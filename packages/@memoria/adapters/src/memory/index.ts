import kleur from "kleur";
import inspect from "object-inspect";
import Decorators from "./decorators";
import { insertFixturesWithTypechecks, primaryKeyTypeSafetyCheck } from "../utils";
import MemoriaModel, { Store } from "@memoria/model";
import type { ModelRef } from "@memoria/model";

type primaryKey = number | string;
type QueryObject = { [key: string]: any };

export default class MemoryAdapter {
  static Decorators = Decorators;

  static async resetCache(
    Model: typeof MemoriaModel,
    targetState?: ModelRef[]
  ): Promise<ModelRef[]> {
    Model.cache.length = 0;

    if (targetState) {
      await insertFixturesWithTypechecks(Model, targetState);
    }

    return Model.cache;
  }

  static async resetRecords(
    Model: typeof MemoriaModel,
    targetState?: ModelRef[]
  ): Promise<ModelRef[]> {
    return await this.resetCache(Model, targetState);
  }

  static peek(
    Model: typeof MemoriaModel,
    primaryKey: primaryKey | primaryKey[]
  ): ModelRef[] | ModelRef | void {
    if (Array.isArray(primaryKey as primaryKey[])) {
      return Array.from(Model.cache).reduce((result: ModelRef[], model: ModelRef) => {
        const foundModel = (primaryKey as primaryKey[]).includes(model[Model.primaryKeyName])
          ? model
          : null;

        return foundModel ? result.concat([foundModel]) : result;
      }, []) as ModelRef[];
    } else if (typeof primaryKey === "number" || typeof primaryKey === "string") {
      return Array.from(Model.cache).find(
        (model: ModelRef) => model[Model.primaryKeyName] === primaryKey
      ) as ModelRef | undefined;
    }

    throw new Error(
      kleur.red(`[Memoria] ${Model.name}.find(id) cannot be called without a valid id`)
    );
  }

  static peekBy(Model: typeof MemoriaModel, queryObject: object): ModelRef | void {
    if (!queryObject) {
      throw new Error(
        kleur.red(`[Memoria] ${Model.name}.findBy(id) cannot be called without a parameter`)
      );
    }

    let keys = Object.keys(queryObject);

    return Model.cache.find((model: ModelRef) => comparison(model, queryObject, keys, 0));
  }

  static peekAll(Model: typeof MemoriaModel, queryObject: object = {}): ModelRef[] | void {
    let keys = Object.keys(queryObject);
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
    let modelId = model[Model.primaryKeyName];
    if (modelId) {
      let foundModel = await this.find(Model, modelId);

      return foundModel ? await this.update(Model, model) : await this.insert(Model, model);
    }

    return await this.insert(Model, model);
  }

  static async insert(Model: typeof MemoriaModel, model: QueryObject): Promise<ModelRef> {
    let filledModel = Object.assign({}, Store.getDefaultValues(Model, "insert"), model); // TODO: maybe remove this var in future
    let target = new Model(
      Array.from(Model.columnNames).reduce((result: QueryObject, attribute: string) => {
        if (typeof filledModel[attribute] === "function") {
          result[attribute] = filledModel[attribute].apply(null, [Model]); // TODO: this changed
        } else if (!filledModel.hasOwnProperty(attribute)) {
          result[attribute] = null;
        } else {
          result[attribute] = filledModel[attribute];
        }

        return result;
      }, {})
    ) as ModelRef;

    primaryKeyTypeSafetyCheck(Model.primaryKeyType, target[Model.primaryKeyName], Model.name);

    let existingRecord = target.id
      ? await this.find(Model, target.id)
      : await this.findBy(Model, { uuid: target.uuid });
    if (existingRecord) {
      throw new Error(
        kleur.red(
          `[Memoria] ${Model.name} ${Model.primaryKeyName} ${
            target[Model.primaryKeyName]
          } already exists in the database! ${Model.name}.insert(${inspect(model)}) fails`
        )
      );
    }

    Model.cache.push(target as ModelRef);

    return target as ModelRef;
  }

  // TODO: HANDLE updateDate default generation
  static async update(Model: typeof MemoriaModel, record: ModelRef): Promise<ModelRef> {
    if (!record || (!record.id && !record.uuid)) {
      throw new Error(
        kleur.red(
          `[Memoria] ${Model.name}.update(record) requires id or uuid primary key to update a record`
        )
      );
    }

    let targetRecord = record.id
      ? await this.find(Model, record.id)
      : await this.findBy(Model, { uuid: record.uuid });
    let primaryKey = Model.primaryKeyName;
    if (!targetRecord) {
      throw new Error(
        kleur.red(
          `[Memoria] ${Model.name}.update(record) failed because ${Model.name} with ${primaryKey}: ${record[primaryKey]} does not exist`
        )
      );
    }

    let recordsUnknownAttribute = Object.keys(record).find(
      (attribute) => !Model.columnNames.has(attribute)
    );
    if (recordsUnknownAttribute) {
      throw new Error(
        kleur.red(
          `[Memoria] ${Model.name}.update ${primaryKey}: ${record[primaryKey]} fails, ${Model.name} model does not have ${recordsUnknownAttribute} attribute to update`
        )
      );
    }

    let defaultColumnsForUpdate = Store.getDefaultValues(Model, "update");
    return Object.assign(
      targetRecord,
      Object.keys(defaultColumnsForUpdate).reduce((result: QueryObject, keyName) => {
        if (typeof defaultColumnsForUpdate[keyName] === "function") {
          result[keyName] = defaultColumnsForUpdate[keyName].apply(null, [Model]);
        }

        return result;
      }, {}),
      record
    );
  }

  // TODO: HANDLE deleteDate generation
  static unload(Model: typeof MemoriaModel, record: ModelRef): ModelRef {
    if (Model.cache.length === 0) {
      throw new Error(
        kleur.red(
          `[Memoria] ${Model.name} has no records in the database to delete. ${
            Model.name
          }.delete(${inspect(record)}) failed`
        )
      );
    } else if (!record) {
      throw new Error(
        kleur.red(
          `[Memoria] ${Model.name}.delete(model) model object parameter required to delete a model`
        )
      );
    }

    let targetRecord = record.id
      ? (this.peek(Model, record.id) as ModelRef)
      : (this.peekBy(Model, { uuid: record.uuid }) as ModelRef);
    if (!targetRecord) {
      throw new Error(
        kleur.red(
          `[Memoria] Could not find ${Model.name} with ${Model.primaryKeyName} ${
            record[Model.primaryKeyName]
          } to delete. ${Model.name}.delete(${inspect(record)}) failed`
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

// NOTE: if records were ordered by ID, then there could be performance benefit
function comparison(model: ModelRef, options: QueryObject, keys: string[], index = 0): boolean {
  const key = keys[index];

  if (keys.length === index) {
    return model[key] === options[key];
  } else if (model[key] === options[key]) {
    return comparison(model, options, keys, index + 1);
  }

  return false;
}
