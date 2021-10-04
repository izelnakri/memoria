import { MemoryAdapter } from "@memoria/adapters";
import { underscore } from "inflected";
import { ModelError, RuntimeError } from "./errors/index.js";
import Changeset from "./changeset.js";
import Config from "./config.js";
import Serializer, { transformValue } from "./serializer.js";
import type { ModelReference, RelationshipSchemaDefinition } from "./index.js";

type primaryKey = number | string;
type QueryObject = { [key: string]: any };
type ModelRefOrInstance = ModelReference | Model;

interface ModelInstantiateOptions {
  isNew?: boolean;
  isDeleted?: boolean;
}

interface ModelBuildOptions extends ModelInstantiateOptions {
  freeze?: boolean;
  trackAttributes?: boolean;
}

const LOCK_PROPERTY = {
  configurable: false,
  enumerable: false,
  writable: false,
};

// NOTE: CRUD params with instances change + error is not reset on each CRUD operation currently on purpose.
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

  static push(model: ModelRefOrInstance): Model | Model[] {
    return this.Adapter.push(this, model);
  }

  static resetCache(fixtures?: ModelRefOrInstance[]): Model[] {
    return this.Adapter.resetCache(this, fixtures);
  }

  static async resetRecords(targetState?: ModelRefOrInstance[]): Promise<Model[]> {
    return await this.Adapter.resetRecords(this, targetState);
  }

  static peek(primaryKey: primaryKey | primaryKey[]): Model[] | Model | void {
    if (!primaryKey) {
      throw new RuntimeError(
        `${Model.name}.find(id) or ${Model.name}.peek(id) cannot be called without a valid id`
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

  static async find(primaryKey: primaryKey | primaryKey[]): Promise<Model[] | Model | void> {
    return await this.Adapter.find(this, primaryKey);
  }

  static async findBy(queryObject: QueryObject): Promise<Model | void> {
    return await this.Adapter.findBy(this, queryObject);
  }

  static async findAll(queryObject: QueryObject = {}): Promise<Model[] | void> {
    return await this.Adapter.findAll(this, queryObject);
  }

  static cache(fixture: ModelRefOrInstance): Model {
    return this.Adapter.cache(this, fixture);
  }

  static async insert(record?: QueryObject | ModelRefOrInstance): Promise<Model> {
    this.setRecordInTransit(record);

    let result = await this.Adapter.insert(this, record || {});
    // TODO: revision and changes reset for input instance(?) AND result: yes absolutely(because it gets it from cache on update)

    if (record instanceof this) {
      record.#_inTransit = false;
      record.#_isNew = false;
    }

    return result;
  }

  static async update(record: ModelRefOrInstance): Promise<Model> {
    this.setRecordInTransit(record);

    let result = await this.Adapter.update(this, record);
    record.revisionHistory.push(result.revision);

    this.unsetRecordInTransit(record);

    return result;
  }

  static async save(record: QueryObject | ModelRefOrInstance): Promise<Model> {
    this.setRecordInTransit(record);

    let result = await this.Adapter.save(this, record);
    record.revisionHistory.push(result.revision);

    this.unsetRecordInTransit(record);

    return result;
  }

  static unload(record: ModelRefOrInstance): Model {
    return this.Adapter.unload(this, record);
  }

  static async delete(record: ModelRefOrInstance): Promise<Model> {
    this.setRecordInTransit(record);

    let result = await this.Adapter.delete(this, record);

    if (record instanceof this) {
      record.#_inTransit = false;
      record.#_isDeleted = true;
    }

    return result;
  }

  static async saveAll(records: QueryObject[] | ModelRefOrInstance[]): Promise<Model[]> {
    records.forEach((record) => this.setRecordInTransit(record));

    let result = await this.Adapter.saveAll(this, records);

    records.forEach((record) => this.unsetRecordInTransit(record));

    return result;
  }

  static async insertAll(records: QueryObject[] | ModelRefOrInstance[]): Promise<Model[]> {
    records.forEach((record) => this.setRecordInTransit(record));

    let result = await this.Adapter.insertAll(this, records);

    records.forEach((record) => this.unsetRecordInTransit(record));

    return result;
  }

  static async updateAll(records: ModelRefOrInstance[]): Promise<Model[]> {
    records.forEach((record) => this.setRecordInTransit(record));

    let result = await this.Adapter.updateAll(this, records);

    records.forEach((record) => this.unsetRecordInTransit(record));

    return result;
  }

  static unloadAll(records?: ModelRefOrInstance[]): Model[] {
    return this.Adapter.unloadAll(this, records);
  }

  static async deleteAll(records: ModelRefOrInstance[]): Promise<Model[]> {
    records.forEach((record) => this.setRecordInTransit(record));

    let result = await this.Adapter.deleteAll(this, records);

    records.forEach((record) => this.unsetRecordInTransit(record));

    return result;
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
      model.revisionHistory.push(
        Array.from(this.columnNames).reduce((result, keyName) => {
          transformModelForBuild(model, keyName, buildObject);

          return Object.assign(result, { [keyName]: model[keyName] });
        }, {} as ModelReference)
      );

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

  // tracking only includes in Model.build(), same goes for model assignments
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

  changes = Object.create(null);
  revisionHistory: ModelReference[] = [];

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
    return Object.keys(this.changes).reduce((result, keyName) => {
      return Object.assign(result, { [keyName]: [this.revision[keyName], this.changes[keyName]] });
    }, {});
  }

  rollbackAttributes() {
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
