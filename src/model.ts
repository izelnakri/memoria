import util from "util";
import chalk from "ansi-colors";
import Inflector from "i";
import { classify, underscore } from "ember-cli-string-utils";
import { insertFixturesWithTypechecks, primaryKeyTypeSafetyCheck, generateUUID } from "./utils";

const { singularize, pluralize } = Inflector();

type RequireOnlyOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, undefined>>;
  }[Keys];

export interface InternalModelShape {
  id?: number;
  uuid?: string;
  [propName: string]: any;
}

export type InternalModel = RequireOnlyOne<InternalModelShape, "id" | "uuid">;

export default abstract class MemServerModel {
  static _DB = {};
  static _attributes = {};
  static _defaultAttributes = {}; // NOTE: probably a decorator here in future
  static _embedReferences = {}; // NOTE: serializer concern

  static primaryKey: string | null = null; // NOTE: this might be problematic!!

  static get DB(): Array<InternalModel> {
    if (!this._DB[this.name]) {
      this._DB[this.name] = [];

      return this._DB[this.name];
    }

    return this._DB[this.name];
  }
  static get attributes(): Array<string> {
    if (!this._attributes[this.name]) {
      this._attributes[this.name] = [];

      return this._attributes[this.name];
    }

    return this._attributes[this.name];
  }

  static set defaultAttributes(value: object) {
    Object.keys(value).forEach((key) => {
      if (!this.attributes.includes(key)) {
        this.attributes.push(key);
      }
    });

    this._defaultAttributes = value;
  }

  static get defaultAttributes(): object {
    return this._defaultAttributes;
  }

  static set embedReferences(references: Object) {
    this._embedReferences[this.name] = references;
  }
  static get embedReferences() {
    // NOTE: serializer concern
    if (!this._embedReferences[this.name]) {
      this._embedReferences[this.name] = {};

      return this._embedReferences[this.name];
    }

    return this._embedReferences[this.name];
  }

  static resetDatabase(fixtures: Array<InternalModel> | undefined): Array<InternalModel> {
    this.DB.length = 0;
    this.attributes.length = 0;
    this.defaultAttributes = this.defaultAttributes;

    if (fixtures) {
      insertFixturesWithTypechecks(this, fixtures);
    }

    return this.DB;
  }

  static count(): number {
    return this.DB.length;
  }
  static find(param: Array<number> | number): Array<InternalModel> | InternalModel | undefined {
    // NOTE: turn param into an interface with id or uuid
    if (!param) {
      throw new Error(
        chalk.red(`[MemServer] ${this.name}.find(id) cannot be called without a valid id`)
      );
    } else if (Array.isArray(param)) {
      const models = Array.from(this.DB);

      return models.reduce((result: InternalModel[], model) => {
        const foundModel = param.includes(model.id) ? model : null;

        return foundModel ? result.concat([foundModel]) : result;
      }, []);
    } else if (typeof param !== "number") {
      throw new Error(
        chalk.red(`[MemServer] ${this.name}.find(id) cannot be called without a valid id`)
      );
    }

    const models = Array.from(this.DB);

    return models.find((model) => model.id === param);
  }
  static findBy(options: object): InternalModel | undefined {
    if (!options) {
      throw new Error(
        chalk.red(`[MemServer] ${this.name}.findBy(id) cannot be called without a parameter`)
      );
    }

    const keys = Object.keys(options);

    return this.DB.find((model) => comparison(model, options, keys, 0));
  }
  static findAll(options = {}): Array<InternalModel> {
    const models: Array<InternalModel> = Array.from(this.DB);
    const keys = Object.keys(options);

    if (keys.length === 0) {
      return models;
    }

    return models.filter((model) => comparison(model, options, keys, 0));
  }
  static insert(options: InternalModelShape | undefined): InternalModel {
    if (this.DB.length === 0) {
      const recordsPrimaryKey = this.primaryKey || (options.uuid ? "uuid" : "id");

      this.primaryKey = recordsPrimaryKey;
      this.attributes.push(this.primaryKey);
    }

    const defaultAttributes = this.attributes.reduce((result, attribute) => {
      if (attribute === this.primaryKey) {
        result[attribute] = this.primaryKey === "id" ? incrementId(this.DB, this) : generateUUID();

        return result;
      }

      const target = this.defaultAttributes[attribute];

      result[attribute] = typeof target === "function" ? target() : target;

      return result;
    }, {});
    const target = Object.assign(defaultAttributes, options);

    primaryKeyTypeSafetyCheck(this.primaryKey, target[this.primaryKey], this.name);

    const existingRecord = target.id ? this.find(target.id) : this.findBy({ uuid: target.uuid });

    if (existingRecord) {
      throw new Error(
        chalk.red(
          `[MemServer] ${this.name} ${this.primaryKey} ${
            target[this.primaryKey]
          } already exists in the database! ${this.name}.insert(${util.inspect(options)}) fails`
        )
      );
    }

    Object.keys(target)
      .filter((attribute) => !this.attributes.includes(attribute))
      .forEach((attribute) => this.attributes.push(attribute));

    this.DB.push(target as InternalModel);

    return target as InternalModel;
  }
  static update(record: InternalModel): InternalModel {
    if (!record || (!record.id && !record.uuid)) {
      throw new Error(
        chalk.red(
          `[MemServer] ${this.name}.update(record) requires id or uuid primary key to update a record`
        )
      );
    }

    const targetRecord = record.id ? this.find(record.id) : this.findBy({ uuid: record.uuid });

    if (!targetRecord) {
      throw new Error(
        chalk.red(
          `[MemServer] ${this.name}.update(record) failed because ${this.name} with ${
            this.primaryKey
          }: ${record[this.primaryKey]} does not exist`
        )
      );
    }

    const recordsUnknownAttribute = Object.keys(record).find(
      (attribute) => !this.attributes.includes(attribute)
    );

    if (recordsUnknownAttribute) {
      throw new Error(
        chalk.red(
          `[MemServer] ${this.name}.update ${this.primaryKey}: ${record[this.primaryKey]} fails, ${
            this.name
          } model does not have ${recordsUnknownAttribute} attribute to update`
        )
      );
    }

    return Object.assign(targetRecord, record);
  }
  static delete(record: InternalModel | undefined) {
    if (this.DB.length === 0) {
      throw new Error(
        chalk.red(
          `[MemServer] ${this.name} has no records in the database to delete. ${
            this.name
          }.delete(${util.inspect(record)}) failed`
        )
      );
    } else if (!record) {
      throw new Error(
        chalk.red(
          `[MemServer] ${this.name}.delete(model) model object parameter required to delete a model`
        )
      );
    }

    const targetRecord = record.id ? this.find(record.id) : this.findBy({ uuid: record.uuid });

    if (!targetRecord) {
      throw new Error(
        chalk.red(
          `[MemServer] Could not find ${this.name} with ${this.primaryKey} ${
            record[this.primaryKey]
          } to delete. ${this.name}.delete(${util.inspect(record)}) failed`
        )
      );
    }

    if (Array.isArray(targetRecord)) {
      targetRecord.forEach((record) => {
        const targetIndex = this.DB.indexOf(record);

        this.DB.splice(targetIndex, 1);
      });

      return targetRecord;
    }

    const targetIndex = this.DB.indexOf(targetRecord);

    this.DB.splice(targetIndex, 1);

    return targetRecord;
  }
  static embed(relationship): object {
    // EXAMPLE: { comments: Comment }
    if (typeof relationship !== "object" || relationship.name) {
      throw new Error(
        chalk.red(
          `[MemServer] ${this.name}.embed(relationshipObject) requires an object as a parameter: { relationshipKey: $RelationshipModel }`
        )
      );
    }

    const key = Object.keys(relationship)[0];

    if (!relationship[key]) {
      throw new Error(
        chalk.red(
          `[MemServer] ${this.name}.embed() fails: ${key} Model reference is not a valid. Please put a valid $ModelName to ${this.name}.embed()`
        )
      );
    }

    return Object.assign(this.embedReferences, relationship);
  }
  static serializer(objectOrArray: InternalModel | Array<InternalModel>) {
    if (!objectOrArray) {
      return;
    } else if (Array.isArray(objectOrArray)) {
      return objectOrArray.map((object) => this.serialize(object), []);
    }

    return this.serialize(objectOrArray);
  }
  static serialize(object: InternalModel) {
    // NOTE: add links object ?
    if (Array.isArray(object)) {
      throw new Error(
        chalk.red(
          `[MemServer] ${this.name}.serialize(object) expects an object not an array. Use ${this.name}.serializer(data) for serializing array of records`
        )
      );
    }

    const objectWithAllAttributes = this.attributes.reduce((result, attribute) => {
      if (result[attribute] === undefined) {
        result[attribute] = null;
      }

      return result;
    }, Object.assign({}, object));

    return Object.keys(this.embedReferences).reduce((result, embedKey) => {
      const embedModel = this.embedReferences[embedKey];
      const embeddedRecords = this.getRelationship(object, embedKey, embedModel);

      return Object.assign({}, result, { [embedKey]: embedModel.serializer(embeddedRecords) });
    }, objectWithAllAttributes);
  }
  static getRelationship(parentObject, relationshipName: string, relationshipModel: InternalModel) {
    if (Array.isArray(parentObject)) {
      throw new Error(
        chalk.red(
          `[MemServer] ${this.name}.getRelationship expects model input to be an object not an array`
        )
      );
    }

    const targetRelationshipModel = relationshipModel || this.embedReferences[relationshipName];
    const hasManyRelationship = pluralize(relationshipName) === relationshipName;

    if (!targetRelationshipModel) {
      throw new Error(
        chalk.red(
          `[MemServer] ${relationshipName} relationship could not be found on ${this.name} model. Please put the ${relationshipName} Model object as the third parameter to ${this.name}.getRelationship function`
        )
      );
    } else if (hasManyRelationship) {
      if (parentObject.id) {
        const hasManyIDRecords = targetRelationshipModel.findAll({
          [`${underscore(this.name)}_id`]: parentObject.id
        });

        return hasManyIDRecords.length > 0 ? hasManyIDRecords : [];
      } else if (parentObject.uuid) {
        const hasManyUUIDRecords = targetRelationshipModel.findAll({
          [`${underscore(this.name)}_uuid`]: parentObject.uuid
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
        [`${underscore(this.name)}_id`]: parentObject.id
      });
    } else if (parentObject.uuid) {
      return targetRelationshipModel.findBy({
        [`${underscore(this.name)}_uuid`]: parentObject.uuid
      });
    }
  }
}

function incrementId(DB, Model) {
  if (!DB || DB.length === 0) {
    return 1;
  }

  const lastIdInSequence = DB.map((model) => model.id)
    .sort((a, b) => a - b)
    .find((id, index, array) => (index === array.length - 1 ? true : id + 1 !== array[index + 1]));

  return lastIdInSequence + 1;
}

// NOTE: if records were ordered by ID, then there could be performance benefit
function comparison(model, options, keys, index = 0) {
  const key = keys[index];

  if (keys.length === index) {
    return model[key] === options[key];
  } else if (model[key] === options[key]) {
    return comparison(model, options, keys, index + 1);
  }

  return false;
}
