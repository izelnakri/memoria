import { MemoryAdapter } from "@memoria/adapters";
import { underscore } from "inflected";
import { ModelError, RuntimeError } from "./errors/index.js";
import Config from "./config.js";
import Serializer, { transformValue } from "./serializer.js";
import type { ModelReference, RelationshipSchemaDefinition } from "./index.js";

type primaryKey = number | string;
type QueryObject = { [key: string]: any };
type ModelRefOrInstance = ModelReference | Model;

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
    return await this.Adapter.insert(this, record || {});
  }

  static async update(record: ModelRefOrInstance): Promise<Model> {
    return await this.Adapter.update(this, record);
  }

  static async save(record: QueryObject | ModelRefOrInstance): Promise<Model> {
    return await this.Adapter.save(this, record);
  }

  static unload(record: ModelRefOrInstance): Model {
    return this.Adapter.unload(this, record);
  }

  static async delete(record: ModelRefOrInstance): Promise<Model> {
    return await this.Adapter.delete(this, record);
  }

  static async saveAll(records: QueryObject[] | ModelRefOrInstance[]): Promise<Model[]> {
    return await this.Adapter.saveAll(this, records);
  }

  static async insertAll(records: QueryObject[] | ModelRefOrInstance[]): Promise<Model[]> {
    return await this.Adapter.insertAll(this, records);
  }

  static async updateAll(records: ModelRefOrInstance[]): Promise<Model[]> {
    return await this.Adapter.updateAll(this, records);
  }

  static unloadAll(records?: ModelRefOrInstance[]): Model[] {
    return this.Adapter.unloadAll(this, records);
  }

  static async deleteAll(records: ModelRefOrInstance[]): Promise<Model[]> {
    return await this.Adapter.deleteAll(this, records);
  }

  static async count(options: QueryObject): Promise<number> {
    return await this.Adapter.count(this, options);
  }

  // NOTE: this doesnt assign default values from the instance!!
  // transforms strings to datestrings if it is a date column
  static build(options?: QueryObject | Model): Model {
    if (!options) {
      return Object.seal(new this());
    }

    let transformedOptions = Array.from(this.columnNames).reduce((result, keyName) => {
      // TODO: here we could do a typecheck as well
      result[keyName] = transformValue(this, keyName, options[keyName]);

      return result;
    }, {});
    let model = new this(transformedOptions);

    Object.keys(model).forEach((keyName: string) => {
      model[keyName] = model[keyName] || keyName in options ? transformedOptions[keyName] : null;
    });

    return Object.seal(model);
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

  #_errors: ModelError[] = [];
  get errors(): ModelError[] {
    return this.#_errors;
  }
  set errors(newError: ModelError[]) {
    this.#_errors = newError;
  }

  constructor(options?: QueryObject) {
    Array.from((this.constructor as typeof Model).columnNames).forEach((keyName) => {
      Object.defineProperty(this, keyName, {
        enumerable: true,
        writable: true,
        configurable: true,
        value: options && keyName in options ? options[keyName] : null,
      });
    });

    return this;
  }
}
