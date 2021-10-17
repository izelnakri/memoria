import Decorators from "./decorators/index.js";
import MemoriaModel, {
  Config,
  Changeset,
  DeleteError,
  InsertError,
  RuntimeError,
  UpdateError,
  transformValue,
  clearObject,
} from "@memoria/model";
import type { ModelReference, DecoratorBucket, ModelBuildOptions } from "@memoria/model";

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

  static async resetForTests(
    Config,
    modelName?: string,
    options?: ModelBuildOptions
  ): Promise<Config> {
    if (modelName) {
      Config.Schemas[modelName].target.resetCache();
    } else {
      Config.Schemas.forEach((schema) => this.resetCache(schema.target, [], options));
    }

    return Config;
  }

  static resetCache(
    Model: typeof MemoriaModel,
    targetState?: ModelRefOrInstance[],
    options?: ModelBuildOptions
  ): MemoriaModel[] {
    Model.Cache.length = 0;

    if (targetState) {
      targetState.forEach((fixture) => this.cache(Model, fixture, options));
    }

    return Model.Cache;
  }

  static async resetRecords(
    Model: typeof MemoriaModel,
    targetState?: ModelRefOrInstance[],
    options?: ModelBuildOptions
  ): Promise<MemoriaModel[]> {
    return this.resetCache(Model, targetState, options);
  }

  static build(
    Model: typeof MemoriaModel,
    buildObject?: QueryObject | MemoriaModel,
    options?: ModelBuildOptions
  ) {
    if (buildObject instanceof Model && buildObject.isBuilt) {
      return buildObject;
    } else if (buildObject instanceof Model) {
      throw new Error(
        "You should not provide an instantiated but not built model to $Model.build(model)"
      );
    }

    let model = new Model(options);
    if (attributeTrackingEnabled(options)) {
      return rewriteColumnPropertyDescriptorsAndAddProvidedValues(model, buildObject);
    }

    return Array.from(Model.columnNames).reduce((result, keyName) => {
      result[keyName] = transformModelForBuild(result, keyName, buildObject);

      return result;
    }, model);
  }

  static cache(
    Model: typeof MemoriaModel,
    record: ModelRefOrInstance,
    options?: ModelBuildOptions
  ): MemoriaModel {
    // TODO: make this work better, should check relationships and push to relationships if they exist
    let existingModelInCache = this.peek(
      Model,
      record[Model.primaryKeyName]
    ) as MemoriaModel | void;
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

      return model;
    }

    let target =
      record instanceof Model
        ? record
        : cleanRelationships(
            Model,
            Model.build(record, Object.assign(options || {}, { isNew: false }))
          );

    Model.Cache.push(target as MemoriaModel);

    return target as MemoriaModel;
  }

  static peek(
    Model: typeof MemoriaModel,
    primaryKey: primaryKey | primaryKey[]
  ): MemoriaModel[] | MemoriaModel | void {
    if (Array.isArray(primaryKey as primaryKey[])) {
      return Array.from(Model.Cache).reduce((result: MemoriaModel[], model: MemoriaModel) => {
        let foundModel = (primaryKey as primaryKey[]).includes(model[Model.primaryKeyName])
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
    primaryKey: primaryKey | primaryKey[],
    _options?: ModelBuildOptions
  ): Promise<MemoriaModel[] | MemoriaModel | void> {
    return this.peek(Model, primaryKey);
  }

  static async findBy(
    Model: typeof MemoriaModel,
    queryObject: object,
    _options?: ModelBuildOptions
  ): Promise<MemoriaModel | void> {
    return this.peekBy(Model, queryObject);
  }

  static async findAll(
    Model: typeof MemoriaModel,
    queryObject: object = {},
    _options?: ModelBuildOptions
  ): Promise<MemoriaModel[] | void> {
    return this.peekAll(Model, queryObject);
  }

  static async insert(
    Model: typeof MemoriaModel,
    model: QueryObject | ModelRefOrInstance,
    options?: ModelBuildOptions
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
        Object.assign(options || {}, { isNew: false })
      )
    );

    if (this.peek(Model, target[Model.primaryKeyName])) {
      throw new InsertError(new Changeset(target), {
        id: target[Model.primaryKeyName],
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
    record: QueryObject | ModelRefOrInstance,
    _options?: ModelBuildOptions
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

    let defaultColumnsForUpdate = Config.getDefaultValues(Model, "update");
    return Object.assign(
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

    let targetIndex = Model.Cache.indexOf(targetRecord);

    Model.Cache.splice(targetIndex, 1);

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
      Model.Cache.length = 0;

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
}

function attributeTrackingEnabled(options?: ModelBuildOptions) {
  return !options || options.revision !== false;
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

function rewriteColumnPropertyDescriptorsAndAddProvidedValues(
  model: MemoriaModel,
  buildObject?: QueryObject | MemoriaModel
) {
  let Model = model.constructor as typeof MemoriaModel;
  Array.from(Model.columnNames).forEach((columnName) => {
    let cache = transformModelForBuild(model, columnName, buildObject);

    Object.defineProperty(model, columnName, {
      configurable: false,
      enumerable: true,
      get() {
        return cache;
      },
      set(value) {
        if (this[columnName] === value) {
          return;
        } else if (
          value instanceof Date &&
          this[columnName] &&
          this[columnName].toJSON() === value.toJSON()
        ) {
          return;
        }

        value = value === undefined ? null : value;
        if (this.revision[columnName] === value) {
          delete this.changes[columnName];
        } else {
          Object.assign(this.changes, { [columnName]: value });
        }

        this.errors.forEach((error, errorIndex) => {
          if (error.attribute === columnName) {
            this.errors.splice(errorIndex, 1);
          }
        });

        cache = value;
      },
    });
  });

  return model;
}

function transformModelForBuild(
  model: MemoriaModel,
  keyName: string,
  buildObject?: QueryObject | MemoriaModel
) {
  return buildObject && keyName in buildObject
    ? transformValue(model.constructor as typeof MemoriaModel, keyName, buildObject[keyName])
    : model[keyName] || null;
}
