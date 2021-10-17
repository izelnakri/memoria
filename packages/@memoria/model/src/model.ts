import { MemoryAdapter } from "@memoria/adapters";
import { underscore } from "inflected";
import { CacheError, ModelError, RuntimeError } from "./errors/index.js";
import Changeset from "./changeset.js";
import Config from "./config.js";
import Serializer from "./serializer.js";
import { clearObject, primaryKeyTypeSafetyCheck } from "./utils.js";
import type { ModelReference, ModelReferenceShape, RelationshipSchemaDefinition } from "./index.js";

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
  // debug?:
  // tracer?:
  // include?: // NOTE: would be a useful addition for JSONAPIAdapter & GraphQLAdapter
}

const LOCK_PROPERTY = {
  configurable: false,
  enumerable: false,
  writable: false,
};

// NOTE: perhaps make peek and unload methods return a copied object so they can receive ModelBuildOptions,
// also MemoryAdapter find methods call them. So check the performance impact of this change on test suites in future

// cache replaces existing record!, doesnt have defaultValues
export default class Model {
  static Adapter: typeof MemoryAdapter = MemoryAdapter;
  static Error: typeof ModelError = ModelError;
  static Serializer: typeof Serializer = Serializer;

  static get Cache(): Model[] {
    return Config.getDB(this);
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

  static get relationships(): RelationshipSchemaDefinition {
    return Config.getSchema(this).relations;
  }

  static cache(model: ModelRefOrInstance, options: ModelBuildOptions): Model | Model[] {
    if (!model[this.primaryKeyName]) {
      throw new RuntimeError(new Changeset(this.build(model, { isNew: false })), {
        id: null,
        modelName: this.name,
        attribute: this.primaryKeyName,
        message: "doesn't exist",
      });
    }

    primaryKeyTypeSafetyCheck(model, this);

    let cachedModel = this.Adapter.cache(this, model, options);
    if (Object.keys(cachedModel.changes).length > 0) {
      clearObject(cachedModel.changes);

      revisionEnabled(options) && cachedModel.revisionHistory.push(Object.assign({}, cachedModel));
    }

    return cachedModel;
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

  static peek(primaryKey: primaryKey | primaryKey[]): Model | Model[] | void {
    if (!primaryKey) {
      throw new RuntimeError(
        `${this.name}.find(id) or ${this.name}.peek(id) cannot be called without a valid id`
      );
    }

    return this.Adapter.peek(this, primaryKey);
  }

  static peekBy(queryObject: QueryObject): Model | void {
    return this.Adapter.peekBy(this, queryObject);
  }

  static peekAll(queryObject: QueryObject = {}): Model[] {
    return this.Adapter.peekAll(this, queryObject);
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

    clearObject(model.changes);
    revisionEnabled(options) && model.revisionHistory.push(Object.assign({}, model));

    if (record instanceof this) {
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
      record.#_inTransit = false;
      record.#_isDeleted = true;
    }

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

    records.forEach((record) => {
      if (record instanceof this) {
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

    records.forEach((record) => {
      if (!record[this.primaryKeyName]) {
        throw new RuntimeError(
          new Changeset(this.build(record)),
          "$Model.updateAll() called without records having primaryKey"
        );
      }

      primaryKeyTypeSafetyCheck(record, this);
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

    records.forEach((record) => {
      if (record instanceof this) {
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
    // NOTE: sometimes skip this part if its built(?)
    let model = this.Adapter.build(this, buildObject, options);

    revisionEnabled(options) && model.revisionHistory.push(Object.assign({}, model));

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
    let Klass = this.constructor as typeof Model;

    return await Klass.Adapter.find(Klass, this[Klass.primaryKeyName]);
  }
}

function revisionEnabled(options?: ModelBuildOptions) {
  return !options || options.revision !== false;
}

function shouldInsertOrUpdateARecord(
  Klass: typeof Model,
  record: QueryObject | ModelRefOrInstance
): "insert" | "update" {
  if (!record[Klass.primaryKeyName]) {
    return "insert";
  } else if (record instanceof Klass) {
    return record.isNew ? "insert" : "update";
  } else if (Klass.peek(record[Klass.primaryKeyName])) {
    return "update";
  }

  return "insert";
}

function checkProvidedFixtures(Klass: typeof Model, fixtureArray, buildOptions) {
  if (Array.isArray(fixtureArray)) {
    fixtureArray.reduce((primaryKeys: Set<primaryKey>, targetFixture) => {
      primaryKeyTypeSafetyCheck(targetFixture, Klass);

      let primaryKey = targetFixture[Klass.primaryKeyName];
      if (!primaryKey) {
        throw new CacheError(new Changeset(Klass.build(targetFixture, buildOptions)), {
          id: null,
          modelName: Klass.name,
          attribute: Klass.primaryKeyName,
          message: "is missing",
        });
      } else if (primaryKeys.has(primaryKey)) {
        throw new RuntimeError(
          `${Klass.name}.resetCache(records) have duplicate primary key "${primaryKey}" in records`
        );
      }

      return primaryKeys.add(primaryKey);
    }, new Set([]));
  }
}
