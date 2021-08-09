import kleur from "kleur";
import inspect from "object-inspect";
import { Connection, createConnection, EntitySchema } from "typeorm";
import Decorators from "./decorators/index.js";
import { primaryKeyTypeSafetyCheck } from "../utils.js";
import MemoriaModel, { Store } from "@memoria/model";
import type { ModelRef } from "@memoria/model";

type primaryKey = number | string;
type QueryObject = { [key: string]: any };

interface FreeObject {
  [key: string]: any;
}

// TODO: save, saveAll, insertAll, updateAll, deleteAll, resetRecords, push, cache,

// TODO: add maxExecutionTime? if make everything from queryBuiler
// Model itself should really be the entity? Otherwise Relationship references might not work?!: Never verified.
export default class SQLAdapter {
  static Decorators = Decorators;

  static CONNECTION_OPTIONS = {
    type: "postgres",
    host: "localhost",
    port: 5432,
    synchronize: true,
    username: "postgres",
    password: "postgres",
    database: "postgres",
  };
  static _connection: null | FreeObject = null;
  static async getConnection() {
    if (this._connection && this._connection.isConnected) {
      return this._connection;
    }

    // @ts-ignore
    Store.Entities = Store.Schemas.map((schema) => new EntitySchema(schema));
    // @ts-ignore
    this._connection = (await createConnection({
      entities: Store.Entities,
      ...this.CONNECTION_OPTIONS,
    })) as Connection;

    return this._connection;
  }
  static async getEntityManager() {
    let connection = await this.getConnection();
    return connection.manager;
  }

  static build(Model: typeof MemoriaModel, options): MemoriaModel {
    let model = new Model(options);

    Object.keys(model).forEach((keyName: string) => {
      model[keyName] = keyName in options ? options[keyName] : model[keyName] || null;
    });

    return Object.seal(model);
  }

  static push(_model: QueryObject): void | MemoriaModel {
    // TODO: make this work, should check relationships and push to relationships if they exist
  }

  static resetCache(Model: typeof MemoriaModel, targetState?: ModelRef[]): MemoriaModel[] {
    Model.Cache.length = 0;

    if (targetState) {
      targetState.map((targetFixture) => this.cache(Model, targetFixture));
    }

    return Model.Cache;
  }

  static async resetRecords(
    Model: typeof MemoriaModel,
    targetState?: ModelRef[]
  ): Promise<void | MemoriaModel[]> {
    let Manager = await this.getEntityManager();

    await Manager.clear(Model);

    if (targetState) {
      return await this.insertAll(Model, targetState);
    }
  }

  static peek(
    Model: typeof MemoriaModel,
    primaryKey: primaryKey | primaryKey[]
  ): MemoriaModel[] | MemoriaModel | void {
    if (Array.isArray(primaryKey as primaryKey[])) {
      return Array.from(Model.Cache).reduce((result: ModelRef[], model: ModelRef) => {
        const foundModel = (primaryKey as primaryKey[]).includes(model[Model.primaryKeyName])
          ? model
          : null;

        return foundModel ? result.concat([foundModel]) : result;
      }, []) as ModelRef[];
    } else if (typeof primaryKey === "number" || typeof primaryKey === "string") {
      return Array.from(Model.Cache).find(
        (model: ModelRef) => model[Model.primaryKeyName] === primaryKey
      ) as ModelRef | undefined;
    }

    throw new Error(
      kleur.red(`[Memoria] ${Model.name}.find(id) cannot be called without a valid id`)
    );
  }

  static peekBy(Model: typeof MemoriaModel, queryObject: object): MemoriaModel | void {
    if (!queryObject) {
      throw new Error(
        kleur.red(`[Memoria] ${Model.name}.findBy(id) cannot be called without a parameter`)
      );
    }

    let keys = Object.keys(queryObject);

    return Model.Cache.find((model: ModelRef) => comparison(model, queryObject, keys, 0));
  }

  static peekAll(Model: typeof MemoriaModel, queryObject: object = {}): MemoriaModel[] | void {
    let keys = Object.keys(queryObject);
    if (keys.length === 0) {
      return Array.from(Model.Cache);
    }

    return Array.from(Model.Cache as MemoriaModel[]).filter((model: MemoriaModel) =>
      comparison(model as ModelRef, queryObject, keys, 0)
    );
  }

  static async count(Model: typeof MemoriaModel, options?: object): Promise<number> {
    let Manager = await this.getEntityManager();

    if (options) {
      return await Manager.count(Model, options); // TODO: update this
    }

    return await Manager.count(Model); // TODO: update this
  }

  static async find(
    Model: typeof MemoriaModel,
    primaryKey: primaryKey | primaryKey[]
  ): Promise<MemoriaModel[] | MemoriaModel | void> {
    let Manager = await this.getEntityManager();

    return await Manager.findOne(Model, primaryKey);
  }

  static async findBy(
    Model: typeof MemoriaModel,
    queryObject: object
  ): Promise<MemoriaModel | void> {
    let Manager = await this.getEntityManager();

    return await Manager.findOne(Model, queryObject);
  }

  static async findAll(
    Model: typeof MemoriaModel,
    queryObject: object = {}
  ): Promise<MemoriaModel[] | void> {
    let Manager = await this.getEntityManager();

    return await Manager.find(Model, queryObject);
  }

  static cache(Model: typeof MemoriaModel, fixture: ModelRef): MemoriaModel {
    if (!fixture.hasOwnProperty(Model.primaryKeyName)) {
      throw new Error(
        kleur.red(
          `[Memoria] CacheError: A ${Model.name} Record is missing a primary key(${Model.primaryKeyName}) to add to cache. Please make sure all your ${Model.name} fixtures have ${Model.primaryKeyName} key`
        )
      );
    }

    primaryKeyTypeSafetyCheck(Model, fixture[Model.primaryKeyName]);

    if (this.peek(Model, fixture[Model.primaryKeyName])) {
      throw new Error(
        kleur.red(
          `[Memoria] CacheError: ${Model.name}.cache() fails: ${Model.primaryKeyName} ${
            fixture[Model.primaryKeyName]
          } already exists in the cache! `
        )
      );
    }

    let target = this.build(Model, fixture);

    Model.Cache.push(target);

    return target;
  }

  static async save(Model: typeof MemoriaModel, model: ModelRef): Promise<MemoriaModel> {
    let Manager = await this.getEntityManager();
    let result = await Manager.save(Model, model);

    return this.build(Model, result.generatedMaps[0]);
  }

  static async insert(Model: typeof MemoriaModel, model: QueryObject): Promise<MemoriaModel> {
    let Manager = await this.getEntityManager();
    let result = await Manager.insert(Model, model);

    return this.build(Model, result.generatedMaps[0]);
  }

  static async update(Model: typeof MemoriaModel, record: ModelRef): Promise<ModelRef> {
    let primaryKeyName = Model.primaryKeyName;
    let Manager = await this.getEntityManager();
    let result = await Manager.createQueryBuilder()
      .update(Model)
      .set(record)
      .where(`${primaryKeyName} = :${primaryKeyName}`, { [primaryKeyName]: record[primaryKeyName] })
      .returning("*")
      .execute();

    return this.build(Model, result.raw[0]) as ModelRef;
  }

  // TODO: HANDLE deleteDate generation
  static unload(Model: typeof MemoriaModel, record: ModelRef): ModelRef {
    if (Model.Cache.length === 0) {
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

    let targetRecord = this.peek(Model, record[Model.primaryKeyName]) as ModelRef;
    if (!targetRecord) {
      throw new Error(
        kleur.red(
          `[Memoria] Could not find ${Model.name} with ${Model.primaryKeyName}: ${
            record[Model.primaryKeyName]
          } to delete. ${Model.name}.delete(${inspect(record)}) failed`
        )
      );
    }

    let targetIndex = Model.Cache.indexOf(targetRecord);

    Model.Cache.splice(targetIndex, 1);

    return targetRecord;
  }

  static async delete(Model: typeof MemoriaModel, record: ModelRef): Promise<MemoriaModel> {
    let primaryKeyName = Model.primaryKeyName;
    let Manager = await this.getEntityManager();
    let result = await Manager.createQueryBuilder()
      .delete()
      .from(Model)
      .where(`${primaryKeyName} = :${primaryKeyName}`, { [primaryKeyName]: record[primaryKeyName] })
      .returning("*")
      .execute();

    return this.build(Model, result.raw[0]);
  }

  static async saveAll(_Model: typeof MemoriaModel, models: ModelRef[]): Promise<MemoriaModel[]> {
    let Manager = await this.getEntityManager();

    return await Manager.save(models);
  }

  static async insertAll(Model: typeof MemoriaModel, models: ModelRef[]): Promise<MemoriaModel[]> {
    let Manager = await this.getEntityManager();
    let result = await Manager.createQueryBuilder()
      .insert()
      .into(Model)
      .values(models)
      .returning("*")
      .execute();

    return result.raw.map((rawResult) => this.build(Model, rawResult));
  }

  static async updateAll(_Model: typeof MemoriaModel, models: ModelRef[]): Promise<MemoriaModel[]> {
    // TODO: test when pure objects are provided
    let Manager = await this.getEntityManager();

    return await Manager.save(models);
  }

  static unloadAll(Model: typeof MemoriaModel, models?: ModelRef[]): void {
    if (!models) {
      Model.Cache.length = 0;

      return;
    }

    return models.forEach((model) => this.unload(Model, model));
  }

  static async deleteAll(Model: typeof MemoriaModel, models: ModelRef[]): Promise<void> {
    if (!models) {
      throw new Error(
        kleur.red(`[Memoria] ${Model.name}.deleteAll(models) need an array of models!`)
      );
    }

    let Manager = await this.getEntityManager();
    let result = await Manager.createQueryBuilder()
      .delete()
      .from(Model)
      .whereInIds(models.map((model) => model[Model.primaryKeyName]))
      .returning("*")
      .execute();

    return result.raw.map((rawResult) => this.build(Model, rawResult));
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
