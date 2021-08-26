// TODO: memory adapter also needs to handle instances + instances w relationships correctly
// TODO: insert( has a major bug, maybe fixed maybe need init object on reduce
// Model.columnNames doesnt need to be array?!? on queryBuilder
// SQL updateAll is buggy because of relationship references

// TODO: filter relationships on insert, update, delete, insertAll, updateAll, deleteAll
import kleur from "kleur";
import { Connection, createConnection, EntitySchema } from "typeorm";
import Decorators from "./decorators/index.js";
import { primaryKeyTypeSafetyCheck } from "../utils.js";
import MemoryAdapter from "../memory/index.js";
import MemoriaModel, { Config } from "@memoria/model";
import type { ModelRef } from "@memoria/model";

type primaryKey = number | string;
type QueryObject = { [key: string]: any };
type ModelRefOrInstance = ModelRef | MemoriaModel;

interface FreeObject {
  [key: string]: any;
}
// TODO: this.cache() adds to Cache, needs relationships handling

// TODO: add maxExecutionTime? if make everything from queryBuiler
// Model itself should really be the entity? Otherwise Relationship references might not work?!: Never verified.
// TODO: also allow manual id insertion
//     orderBy: {
//     name: "ASC",
//     id: "DESC"
// }

// NOTE: if record exists in this.cache returns the existing record
// cache and push the same thing?
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

  static _connection: null | FreeObject = null;
  static async getConnection() {
    if (this._connection && this._connection.isConnected) {
      return this._connection;
    }

    // @ts-ignore
    this._connection = (await createConnection({
      // @ts-ignore
      entities: Config.Schemas.map((schema) => new EntitySchema(schema)),
      ...{ logging: this.logging, ...this.CONNECTION_OPTIONS },
    })) as Connection;

    return this._connection;
  }

  static async getEntityManager() {
    let connection = await this.getConnection();
    return connection.manager;
  }

  static async resetSchemas(Config, modelName?: string): Promise<Config> {
    if (modelName) {
      throw new Error(
        "$Model.resetSchemas(modelName) not supported for SQLAdapter yet. Use $Model.resetSchemas()"
      );
    }
    let connection = await this.getConnection();

    await connection.dropDatabase();
    await super.resetSchemas(Config, modelName);

    // TODO: check if this is needed to clear typeorm MetadataArgsStore:
    // NOTE: uncommenting this breaks test builds on static imports. Check if this is even needed, or there is another way:
    // import { PlatformTools } from "typeorm/platform/PlatformTools.js";
    // import { MetadataArgsStorage } from "typeorm/metadata-args/MetadataArgsStorage.js";
    // let globalScope = PlatformTools.getGlobalVariable();
    // globalScope.typeormMetadataArgsStorage = new MetadataArgsStorage();

    await connection.close();

    return Config;
  }

  static async resetForTests(Config, modelName?: string): Promise<Config> {
    await super.resetForTests(Config, modelName);

    let tableNames = Config.Schemas.map((schema) => `"${schema.target.tableName}"`);
    let Manager = await this.getEntityManager();

    return await Manager.query(`TRUNCATE TABLE ${tableNames.join(", ")} RESTART IDENTITY`); // NOTE: research CASCADE
  }

  static async resetRecords(
    Model: typeof MemoriaModel,
    targetState?: ModelRefOrInstance[]
  ): Promise<void | MemoriaModel[]> {
    let Manager = await this.getEntityManager();

    await Manager.clear(Model);
    await super.resetRecords(Model, targetState);

    if (targetState) {
      return await this.insertAll(Model, targetState);
    }
  }

  static cache(Model: typeof MemoriaModel, record: ModelRefOrInstance): MemoriaModel {
    if (!record.hasOwnProperty(Model.primaryKeyName)) {
      throw new Error(
        kleur.red(
          `[Memoria] CacheError: A ${Model.name} Record is missing a primary key(${Model.primaryKeyName}) to add to cache. Please make sure all your ${Model.name} fixtures have ${Model.primaryKeyName} key`
        )
      );
    }

    primaryKeyTypeSafetyCheck(Model, record[Model.primaryKeyName]);

    let foundInCache = this.peek(Model, record[Model.primaryKeyName]);
    if (foundInCache) {
      return foundInCache;
    }

    let target = cleanRelationships(
      Model,
      record instanceof Model ? record : this.build(Model, record)
    );

    Model.Cache.push(target);

    return target;
  }

  static async count(Model: typeof MemoriaModel, options?: object): Promise<number> {
    let Manager = await this.getEntityManager();

    return options ? await Manager.count(Model, options) : await Manager.count(Model);
  }

  static async find(
    Model: typeof MemoriaModel,
    primaryKey: primaryKey | primaryKey[]
  ): Promise<MemoriaModel[] | MemoriaModel | void> {
    let Manager = await this.getEntityManager();

    if (Array.isArray(primaryKey)) {
      // TODO: this might also need adjustments/move to normal query
      let foundModels = await Manager.findByIds(Model, primaryKey, {
        order: { [Model.primaryKeyName]: "ASC" },
      });
      return foundModels.map((model) => this.cache(Model, model));
    }

    let foundModel = await Manager.findOne(Model, primaryKey);
    return this.cache(Model, foundModel);
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
    let foundModel = await Manager.findOne(Model, queryObject);

    return this.cache(Model, foundModel);
  }

  static async findAll(
    Model: typeof MemoriaModel,
    queryObject: object = {}
  ): Promise<MemoriaModel[] | void> {
    let Manager = await this.getEntityManager();
    let query = await Manager.createQueryBuilder(Model, Model.tableName).orderBy(
      `${Model.tableName}.${Model.primaryKeyName}`,
      "ASC"
    );

    if (queryObject) {
      query.where(buildWhereSQLQueryFromObject(Model.tableName, queryObject), queryObject);
    }

    let result = await query.getMany();

    return result.map((model) => this.cache(Model, model));
  }

  // TODO: check actions from here!! for relationship CRUD
  static async save(
    Model: typeof MemoriaModel,
    record: QueryObject | ModelRefOrInstance
  ): Promise<MemoriaModel> {
    let Manager = await this.getEntityManager();
    let resultRaw = await Manager.save(Model, cleanRelationships(Model, record));
    let result = this.build(Model, resultRaw.generatedMaps[0]) as ModelRef;

    if (this.peek(Model, result[Model.primaryKeyName])) {
      return await super.update(Model, result); // NOTE: this could be problematic
    }

    return this.push(Model, result); // TODO: save the cache olmaz cunku bulursa onu return ediyor
  }

  static async insert(
    Model: typeof MemoriaModel,
    record: QueryObject | ModelRefOrInstance
  ): Promise<MemoriaModel> {
    let target = Object.keys(record).reduce((result, columnName) => {
      if (Model.columnNames.has(columnName)) {
        return Object.assign(result, { [columnName]: record[columnName] });
      }

      return result;
    }, {});
    let Manager = await this.getEntityManager();
    let result = await Manager.createQueryBuilder()
      .insert()
      .into(Model, Object.keys(target))
      .values(target)
      .returning("*")
      .execute();

    // NOTE: this updates postgres sequence by max id, important when id provided
    if (Model.primaryKeyType === "id" && record[Model.primaryKeyName]) {
      let tableName = Manager.connection.entityMetadatas.find(
        (metadata) => metadata.targetName === Model.name
      ).tableName;
      await Manager.query(
        `SELECT setval(pg_get_serial_sequence('${tableName}', '${Model.primaryKeyName}'), (SELECT MAX(${Model.primaryKeyName}) FROM "${tableName}"), true)`
      );
    }

    return this.cache(Model, result.generatedMaps[0]);
  }

  static async update(
    Model: typeof MemoriaModel,
    record: ModelRefOrInstance
  ): Promise<MemoriaModel> {
    let primaryKeyName = Model.primaryKeyName;
    let Manager = await this.getEntityManager();
    let resultRaw = await Manager.createQueryBuilder()
      .update(Model)
      .set(record)
      .where(`${primaryKeyName} = :${primaryKeyName}`, { [primaryKeyName]: record[primaryKeyName] })
      .returning("*")
      .execute();
    let result = this.build(Model, resultRaw.raw[0]) as ModelRef;

    if (this.peek(Model, result[Model.primaryKeyName])) {
      return await super.update(Model, result); // NOTE: this could be problematic
    }

    return this.push(Model, result) as MemoriaModel;
  }

  // NOTE: test this delete function when id isnt provided or invalid
  static async delete(
    Model: typeof MemoriaModel,
    record: ModelRefOrInstance
  ): Promise<MemoriaModel> {
    if (!record) {
      throw new Error(
        kleur.red(
          `[Memoria] ${Model.name}.delete(model) model object parameter required to delete a model`
        )
      );
    }

    let primaryKeyName = Model.primaryKeyName;
    let Manager = await this.getEntityManager();
    let resultRaw = await Manager.createQueryBuilder()
      .delete()
      .from(Model)
      .where(`${primaryKeyName} = :${primaryKeyName}`, { [primaryKeyName]: record[primaryKeyName] })
      .returning("*")
      .execute();
    let result = resultRaw.raw[0];

    if (this.peek(Model, result[Model.primaryKeyName])) {
      return await super.delete(Model, result); // NOTE: this could be problematic
    }

    return this.build(Model, result);
  }

  static async saveAll(
    Model: typeof MemoriaModel,
    records: ModelRefOrInstance[]
  ): Promise<MemoriaModel[]> {
    // TODO: this should do both insertAll or updateAll based on the scenario
    let Manager = await this.getEntityManager();
    let results = await Manager.save(
      records.map((record) => cleanRelationships(Model, this.build(Model, record)))
    );

    return results.map((result) => this.push(Model, result));
  }

  // TODO: check this:
  static async insertAll(
    Model: typeof MemoriaModel,
    records: ModelRefOrInstance[]
  ): Promise<MemoriaModel[]> {
    let providedIds = records.reduce((result: primaryKey[], record) => {
      if (Model.primaryKeyName in record) {
        let primaryKey = record[Model.primaryKeyName] as primaryKey;
        if (result.includes(primaryKey)) {
          throw new Error(
            `[Memoria] ${Model.name}.insertAll(records) fails: ${Model.primaryKeyName} ${primaryKey} is duplicate in records array!`
          );
        }

        result.push(primaryKey);
      }

      return result;
    }, []);

    let Manager = await this.getEntityManager();
    let result = await Manager.createQueryBuilder()
      .insert()
      .into(Model, Model.columnNames)
      .values(records) // NOTE: probably doent need relationships filter as it is
      .returning("*")
      .execute();

    if (providedIds[0] && typeof providedIds[0] === "number") {
      let tableName = Manager.connection.entityMetadatas.find(
        (metadata) => metadata.targetName === Model.name
      ).tableName;
      await Manager.query(
        `SELECT setval(pg_get_serial_sequence('${tableName}', '${Model.primaryKeyName}'), (SELECT MAX(${Model.primaryKeyName}) FROM "${tableName}"), true)`
      );
    }

    return result.raw.map((rawResult) => this.cache(Model, rawResult));
  }

  // In future, optimize query: https://stackoverflow.com/questions/18797608/update-multiple-rows-in-same-query-using-postgresql
  static async updateAll(
    Model: typeof MemoriaModel,
    records: ModelRefOrInstance[]
  ): Promise<MemoriaModel[]> {
    // TODO: model always expects them to be instance!! Do not use save function!
    let Manager = await this.getEntityManager();
    let results = await Manager.save(
      records.map((model) => cleanRelationships(Model, this.build(Model, model)))
    );

    return results.map((result) => this.push(Model, result));
  }

  static async deleteAll(
    Model: typeof MemoriaModel,
    records: ModelRefOrInstance[]
  ): Promise<MemoriaModel[]> {
    if (!records) {
      throw new Error(
        kleur.red(`[Memoria] ${Model.name}.deleteAll(records) need an array of models!`)
      );
    }

    let Manager = await this.getEntityManager();
    let targetPrimaryKeys = records.map((model) => model[Model.primaryKeyName]);
    let result = await Manager.createQueryBuilder()
      .delete()
      .from(Model)
      .whereInIds(targetPrimaryKeys)
      .returning("*")
      .execute();

    await this.unloadAll(Model, this.peekAll(Model, targetPrimaryKeys) as MemoriaModel[]);

    return result.raw.map((rawResult) => this.build(Model, rawResult));
  }
}

function cleanRelationships(Model, instance) {
  Object.keys(Model.relationships).forEach((relationshipKey) => {
    if (relationshipKey in instance) {
      instance[relationshipKey] = undefined;
    }
  });

  return instance;
}

function buildWhereSQLQueryFromObject(aliasName: string, query: QueryObject) {
  return Object.keys(query).reduce((result, keyName) => {
    if (result === "") {
      return `${aliasName}.${keyName} = :${keyName}`;
    }

    return `${result} AND ${aliasName}.${keyName} = :${keyName}`;
  }, "");
}
