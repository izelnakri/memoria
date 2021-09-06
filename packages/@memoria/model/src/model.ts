import kleur from "kleur";
import { MemoryAdapter } from "@memoria/adapters";
import { underscore } from "@emberx/string";
import { pluralize } from "inflected";
import ModelError from "./error.js";
import Config from "./config.js";
import { transformValue } from "./serializer.js";
// import type { SchemaDefinition } from "./types";
import type { ModelRef, RelationshipSchemaDefinition } from "./index.js";

type primaryKey = number | string;
type QueryObject = { [key: string]: any };
type ModelRefOrInstance = ModelRef | Model;

// TODO: remove embedReferences getter
export default class Model {
  static Adapter = MemoryAdapter;
  static Error = ModelError;

  static embedReferences = {}; // TODO: move to serializer

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
      throw new Error(
        kleur.red(
          `[Memoria] ${Model.name}.find(id) or ${Model.name}.peek(id) cannot be called without a valid id`
        )
      );
    }

    return this.Adapter.peek(this, primaryKey);
  }

  static peekBy(queryObject: QueryObject): Model | void {
    return this.Adapter.peekBy(this, queryObject);
  }

  static peekAll(queryObject: QueryObject = {}): Model[] | void {
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
      result[keyName] = transformValue(this, keyName, options[keyName]);

      return result;
    }, {});
    let model = new this(transformedOptions);

    Object.keys(model).forEach((keyName: string) => {
      model[keyName] = model[keyName] || keyName in options ? transformedOptions[keyName] : null;
    });

    return Object.seal(model);
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

  // NOTE: serializer functions
  static embed(relationship: { [key: string]: any }): object {
    // EXAMPLE: { comments: Comment }
    if (typeof relationship !== "object" || relationship.name) {
      throw new Error(
        kleur.red(
          `[Memoria] ${this.name}.embed(relationshipObject) requires an object as a parameter: { relationshipKey: $RelationshipModel }`
        )
      );
    }

    const key = Object.keys(relationship)[0];

    if (!relationship[key]) {
      throw new Error(
        kleur.red(
          `[Memoria] ${this.name}.embed() fails: ${key} Model reference is not a valid. Please put a valid $ModelName to ${this.name}.embed()`
        )
      );
    }

    return Object.assign(Config.getEmbedDataForSerialization(this), relationship);
  }

  static serializer(objectOrArray: ModelRefOrInstance | ModelRefOrInstance[]) {
    if (!objectOrArray) {
      return;
    } else if (Array.isArray(objectOrArray)) {
      return (objectOrArray as Array<ModelRef>).map((object) => this.serialize(object));
    }

    return this.serialize(objectOrArray as ModelRef);
  }

  static serialize(object: ModelRefOrInstance) {
    // NOTE: add links object ?
    if (Array.isArray(object)) {
      throw new Error(
        kleur.red(
          `[Memoria] ${this.name}.serialize(object) expects an object not an array. Use ${this.name}.serializer(data) for serializing array of records`
        )
      );
    }

    let objectWithAllColumns = Array.from(this.columnNames).reduce((result, columnName) => {
      if (result[columnName] === undefined) {
        result[columnName] = null;
      }

      return result;
    }, Object.assign({}, object));
    let embedReferences = Config.getEmbedDataForSerialization(this);
    return Object.keys(embedReferences).reduce((result, embedKey) => {
      let embedModel = embedReferences[embedKey];
      let embeddedRecords = this.getRelationship(object as ModelRef, embedKey, embedModel);

      return Object.assign({}, result, { [embedKey]: embedModel.serializer(embeddedRecords) });
    }, objectWithAllColumns);
  }

  static getRelationship(
    parentObject: ModelRef,
    relationshipName: string,
    relationshipModel?: ModelRef
  ) {
    if (Array.isArray(parentObject)) {
      throw new Error(
        kleur.red(
          `[Memoria] ${this.name}.getRelationship expects model input to be an object not an array`
        )
      );
    }

    const targetRelationshipModel =
      relationshipModel || Config.getEmbedDataForSerialization(this)[relationshipName];
    const hasManyRelationship = pluralize(relationshipName) === relationshipName;

    if (!targetRelationshipModel) {
      throw new Error(
        kleur.red(
          `[Memoria] ${relationshipName} relationship could not be found on ${this.name} model. Please put the ${relationshipName} Model object as the third parameter to ${this.name}.getRelationship function`
        )
      );
    } else if (hasManyRelationship) {
      if (parentObject.id) {
        const hasManyIDRecords = targetRelationshipModel.peekAll({
          [`${underscore(this.name)}_id`]: parentObject.id,
        });

        return hasManyIDRecords.length > 0
          ? sortByIdOrUUID(hasManyIDRecords, hasManyIDRecords[0].constructor.primaryKeyName)
          : [];
      } else if (parentObject.uuid) {
        const hasManyUUIDRecords = targetRelationshipModel.peekAll({
          [`${underscore(this.name)}_uuid`]: parentObject.uuid,
        });

        return hasManyUUIDRecords.length > 0
          ? sortByIdOrUUID(hasManyUUIDRecords, hasManyUUIDRecords[0].constructor.primaryKeyName)
          : [];
      }
    }

    const objectRef =
      parentObject[`${underscore(relationshipName)}_id`] ||
      parentObject[`${underscore(relationshipName)}_uuid`] ||
      parentObject[`${underscore(targetRelationshipModel.name)}_id`] ||
      parentObject[`${underscore(targetRelationshipModel.name)}_uuid`];

    if (objectRef && typeof objectRef === "number") {
      return targetRelationshipModel.peek(objectRef);
    } else if (objectRef) {
      return targetRelationshipModel.peekBy({ uuid: objectRef });
    }

    if (parentObject.id) {
      return targetRelationshipModel.peekBy({
        [`${underscore(this.name)}_id`]: parentObject.id,
      });
    } else if (parentObject.uuid) {
      return targetRelationshipModel.peekBy({
        [`${underscore(this.name)}_uuid`]: parentObject.uuid,
      });
    }
  }
}

function sortByIdOrUUID(records: Model[], primaryColumnName: string) {
  // TODO: Optimize, READ MDN Docs on default sorting algorithm, implement it for objects
  let sortedIds = records.map((record) => record[primaryColumnName]).sort();
  return sortedIds.map((id) => records.find((record) => record[primaryColumnName] === id));
}
