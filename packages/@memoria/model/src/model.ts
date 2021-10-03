import { MemoryAdapter } from "@memoria/adapters";
import { underscore } from "inflected";
import { ModelError, RuntimeError } from "./errors/index.js";
import Config from "./config.js";
import Serializer, { transformValue } from "./serializer.js";
import type { ModelReference, RelationshipSchemaDefinition } from "./index.js";

type primaryKey = number | string;
type QueryObject = { [key: string]: any };
type ModelRefOrInstance = ModelReference | Model;

interface ModelBuildOptions {
  isNew?: boolean;
  isDeleted?: boolean;
  freeze?: boolean;
}

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

    if (record instanceof this) {
      record.#_inTransit = false;
      record.#_isNew = false;
    }

    return result;
  }

  static async update(record: ModelRefOrInstance): Promise<Model> {
    this.setRecordInTransit(record);

    let result = await this.Adapter.update(this, record);

    this.unsetRecordInTransit(record);

    return result;
  }

  static async save(record: QueryObject | ModelRefOrInstance): Promise<Model> {
    this.setRecordInTransit(record);

    let result = await this.Adapter.save(this, record);

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
  static build(buildObject?: QueryObject | Model, options?: ModelBuildOptions): Model {
    let model = new this(options);

    if (!buildObject) {
      Object.keys(model).forEach((keyName: string) => {
        model[keyName] = model[keyName] || null;
      });

      return options && options.freeze ? (Object.freeze(model) as Model) : Object.seal(model);
    }

    let transformedObject = Array.from(this.columnNames).reduce((result, keyName) => {
      // TODO: here we could do a typecheck as well
      result[keyName] = transformValue(this, keyName, buildObject[keyName]);

      return result;
    }, {});

    // NOTE: this is NOT ok when there is a default setting
    Object.keys(model).forEach((keyName: string) => {
      model[keyName] = keyName in buildObject ? transformedObject[keyName] : model[keyName] || null;
    });

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

  constructor(options?: ModelBuildOptions) {
    if (options) {
      if ("isNew" in options) {
        this.#_isNew = options.isNew as boolean;
      }
      if ("isDeleted" in options) {
        this.#_isDeleted = options.isDeleted as boolean;
      }
    }
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
    return !this.isNew;
  }

  #_isDeleted = false;
  get isDeleted() {
    return this.#_isDeleted;
  }
  set isDeleted(value) {
    this.#_isDeleted = !!value;
  }

  #_isDirty = false;
  get isDirty() {
    return this.#_isDirty;
  }

  #_inTransit = false;
  get inTransit() {
    return this.#_inTransit;
  }

  async reload() {
    let Klass = this.constructor as typeof Model;

    return await Klass.Adapter.find(Klass, this[Klass.primaryKeyName]);
  }
}
