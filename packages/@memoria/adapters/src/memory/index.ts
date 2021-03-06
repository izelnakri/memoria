// NOTE: Decision, never store relationshipReferences for .insert() and .update() [especially]
// NOTE: maybe move part of the insert, update, cache reference logic to model.js instead of MemoryAdapter:
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
      let targetSchemaIndex = Schema.Schemas.findIndex(
        (schema) => schema.target.name === Model.name
      );
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
        let newTargetState =
          targetState.map((model: ModelRefOrInstance) => assignDefaultValuesForInsert(model || {}, Model));

        return this.resetCache(Model, newTargetState, options);
      }

      return this.resetCache(Model, targetState, options);
    }

    DB._DB.clear();

    return [];
  }

  static cache(
    Model: typeof MemoriaModel,
    record: ModelRefOrInstance,
    options?: ModelBuildOptions
  ): MemoriaModel {
    let targetOptions = { ...options, isNew: false };
    let existingModelInCache = Model.Cache.get(record[Model.primaryKeyName]) as MemoriaModel | void;
    if (existingModelInCache) {
      let model = Object.assign(
        existingModelInCache,
        Array.from(Model.columnNames).reduce((result: QueryObject, attribute: string) => {
          if (record.hasOwnProperty(attribute)) {
            result[attribute] = transformValue(Model, attribute, record[attribute]);
          }

          return result;
        }, {})
      );
      let target = this.returnWithCacheEviction(tryToRevision(model, targetOptions), targetOptions);

      if (record instanceof Model) {
        record.fetchedRelationships.forEach((relationshipName) => {
          target[relationshipName] = record[relationshipName];
        });
        Array.from(Model.columnNames).forEach((columnName) => {
          record[columnName] = model[columnName];
        });
      }

      return RelationshipDB.cache(target, "update", record);
    } else if (record && record instanceof Model && !record.isBuilt) {
      Object.seal(record);
    }

    let cachedRecord = Model.build(record, targetOptions); // NOTE: pure object here creates no extra revision for "insert" just "build"

    Model.Cache.set(cachedRecord[Model.primaryKeyName], cachedRecord);

    let result = this.returnWithCacheEviction(cachedRecord, targetOptions);

    cachedRecord.fetchedRelationships.forEach((relationshipName) => {
      RelationshipDB.findRelationshipCacheFor(Model, relationshipName).delete(cachedRecord);
    });

    return RelationshipDB.cache(result, "insert", record);
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
      let model = Model.Cache.get(primaryKey) || null;

      return model && this.returnWithCacheEviction(model, options);
    }

    throw new RuntimeError(`${Model.name}.peek() called without a valid primaryKey`);
  }

  static peekBy(
    Model: typeof MemoriaModel,
    queryObject: object,
    options?: ModelBuildOptions
  ): MemoriaModel | void {
    let keys = queryObject instanceof Model ? Array.from(Model.columnNames) : Object.keys(queryObject);
    let model = Array.from(Model.Cache.values()).find((model: MemoriaModel) =>
      comparison(model, queryObject, keys, 0)
    ) || null;

    return model && this.returnWithCacheEviction(model, options);
  }

  static peekAll(
    Model: typeof MemoriaModel,
    queryObject: object = {},
    options?: ModelBuildOptions
  ): MemoriaModel[] {
    let keys = queryObject instanceof Model ? Array.from(Model.columnNames) : Object.keys(queryObject);
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
    record?: QueryObject | ModelRefOrInstance,
    options?: ModelBuildOptions
  ): Promise<MemoriaModel> {
    let targetOptions = { ...options, isNew: false };
    let targetRecord = record || {};
    if (targetRecord[Model.primaryKeyName] && Model.Cache.get(targetRecord[Model.primaryKeyName])) {
      throw new InsertError(new Changeset(Model.Cache.get(targetRecord[Model.primaryKeyName])), {
        id: targetRecord[Model.primaryKeyName],
        modelName: Model.name,
        attribute: Model.primaryKeyName,
        message: "already exists",
      });
    }

    let cachedRecord = Model.build(assignDefaultValuesForInsert(targetRecord, Model), targetOptions); // TODO: this will have the relationships as they are taken from fetchedRelationships

    Model.Cache.set(cachedRecord[Model.primaryKeyName], cachedRecord);

    let result = this.returnWithCacheEviction(cachedRecord, targetOptions);

    cachedRecord.fetchedRelationships.forEach((relationshipName) => {
      RelationshipDB.findRelationshipCacheFor(Model, relationshipName).delete(cachedRecord);
    });

    return RelationshipDB.cache(result, "insert", record);
  }

  static async update(
    Model: typeof MemoriaModel,
    record: QueryObject | ModelRefOrInstance,
    options?: ModelBuildOptions
  ): Promise<MemoriaModel> {
    let targetRecord = Model.Cache.get(record[Model.primaryKeyName]) as MemoriaModel;
    if (!targetRecord) {
      throw new UpdateError(new Changeset(Model.build(record)), {
        id: record[Model.primaryKeyName],
        modelName: Model.name,
        attribute: Model.primaryKeyName,
        message: "doesn't exist in cache to update",
      });
    }

    let defaultColumnsForUpdate = DB.getDefaultValues(Model, "update");

    if (record instanceof Model) {
      let target = Object.keys(defaultColumnsForUpdate).reduce((result, attributeName) => {
        record[attributeName] = defaultColumnsForUpdate[attributeName](Model);

        return result;
      }, record.isFrozen ? Model.build(record) : record);

      return this.cache(Model, target, options);
    }

    let target = Array.from(Model.columnNames).reduce((result, attribute: string) => {
      if (defaultColumnsForUpdate.hasOwnProperty(attribute)) {
        result[attribute] = defaultColumnsForUpdate[attribute](Model);
      } else if (record.hasOwnProperty(attribute)) {
        result[attribute] = record[attribute];
      }

      return result;
    }, { ...record }) as ModelRefOrInstance;

    return this.cache(Model, target, options);
  }

  static unload(
    Model: typeof MemoriaModel,
    record: ModelRefOrInstance,
    options?: ModelBuildOptions
  ): MemoriaModel {
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

  protected static returnWithCacheEviction(
    model: MemoriaModel,
    options: ModelBuildOptions | undefined
  ) {
    if (options && "cache" in options && Number.isInteger(options.cache)) {
      DB.setTimeout(model, options.cache || 0);
    }

    return (model.constructor as typeof MemoriaModel).build(model, { ...options, isNew: false });
  }

  static fetchRelationship(
    model: MemoriaModel,
    relationshipName: string,
    relationshipMetadata?: RelationshipMetadata
  ) {
    let Model = model.constructor as typeof MemoriaModel;
    let metadata =
      relationshipMetadata ||
      RelationshipSchema.getRelationshipMetadataFor(Model, relationshipName);
    let { relationshipType, RelationshipClass, reverseRelationshipName } = metadata;

    // NOTE: these always create new instances, we want this to happen
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
            model[Model.primaryKeyName]
              ? RelationshipClass.peekBy({
                [reverseRelationshipForeignKeyColumnName]: model[Model.primaryKeyName],
              })
              : null
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

      return null; // TODO: ManyToMany not implemented because of this, implement this
    });
  }
}

function comparison(model: MemoriaModel, options: QueryObject, keys: string[], index = 0): boolean {
  const key = keys[index];

  if (keys.length === index) {
    return model[key] === options[key];
  } else if (model[key] === options[key]) {
    return comparison(model, options, keys, index + 1);
  }

  return false;
}

// NOTE: maybe move to DB(?)
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

function tryToRevision(model: MemoriaModel, options) {
  if (Object.keys(model.changes).length > 0) {
    clearObject(model.changes);

    revisionEnabled(options) && model.revisionHistory.add(model);
  }

  return model;
}

function revisionEnabled(options?: ModelBuildOptions) {
  return !options || options.revision !== false;
}
