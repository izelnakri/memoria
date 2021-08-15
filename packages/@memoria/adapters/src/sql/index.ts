import kleur from "kleur";
import inspect from "object-inspect";
import { Connection, createConnection, EntitySchema } from "typeorm";
import Decorators from "./decorators/index.js";
import { primaryKeyTypeSafetyCheck } from "../utils.js";
import MemoryAdapter from "../memory/index.js";
import MemoriaModel, { Config } from "@memoria/model";
import type { ModelRef } from "@memoria/model";

type primaryKey = number | string;
type QueryObject = { [key: string]: any };

interface FreeObject {
  [key: string]: any;
}

// TODO: add maxExecutionTime? if make everything from queryBuiler
// Model itself should really be the entity? Otherwise Relationship references might not work?!: Never verified.
// TODO: also allow manual id insertion
//     orderBy: {
//     name: "ASC",
//     id: "DESC"
// }

export default class SQLAdapter extends MemoryAdapter {
  static Decorators = Decorators;

  static logging = true;
  static CONNECTION_OPTIONS = {
    type: "postgres",
    host: "localhost",
    port: 5432,
    synchronize: true,
    username: "postgres",
    password: "postgres",
    database: "postgres",
  };

  static async resetSchemas(Config: Config, modelName?: string): Promise<Config> {
    if (modelName) {
      throw new Error(
        "$Model.resetSchemas(modelName) not supported for SQLAdapter yet. Use $Model.resetSchemas()"
      );
    }
    let connection = await this.getConnection();

    await connection.dropDatabase();
    await super.resetSchemas(Config, modelName);

    // NOTE: uncommenting this breaks test builds on static imports. Check if this is even needed, or there is another way:
    // import { PlatformTools } from "typeorm/platform/PlatformTools.js";
    // import { MetadataArgsStorage } from "typeorm/metadata-args/MetadataArgsStorage.js";
    // let globalScope = PlatformTools.getGlobalVariable();
    // globalScope.typeormMetadataArgsStorage = new MetadataArgsStorage();

    await connection.close();
  }

  static async resetForTests(Config: Config, modelName?: string): Promise<Config> {
    await super.resetForTests(Config, modelName);

    let tableNames = Config.Schemas.map((schema) => `"${schema.target.tableName}"`);
    let Manager = await this.getEntityManager();

    return await Manager.query(`TRUNCATE TABLE ${tableNames.join(", ")} RESTART IDENTITY`); // NOTE: research CASCADE
  }

  static _connection: null | FreeObject = null;
  static async getConnection() {
    if (this._connection && this._connection.isConnected) {
      return this._connection;
    }

    // @ts-ignore
    this._connection = (await createConnection({
      entities: Config.Schemas.map((schema) => new EntitySchema(schema)),
      ...{ logging: this.logging, ...this.CONNECTION_OPTIONS },
    })) as Connection;

    return this._connection;
  }

  static async getEntityManager() {
    let connection = await this.getConnection();
    return connection.manager;
  }

  static async resetRecords(
    Model: typeof MemoriaModel,
    targetState?: ModelRef[]
  ): Promise<void | MemoriaModel[]> {
    let Manager = await this.getEntityManager();

    await Manager.clear(Model);

    if (targetState) {
      targetState.forEach((fixture) => {
        if (!fixture.hasOwnProperty(Model.primaryKeyName)) {
          throw new Error(
            kleur.red(
              `[Memoria] A ${Model.name} record is missing a primary key(${Model.primaryKeyName}) to add to DB. Please make sure all your ${Model.name} fixtures have ${Model.primaryKeyName} key`
            )
          );
        }

        primaryKeyTypeSafetyCheck(Model, fixture[Model.primaryKeyName]);
      });

      targetState.reduce((result, fixture) => {
        if (!(Model.primaryKeyName in fixture)) {
          return result;
        }

        let primaryKey = fixture[Model.primaryKeyName];
        if (result.includes(primaryKey)) {
          throw new Error(
            `[Memoria] ${Model.name}.resetRecords(records) fails: ${Model.primaryKeyName} ${primaryKey} already exists in the database!`
          );
        }

        result.push(primaryKey);

        return result;
      }, [] as any[]);

      return await this.insertAll(Model, targetState);
    }
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

    if (Array.isArray(primaryKey)) {
      return await Manager.findByIds(Model, primaryKey);
    }

    return await Manager.findOne(Model, primaryKey);
  }

  static async findBy(
    Model: typeof MemoriaModel,
    queryObject: object
  ): Promise<MemoriaModel | void> {
    if (!queryObject) {
      throw new Error(
        kleur.red(`[Memoria] ${Model.name}.findBy(id) cannot be called without a parameter`)
      );
    }

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

  static async save(Model: typeof MemoriaModel, model: ModelRef): Promise<MemoriaModel> {
    let Manager = await this.getEntityManager();
    let result = await Manager.save(Model, model);

    return this.build(Model, result.generatedMaps[0]);
  }

  static async insert(Model: typeof MemoriaModel, model: QueryObject): Promise<MemoriaModel> {
    let targetColumnNames = Object.keys(model).filter((key) => Model.columnNames.has(key));
    let Manager = await this.getEntityManager();
    let result = await Manager.createQueryBuilder()
      .insert()
      .into(Model, targetColumnNames)
      .values(
        targetColumnNames.reduce(
          (result, columnName: string) =>
            Object.assign(result, { [columnName]: model[columnName] }),
          Object.assign({}, model)
        )
      )
      .returning("*")
      .execute();
    if (Model.primaryKeyType === "id" && model[Model.primaryKeyName]) {
      let tableName = Manager.connection.entityMetadatas.find(
        (metadata) => metadata.targetName === Model.name
      ).tableName;
      await Manager.query(
        `SELECT setval(pg_get_serial_sequence('${tableName}', '${Model.primaryKeyName}'), (SELECT MAX(${Model.primaryKeyName}) FROM "${tableName}"), true)`
      );
    }

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

  static async delete(Model: typeof MemoriaModel, record: ModelRef): Promise<MemoriaModel> {
    if (!record) {
      throw new Error(
        kleur.red(
          `[Memoria] ${Model.name}.delete(model) model object parameter required to delete a model`
        )
      );
    }

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
    models.map((model) => {
      return model[Model.primaryKeyName];
    });

    // TODO: problem, when duplicate ids provided sequence increments one of them!!
    let Manager = await this.getEntityManager();
    let result = await Manager.createQueryBuilder()
      .insert()
      .into(Model, Model.columnNames)
      .values(models)
      .returning("*")
      .execute();
    // await Manager.query(
    //   `SELECT setval(pg_get_serial_sequence('${tableName}', '${Model.primaryKeyName}'), (SELECT MAX(${Model.primaryKeyName}) FROM "${tableName}"), true)`
    // );

    return result.raw.map((rawResult) => this.build(Model, rawResult));
  }

  static async updateAll(_Model: typeof MemoriaModel, models: ModelRef[]): Promise<MemoriaModel[]> {
    // TODO: test when pure objects are provided
    let Manager = await this.getEntityManager();

    return await Manager.save(models);
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
