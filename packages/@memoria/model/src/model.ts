// TODO: make Model.build() throw error if model.isBuilt is provided
// TODO: should I change the data structure to allow for better revision storage(?)
// |> store successful build, insert, update, delete actions as revision
// |> make revision data structure like a changeset(?)
// Add errors:[] to the revisionList(?) then could be problematic how the template model.errors work(?) - no maybe not(?) -> this is the question
import { MemoryAdapter } from "@memoria/adapters";
import { underscore } from "inflected";
import { CacheError, ModelError, RuntimeError } from "./errors/index.js";
import Changeset from "./changeset.js";
import { Config, DB } from "./stores/index.js";
import Serializer from "./serializer.js";
import { clearObject, primaryKeyTypeSafetyCheck } from "./utils.js";
import type { RelationshipSummary } from "./stores/config.js";
import type { ModelReference, ModelReferenceShape, RelationshipDefinitionStore } from "./index.js";

type primaryKey = number | string;
type QueryObject = { [key: string]: any };
type ModelRefOrInstance = ModelReference | Model;

interface ModelRelationships {
  [relationshipName: string]: typeof Model;
}

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

  static get Cache(): Model[] {
    return DB.getDB(this);
  }

  static get tableName(): string {
    return underscore(this.name); // TODO: add entity.tableName || underscore(this.name) when feature is available
  }

  static get primaryKeyName(): string {
    return Config.getPrimaryKeyName(this);
  }

  static get primaryKeyType(): "uuid" | "id" {
    return Config.getColumnsMetadata(this)[this.primaryKeyName].generated === "uuid"
      ? "uuid"
      : "id";
  }

  static get columnNames(): Set<string> {
    return Config.getColumnNames(this);
  }

  static get belongsToColumnNames(): Set<string> {
    return Config.getBelongsToColumnNames(this);
  }

  // NOTE: currently this is costly, optimize it in future:
  static get relationshipNames(): Set<string> {
    return new Set(Object.keys(this.relationshipSummary));
  }

  static get relationshipSummary(): RelationshipSummary {
    return Config.relationshipsSummary[this.name];
  }

  static get belongsToRelationships(): ModelRelationships {
    return filterRelationsFromEntity(this, "many-to-one");
  }

  static get hasOneRelationships(): ModelRelationships {
    return filterRelationsFromEntity(this, "one-to-one");
  }

  static get hasManyRelationships(): ModelRelationships {
    return filterRelationsFromEntity(this, "one-to-many");
  }

  static get manyToManyRelationships(): ModelRelationships {
    return filterRelationsFromEntity(this, "many-to-many");
  }

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
      this.relationshipNames.forEach((relationshipName) => {
        model[relationshipName] = record[relationshipName];
      });

      record.#_inTransit = false;
      record.#_isNew = false;
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

    return result;
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

  // transforms strings to datestrings if it is a date column, turns undefined default values to null, doesnt assign default values to an instance
  // could do attribute tracking
  // TODO: test also passing new Model() instance
  static build(buildObject?: QueryObject | Model, options?: ModelBuildOptions): Model {
    let model = this.Adapter.build(this, buildObject, options);

    revisionEnabled(options) &&
      !(buildObject instanceof Model && buildObject.isBuilt) &&
      model.revisionHistory.push(Object.assign({}, model));

    return options && options.freeze ? (Object.freeze(model) as Model) : Object.seal(model);
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

type relationshipType = "many-to-one" | "one-to-many" | "one-to-one" | "many-to-many";

function filterRelationsFromEntity(
  Class: typeof Model,
  relationshipType: relationshipType
): ModelRelationships {
  let relationshipSchema = Config.getRelationshipSchemaDefinitions(
    Class
  ) as RelationshipDefinitionStore;

  return relationshipSchema
    ? Object.keys(relationshipSchema).reduce((result, relationshipPropertyName) => {
        let schema = relationshipSchema[relationshipPropertyName];

        if (schema.type === relationshipType) {
          result[relationshipPropertyName] =
            typeof schema.target === "function" ? schema.target() : schema.target;
        }

        return result;
      }, {})
    : {};
}
