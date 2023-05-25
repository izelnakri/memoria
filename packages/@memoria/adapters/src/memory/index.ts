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
  match,
} from "@memoria/model";
import { prepareTargetObjectFromInstance } from "../utils.js";
import type {
  PrimaryKey,
  ModelReference,
  DecoratorBucket,
  ModelBuildOptions,
  RelationshipMetadata,
} from "@memoria/model";

type QueryObject = { [key: string]: any };
type ModelRefOrInstance = ModelReference | MemoriaModel;

// TODO: allow storing bigint as string due to bigint!! Thats what SQLAdapter does
export default class MemoryAdapter {
  static Decorators: DecoratorBucket = Decorators;

  static async resetSchemas(Schema, Model?: typeof MemoriaModel): Promise<Schema> {
    if (Model) {
      let targetSchemaIndex = Schema.Schemas.findIndex((schema) => schema.target.name === Model.name);
      if (Schema.Models.get(Model)) {
        DB._DB.delete(Model.name);
        DB._defaultValuesCache.delete(Model.name);
        Schema.Models.delete(Model.name);
        Schema.Schemas.splice(targetSchemaIndex, 1);
        Schema._primaryKeyNameCache.delete(Model.name);
        Schema._columnNames.delete(Model.name);
        clearObject(Schema.Schemas[targetSchemaIndex].target.Serializer.embeds);
        RelationshipDB.clear(Model);
        RelationshipSchema.resetSchema(Model);
      }

      return Schema;
    }

    DB._DB.clear();
    DB._defaultValuesCache.clear();
    Schema.Models.clear();
    Schema._primaryKeyNameCache.clear();
    Schema._columnNames.clear();
    for (let schema of Schema.Schemas) {
      // NOTE: this is complex because could hold cyclical references
      // TODO: this only cleans registered data!!
      clearObject(schema.target.Serializer.embeds);
    }
    Schema.Schemas.length = 0;
    RelationshipDB.clear();
    RelationshipSchema.resetSchema();

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
          assignDefaultValuesForInsert(model || {}, Model)
        );

        return this.resetCache(Model, newTargetState, options);
      }

      return this.resetCache(Model, targetState, options);
    }

    DB._DB.clear();

    return [];
  }

  static cache(Model: typeof MemoriaModel, record: ModelRefOrInstance, options?: ModelBuildOptions): MemoriaModel {
    let inputOptions = { ...options, isNew: false };
    let existingModelInCache = Model.Cache.get(record[Model.primaryKeyName]) as MemoriaModel | void;
    if (existingModelInCache) {
      let cachedRecord = Object.assign(
        existingModelInCache,
        Array.from(Model.columnNames).reduce((result: QueryObject, attribute: string) => {
          if (record.hasOwnProperty(attribute)) {
            result[attribute] = transformValue(Model, attribute, record[attribute]);
          }

          return result;
        }, {})
      );

      let outputRecord =
        record instanceof Model
          ? record
          : this.returnWithCacheEviction(addToRevisionHistory(cachedRecord, inputOptions), inputOptions);

      if (options && "cacheDuration" in options && Number.isInteger(options.cacheDuration)) {
        DB.setTimeout(cachedRecord, options.cacheDuration || 0);
      }

      return RelationshipDB.cache(outputRecord, "update", record, cachedRecord);
    } else if (record && record instanceof Model && !record.isBuilt) {
      Object.seal(record);
    }

    let cachedRecord = Model.build(record, inputOptions);
    let targetIsModel = record instanceof Model;
    if (targetIsModel) {
      record.isNew = false;
    }

    Model.Cache.set(cachedRecord[Model.primaryKeyName], cachedRecord);

    if (options && "cacheDuration" in options && Number.isInteger(options.cacheDuration)) {
      DB.setTimeout(cachedRecord, options.cacheDuration || 0);
    }

    let outputRecord = targetIsModel ? record : Model.build(cachedRecord, { ...options, isNew: false });

    return RelationshipDB.cache(outputRecord, "insert", record, cachedRecord);
  }

  static peek(
    Model: typeof MemoriaModel,
    primaryKey: PrimaryKey | PrimaryKey[],
    options?: ModelBuildOptions
  ): MemoriaModel[] | MemoriaModel | null {
    if (Array.isArray(primaryKey)) {
      return (primaryKey as PrimaryKey[]).reduce((result, targetKey) => {
        let foundModel = Model.Cache.get(targetKey);

        return foundModel ? result.concat([this.returnWithCacheEviction(foundModel, options)]) : result;
      }, [] as MemoriaModel[]);
    } else if (typeof primaryKey === "number" || typeof primaryKey === "string") {
      let model = Model.Cache.get(primaryKey) || null;

      return model && this.returnWithCacheEviction(model, options);
    }

    throw new RuntimeError(`${Model.name}.peek() called without a valid primaryKey`);
  }

  static peekBy(Model: typeof MemoriaModel, queryObject: object, options?: ModelBuildOptions): MemoriaModel | null {
    let model = Array.from(Model.Cache.values()).find((model: MemoriaModel) => match(model, queryObject)) || null;

    return model && this.returnWithCacheEviction(model, options);
  }

  static peekAll(Model: typeof MemoriaModel, queryObject: object = {}, options?: ModelBuildOptions): MemoriaModel[] {
    let keys = queryObject instanceof Model ? Array.from(Model.columnNames) : Object.keys(queryObject);
    if (keys.length === 0) {
      return Array.from(Model.Cache.values()).map((model) => this.returnWithCacheEviction(model, options));
    }

    let results = [] as MemoriaModel[];
    for (const model of Model.Cache.values()) {
      if (match(model, queryObject)) {
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
  ): Promise<MemoriaModel[] | MemoriaModel | null> {
    return this.peek(Model, primaryKey, options);
  }

  static async findBy(
    Model: typeof MemoriaModel,
    queryObject: object,
    options?: ModelBuildOptions
  ): Promise<MemoriaModel | null> {
    return this.peekBy(Model, queryObject, options);
  }

  static async findAll(
    Model: typeof MemoriaModel,
    queryObject: object = {},
    options?: ModelBuildOptions
  ): Promise<MemoriaModel[] | null> {
    return this.peekAll(Model, queryObject, options);
  }

  static async insert(
    Model: typeof MemoriaModel,
    record?: QueryObject | ModelRefOrInstance,
    options?: ModelBuildOptions
  ): Promise<MemoriaModel> {
    let inputOptions = { ...options, isNew: false };
    let targetRecord = record || {};
    let primaryKeyValue = targetRecord[Model.primaryKeyName];
    if (primaryKeyValue && Model.Cache.get(primaryKeyValue)) {
      throw new InsertError(new Changeset(Model.Cache.get(primaryKeyValue)), {
        id: primaryKeyValue,
        modelName: Model.name,
        attribute: Model.primaryKeyName,
        message: "already exists",
      });
    }

    let targetValues = assignDefaultValuesForInsert(targetRecord, Model);
    let cachedRecord = Model.build(targetValues, inputOptions);
    let targetIsModel = targetValues instanceof Model;
    if (targetIsModel) {
      targetValues.isNew = false;
    }

    let outputRecord = targetIsModel ? targetValues : Model.build(cachedRecord, { ...options, isNew: false });

    Model.Cache.set(cachedRecord[Model.primaryKeyName], cachedRecord);

    if (options && "cacheDuration" in options && Number.isInteger(options.cacheDuration)) {
      DB.setTimeout(cachedRecord, options.cacheDuration || 0);
    }

    return RelationshipDB.cache(outputRecord, "insert", targetRecord, cachedRecord);
  }

  static async update(
    Model: typeof MemoriaModel,
    record: QueryObject | ModelRefOrInstance,
    options?: ModelBuildOptions
  ): Promise<MemoriaModel> {
    let cachedRecord = Model.Cache.get(record[Model.primaryKeyName]) as MemoriaModel;
    if (!cachedRecord) {
      throw new UpdateError(new Changeset(Model.build(record)), {
        id: record[Model.primaryKeyName],
        modelName: Model.name,
        attribute: Model.primaryKeyName,
        message: "doesn't exist in cache to update",
      });
    }

    let defaultColumnsForUpdate = DB.getDefaultValues(Model, "update");

    if (record instanceof Model) {
      let outputRecord = Object.keys(defaultColumnsForUpdate).reduce(
        (result, attributeName) => {
          record[attributeName] = defaultColumnsForUpdate[attributeName](Model);

          return result;
        },
        record.isFrozen ? Model.build(record) : record
      );

      return this.cache(Model, outputRecord, options);
    }

    let outputRecord = Array.from(Model.columnNames).reduce(
      (result, attribute: string) => {
        if (defaultColumnsForUpdate.hasOwnProperty(attribute)) {
          result[attribute] = defaultColumnsForUpdate[attribute](Model);
        } else if (record.hasOwnProperty(attribute)) {
          result[attribute] = record[attribute];
        }

        return result;
      },
      { ...record }
    ) as ModelRefOrInstance;

    return this.cache(Model, outputRecord, options);
  }

  static unload(Model: typeof MemoriaModel, record: ModelRefOrInstance, options?: ModelBuildOptions): MemoriaModel {
    let targetRecord = Model.Cache.get(record[Model.primaryKeyName]) as MemoriaModel;
    if (!targetRecord) {
      throw new DeleteError(new Changeset(Model.build(record, { ...options, isNew: false })), {
        id: record[Model.primaryKeyName],
        modelName: Model.name,
        attribute: Model.primaryKeyName,
        message: "doesn't exist in cache to delete",
      });
    }

    RelationshipDB.delete(targetRecord);
    Model.Cache.delete(targetRecord[Model.primaryKeyName]);

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

  protected static returnWithCacheEviction(model: MemoriaModel, options: ModelBuildOptions = {}) {
    if ("cache" in options && Number.isInteger(options.cacheDuration)) {
      DB.setTimeout(model, options.cacheDuration || 0);
    }

    return (model.constructor as typeof MemoriaModel).build(model, { ...options, isNew: false });
  }

  static fetchRelationship(model: MemoriaModel, relationshipName: string, relationshipMetadata?: RelationshipMetadata) {
    let Model = model.constructor as typeof MemoriaModel;
    let metadata = relationshipMetadata || RelationshipSchema.getRelationshipMetadataFor(Model, relationshipName);
    let { relationshipType, RelationshipClass, reverseRelationshipName, SourceClass } = metadata;

    return new RelationshipPromise(async (resolve, _reject) => {
      if (relationshipType === "BelongsTo") {
        let foreignKeyColumnName = metadata.foreignKeyColumnName as string;
        if (!model[foreignKeyColumnName]) {
          return resolve(RelationshipDB.cacheRelationship(model, metadata, null));
        }

        return resolve(
          RelationshipDB.cacheRelationship(
            model,
            metadata,
            RelationshipClass.peek(model[foreignKeyColumnName] as PrimaryKey)
          )
        );
      } else if (relationshipType === "OneToOne") {
        let reverseRelationshipForeignKeyColumnName = metadata.reverseRelationshipForeignKeyColumnName as string;
        if (!reverseRelationshipForeignKeyColumnName || !reverseRelationshipName) {
          throw new Error(
            `${RelationshipClass.name} missing a foreign key column or @BelongsTo declaration for ${SourceClass.name} on ${relationshipName} @hasOne relationship!`
          );
        }

        let relationship = model[Model.primaryKeyName]
          ? RelationshipClass.peekBy({
              [reverseRelationshipForeignKeyColumnName]: model[Model.primaryKeyName],
            })
          : null;

        return resolve(RelationshipDB.cacheRelationship(model, metadata, relationship));
      } else if (relationshipType === "HasMany") {
        let reverseRelationshipForeignKeyColumnName = metadata.reverseRelationshipForeignKeyColumnName as string;
        if (!reverseRelationshipForeignKeyColumnName) {
          throw new Error(
            `${RelationshipClass.name} missing a foreign key column for ${SourceClass.name} on ${relationshipName} @hasMany relationship!`
          );
        }

        let relationship = model[Model.primaryKeyName]
          ? RelationshipClass.peekAll({ [reverseRelationshipForeignKeyColumnName]: model[Model.primaryKeyName] })
          : [];
        // NOTE: peekAll generate new instances each time, this is a feature, not a bug(?). That way when we mutate foreignKey of existing record, hasMany array stays in tact

        return resolve(RelationshipDB.cacheRelationship(model, metadata, relationship));
      }

      return resolve(null); // NOTE: ManyToMany not implemented yet.
    });
  }
}

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
  }, prepareTargetObjectFromInstance(model, Model));
}

// NOTE: instead model should add to existingModel, and maybe vice-versa?
function addToRevisionHistory(model: MemoriaModel, options: ModelBuildOptions) {
  if (Object.keys(model.changes).length > 0) {
    clearObject(model.changes);

    revisionEnabled(options) && model.revisionHistory.add(model);
  }

  return model;
}

function revisionEnabled(options?: ModelBuildOptions) {
  return !options || options.revision !== false;
}
