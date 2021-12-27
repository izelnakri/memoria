import Decorators from "./decorators/index.js";
import MemoriaModel, {
  Schema,
  DB,
  RelationshipSchema,
  RelationshipDB,
  RelationshipPromise,
  Changeset,
  DeleteError,
  InsertError,
  RuntimeError,
  UpdateError,
  transformValue,
  clearObject,
} from "@memoria/model";
import type {
  PrimaryKey,
  ModelReference,
  DecoratorBucket,
  ModelBuildOptions,
  RelationshipMetadata,
} from "@memoria/model";

type QueryObject = { [key: string]: any };
type ModelRefOrInstance = ModelReference | MemoriaModel;

// TODO: allow storeing bigint as string due to bigint!! Thats what SQLAdapter does
export default class MemoryAdapter {
  static Decorators: DecoratorBucket = Decorators;

  // TODO: make this directly Class not modelName
  static async resetSchemas(Schema, Model?: typeof MemoriaModel): Promise<Schema> {
    if (Model) {
      let targetSchemaIndex = Schema.Schemas.findIndex(
        (schema) => schema.target.name === Model.name
      );
      if (targetSchemaIndex >= 0) {
        clearObject(Schema.Schemas[targetSchemaIndex].target.Serializer.embeds);
        DB._DB.delete(Model.name);
        DB._defaultValuesCache.delete(Model.name);
        Schema.Schemas.splice(targetSchemaIndex, 1);
        Schema._columnNames.delete(Model.name);
        Schema._primaryKeyNameCache.delete(Model.name);
        RelationshipDB.clear(Model);
        RelationshipSchema.clear(Model);
      }

      return Schema;
    }

    DB._DB.clear();
    DB._defaultValuesCache.clear();
    Schema._columnNames.clear();
    Schema._primaryKeyNameCache.clear();
    RelationshipDB.clear();
    RelationshipSchema.clear();

    for (let schema of Schema.Schemas) {
      // NOTE: this is complex because could hold cyclical references
      // TODO: this only cleans registered data!!
      clearObject(schema.target.Serializer.embeds);
    }

    Schema.Schemas.length = 0;

    return Schema;
  }

  static resetCache(
    Model: typeof MemoriaModel,
    targetState?: ModelRefOrInstance[],
    options?: ModelBuildOptions
  ): MemoriaModel[] {
    Model.Cache.clear();

    if (!targetState) {
      return [];
    }

    return targetState.map((fixture) => this.cache(Model, fixture, options));
  }

  static async resetRecords(
    Model?: typeof MemoriaModel,
    targetState?: ModelRefOrInstance[],
    options?: ModelBuildOptions
  ): Promise<MemoriaModel[]> {
    if (Model) {
      if (targetState && targetState.length > 0) {
        let newTargetState = targetState.map((model: ModelRefOrInstance) =>
          assignDefaultValuesForInsert(model, Model)
        );

        return this.resetCache(Model, newTargetState, options);
      }

      return this.resetCache(Model, targetState, options);
    }

    DB._DB.clear();

    return [];
  }

  // TODO: should be used for setPersistedRecords also does instanceRelationship updates(to direct relationships)
  // and reflexive(due to instance cache) updates single record traverses the ENTIRE instanceCaches(scoped to relationships) to update its copies
  // same for insert and update
  // delete deletes it
  // even hasMany diffs could be based on this(when fetched as hasMany it will update all inserts) and deletes on hasMany would be irrelevant(?)
  // along with oneToOne after CCUD
  static cache(
    Model: typeof MemoriaModel,
    record: ModelRefOrInstance,
    options?: ModelBuildOptions
  ): MemoriaModel {
    // TODO: add persistedRelationshipReferences(!)
    // by checking record.isNew & instanceRecordsBelongsToCache adjustment(?)

    // TODO: make this work better, should check relationships and push to relationships if they exist
    let targetOptions = Object.assign(options || {}, { isNew: false });
    let existingModelInCache = this.peek(
      Model,
      record[Model.primaryKeyName]
    ) as MemoriaModel | void;
    if (existingModelInCache) {
      let model = Model.build(
        Object.assign(
          existingModelInCache,
          Array.from(Model.columnNames).reduce((result: QueryObject, attribute: string) => {
            if (record.hasOwnProperty(attribute)) {
              result[attribute] = transformValue(Model, attribute, record[attribute]);
            }

            return result;
          }, {})
        ),
        targetOptions
      );

      return this.returnWithCacheEviction(
        RelationshipDB.cache(tryToRevision(model, options), "update"),
        options
      );
    }

    let target = Model.build(record, targetOptions); // NOTE: pure object here creates no extra revision for "insert" just "build"

    Model.Cache.set(target[Model.primaryKeyName], Model.build(target, targetOptions));
    RelationshipDB.cache(target, "insert");

    return this.returnWithCacheEviction(target, options); // NOTE: instance here doesnt create revision for "cache", maybe add another revision
  }

  static peek(
    Model: typeof MemoriaModel,
    primaryKey: PrimaryKey | PrimaryKey[],
    options?: ModelBuildOptions
  ): MemoriaModel[] | MemoriaModel | void {
    if (Array.isArray(primaryKey)) {
      return (primaryKey as PrimaryKey[]).reduce((result, targetKey) => {
        let foundModel = Model.Cache.get(targetKey);

        return foundModel
          ? result.concat([this.returnWithCacheEviction(foundModel, options)])
          : result;
      }, [] as MemoriaModel[]);
    } else if (typeof primaryKey === "number" || typeof primaryKey === "string") {
      let model = Model.Cache.get(primaryKey);

      return model && this.returnWithCacheEviction(model, options);
    }

    throw new RuntimeError(`${Model.name}.peek() called without a valid primaryKey`);
  }

  static peekBy(
    Model: typeof MemoriaModel,
    queryObject: object,
    options?: ModelBuildOptions
  ): MemoriaModel | void {
    let keys = Object.keys(queryObject);
    let model = Array.from(Model.Cache.values()).find((model: MemoriaModel) =>
      comparison(model, queryObject, keys, 0)
    );

    return model && this.returnWithCacheEviction(model, options);
  }

  static peekAll(
    Model: typeof MemoriaModel,
    queryObject: object = {},
    options?: ModelBuildOptions
  ): MemoriaModel[] {
    let keys = Object.keys(queryObject);
    if (keys.length === 0) {
      return Array.from(Model.Cache.values()).map((model) =>
        this.returnWithCacheEviction(model, options)
      );
    }

    let results = [] as MemoriaModel[];
    for (const model of Model.Cache.values()) {
      if (comparison(model, queryObject, keys, 0)) {
        results.push(this.returnWithCacheEviction(model, options));
      }
    }

    return results;
  }

  static async count(Model: typeof MemoriaModel, queryObject?: QueryObject): Promise<number> {
    if (queryObject) {
      return this.peekAll(Model, queryObject).length;
    }

    return Model.Cache.size;
  }

  static async find(
    Model: typeof MemoriaModel,
    primaryKey: PrimaryKey | PrimaryKey[],
    options?: ModelBuildOptions
  ): Promise<MemoriaModel[] | MemoriaModel | void> {
    return this.peek(Model, primaryKey, options);
  }

  static async findBy(
    Model: typeof MemoriaModel,
    queryObject: object,
    options?: ModelBuildOptions
  ): Promise<MemoriaModel | void> {
    return this.peekBy(Model, queryObject, options);
  }

  static async findAll(
    Model: typeof MemoriaModel,
    queryObject: object = {},
    options?: ModelBuildOptions
  ): Promise<MemoriaModel[] | void> {
    return this.peekAll(Model, queryObject, options);
  }

  static async insert(
    Model: typeof MemoriaModel,
    model: QueryObject | ModelRefOrInstance,
    options?: ModelBuildOptions
  ): Promise<MemoriaModel> {
    if (model[Model.primaryKeyName] && this.peek(Model, model[Model.primaryKeyName])) {
      throw new InsertError(new Changeset(Model.build(model)), {
        id: model[Model.primaryKeyName],
        modelName: Model.name,
        attribute: Model.primaryKeyName,
        message: "already exists",
      });
    }

    let buildOptions = Object.assign(options || {}, { isNew: false });
    let target = Model.build(assignDefaultValuesForInsert(model, Model), buildOptions);

    Model.Cache.set(target[Model.primaryKeyName], Model.build(target, buildOptions));
    RelationshipDB.cache(target, "insert");

    return this.returnWithCacheEviction(target, options);
  }

  static async update(
    Model: typeof MemoriaModel,
    record: QueryObject | ModelRefOrInstance,
    options?: ModelBuildOptions
  ): Promise<MemoriaModel> {
    let targetRecord = this.peek(Model, record[Model.primaryKeyName]) as MemoriaModel;
    if (!targetRecord) {
      throw new UpdateError(new Changeset(Model.build(record)), {
        id: record[Model.primaryKeyName],
        modelName: Model.name,
        attribute: Model.primaryKeyName,
        message: "doesn't exist in cache to update",
      });
    }

    let defaultColumnsForUpdate = DB.getDefaultValues(Model, "update");

    return this.cache(
      Model,
      Array.from(Model.columnNames).reduce((result, attribute: string) => {
        if (record.hasOwnProperty(attribute)) {
          result[attribute] = record[attribute];
        } else if (typeof defaultColumnsForUpdate[attribute] === "function") {
          result[attribute] = defaultColumnsForUpdate[attribute](Model);
        }

        return result as ModelRefOrInstance;
      }, {} as ModelRefOrInstance),
      options
    );
  }

  static unload(
    Model: typeof MemoriaModel,
    record: ModelRefOrInstance,
    _options?: ModelBuildOptions
  ): MemoriaModel {
    let targetRecord = this.peek(Model, record[Model.primaryKeyName]) as MemoriaModel;
    if (!targetRecord) {
      throw new DeleteError(new Changeset(Model.build(record)), {
        id: record[Model.primaryKeyName],
        modelName: Model.name,
        attribute: Model.primaryKeyName,
        message: "doesn't exist in cache to delete",
      });
    }

    Model.Cache.delete(targetRecord[Model.primaryKeyName]);
    // RelationshipDB.delete(targetRecord);

    targetRecord.isDeleted = true;

    return targetRecord;
  }

  static async delete(
    Model: typeof MemoriaModel,
    record: ModelRefOrInstance,
    options?: ModelBuildOptions
  ): Promise<MemoriaModel> {
    return this.unload(Model, record, options);
  }

  static async insertAll(
    Model: typeof MemoriaModel,
    models: QueryObject[] | ModelRefOrInstance[],
    options?: ModelBuildOptions
  ): Promise<MemoriaModel[]> {
    return await Promise.all(models.map((model) => this.insert(Model, model, options)));
  }

  static async updateAll(
    Model: typeof MemoriaModel,
    models: ModelRefOrInstance[],
    options?: ModelBuildOptions
  ): Promise<MemoriaModel[]> {
    return await Promise.all(models.map((model) => this.update(Model, model, options)));
  }

  static unloadAll(
    Model: typeof MemoriaModel,
    models?: ModelRefOrInstance[],
    options?: ModelBuildOptions
  ): MemoriaModel[] {
    if (!models) {
      Model.Cache.clear();

      return [];
    }

    return models.map((model) => this.unload(Model, model, options));
  }

  static async deleteAll(
    Model: typeof MemoriaModel,
    models: ModelRefOrInstance[],
    options?: ModelBuildOptions
  ): Promise<MemoriaModel[]> {
    return await Promise.all(models.map((model) => this.unload(Model, model, options)));
  }

  protected static returnWithCacheEviction(
    model: MemoriaModel,
    options: ModelBuildOptions | undefined
  ) {
    if (options && "cache" in options && Number.isInteger(options.cache)) {
      DB.setTimeout(model, options.cache || 0);
    }

    return model;
  }

  static fetchRelationship(
    model: MemoriaModel,
    relationshipName: string,
    relationshipMetadata?: RelationshipMetadata
  ) {
    let Model = model.constructor as typeof MemoriaModel;
    let metadata =
      relationshipMetadata ||
      RelationshipSchema.getRelationshipMetadataFor(Model, relationshipName); // TODO: get with schema function instead(?)
    let { relationshipType, RelationshipClass, reverseRelationshipName } = metadata;

    return new RelationshipPromise(async (resolve, reject) => {
      if (relationshipType === "BelongsTo") {
        let foreignKeyColumnName = metadata.foreignKeyColumnName as string;
        if (!model[foreignKeyColumnName]) {
          return resolve(null);
        }

        return resolve(RelationshipClass.peek(model[foreignKeyColumnName]));
      } else if (relationshipType === "OneToOne") {
        if (reverseRelationshipName) {
          let reverseRelationshipForeignKeyColumnName = metadata.reverseRelationshipForeignKeyColumnName as string;

          return resolve(
            RelationshipClass.peekBy({
              [reverseRelationshipForeignKeyColumnName]: model[Model.primaryKeyName],
            })
          );
        }

        return reject();
      } else if (relationshipType === "HasMany") {
        if (reverseRelationshipName) {
          let foreignKeyColumnName = metadata.foreignKeyColumnName as string;
          return resolve(
            RelationshipClass.peekAll({ [foreignKeyColumnName]: model[Model.primaryKeyName] })
          );
        }

        return reject();
      }

      // TODO:
    });
  }
}

// NOTE: if records were ordered by ID after insert, then there could be performance benefit
function comparison(model: MemoriaModel, options: QueryObject, keys: string[], index = 0): boolean {
  const key = keys[index];

  if (keys.length === index) {
    return model[key] === options[key];
  } else if (model[key] === options[key]) {
    return comparison(model, options, keys, index + 1);
  }

  return false;
}

// TODO: maybe move to DB(?)
function assignDefaultValuesForInsert(model, Model: typeof MemoriaModel) {
  let defaultValues = DB.getDefaultValues(Model, "insert");

  return Array.from(Model.columnNames).reduce((result: ModelRefOrInstance, attribute: string) => {
    if (attribute === Model.primaryKeyName) {
      result[attribute] = model[attribute] || defaultValues[attribute](Model);
    } else if (model.hasOwnProperty(attribute)) {
      result[attribute] = model[attribute];
    } else if (!defaultValues.hasOwnProperty(attribute)) {
      result[attribute] = null;
    } else {
      result[attribute] =
        typeof defaultValues[attribute] === "function"
          ? defaultValues[attribute](Model) // TODO: this changed
          : defaultValues[attribute];
    }

    return result;
  }, model);
}

function tryToRevision(model: MemoriaModel, options) {
  if (Object.keys(model.changes).length > 0) {
    clearObject(model.changes);

    revisionEnabled(options) && model.revisionHistory.push(Object.assign({}, model));
  }

  return model;
}

function revisionEnabled(options?: ModelBuildOptions) {
  return !options || options.revision !== false;
}
