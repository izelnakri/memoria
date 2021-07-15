import kleur from "kleur";
import { underscore } from "@emberx/string";
import { pluralize, singularize } from "inflected";
import { MemoryAdapter } from "@memoria/adapters";
import Store from "./store";
import type { ModelRef } from "./index";

type primaryKey = number | string;

// TODO: remove static setters and maybe getters
export default class Model {
  static Adapter = MemoryAdapter;
  static _Store = Store;

  static get cache(): ModelRef[] {
    return Store.getDB(this);
  }

  static get primaryKeyName(): string {
    return Store.getPrimaryKeyName(this);
  }

  static get primaryKeyType(): "uuid" | "id" {
    return Store.getColumnsMetadata(this)[this.primaryKeyName].generated === "uuid" ? "uuid" : "id";
  }

  // NOTE: not fully cached
  static get columnNames(): Set<string> {
    return Store.getColumnNames(this);
  }

  static resetCache(fixtures?: Array<ModelRef>): Array<ModelRef> {
    return this.Adapter.resetCache(this, fixtures);
  }

  static async resetRecords(targetState?: ModelRef[]): Promise<ModelRef[]> {
    return await this.Adapter.resetRecords(this, targetState);
  }

  static peek(primaryKey: primaryKey | primaryKey[]): ModelRef[] | ModelRef | void {
    if (!primaryKey) {
      throw new Error(
        kleur.red(`[Memoria] ${Model.name}.find(id) cannot be called without a valid id`)
      );
    }

    return this.Adapter.peek(this, primaryKey);
  }

  static peekBy(queryObject: object): ModelRef | void {
    return this.Adapter.peekBy(this, queryObject);
  }

  static peekAll(queryObject: object = {}): ModelRef[] | void {
    return this.Adapter.peekAll(this, queryObject);
  }

  static async count(): Promise<number> {
    return await this.Adapter.count(this);
  }

  static async find(primaryKey: primaryKey | primaryKey[]): Promise<ModelRef[] | ModelRef | void> {
    return await this.Adapter.find(this, primaryKey);
  }

  static async findBy(queryObject: object): Promise<ModelRef | void> {
    return await this.Adapter.findBy(this, queryObject);
  }

  static async findAll(queryObject: object = {}): Promise<ModelRef[] | void> {
    return await this.Adapter.findAll(this, queryObject);
  }

  static async save(record: ModelRef): Promise<ModelRef> {
    return await this.Adapter.save(this, record);
  }

  static async insert(record?: ModelRef): Promise<ModelRef> {
    return await this.Adapter.insert(this, record || {});
  }

  static async update(record: ModelRef): Promise<ModelRef> {
    return await this.Adapter.update(this, record);
  }

  static unload(record: ModelRef): ModelRef {
    return this.Adapter.unload(this, record);
  }

  static async delete(record: ModelRef): Promise<ModelRef> {
    return await this.Adapter.delete(this, record);
  }

  static async saveAll(records: ModelRef[]): Promise<ModelRef[]> {
    return await this.Adapter.saveAll(this, records);
  }

  static async insertAll(records: ModelRef[]): Promise<ModelRef[]> {
    return await this.Adapter.insertAll(this, records);
  }

  static async updateAll(records: ModelRef[]): Promise<ModelRef[]> {
    return await this.Adapter.updateAll(this, records);
  }

  static unloadAll(records?: ModelRef[]): void {
    return this.Adapter.unloadAll(this, records);
  }

  static async deleteAll(records: ModelRef[]): Promise<void> {
    return await this.Adapter.deleteAll(this, records);
  }

  // NOTE: serializer functions
  static embed(relationship): object {
    // EXAMPLE: { comments: Comment }
    if (typeof relationship !== "object" || relationship.name) {
      throw new Error(
        kleur.red(
          `[Memserver] ${this.name}.embed(relationshipObject) requires an object as a parameter: { relationshipKey: $RelationshipModel }`
        )
      );
    }

    const key = Object.keys(relationship)[0];

    if (!relationship[key]) {
      throw new Error(
        kleur.red(
          `[Memserver] ${this.name}.embed() fails: ${key} Model reference is not a valid. Please put a valid $ModelName to ${this.name}.embed()`
        )
      );
    }

    return Object.assign(Store.getEmbedDataForSerialization(Model), relationship);
  }

  static serializer(objectOrArray: ModelRef | Array<ModelRef>) {
    if (!objectOrArray) {
      return;
    } else if (Array.isArray(objectOrArray)) {
      return (objectOrArray as Array<ModelRef>).map((object) => this.serialize(object));
    }

    return this.serialize(objectOrArray as ModelRef);
  }

  static serialize(object: ModelRef) {
    // NOTE: add links object ?
    if (Array.isArray(object)) {
      throw new Error(
        kleur.red(
          `[Memserver] ${this.name}.serialize(object) expects an object not an array. Use ${this.name}.serializer(data) for serializing array of records`
        )
      );
    }

    let objectWithAllColumns = Array.from(this.columnNames).reduce((result, columnName) => {
      if (result[columnName] === undefined) {
        result[columnName] = null;
      }

      return result;
    }, Object.assign({}, object));
    let embedReferences = Store.getEmbedDataForSerialization(this);
    return Object.keys(embedReferences).reduce((result, embedKey) => {
      const embedModel = embedReferences[embedKey];
      const embeddedRecords = this.getRelationship(object, embedKey, embedModel);

      return Object.assign({}, result, { [embedKey]: embedModel.serializer(embeddedRecords) });
    }, objectWithAllColumns);
  }

  static getRelationship(parentObject, relationshipName: string, relationshipModel?: ModelRef) {
    if (Array.isArray(parentObject)) {
      throw new Error(
        kleur.red(
          `[Memserver] ${this.name}.getRelationship expects model input to be an object not an array`
        )
      );
    }

    const targetRelationshipModel =
      relationshipModel || Store.getEmbedDataForSerialization(this)[relationshipName];
    const hasManyRelationship = pluralize(relationshipName) === relationshipName;

    if (!targetRelationshipModel) {
      throw new Error(
        kleur.red(
          `[Memserver] ${relationshipName} relationship could not be found on ${this.name} model. Please put the ${relationshipName} Model object as the third parameter to ${this.name}.getRelationship function`
        )
      );
    } else if (hasManyRelationship) {
      if (parentObject.id) {
        const hasManyIDRecords = targetRelationshipModel.findAll({
          [`${underscore(this.name)}_id`]: parentObject.id,
        });

        return hasManyIDRecords.length > 0 ? hasManyIDRecords : [];
      } else if (parentObject.uuid) {
        const hasManyUUIDRecords = targetRelationshipModel.findAll({
          [`${underscore(this.name)}_uuid`]: parentObject.uuid,
        });

        return hasManyUUIDRecords.length > 0 ? hasManyUUIDRecords : [];
      }
    }

    const objectRef =
      parentObject[`${underscore(relationshipName)}_id`] ||
      parentObject[`${underscore(relationshipName)}_uuid`] ||
      parentObject[`${underscore(targetRelationshipModel.name)}_id`] ||
      parentObject[`${underscore(targetRelationshipModel.name)}_uuid`];

    if (objectRef && typeof objectRef === "number") {
      return targetRelationshipModel.find(objectRef);
    } else if (objectRef) {
      return targetRelationshipModel.findBy({ uuid: objectRef });
    }

    if (parentObject.id) {
      return targetRelationshipModel.findBy({
        [`${underscore(this.name)}_id`]: parentObject.id,
      });
    } else if (parentObject.uuid) {
      return targetRelationshipModel.findBy({
        [`${underscore(this.name)}_uuid`]: parentObject.uuid,
      });
    }
  }
}
