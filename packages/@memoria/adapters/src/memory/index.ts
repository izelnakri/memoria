import Decorators from "./decorators/index.js";
import MemoriaModel, {
  Config,
  Changeset,
  DeleteError,
  InsertError,
  RuntimeError,
  UpdateError,
  transformValue,
  primaryKeyTypeSafetyCheck,
  clearObject,
} from "@memoria/model";
import type { ModelReference, DecoratorBucket, CRUDOptions } from "@memoria/model";

type primaryKey = number | string;
type QueryObject = { [key: string]: any };
type ModelRefOrInstance = ModelReference | MemoriaModel;

// TODO: allow storeing bigint as string due to bigint!! Thats what SQLAdapter does
export default class MemoryAdapter {
  static Decorators: DecoratorBucket = Decorators;

  static async resetSchemas(Config, modelName?: string): Promise<Config> {
    if (modelName) {
      let targetSchemaIndex = Config.Schemas.findIndex(
        (schema) => schema.target.name === modelName
      );
      if (targetSchemaIndex >= 0) {
        Config.Schemas.splice(targetSchemaIndex, 1);
        delete Config._DB[modelName];
        delete Config._columnNames[modelName];
        delete Config._primaryKeyNameCache[modelName];
        delete Config._defaultValuesCache[modelName];
        delete Config._embedReferences[modelName];
        // TODO: this is problematic, doesnt clear other relationship embeds
      }

      return Config;
    }

    Config.Schemas.length = 0;
    clearObject(Config._DB);
    clearObject(Config._columnNames);
    clearObject(Config._primaryKeyNameCache);
    clearObject(Config._defaultValuesCache);

    for (let cache in Config._embedReferences) {
      // NOTE: this is complex because could hold cyclical references
      // TODO: this only cleans registered data!!
      clearObject(Config._embedReferences[cache]);

      delete Config._embedReferences[cache];
    }

    return Config;
  }

  static async resetForTests(Config, modelName?: string): Promise<Config> {
    if (modelName) {
      Config.Schemas[modelName].target.resetCache();
    } else {
      Config.Schemas.forEach((schema) => this.resetCache(schema.target));
    }

    return Config;
  }

  static resetCache(
    Model: typeof MemoriaModel,
    targetState?: ModelRefOrInstance[],
    options?: CRUDOptions
  ): MemoriaModel[] {
    Model.Cache.length = 0;

    if (targetState) {
      targetState.reduce((primaryKeys: Set<primaryKey>, targetFixture) => {
        let primaryKey = targetFixture[Model.primaryKeyName];
        if (primaryKey && primaryKeys.has(primaryKey)) {
          throw new RuntimeError(
            `${Model.name}.resetCache(records) have duplicate primary key "${primaryKey}" in records`
          );
        }

        this.cache(Model, targetFixture, options);

        return primaryKeys.add(primaryKey);
      }, new Set([]));
    }

    return Model.Cache;
  }

  static async resetRecords(
    Model: typeof MemoriaModel,
    targetState?: ModelRefOrInstance[],
    options?: CRUDOptions
  ): Promise<MemoriaModel[]> {
    return this.resetCache(Model, targetState, options);
  }

  // it provided record must have the primaryKey
  static cache(
    Model: typeof MemoriaModel,
    record: ModelRefOrInstance,
    options?: CRUDOptions
  ): MemoriaModel {
    // TODO: make this work better, should check relationships and push to relationships if they exist
    let primaryKey = record[Model.primaryKeyName];
    if (!primaryKey) {
      throw new RuntimeError(new Changeset(Model.build(record, { isNew: false })), {
        id: null,
        modelName: Model.name,
        attribute: Model.primaryKeyName,
        message: "doesn't exist",
      });
    }

    let shouldRevision = !options || options.revision !== false;
    let existingModelInCache = this.peek(Model, primaryKey) as MemoriaModel | void;
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

      if (Object.keys(model.changes).length > 0) {
        clearObject(model.changes);

        if (shouldRevision) {
          model.revisionHistory.push(Object.assign({}, model));
        }
      }

      return model;
    } else if (record instanceof Model) {
      primaryKeyTypeSafetyCheck(record);

      Model.Cache.push(record as MemoriaModel);

      clearObject(record.changes);

      if (shouldRevision) {
        record.revisionHistory.push(Object.assign({}, record));
      }

      return record as MemoriaModel;
    }

    let target = cleanRelationships(
      Model,
      Model.build(record, Object.assign({ isNew: false }, options))
    );

    primaryKeyTypeSafetyCheck(target); // NOTE: redundant remove it in future by doing it in build()

    Model.Cache.push(target as MemoriaModel);

    return target as MemoriaModel;
  }

  static peek(
    Model: typeof MemoriaModel,
    primaryKey: primaryKey | primaryKey[]
  ): MemoriaModel[] | MemoriaModel | void {
    if (Array.isArray(primaryKey as primaryKey[])) {
      return Array.from(Model.Cache).reduce((result: MemoriaModel[], model: MemoriaModel) => {
        const foundModel = (primaryKey as primaryKey[]).includes(model[Model.primaryKeyName])
          ? model
          : null;

        return foundModel ? result.concat([foundModel]) : result;
      }, []) as MemoriaModel[];
    } else if (typeof primaryKey === "number" || typeof primaryKey === "string") {
      return Array.from(Model.Cache).find(
        (model: MemoriaModel) => model[Model.primaryKeyName] === primaryKey
      ) as MemoriaModel | undefined;
    }

    throw new RuntimeError(`${Model.name}.peek() called without a valid primaryKey`);
  }

  static peekBy(Model: typeof MemoriaModel, queryObject: object): MemoriaModel | void {
    let keys = Object.keys(queryObject);

    return Model.Cache.find((model: MemoriaModel) => comparison(model, queryObject, keys, 0));
  }

  static peekAll(Model: typeof MemoriaModel, queryObject: object = {}): MemoriaModel[] {
    let keys = Object.keys(queryObject);
    if (keys.length === 0) {
      return Array.from(Model.Cache);
    }

    return Array.from(Model.Cache as MemoriaModel[]).filter((model: MemoriaModel) =>
      comparison(model, queryObject, keys, 0)
    );
  }

  static async count(Model: typeof MemoriaModel, queryObject?: QueryObject): Promise<number> {
    if (queryObject) {
      return this.peekAll(Model, queryObject).length;
    }

    return Model.Cache.length;
  }

  static async find(
    Model: typeof MemoriaModel,
    primaryKey: primaryKey | primaryKey[]
  ): Promise<MemoriaModel[] | MemoriaModel | void> {
    return this.peek(Model, primaryKey);
  }

  static async findBy(
    Model: typeof MemoriaModel,
    queryObject: object
  ): Promise<MemoriaModel | void> {
    return this.peekBy(Model, queryObject);
  }

  static async findAll(
    Model: typeof MemoriaModel,
    queryObject: object = {}
  ): Promise<MemoriaModel[] | void> {
    return this.peekAll(Model, queryObject);
  }

  static async insert(
    Model: typeof MemoriaModel,
    model: QueryObject | ModelRefOrInstance,
    options?: CRUDOptions
  ): Promise<MemoriaModel> {
    let defaultValues = Object.assign({}, Config.getDefaultValues(Model, "insert"));
    let target = cleanRelationships(
      Model,
      Model.build(
        Array.from(Model.columnNames).reduce((result: QueryObject, attribute: string) => {
          if (model.hasOwnProperty(attribute)) {
            result[attribute] = model[attribute];
          } else if (!defaultValues.hasOwnProperty(attribute)) {
            result[attribute] = null;
          } else if (typeof defaultValues[attribute] === "function") {
            result[attribute] = defaultValues[attribute](Model); // TODO: this changed
          } else {
            result[attribute] = defaultValues[attribute];
          }

          return result;
        }, {}),
        { isNew: false }
      )
    );
    let primaryKey = target[Model.primaryKeyName];

    primaryKeyTypeSafetyCheck(target);

    if (this.peek(Model, primaryKey)) {
      throw new InsertError(new Changeset(target), {
        id: primaryKey,
        modelName: Model.name,
        attribute: Model.primaryKeyName,
        message: "already exists",
      });
    }

    Model.Cache.push(target as MemoriaModel);

    return target as MemoriaModel;
  }

  static async update(
    Model: typeof MemoriaModel,
    record: QueryObject | ModelRefOrInstance
  ): Promise<MemoriaModel> {
    let primaryKey = record[Model.primaryKeyName];
    if (!primaryKey) {
      throw new RuntimeError(
        new Changeset(Model.build(record)),
        "update() called without a valid primaryKey"
      );
    }

    let targetRecord = this.peek(Model, primaryKey) as MemoriaModel;
    if (!targetRecord) {
      throw new UpdateError(new Changeset(Model.build(record)), {
        id: record[Model.primaryKeyName],
        modelName: Model.name,
        attribute: Model.primaryKeyName,
        message: "doesn't exist in cache to update",
      });
    }

    let defaultColumnsForUpdate = Config.getDefaultValues(Model, "update");
    let model = Object.assign(
      targetRecord,
      Array.from(Model.columnNames).reduce((result: QueryObject, attribute: string) => {
        if (record.hasOwnProperty(attribute)) {
          result[attribute] = record[attribute];
        } else if (typeof defaultColumnsForUpdate[attribute] === "function") {
          result[attribute] = defaultColumnsForUpdate[attribute](Model);
        }

        return result;
      }, {})
    );

    clearObject(model.changes);
    model.revisionHistory.push(Object.assign({}, model));

    return model;
  }

  static unload(Model: typeof MemoriaModel, record: ModelRefOrInstance): MemoriaModel {
    if (!record) {
      throw new RuntimeError(
        new Changeset(Model.build(record)),
        "unload() called without a valid record"
      );
    }

    let targetRecord = this.peek(Model, record[Model.primaryKeyName]) as MemoriaModel;
    if (!targetRecord) {
      throw new DeleteError(new Changeset(Model.build(record)), {
        id: record[Model.primaryKeyName],
        modelName: Model.name,
        attribute: Model.primaryKeyName,
        message: "doesn't exist in cache to delete",
      });
    }

    let targetIndex = Model.Cache.indexOf(targetRecord);

    Model.Cache.splice(targetIndex, 1);

    targetRecord.isDeleted = true;

    return targetRecord;
  }

  static async delete(
    Model: typeof MemoriaModel,
    record: ModelRefOrInstance
  ): Promise<MemoriaModel> {
    return this.unload(Model, record);
  }

  static async insertAll(
    Model: typeof MemoriaModel,
    models: QueryObject[] | ModelRefOrInstance[],
    options?: CRUDOptions
  ): Promise<MemoriaModel[]> {
    return await Promise.all(models.map((model) => this.insert(Model, model, options)));
  }

  static async updateAll(
    Model: typeof MemoriaModel,
    models: ModelRefOrInstance[]
  ): Promise<MemoriaModel[]> {
    return await Promise.all(models.map((model) => this.update(Model, model)));
  }

  static unloadAll(Model: typeof MemoriaModel, models?: ModelRefOrInstance[]): MemoriaModel[] {
    if (!models) {
      Model.Cache.length = 0;

      return [];
    }

    return models.map((model) => this.unload(Model, model));
  }

  static async deleteAll(
    Model: typeof MemoriaModel,
    models: ModelRefOrInstance[]
  ): Promise<MemoriaModel[]> {
    return await Promise.all(models.map((model) => this.unload(Model, model)));
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

function cleanRelationships(Model, instance) {
  Object.keys(Model.relationships).forEach((relationshipKey) => {
    if (relationshipKey in instance) {
      instance[relationshipKey] = undefined;
    }
  });

  return instance;
}
