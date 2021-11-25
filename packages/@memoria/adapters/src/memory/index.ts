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
import type {
  RelationshipSummary,
  ModelReference,
  DecoratorBucket,
  ModelBuildOptions,
} from "@memoria/model";

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
        clearObject(Config.Schemas[targetSchemaIndex].target.Serializer.embeds);
        Config.Schemas.splice(targetSchemaIndex, 1);
        delete Config._DB[modelName];
        delete Config._columnNames[modelName];
        delete Config._primaryKeyNameCache[modelName];
        delete Config._defaultValuesCache[modelName];
        delete Config._belongsToColumnNames[modelName];
        delete Config._belongsToPointers[modelName];
        // TODO: this is problematic, doesnt clear other relationship embeds
      }

      return Config;
    }

    clearObject(Config._DB);
    clearObject(Config._columnNames);
    clearObject(Config._primaryKeyNameCache);
    clearObject(Config._defaultValuesCache);
    clearObject(Config._belongsToColumnNames);
    clearObject(Config._belongsToPointers);

    for (let schema of Config.Schemas) {
      // NOTE: this is complex because could hold cyclical references
      // TODO: this only cleans registered data!!
      clearObject(schema.target.Serializer.embeds);
    }
    Config.Schemas.length = 0;

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
    if (targetState && targetState.length > 0) {
      let newTargetState = targetState.map((model: ModelRefOrInstance) =>
        assignDefaultValuesForInsert(model, Model)
      );

      return this.resetCache(Model, newTargetState, options);
    }

    return this.resetCache(Model, targetState, options);
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

    let belongsToRelationships = Model.belongsToRelationships;
    let belongsToRelationshipKeys = Object.keys(belongsToRelationships);
    let belongsToColumnNames = Model.belongsToColumnNames;
    let belongsToPointers = Config.getBelongsToPointers(Model);
    let relationshipSummary = Model.relationshipSummary;

    Object.keys(relationshipSummary).forEach((relationshipName) => {
      // NOTE: do here runtime checks maybe!
      // TODO: do I need castRelationship anymore(?) yes for : 1- getting the relationship still when null
      // NOTE: maybe do this foreignKeyReference
      let cache =
        buildObject && relationshipName in buildObject
          ? // if relationshipProvided just leave it there
            castRelationship(model, relationshipName, Model.relationshipSummary, buildObject)
          : model[relationshipName] || null;
      let isBelongsToRelationship = belongsToRelationshipKeys.includes(relationshipName);
      let relationshipForeignKeyName = isBelongsToRelationship
        ? Config.getBelongsToForeignKey(Model, relationshipName)
        : null;
      let RelationshipClass = Array.isArray(relationshipSummary[relationshipName])
        ? relationshipSummary[relationshipName][0]
        : relationshipSummary[relationshipName];

      if (relationshipForeignKeyName) {
        model[relationshipForeignKeyName] = cache
          ? cache[Model.belongsToRelationships[relationshipName].primaryKeyName] || null
          : null;
      }

      Object.defineProperty(model, relationshipName, {
        configurable: false,
        enumerable: true,
        get() {
          if (isBelongsToRelationship) {
            let primaryKey = this[relationshipForeignKeyName as string];
            if (primaryKey) {
              return (
                RelationshipClass.peek(primaryKey) || cache || RelationshipClass.find(primaryKey)
              );
            }

            return cache || null;
          }

          return cache || null; // TODO: adjust this for hasMany, hasOne, and ManyToMany.
        },
        set(value) {
          if (isBelongsToRelationship) {
            let RelationshipModel = Model.belongsToRelationships[relationshipName];

            cache = value instanceof MemoriaModel ? value : null;

            this[relationshipForeignKeyName as string] = cache
              ? cache[RelationshipModel.primaryKeyName] || null
              : null;
          }
        },
      });
    });

    if (attributeTrackingEnabled(options)) {
      return rewriteColumnPropertyDescriptorsAndAddProvidedValues(model, buildObject);
    }

    return Array.from(Model.columnNames).reduce((result, columnName) => {
      if (Model.belongsToColumnNames.has(columnName)) {
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

    Model.Cache.push(Model.build(target, targetOptions));

    return this.returnWithCacheEviction(target, options); // NOTE: instance here doesnt create revision for "cache", maybe add another revision
  }

  static peek(
    Model: typeof MemoriaModel,
    primaryKey: primaryKey | primaryKey[],
    options?: ModelBuildOptions
  ): MemoriaModel[] | MemoriaModel | void {
    if (Array.isArray(primaryKey as primaryKey[])) {
      return Array.from(Model.Cache).reduce((result: MemoriaModel[], model: MemoriaModel) => {
        let foundModel = (primaryKey as primaryKey[]).includes(model[Model.primaryKeyName])
          ? model
          : null;

        return foundModel
          ? result.concat([this.returnWithCacheEviction(foundModel, options)])
          : result;
      }, []) as MemoriaModel[];
    } else if (typeof primaryKey === "number" || typeof primaryKey === "string") {
      let model = Array.from(Model.Cache).find(
        (model: MemoriaModel) => model[Model.primaryKeyName] === primaryKey
      ) as MemoriaModel | undefined;

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
    let model = Model.Cache.find((model: MemoriaModel) => comparison(model, queryObject, keys, 0));

    return model && this.returnWithCacheEviction(model, options);
  }

  static peekAll(
    Model: typeof MemoriaModel,
    queryObject: object = {},
    options?: ModelBuildOptions
  ): MemoriaModel[] {
    let keys = Object.keys(queryObject);
    if (keys.length === 0) {
      return Model.Cache.map((model) => this.returnWithCacheEviction(model, options));
    }

    let results = Array.from(Model.Cache as MemoriaModel[]).filter((model: MemoriaModel) =>
      comparison(model, queryObject, keys, 0)
    );

    return results.map((model) => this.returnWithCacheEviction(model, options));
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

    Model.Cache.push(Model.build(target, buildOptions));

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

    let defaultColumnsForUpdate = Config.getDefaultValues(Model, "update");

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

  protected static returnWithCacheEviction(
    model: MemoriaModel,
    options: ModelBuildOptions | undefined
  ) {
    if (options && "cache" in options && Number.isInteger(options.cache)) {
      Config.setTimeout(model, options.cache || 0);
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
          let belongsToPointer = Config.getBelongsToPointers(Model)[columnName];
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

  let belongsToPointers = Config.getBelongsToPointers(model.constructor as typeof MemoriaModel);
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
  let defaultValues = Config.getDefaultValues(Model, "insert");

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
