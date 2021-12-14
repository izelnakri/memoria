// TODO: deleting a model should delete it from all possible relationships!!

import Decorators from "./decorators/index.js";
import MemoriaModel, {
  Config,
  DB,
  RelationshipConfig,
  RelationshipDB,
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
  RelationshipSummary,
  ModelReference,
  DecoratorBucket,
  ModelBuildOptions,
} from "@memoria/model";

type QueryObject = { [key: string]: any };
type ModelRefOrInstance = ModelReference | MemoriaModel;

// TODO: allow storeing bigint as string due to bigint!! Thats what SQLAdapter does
export default class MemoryAdapter {
  static Decorators: DecoratorBucket = Decorators;

  // TODO: make this directly Class not modelName
  static async resetSchemas(Config, Model?: typeof MemoriaModel): Promise<Config> {
    if (Model) {
      let targetSchemaIndex = Config.Schemas.findIndex(
        (schema) => schema.target.name === Model.name
      );
      if (targetSchemaIndex >= 0) {
        clearObject(Config.Schemas[targetSchemaIndex].target.Serializer.embeds);
        Config.Schemas.splice(targetSchemaIndex, 1);
        DB._DB.delete(Model.name);
        DB._defaultValuesCache.delete(Model.name);
        Config._columnNames.delete(Model.name);
        Config._primaryKeyNameCache.delete(Model.name);
        RelationshipConfig._belongsToColumnNames.delete(Model.name);
        RelationshipConfig._belongsToPointers.delete(Model.name);
        // TODO: this is problematic, doesnt clear other relationship embeds
      }

      return Config;
    }

    DB._DB.clear();
    DB._defaultValuesCache.clear();
    Config._columnNames.clear();
    Config._primaryKeyNameCache.clear();
    RelationshipConfig._belongsToColumnNames.clear();
    RelationshipConfig._belongsToPointers.clear();

    for (let schema of Config.Schemas) {
      // NOTE: this is complex because could hold cyclical references
      // TODO: this only cleans registered data!!
      clearObject(schema.target.Serializer.embeds);
    }

    Config.Schemas.length = 0;

    return Config;
  }

  static resetCache(
    Model: typeof MemoriaModel,
    targetState?: ModelRefOrInstance[],
    options?: ModelBuildOptions
  ): MemoriaModel[] {
    Model.Cache.clear();

    if (targetState) {
      targetState.forEach((fixture) => this.cache(Model, fixture, options));
    }

    return Array.from(Model.Cache.values()); // NOTE: This is a shallow copy, could be problematic
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

  static build(
    Model: typeof MemoriaModel,
    buildObject?: QueryObject | MemoriaModel,
    options?: ModelBuildOptions
  ) {
    if (buildObject instanceof Model) {
      if (!buildObject.isBuilt) {
        throw new Error(
          "You should not provide an instantiated but not built model to $Model.build(model)"
        );
      } else if (options && options.copy === false) {
        return buildObject;
      }
    }

    let model = new Model(options); // NOTE: this could be change to only on { copy: true } and make it mutate on other cases
    if (buildObject && buildObject.revisionHistory) {
      buildObject.revisionHistory.forEach((revision) => {
        model.revisionHistory.push({ ...revision });
      });
    }
    if (buildObject && buildObject.changes) {
      Object.keys(buildObject.changes).forEach((key) => {
        model.changes[key] = buildObject.changes[key];
      });
    }

    let relationshipSummary = Model.relationshipSummary;

    Object.keys(relationshipSummary).forEach((relationshipName) => {
      RelationshipConfig.getBelongsToColumnNames(Model); // NOTE: this creates Model.belongsToColumnNames once, which is needed for now until static { } Module init closure
      // NOTE: do here runtime checks maybe!
      // TODO: do I need castRelationship anymore(?) yes for : 1- getting the relationship still when null

      RelationshipDB.set(
        model,
        relationshipName,
        buildObject && relationshipName in buildObject
          ? // if relationshipProvided just leave it there
            castRelationship(model, relationshipName, Model.relationshipSummary, buildObject)
          : model[relationshipName] || null
      );

      Object.defineProperty(model, relationshipName, {
        configurable: false,
        enumerable: true,
        get() {
          return RelationshipDB.get(model, relationshipName);
        },
        set(value) {
          return RelationshipDB.set(
            model,
            relationshipName,
            value instanceof MemoriaModel ? value : null
          );
        },
      });
    });

    if (attributeTrackingEnabled(options)) {
      return rewriteColumnPropertyDescriptorsAndAddProvidedValues(model, buildObject);
    }

    let belongsToColumnNames = Model.belongsToColumnNames;
    let belongsToPointers = RelationshipConfig.getBelongsToPointers(Model);

    return Array.from(Model.columnNames).reduce((result, columnName) => {
      if (belongsToColumnNames.has(columnName)) {
        let cache = transformModelForBuild(model, columnName, buildObject);
        let belongsToPointer = belongsToPointers[columnName];

        Object.defineProperty(model, columnName, {
          configurable: false,
          enumerable: true,
          get() {
            return cache;
          },
          set(value) {
            if (this[columnName] === value) {
              return;
            }

            cache = value === undefined ? null : value;

            if (belongsToColumnNames.has(columnName)) {
              let relationship = this[belongsToPointer.relationshipName];
              if (
                relationship &&
                !relationship[belongsToPointer.relationshipClass.primaryKeyName]
              ) {
                return;
              }

              this[belongsToPointer.relationshipName] =
                value === null
                  ? null
                  : tryGettingRelationshipFromPrimaryKey(belongsToPointer.relationshipClass, value);
            }
          },
        });

        return result;
      }

      result[columnName] = transformModelForBuild(result, columnName, buildObject);

      return result;
    }, model);
  }

  static cache(
    Model: typeof MemoriaModel,
    record: ModelRefOrInstance,
    options?: ModelBuildOptions
  ): MemoriaModel {
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

      return this.returnWithCacheEviction(tryToRevision(model, options), options);
    }

    let target = Model.build(record, targetOptions); // NOTE: pure object here creates no extra revision for "insert" just "build"

    Model.Cache.set(target[Model.primaryKeyName], Model.build(target, targetOptions));

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

function rewriteColumnPropertyDescriptorsAndAddProvidedValues(
  model: MemoriaModel,
  buildObject?: QueryObject | MemoriaModel
) {
  let Model = model.constructor as typeof MemoriaModel;
  // buildObject iteration, or nullifying
  // set relationships if provided
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

        cache = value === undefined ? null : value;

        if (this.revision[columnName] === cache) {
          delete this.changes[columnName];
        } else {
          Object.assign(this.changes, { [columnName]: cache });
        }

        this.errors.forEach((error, errorIndex) => {
          if (error.attribute === columnName) {
            this.errors.splice(errorIndex, 1);
          }
        });

        if (Model.belongsToColumnNames.has(columnName)) {
          let belongsToPointer = RelationshipConfig.getBelongsToPointers(Model)[columnName];
          let relationship = this[belongsToPointer.relationshipName];
          if (relationship && !relationship[belongsToPointer.relationshipClass.primaryKeyName]) {
            return;
          }

          this[belongsToPointer.relationshipName] =
            cache === null
              ? null
              : tryGettingRelationshipFromPrimaryKey(belongsToPointer.relationshipClass, cache);
        }
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

function castRelationship(
  model: MemoriaModel,
  relationshipName: string,
  relationshipSummary: RelationshipSummary,
  buildObject: QueryObject | MemoriaModel
) {
  // NOTE: MAKE this array or single object-aware
  if (relationshipName in buildObject) {
    return buildObject[relationshipName] || null;
  } else if (Array.isArray(relationshipSummary[relationshipName])) {
    return null;
  }

  let belongsToPointers = RelationshipConfig.getBelongsToPointers(
    model.constructor as typeof MemoriaModel
  );
  let relationshipForeignKeyName = Object.keys(belongsToPointers).find(
    (belongsToColumnName) =>
      belongsToPointers[belongsToColumnName].relationshipName === relationshipName
  ) as string;

  return relationshipForeignKeyName
    ? tryGettingRelationshipFromPrimaryKey(
        belongsToPointers[relationshipForeignKeyName].relationshipClass,
        model[relationshipForeignKeyName]
      )
    : null;
}

function tryGettingRelationshipFromPrimaryKey(
  RelationshipClass: typeof MemoriaModel,
  primaryKey: any
) {
  if (!primaryKey) {
    return null;
  }

  return RelationshipClass.peek(primaryKey) || RelationshipClass.find(primaryKey);
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
