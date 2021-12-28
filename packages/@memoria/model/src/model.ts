// TODO: make Model.build() throw error if model.isBuilt is provided
// TODO: should I change the data structure to allow for better revision storage(?)
// |> store successful build, insert, update, delete actions as revision
// |> make revision data structure like a changeset(?)
// Add errors:[] to the revisionList(?) then could be problematic how the template model.errors work(?) - no maybe not(?) -> this is the question
import { MemoryAdapter } from "@memoria/adapters";
import { underscore } from "inflected";
import { CacheError, ModelError, RuntimeError } from "./errors/index.js";
import { Schema, DB, RelationshipSchema, RelationshipDB } from "./stores/index.js";
import Changeset from "./changeset.js";
import Serializer, { transformValue } from "./serializer.js";
import { clearObject, primaryKeyTypeSafetyCheck } from "./utils.js";
import type { ModelReference, ModelReferenceShape, RelationshipType } from "./index.js";

type primaryKey = number | string;
type QueryObject = { [key: string]: any };
type ModelRefOrInstance = ModelReference | Model;

interface ModelInstantiateOptions {
  isNew?: boolean;
  isDeleted?: boolean;
}

export interface ModelBuildOptions extends ModelInstantiateOptions {
  freeze?: boolean;
  revision?: boolean;
  cache?: number;
  copy?: boolean; // NOTE: it copies by default
  // debug?:
  // tracer?:
  // include?: // NOTE: would be a useful addition for JSONAPIAdapter & GraphQLAdapter
}

// NOTE: maybe add embed option? for CRUDOptions

const LOCK_PROPERTY = {
  configurable: false,
  enumerable: false,
  writable: false,
};

// NOTE: perhaps make peek and unload methods return a copied object so they can receive ModelBuildOptions,
// also MemoryAdapter find methods call them. So check the performance impact of this change on test suites in future

// cache replaces existing record!, doesnt have defaultValues
// revision strategy, create one revision for: build -> insert, update(if it updates with changes)
// there is also provided model and returned model on crud
export default class Model {
  static Adapter: typeof MemoryAdapter = MemoryAdapter;
  static Error: typeof ModelError = ModelError;
  static Serializer: typeof Serializer = Serializer;
  static DEBUG = { Schema, DB, RelationshipSchema, RelationshipDB };

  static get Cache() {
    return DB.getDB(this);
  }

  static get tableName(): string {
    return underscore(this.name); // TODO: add entity.tableName || underscore(this.name) when feature is available
  }

  static get primaryKeyName(): string {
    return Schema.getPrimaryKeyName(this);
  }

  static get primaryKeyType(): "uuid" | "id" {
    return Schema.getColumnsMetadataFrom(this)[this.primaryKeyName].generated === "uuid"
      ? "uuid"
      : "id";
  }

  static get columnNames(): Set<string> {
    return Schema.getColumnNames(this);
  }

  static get relationshipNames(): Set<string> {
    return new Set(Object.keys(RelationshipSchema.getRelationshipTable(this)));
  }

  static getRelationshipTable(relationshipType?: RelationshipType) {
    return RelationshipSchema.getRelationshipTable(this, relationshipType);
  }

  // transforms strings to datestrings if it is a date column, turns undefined default values to null, doesnt assign default values to an instance
  // could do attribute tracking
  // TODO: test also passing new Model() instance
  // TODO: setPersistedRecords should be done here, (maybe optimize it for multiple calls in one)
  static build(buildObject: QueryObject | Model = {}, options?: ModelBuildOptions) {
    if (buildObject instanceof this) {
      if (!buildObject.isBuilt) {
        throw new Error(
          "You should not provide an instantiated but not built model to $Model.build(model)"
        );
      } else if (options && options.copy === false) {
        return buildObject;
      }
    }

    let model = new this(options); // NOTE: this could be changed to only on { copy: true } and make it mutate on other cases
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

    if (model[this.primaryKeyName]) {
      RelationshipDB.getModelReferenceFor(this, model[this.primaryKeyName]).add(model);
    }

    let belongsToColumnNames = RelationshipSchema.getBelongsToColumnNames(this); // NOTE: this creates Model.belongsToColumnNames once, which is needed for now until static { } Module init closure

    Object.keys(RelationshipSchema.getRelationshipTable(this)).forEach((relationshipName) => {
      if (buildObject && relationshipName in buildObject) {
        RelationshipDB.set(model, relationshipName, buildObject[relationshipName]);
      }

      Object.defineProperty(model, relationshipName, {
        configurable: false,
        enumerable: true,
        get() {
          return RelationshipDB.get(model, relationshipName);
        },
        set(value) {
          return RelationshipDB.set(model, relationshipName, value);
        },
      });
    });

    if (attributeTrackingEnabled(options)) {
      return rewriteColumnPropertyDescriptorsAndAddProvidedValues(model, options, buildObject);
    }

    let belongsToColumnTable = RelationshipSchema.getBelongsToColumnTable(this);

    Array.from(this.columnNames).forEach((columnName) => {
      if (belongsToColumnNames.has(columnName)) {
        let cache = getTransformedValue(model, columnName, buildObject);
        let { relationshipName, RelationshipClass } = belongsToColumnTable[columnName];

        return Object.defineProperty(model, columnName, {
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

            if (
              this[relationshipName] &&
              !this[relationshipName][RelationshipClass.primaryKeyName]
            ) {
              return;
            }

            this[relationshipName] =
              cache === null
                ? null
                : RelationshipClass.peek(cache) || RelationshipClass.find(cache);
          },
        });
      }

      model[columnName] = getTransformedValue(model, columnName, buildObject);
    });

    return revisionAndLockModel(model, options, buildObject);
  }

  // NOTE: this proxies to adapter because JSONAPIAdapter could do its own for example, even when 2nd arg is model instance not payload
  // That payload parsing can happen in the Adapter.cache() the method can recursively call itself & handle payloads in 2nd arg
  static cache(model: ModelRefOrInstance, options?: ModelBuildOptions): Model {
    if (!model[this.primaryKeyName]) {
      throw new RuntimeError(new Changeset(this.build(model, { isNew: false })), {
        id: null,
        modelName: this.name,
        attribute: this.primaryKeyName,
        message: "doesn't exist",
      });
    }

    primaryKeyTypeSafetyCheck(model, this);

    // NOTE: this creates revision only for update and if model is not an instance, maybe it shouldnt create on every update when no change is there

    return this.Adapter.cache(this, model, options);
  }

  static resetCache(targetState?: ModelRefOrInstance[], options?: ModelBuildOptions): Model[] {
    checkProvidedFixtures(this, targetState, options);

    return this.Adapter.resetCache(this, targetState, options);
  }

  static async resetRecords(
    targetState?: ModelRefOrInstance[],
    options?: ModelBuildOptions
  ): Promise<Model[]> {
    checkProvidedFixtures(this, targetState, options);

    return await this.Adapter.resetRecords(this, targetState, options);
  }

  static peek(
    primaryKey: primaryKey | primaryKey[],
    options?: ModelBuildOptions
  ): Model | Model[] | void {
    if (!primaryKey) {
      throw new RuntimeError(
        `${this.name}.find(id) or ${this.name}.peek(id) cannot be called without a valid id`
      );
    }

    return this.Adapter.peek(this, primaryKey, options);
  }

  static peekBy(queryObject: QueryObject, options?: ModelBuildOptions): Model | void {
    return this.Adapter.peekBy(this, queryObject, options);
  }

  static peekAll(queryObject: QueryObject = {}, options?: ModelBuildOptions): Model[] {
    return this.Adapter.peekAll(this, queryObject, options);
  }

  // TODO: this can perhaps extend the cache time(?) and might still have revision control
  static async find(
    primaryKey: primaryKey | primaryKey[],
    options?: ModelBuildOptions
  ): Promise<Model | Model[] | void> {
    return await this.Adapter.find(this, primaryKey, options);
  }

  static async findBy(
    queryObject: QueryObject,
    options?: ModelBuildOptions
  ): Promise<Model | void> {
    return await this.Adapter.findBy(this, queryObject, options);
  }

  static async findAll(
    queryObject: QueryObject = {},
    options?: ModelBuildOptions
  ): Promise<Model[] | void> {
    return await this.Adapter.findAll(this, queryObject, options);
  }

  static async insert(
    record?: QueryObject | ModelRefOrInstance,
    options?: ModelBuildOptions
  ): Promise<Model> {
    if (record && record[this.primaryKeyName]) {
      primaryKeyTypeSafetyCheck(record, this);
    }

    this.setRecordInTransit(record);

    let model = await this.Adapter.insert(this, record || {}, options);

    if (record instanceof this) {
      record.#_inTransit = false;
      record.#_isNew = false;

      // TODO: these relationship syncs needs to change for insert, update, delete:
      this.relationshipNames.forEach((relationshipName) => {
        // TODO: maybe all except hasMany as model has no hasMany at the beginning
        record[relationshipName] = model[relationshipName];
        // model can have the same relationship as record
      });

      clearObject(record.changes);

      revisionEnabled(options) && model.revisionHistory.push(Object.assign({}, record));
    }

    return model;
  }

  // cacheTimeout clearing absolutely needed for update(then find should also be able to change it)
  static async update(record: ModelRefOrInstance, options?: ModelBuildOptions): Promise<Model> {
    if (!record || !record[this.primaryKeyName]) {
      throw new RuntimeError(
        new Changeset(this.build(record)),
        "$Model.update() called without a record with primaryKey"
      );
    }

    primaryKeyTypeSafetyCheck(record, this);

    this.setRecordInTransit(record);

    let model = await this.Adapter.update(this, record, options);

    if (record instanceof this) {
      this.relationshipNames.forEach((relationshipName) => {
        model[relationshipName] = record[relationshipName];
      });
      this.unsetRecordInTransit(record);

      clearObject(record.changes);

      revisionEnabled(options) && record.revisionHistory.push(Object.assign({}, record));
    }

    return model;
  }

  static async save(
    record: QueryObject | ModelRefOrInstance,
    options?: ModelBuildOptions
  ): Promise<Model> {
    return shouldInsertOrUpdateARecord(this, record) === "insert"
      ? await this.Adapter.insert(this, record, options)
      : await this.Adapter.update(this, record, options);
  }

  static unload(record: ModelRefOrInstance, options?: ModelBuildOptions): Model {
    if (!record) {
      throw new RuntimeError(
        new Changeset(this.build(record)),
        "unload() called without a valid record"
      );
    }

    // TODO: reset model instance cache of the related records

    return this.Adapter.unload(this, record, options);
  }

  static async delete(record: ModelRefOrInstance, options?: ModelBuildOptions): Promise<Model> {
    if (!record || !record[this.primaryKeyName]) {
      throw new RuntimeError(
        new Changeset(this.build(record)),
        "$Model.delete() called without a record with primaryKey"
      );
    }

    primaryKeyTypeSafetyCheck(record, this);

    this.setRecordInTransit(record);

    let result = await this.Adapter.delete(this, record, options);

    if (record instanceof this) {
      this.relationshipNames.forEach((relationshipName) => {
        result[relationshipName] = record[relationshipName];
      });
      record.#_inTransit = false;
      record.#_isDeleted = true;
    }

    // hasOne, hasMany, oneToOne, ManyToMany
    // TODO: reset model instance cache of the related records

    return RelationshipDB.delete(result);
  }

  static async saveAll(
    records: QueryObject[] | ModelRefOrInstance[],
    options?: ModelBuildOptions
  ): Promise<Model[]> {
    return records.every((record) => shouldInsertOrUpdateARecord(this, record) === "update")
      ? await this.Adapter.updateAll(this, records as ModelRefOrInstance[], options)
      : await this.Adapter.insertAll(this, records, options);
  }

  static async insertAll(records: QueryObject[], options?: ModelBuildOptions): Promise<Model[]> {
    if (!records || records.length === 0) {
      throw new RuntimeError("$Model.insertAll(records) called without records");
    }

    try {
      records.reduce((result, record) => {
        if (record[this.primaryKeyName]) {
          primaryKeyTypeSafetyCheck(record, this);

          let primaryKey = record[this.primaryKeyName] as primaryKey;
          if (primaryKey && result.includes(primaryKey)) {
            throw new RuntimeError(
              `${this.name}.insertAll(records) have duplicate primary key "${primaryKey}" to insert`
            );
          }

          result.push(primaryKey);
        }

        this.setRecordInTransit(record);

        return result;
      }, []);
    } catch (error) {
      records.forEach((record) => this.unsetRecordInTransit(record));
      throw error;
    }

    let models = await this.Adapter.insertAll(this, records, options);

    records.forEach((record, index) => {
      if (record instanceof this) {
        this.relationshipNames.forEach((relationshipName) => {
          models[index][relationshipName] = record[relationshipName];
        });
        this.unsetRecordInTransit(record);
        clearObject(record.changes);

        revisionEnabled(options) && record.revisionHistory.push(Object.assign({}, record));
      }
    });

    return models;
  }

  static async updateAll(
    records: ModelRefOrInstance[],
    options?: ModelBuildOptions
  ): Promise<Model[]> {
    if (!records || records.length === 0) {
      throw new RuntimeError("$Model.updateAll(records) called without records");
    }

    records.forEach((record, index) => {
      if (!record[this.primaryKeyName]) {
        throw new RuntimeError(
          new Changeset(this.build(record)),
          "$Model.updateAll() called without records having primaryKey"
        );
      }
      primaryKeyTypeSafetyCheck(record, this);

      this.relationshipNames.forEach((relationshipName) => {
        models[index][relationshipName] = record[relationshipName];
      });
      this.setRecordInTransit(record);
    });

    let models = await this.Adapter.updateAll(this, records, options);

    records.forEach((record) => {
      if (record instanceof this) {
        this.unsetRecordInTransit(record);
        clearObject(record.changes);
        revisionEnabled(options) && record.revisionHistory.push(Object.assign({}, record));
      }
    });

    return models;
  }

  static unloadAll(records?: ModelRefOrInstance[], options?: ModelBuildOptions): Model[] {
    return this.Adapter.unloadAll(this, records, options);
  }

  static async deleteAll(
    records: ModelRefOrInstance[],
    options?: ModelBuildOptions
  ): Promise<Model[]> {
    if (!records || records.length === 0) {
      throw new RuntimeError("$Model.deleteAll(records) called without records");
    }

    records.forEach((record) => {
      if (!record[this.primaryKeyName]) {
        throw new RuntimeError(
          new Changeset(this.build(record)),
          "$Model.deleteAll() called without records having primaryKey"
        );
      }

      primaryKeyTypeSafetyCheck(record, this);

      this.setRecordInTransit(record);
    });

    let models = await this.Adapter.deleteAll(this, records, options);

    records.forEach((record, index) => {
      if (record instanceof this) {
        this.relationshipNames.forEach((relationshipName) => {
          models[index][relationshipName] = record[relationshipName];
        });
        this.unsetRecordInTransit(record);
        record.isDeleted = true;
      }
    });

    return models;
  }

  static async count(options: QueryObject): Promise<number> {
    return await this.Adapter.count(this, options);
  }

  static serializer(objectOrArray: Model | Model[]) {
    if (!objectOrArray) {
      return;
    } else if (Array.isArray(objectOrArray)) {
      return (objectOrArray as Array<Model>).map((object) =>
        this.Serializer.serialize(this, object)
      );
    }

    return this.Serializer.serialize(this, objectOrArray as Model);
  }

  static serialize(object: Model) {
    return this.Serializer.serialize(this, object as Model);
  }

  private static setRecordInTransit(record) {
    if (record instanceof this) {
      record.#_inTransit = true;
    }
  }

  private static unsetRecordInTransit(record) {
    if (record instanceof this) {
      record.#_inTransit = false;
    }
  }

  constructor(options?: ModelInstantiateOptions) {
    Object.defineProperty(this, "changes", LOCK_PROPERTY);
    Object.defineProperty(this, "revisionHistory", LOCK_PROPERTY);

    if (options) {
      if ("isNew" in options) {
        this.#_isNew = options.isNew as boolean;
      }
      if ("isDeleted" in options) {
        this.#_isDeleted = options.isDeleted as boolean;
      }
    }
  }

  changes: QueryObject = Object.create(null); // NOTE: instead I could also create it between revision / instance diff
  revisionHistory: ModelReferenceShape[] = [];

  get revision() {
    return this.revisionHistory[this.revisionHistory.length - 1] || Object.create(null);
  }

  #_errors: ModelError[] = [];
  get errors(): ModelError[] {
    return this.#_errors;
  }
  set errors(newError: ModelError[]) {
    this.#_errors = newError;
  }

  #_isNew = true;
  get isNew() {
    return this.#_isNew;
  }

  get isBuilt() {
    return Object.isSealed(this);
  }

  get isPersisted() {
    return !this.isNew; // NOTE: change this to !this.isDirty && !this.isNew;
  }

  #_isDeleted = false;
  get isDeleted() {
    return this.#_isDeleted;
  }
  set isDeleted(value) {
    this.#_isDeleted = !!value;
  }

  #_inTransit = false;
  get inTransit() {
    return this.#_inTransit;
  }

  get isDirty() {
    return Object.keys(this.changes).length > 0;
  }

  get changeset() {
    return new Changeset(this, this.changes);
  }

  get fetchedRelationships() {
    let Class = this.constructor as typeof Model;
    let relationshipTable = RelationshipSchema.getRelationshipTable(Class);

    return Object.keys(relationshipTable).filter((relationshipName) => {
      return RelationshipDB[
        `instanceRecords${relationshipTable[relationshipName].relationshipType}Cache`
      ]
        .get(`${Class.name}:${relationshipName}`)
        ?.has(this);
    });
  }

  changedAttributes() {
    if (this.revisionHistory.length === 0) {
      throw new RuntimeError(
        "Tried to call model.changedAttributes() on untracked model, use $Model.build()"
      );
    }

    return Object.keys(this.changes).reduce((result, keyName) => {
      return Object.assign(result, { [keyName]: [this.revision[keyName], this.changes[keyName]] });
    }, {});
  }

  rollbackAttributes() {
    if (this.revisionHistory.length === 0) {
      throw new RuntimeError(
        "Tried to call model.rollbackAttributes() on untracked model, use $Model.build()"
      );
    }

    return Object.keys(this.changes).reduce((result, columnName) => {
      result[columnName] = this.revision[columnName];
      return result;
    }, this);
  }

  toObject() {
    return Array.from((this.constructor as typeof Model).columnNames).reduce(
      (result, columnName) => {
        result[columnName] = this.revision[columnName];
        return result;
      },
      Object.create(null)
    );
  }

  toJSON() {
    return (this.constructor as typeof Model).Serializer.serialize(
      this.constructor as typeof Model,
      this
    );
  }

  async reload() {
    let Class = this.constructor as typeof Model;

    return await Class.Adapter.find(Class, this[Class.primaryKeyName]);
  }
}

function revisionEnabled(options?: ModelBuildOptions) {
  return !options || options.revision !== false;
}

function shouldInsertOrUpdateARecord(
  Class: typeof Model,
  record: QueryObject | ModelRefOrInstance
): "insert" | "update" {
  if (!record[Class.primaryKeyName]) {
    return "insert";
  } else if (record instanceof Class) {
    return record.isNew ? "insert" : "update";
  } else if (Class.peek(record[Class.primaryKeyName])) {
    return "update";
  }

  return "insert";
}

function checkProvidedFixtures(Class: typeof Model, fixtureArray, buildOptions) {
  if (Array.isArray(fixtureArray)) {
    fixtureArray.reduce((primaryKeys: Set<primaryKey>, targetFixture) => {
      primaryKeyTypeSafetyCheck(targetFixture, Class);

      let primaryKey = targetFixture[Class.primaryKeyName];
      if (!primaryKey) {
        throw new CacheError(new Changeset(Class.build(targetFixture, buildOptions)), {
          id: null,
          modelName: Class.name,
          attribute: Class.primaryKeyName,
          message: "is missing",
        });
      } else if (primaryKeys.has(primaryKey)) {
        throw new RuntimeError(
          `${Class.name}.resetCache(records) have duplicate primary key "${primaryKey}" in records`
        );
      }

      return primaryKeys.add(primaryKey);
    }, new Set([]));
  }
}

function attributeTrackingEnabled(options?: ModelBuildOptions) {
  return !options || options.revision !== false;
}

function rewriteColumnPropertyDescriptorsAndAddProvidedValues(
  model: Model,
  options,
  buildObject?: QueryObject | Model
) {
  let Class = model.constructor as typeof Model;
  // buildObject iteration, or nullifying
  // set relationships if provided
  Array.from(Class.columnNames).forEach((columnName) => {
    let cache = getTransformedValue(model, columnName, buildObject);

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
          this.changes[columnName] = cache;
        }

        this.errors.forEach((error, errorIndex) => {
          if (error.attribute === columnName) {
            this.errors.splice(errorIndex, 1);
          }
        });

        if (RelationshipSchema.getBelongsToColumnNames(Class).has(columnName)) {
          let { RelationshipClass, relationshipName } = RelationshipSchema.getBelongsToColumnTable(
            Class
          )[columnName];

          if (this[relationshipName] && !this[relationshipName][RelationshipClass.primaryKeyName]) {
            return;
          }

          this[relationshipName] =
            cache === null ? null : RelationshipClass.peek(cache) || RelationshipClass.find(cache);
        }
      },
    });
  });

  return revisionAndLockModel(model, options, buildObject);
}

function getTransformedValue(model: Model, keyName: string, buildObject?: QueryObject | Model) {
  return buildObject && keyName in buildObject
    ? transformValue(model.constructor as typeof Model, keyName, buildObject[keyName])
    : model[keyName] || null;
}

function revisionAndLockModel(model, options?, buildObject?) {
  revisionEnabled(options) &&
    !(buildObject instanceof Model && buildObject.isBuilt) &&
    model.revisionHistory.push(Object.assign({}, model));

  return options && options.freeze ? (Object.freeze(model) as Model) : Object.seal(model);
}
