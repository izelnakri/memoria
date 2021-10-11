import { MemoryAdapter } from "@memoria/adapters";
import { underscore } from "inflected";
import { ModelError, RuntimeError } from "./errors/index.js";
import Changeset from "./changeset.js";
import Config from "./config.js";
import Serializer, { transformValue } from "./serializer.js";
import { clearObject, primaryKeyTypeSafetyCheck } from "./utils.js";
import type { ModelReference, ModelReferenceShape, RelationshipSchemaDefinition } from "./index.js";

type primaryKey = number | string;
type QueryObject = { [key: string]: any };
type ModelRefOrInstance = ModelReference | Model;

interface ModelInstantiateOptions {
  isNew?: boolean;
  isDeleted?: boolean;
}

export interface CRUDOptions {
  revision?: boolean;
  cache?: number;
}

interface ModelBuildOptions extends ModelInstantiateOptions, CRUDOptions {
  freeze?: boolean;
  trackAttributes?: boolean;
}

const LOCK_PROPERTY = {
  configurable: false,
  enumerable: false,
  writable: false,
};

// NOTE: CRUD params with instances change + error is not reset on each CRUD operation currently on purpose.
// Explain what is the different between push and insert?
// Push replaces existing record!, doesnt have defaultValues
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

  static cache(model: ModelRefOrInstance, options: CRUDOptions): Model | Model[] {
    return this.Adapter.cache(this, model, options);
  }

  static resetCache(fixtures?: ModelRefOrInstance[], options?: CRUDOptions): Model[] {
    return this.Adapter.resetCache(this, fixtures, options);
  }

  static async resetRecords(
    targetState?: ModelRefOrInstance[],
    options?: CRUDOptions
  ): Promise<Model[]> {
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

  static async find(primaryKey: primaryKey | primaryKey[]): Promise<Model | Model[] | void> {
    return await this.Adapter.find(this, primaryKey);
  }

  static async findBy(queryObject: QueryObject): Promise<Model | void> {
    return await this.Adapter.findBy(this, queryObject);
  }

  static async findAll(queryObject: QueryObject = {}): Promise<Model[] | void> {
    return await this.Adapter.findAll(this, queryObject);
  }

  static async insert(
    record?: QueryObject | ModelRefOrInstance,
    options?: CRUDOptions
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
      model.revisionHistory.push(Object.assign({}, record));
    }

    return model;
  }

  static async update(record: ModelRefOrInstance): Promise<Model> {
    if (!record || !record[this.primaryKeyName]) {
      throw new RuntimeError(
        new Changeset(this.build(record)),
        "$Model.update() called without a record with primaryKey"
      );
    }

    primaryKeyTypeSafetyCheck(record, this);

    this.setRecordInTransit(record);

    let model = await this.Adapter.update(this, record);

    if (record instanceof this) {
      this.unsetRecordInTransit(record);
      clearObject(record.changes);
      record.revisionHistory.push(Object.assign({}, record));
    }

    return model;
  }

  static async save(record: QueryObject | ModelRefOrInstance): Promise<Model> {
    return shouldInsertOrUpdateARecord(this, record) === "insert"
      ? await this.Adapter.insert(this, record)
      : await this.Adapter.update(this, record);
  }

  static unload(record: ModelRefOrInstance): Model {
    return this.Adapter.unload(this, record);
  }

  static async delete(record: ModelRefOrInstance): Promise<Model> {
    if (!record || !record[this.primaryKeyName]) {
      throw new RuntimeError(
        new Changeset(this.build(record)),
        "$Model.delete() called without a record with primaryKey"
      );
    }

    primaryKeyTypeSafetyCheck(record, this);

    this.setRecordInTransit(record);

    let result = await this.Adapter.delete(this, record);

    if (record instanceof this) {
      record.#_inTransit = false;
      record.#_isDeleted = true;
    }

    return result;
  }

  static async saveAll(records: QueryObject[] | ModelRefOrInstance[]): Promise<Model[]> {
    return records.every((record) => shouldInsertOrUpdateARecord(this, record) === "update")
      ? await this.Adapter.updateAll(this, records as ModelRefOrInstance[])
      : await this.Adapter.insertAll(this, records);
  }

  static async insertAll(
    records: QueryObject[] | ModelRefOrInstance[],
    options?: CRUDOptions
  ): Promise<Model[]> {
    if (!records || records.length === 0) {
      throw new RuntimeError("$Model.insertAll(records) called without records");
    }

    records.forEach((record) => {
      if (record[this.primaryKeyName]) {
        primaryKeyTypeSafetyCheck(record, this);
      }

      this.setRecordInTransit(record);
    });

    let models = await this.Adapter.insertAll(this, records, options);

    records.forEach((record) => {
      if (record instanceof this) {
        this.unsetRecordInTransit(record);
        clearObject(record.changes);
        record.revisionHistory.push(Object.assign({}, record));
      }
    });

    return models;
  }

  static async updateAll(records: ModelRefOrInstance[]): Promise<Model[]> {
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

    let models = await this.Adapter.updateAll(this, records);

    records.forEach((record) => {
      if (record instanceof this) {
        this.unsetRecordInTransit(record);
        clearObject(record.changes);
        record.revisionHistory.push(Object.assign({}, record));
      }
    });

    return models;
  }

  static unloadAll(records?: ModelRefOrInstance[]): Model[] {
    return this.Adapter.unloadAll(this, records);
  }

  static async deleteAll(records: ModelRefOrInstance[]): Promise<Model[]> {
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

    let models = await this.Adapter.deleteAll(this, records);

    records.forEach((record) => {
      if (record instanceof Model) {
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
    let model = new this(options);

    if (!options || options.trackAttributes !== false) {
      if (!options || options.revision !== false) {
        model.revisionHistory.push(
          Array.from(this.columnNames).reduce((result, keyName) => {
            transformModelForBuild(model, keyName, buildObject);

            return Object.assign(result, { [keyName]: model[keyName] });
          }, {} as ModelReference)
        );
      }

      Array.from(this.columnNames).forEach((columnName) => {
        let cache = model[columnName];

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
    } else {
      Array.from(this.columnNames).forEach((keyName) =>
        transformModelForBuild(model, keyName, buildObject)
      );
    }

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

  // tracking only is in Model.build(), same goes for model assignments
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

  changes = Object.create(null); // NOTE: instead I could also create it between revision / instance diff
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

function transformModelForBuild(model, keyName, buildObject) {
  model[keyName] =
    buildObject && keyName in buildObject
      ? transformValue(model.constructor as typeof Model, keyName, buildObject[keyName])
      : model[keyName] || null;
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
