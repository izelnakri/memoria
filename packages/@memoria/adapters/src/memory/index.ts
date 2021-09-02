import kleur from "kleur";
import inspect from "object-inspect"; // used on insert and unload/delete of the cache for better DX
import Decorators from "./decorators/index.js";
import { primaryKeyTypeSafetyCheck } from "../utils.js";
import MemoriaModel, { Config } from "@memoria/model";
import type { ModelRef, DecoratorBucket } from "@memoria/model";

type primaryKey = number | string;
type QueryObject = { [key: string]: any };
type ModelRefOrInstance = ModelRef | MemoriaModel;

// NewBucket, InFlightBucket, DirtyBucket, PersistedBucket, HistoryBucket, ErrorBucket, RollbackBucket

// What is the different between push and insert?
// Push replaces existing record!, doesnt have defaultValues

// TODO: always store id as string due to bigint!! Thats what SQLAdapter does
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
        delete Config._embedReferences[modelName]; // TODO: this is problematic, doesnt clear other relationship embeds
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
    targetState?: ModelRefOrInstance[]
  ): MemoriaModel[] {
    Model.Cache.length = 0;

    if (targetState) {
      targetState.map((targetFixture) => this.cache(Model, targetFixture));
    }

    return Model.Cache;
  }

  static async resetRecords(
    Model: typeof MemoriaModel,
    targetState?: ModelRefOrInstance[]
  ): Promise<void | MemoriaModel[]> {
    return this.resetCache(Model, targetState);
  }

  // NOTE: this doesnt assign default values from the instance!!
  static build(Model: typeof MemoriaModel, options: QueryObject | MemoriaModel): MemoriaModel {
    let model = new Model(options);

    Object.keys(model).forEach((keyName: string) => {
      model[keyName] = model[keyName] || keyName in options ? options[keyName] : null;
    });

    return Object.seal(model);
  }

  // NOTE: requires primaryKey
  static cache(Model: typeof MemoriaModel, record: ModelRefOrInstance): MemoriaModel {
    if (!record.hasOwnProperty(Model.primaryKeyName)) {
      throw new Error(
        kleur.red(
          `[Memoria] CacheError: A ${Model.name} Record is missing a primary key(${Model.primaryKeyName}) to add to cache. Please make sure all your ${Model.name} fixtures have ${Model.primaryKeyName} key`
        )
      );
    }

    primaryKeyTypeSafetyCheck(Model, record[Model.primaryKeyName]);

    if (this.peek(Model, record[Model.primaryKeyName])) {
      throw new Error(
        kleur.red(
          `[Memoria] CacheError: ${Model.name}.cache() fails: ${Model.primaryKeyName} ${
            record[Model.primaryKeyName]
          } already exists in the cache! `
        )
      );
    }

    let target = cleanRelationships(
      Model,
      record instanceof Model ? record : this.build(Model, record)
    );

    // TODO: this should always be relationship filtered pure object?
    Model.Cache.push(target);

    return target;
  }

  // NOTE: like .cache but does change the cached records provided attributes if it already exists in cache
  // it provided record must have the primaryKey
  static push(Model: typeof MemoriaModel, record: ModelRefOrInstance): MemoriaModel {
    // TODO: make this work, should check relationships and push to relationships if they exist
    let primaryKey = record[Model.primaryKeyName];
    let relationshipKeys = Object.keys(Model.relationships);
    // TODO: maybe remove this exception by filtering it directly
    let recordsUnknownAttribute = Object.keys(record).find(
      (attribute) =>
        attribute !== "errors" &&
        !Model.columnNames.has(attribute) &&
        !relationshipKeys.includes(attribute)
    );
    if (recordsUnknownAttribute) {
      throw new Error(
        kleur.red(
          `[Memoria] ${Model.name}.push ${Model.primaryKeyName}: ${primaryKey} fails, ${Model.name} definition does not have ${recordsUnknownAttribute} attribute to update`
        )
      );
    }

    let existingModelInCache = this.peek(Model, primaryKey);
    if (!existingModelInCache) {
      let target = cleanRelationships(
        Model,
        this.build(
          Model,
          Array.from(Model.columnNames).reduce((result: QueryObject, attribute: string) => {
            // NOTE: needed for API response shapes
            if (record.hasOwnProperty(attribute)) {
              result[attribute] = record[attribute];
            }

            return result;
          }, {})
        )
      );
      if (!primaryKey) {
        throw new Error(
          kleur.red(
            `[Memoria] ${Model.name}.push(object) object doesnt include the ${
              Model.primaryKeyName
            } primary key. Object: ${inspect(record)}`
          )
        );
      }

      primaryKeyTypeSafetyCheck(Model, primaryKey);

      Model.Cache.push(target as MemoriaModel);

      return target as MemoriaModel;
    }

    return Object.assign(
      existingModelInCache,
      Array.from(Model.columnNames).reduce((result: QueryObject, attribute: string) => {
        // NOTE: needed for API response shapes
        if (record.hasOwnProperty(attribute)) {
          result[attribute] = record[attribute];
        }

        return result;
      }, {})
    ) as MemoriaModel;
  }

  static peek(
    Model: typeof MemoriaModel,
    primaryKey: primaryKey | primaryKey[]
  ): MemoriaModel[] | MemoriaModel | void {
    if (Array.isArray(primaryKey as primaryKey[])) {
      return Array.from(Model.Cache).reduce((result: ModelRef[], model: ModelRef) => {
        const foundModel = (primaryKey as primaryKey[]).includes(model[Model.primaryKeyName])
          ? model
          : null;

        return foundModel ? result.concat([foundModel]) : result;
      }, []) as ModelRef[];
    } else if (typeof primaryKey === "number" || typeof primaryKey === "string") {
      return Array.from(Model.Cache).find(
        (model: ModelRef) => model[Model.primaryKeyName] === primaryKey
      ) as ModelRef | undefined;
    }

    throw new Error(
      kleur.red(`[Memoria] ${Model.name}.find(id) cannot be called without a valid id`)
    );
  }

  static peekBy(Model: typeof MemoriaModel, queryObject: object): MemoriaModel | void {
    if (!queryObject) {
      throw new Error(
        kleur.red(`[Memoria] ${Model.name}.findBy(id) cannot be called without a parameter`)
      );
    }

    let keys = Object.keys(queryObject);

    return Model.Cache.find((model: ModelRef) => comparison(model, queryObject, keys, 0));
  }

  static peekAll(Model: typeof MemoriaModel, queryObject: object = {}): MemoriaModel[] {
    let keys = Object.keys(queryObject);
    if (keys.length === 0) {
      return Array.from(Model.Cache);
    }

    return Array.from(Model.Cache as MemoriaModel[]).filter((model: MemoriaModel) =>
      comparison(model as ModelRef, queryObject, keys, 0)
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

  static async save(
    Model: typeof MemoriaModel,
    model: QueryObject | ModelRefOrInstance
  ): Promise<MemoriaModel> {
    let modelId = model[Model.primaryKeyName];
    if (modelId) {
      let foundModel = await this.find(Model, modelId);

      return foundModel ? await this.update(Model, model) : await this.insert(Model, model);
    }

    return await this.insert(Model, model);
  }

  static async insert(
    Model: typeof MemoriaModel,
    model: QueryObject | ModelRefOrInstance
  ): Promise<MemoriaModel> {
    let target = cleanRelationships(
      Model,
      this.build(
        Model,
        Array.from(Model.columnNames).reduce((result: QueryObject, attribute: string) => {
          if (model.hasOwnProperty(attribute)) {
            result[attribute] = model[attribute];

            return result;
          }

          let defaultValues = Object.assign({}, Config.getDefaultValues(Model, "insert"));
          if (!defaultValues.hasOwnProperty(attribute)) {
            result[attribute] = null;
          } else if (typeof defaultValues[attribute] === "function") {
            result[attribute] = defaultValues[attribute](Model); // TODO: this changed
          } else {
            result[attribute] = defaultValues[attribute];
          }

          return result;
        }, {})
      )
    );
    let primaryKey = (target as ModelRef)[Model.primaryKeyName];

    primaryKeyTypeSafetyCheck(Model, primaryKey);

    if (this.peek(Model, primaryKey)) {
      throw new Error(
        kleur.red(
          `[Memoria] ${Model.name}.insert(record) fails: ${
            Model.primaryKeyName
          } ${primaryKey} already exists in the database! ${Model.name}.insert(${inspect(model)})`
        )
      );
    }

    Model.Cache.push(target as MemoriaModel);

    return target as MemoriaModel;
  }

  static async update(
    Model: typeof MemoriaModel,
    record: ModelRefOrInstance
  ): Promise<MemoriaModel> {
    let primaryKey = record[Model.primaryKeyName];
    if (!primaryKey) {
      throw new Error(
        kleur.red(
          `[Memoria] ${Model.name}.update(record) requires id or uuid primary key to update a record`
        )
      );
    }

    let targetRecord = this.peek(Model, primaryKey);
    if (!targetRecord) {
      throw new Error(
        kleur.red(
          `[Memoria] ${Model.name}.update(record) failed because ${Model.name} with ${Model.primaryKeyName}: ${primaryKey} does not exist`
        )
      );
    }

    // TODO: maybe remove this exception by filtering it directly
    let relationshipKeys = Object.keys(Model.relationships);
    let recordsUnknownAttribute = Object.keys(record).find(
      (attribute) =>
        attribute !== "errors" &&
        !Model.columnNames.has(attribute) &&
        !relationshipKeys.includes(attribute)
    );
    if (recordsUnknownAttribute) {
      throw new Error(
        kleur.red(
          `[Memoria] ${Model.name}.update ${Model.primaryKeyName}: ${primaryKey} fails, ${Model.name} model does not have ${recordsUnknownAttribute} attribute to update`
        )
      );
    }

    let defaultColumnsForUpdate = Config.getDefaultValues(Model, "update");
    return Object.assign(
      targetRecord,
      Object.keys(defaultColumnsForUpdate).reduce((result: QueryObject, keyName) => {
        if (typeof defaultColumnsForUpdate[keyName] === "function") {
          result[keyName] = defaultColumnsForUpdate[keyName].apply(null, [Model]);
        }

        return result;
      }, {}),
      cleanRelationships(Model, record)
    );
  }

  // TODO: HANDLE deleteDate generation
  static unload(Model: typeof MemoriaModel, record: ModelRefOrInstance): MemoriaModel {
    if (Model.Cache.length === 0) {
      throw new Error(
        kleur.red(
          `[Memoria] ${Model.name} has no records in the database to delete. ${
            Model.name
          }.delete(${inspect(record)}) failed`
        )
      );
    } else if (!record) {
      throw new Error(
        kleur.red(
          `[Memoria] ${Model.name}.delete(model) model object parameter required to delete a model`
        )
      );
    }

    let targetRecord = this.peek(Model, record[Model.primaryKeyName]) as ModelRef;
    if (!targetRecord) {
      throw new Error(
        kleur.red(
          `[Memoria] Could not find ${Model.name} with ${Model.primaryKeyName}: ${
            record[Model.primaryKeyName]
          } to delete. ${Model.name}.delete(${inspect(record)}) failed`
        )
      );
    }

    let targetIndex = Model.Cache.indexOf(targetRecord);

    Model.Cache.splice(targetIndex, 1);

    return targetRecord;
  }

  static async delete(
    Model: typeof MemoriaModel,
    record: ModelRefOrInstance
  ): Promise<MemoriaModel> {
    return this.unload(Model, record);
  }

  static async saveAll(
    Model: typeof MemoriaModel,
    models: ModelRefOrInstance[]
  ): Promise<MemoriaModel[]> {
    return await Promise.all(models.map((model) => this.save(Model, model)));
  }

  static async insertAll(
    Model: typeof MemoriaModel,
    models: QueryObject[] | ModelRefOrInstance[]
  ): Promise<MemoriaModel[]> {
    return await Promise.all(models.map((model) => this.insert(Model, model)));
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
    return models.map((model) => this.unload(Model, model));
  }
}

function clearObject(object) {
  for (let key in object) delete object[key];
}

// NOTE: if records were ordered by ID, then there could be performance benefit
function comparison(model: ModelRef, options: QueryObject, keys: string[], index = 0): boolean {
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
