import kleur from "kleur";
import inspect from "object-inspect";
import Decorators from "./decorators";
import { generateUUID, insertFixturesWithTypechecks, primaryKeyTypeSafetyCheck } from "../utils";
import MemoriaModel, { Store } from "@memoria/model";
import type { ModelRef } from "@memoria/model";

type primaryKey = number | string;

export default class MemoryAdapter {
  static Decorators = Decorators;

  static resetCache(Model: typeof MemoriaModel, targetState?: ModelRef[]): ModelRef[] {
    Model.cache.length = 0;
    Model.columnNames.clear();

    if (targetState) {
      insertFixturesWithTypechecks(Model, targetState);
    }

    return Model.cache;
  }

  static async resetRecords(
    Model: typeof MemoriaModel,
    targetState?: ModelRef[]
  ): Promise<ModelRef[]> {
    return this.resetCache(Model, targetState);
  }

  static peek(
    Model: typeof MemoriaModel,
    primaryKey: primaryKey | primaryKey[]
  ): ModelRef[] | ModelRef | void {
    if (Array.isArray(primaryKey as primaryKey[])) {
      return Array.from(Model.cache).reduce((result: ModelRef[], model: ModelRef) => {
        const foundModel = (primaryKey as primaryKey[]).includes(model[Model.primaryKey])
          ? model
          : null;

        return foundModel ? result.concat([foundModel]) : result;
      }, []) as ModelRef[];
    } else if (typeof primaryKey !== "number") {
      throw new Error(
        kleur.red(`[Memserver] ${Model.name}.find(id) cannot be called without a valid id`)
      );
    }

    return Array.from(Model.cache).find((model: ModelRef) => model.id === primaryKey) as
      | ModelRef
      | undefined;
  }

  static peekBy(Model: typeof MemoriaModel, queryObject: object): ModelRef | void {
    if (!queryObject) {
      throw new Error(
        kleur.red(`[Memserver] ${Model.name}.findBy(id) cannot be called without a parameter`)
      );
    }

    const keys = Object.keys(queryObject);

    return Model.cache.find((model: ModelRef) => comparison(model, queryObject, keys, 0));
  }

  static peekAll(Model: typeof MemoriaModel, queryObject: object = {}): ModelRef[] | void {
    const keys = Object.keys(queryObject);

    if (keys.length === 0) {
      return Array.from(Model.cache);
    }

    return Array.from(Model.cache as ModelRef[]).filter((model: ModelRef) =>
      comparison(model, queryObject, keys, 0)
    );
  }

  static async count(Model: typeof MemoriaModel): Promise<number> {
    return Model.cache.length;
  }

  static async find(
    Model: typeof MemoriaModel,
    primaryKey: primaryKey | primaryKey[]
  ): Promise<ModelRef[] | ModelRef | void> {
    return this.peek(Model, primaryKey);
  }

  static async findBy(Model: typeof MemoriaModel, queryObject: object): Promise<ModelRef | void> {
    return this.peekBy(Model, queryObject);
  }

  static async findAll(
    Model: typeof MemoriaModel,
    queryObject: object = {}
  ): Promise<ModelRef[] | void> {
    return this.peekAll(Model, queryObject);
  }

  static async save(Model: typeof MemoriaModel, model: ModelRef): Promise<ModelRef> {
    let modelId = model[Model.primaryKey];
    if (modelId) {
      let foundModel = await this.find(Model, modelId);

      return foundModel ? await this.update(Model, model) : await this.insert(Model, model);
    }

    return await this.insert(Model, model);
  }

  static async insert(Model: typeof MemoriaModel, model: ModelRef): Promise<ModelRef> {
    if (Model.cache.length === 0) {
      Store.setPrimaryKey(Model, Model.primaryKey || (model.uuid ? "uuid" : "id"));
      Model.columnNames.add(Model.primaryKey);
      Object.keys(Model.defaultValues).forEach((key) => Model.columnNames.add(key));
    }

    if (!model.hasOwnProperty(Model.primaryKey)) {
      model[Model.primaryKey] =
        Model.primaryKey === "id" ? incrementId(Model.cache, Model) : generateUUID();
    }

    primaryKeyTypeSafetyCheck(Model.primaryKey, model[Model.primaryKey], Model.name);

    let target = Array.from(Model.columnNames).reduce((result: ModelRef, attribute) => {
      if (result[attribute] === Date) {
        result[attribute] = new Date(); // NOTE: changed from: "2017-10-25T20:54:04.447Z";
      } else if (typeof result[attribute] === "function") {
        result[attribute] = result[attribute].apply(result);
      } else if (!result.hasOwnProperty(attribute)) {
        result[attribute] = undefined;
      }

      return result;
    }, Object.assign({}, Model.defaultValues, model));
    let existingRecord = target.id
      ? await this.find(Model, target.id)
      : await this.findBy(Model, { uuid: target.uuid });
    if (existingRecord) {
      throw new Error(
        kleur.red(
          `[Memserver] ${Model.name} ${Model.primaryKey} ${
            target[Model.primaryKey]
          } already exists in the database! ${Model.name}.insert(${inspect(model)}) fails`
        )
      );
    }

    Object.keys(target)
      .filter((attribute) => !Model.columnNames.has(attribute))
      .forEach((attribute) => Model.columnNames.add(attribute));

    Model.cache.push(target as ModelRef);

    return target as ModelRef;
  }

  static async update(Model: typeof MemoriaModel, record: ModelRef): Promise<ModelRef> {
    if (!record || (!record.id && !record.uuid)) {
      throw new Error(
        kleur.red(
          `[Memserver] ${Model.name}.update(record) requires id or uuid primary key to update a record`
        )
      );
    }

    let targetRecord = record.id
      ? await this.find(Model, record.id)
      : await this.findBy(Model, { uuid: record.uuid });
    let primaryKey = Model.primaryKey;
    if (!targetRecord) {
      throw new Error(
        kleur.red(
          `[Memserver] ${Model.name}.update(record) failed because ${Model.name} with ${primaryKey}: ${record[primaryKey]} does not exist`
        )
      );
    }

    let recordsUnknownAttribute = Object.keys(record).find(
      (attribute) => !Model.columnNames.has(attribute)
    );
    if (recordsUnknownAttribute) {
      throw new Error(
        kleur.red(
          `[Memserver] ${Model.name}.update ${primaryKey}: ${record[primaryKey]} fails, ${Model.name} model does not have ${recordsUnknownAttribute} attribute to update`
        )
      );
    }

    return Object.assign(targetRecord, record);
  }

  static unload(Model: typeof MemoriaModel, record: ModelRef): ModelRef {
    if (Model.cache.length === 0) {
      throw new Error(
        kleur.red(
          `[Memserver] ${Model.name} has no records in the database to delete. ${
            Model.name
          }.delete(${inspect(record)}) failed`
        )
      );
    } else if (!record) {
      throw new Error(
        kleur.red(
          `[Memserver] ${Model.name}.delete(model) model object parameter required to delete a model`
        )
      );
    }

    let targetRecord = record.id
      ? (this.peek(Model, record.id) as ModelRef)
      : (this.peekBy(Model, { uuid: record.uuid }) as ModelRef);
    if (!targetRecord) {
      throw new Error(
        kleur.red(
          `[Memserver] Could not find ${Model.name} with ${Model.primaryKey} ${
            record[Model.primaryKey]
          } to delete. ${this.name}.delete(${inspect(record)}) failed`
        )
      );
    }

    let targetIndex = Model.cache.indexOf(targetRecord);

    Model.cache.splice(targetIndex, 1);

    return targetRecord;
  }

  static async delete(Model: typeof MemoriaModel, record: ModelRef): Promise<ModelRef> {
    return this.unload(Model, record);
  }

  static async saveAll(Model: typeof MemoriaModel, models: ModelRef[]): Promise<ModelRef[]> {
    return await Promise.all(models.map((model) => this.save(Model, model)));
  }

  static async insertAll(Model: typeof MemoriaModel, models: ModelRef[]): Promise<ModelRef[]> {
    return await Promise.all(models.map((model) => this.insert(Model, model)));
  }

  static async updateAll(Model: typeof MemoriaModel, models: ModelRef[]): Promise<ModelRef[]> {
    return await Promise.all(models.map((model) => this.update(Model, model)));
  }

  static unloadAll(Model: typeof MemoriaModel, models?: ModelRef[]): void {
    if (!models) {
      Model.cache.length = 0;

      return;
    }

    return models.forEach((model) => this.unload(Model, model));
  }

  static async deleteAll(Model: typeof MemoriaModel, models: ModelRef[]): Promise<void> {
    return models.forEach((model) => this.unload(Model, model));
  }
}

function incrementId(DB: ModelRef[], Model: typeof MemoriaModel) {
  if (!DB || DB.length === 0) {
    return 1;
  }

  let lastIdInSequence = DB.map((model) => model.id)
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
