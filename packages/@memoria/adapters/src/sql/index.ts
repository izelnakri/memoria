// TODO: memory adapter also needs to handle relationships correctly
// SQL updateAll is buggy because of relationship references
import { Connection, createConnection, EntitySchema } from "typeorm";
import Decorators from "./decorators/index.js";
import MemoryAdapter from "../memory/index.js";
import MemoriaModel, {
  Changeset,
  Config,
  DeleteError,
  InsertError,
  UpdateError,
  RuntimeError,
} from "@memoria/model";
import type { PrimaryKey, ModelReference, ModelBuildOptions } from "@memoria/model";

type QueryObject = { [key: string]: any };
type ModelRefOrInstance = ModelReference | MemoriaModel;

interface FreeObject {
  [key: string]: any;
}

// TODO: add maxExecutionTime? if make everything from queryBuiler
// Model itself should really be the entity? Otherwise Relationship references might not work?!: Never verified.
export default class SQLAdapter extends MemoryAdapter {
  static Decorators = Decorators;

  static logging = true;
  static host = "localhost";
  static port = 5432;

  static CONNECTION_OPTIONS = {
    type: "postgres",
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
      ...{ logging: this.logging, host: this.host, port: this.port, ...this.CONNECTION_OPTIONS },
    })) as Connection;

    return this._connection;
  }

  static async getEntityManager() {
    let connection = await this.getConnection();
    return connection.manager;
  }

  static async resetSchemas(Config, Model?: typeof MemoriaModel): Promise<Config> {
    if (Model) {
      throw new RuntimeError(
        "$Model.resetSchemas($Model) not supported for SQLAdapter yet. Use $Model.resetSchemas()"
      );
    }
    let connection = await this.getConnection();

    await connection.dropDatabase();
    await super.resetSchemas(Config, Model);

    // TODO: check if this is needed to clear typeorm MetadataArgsStore:
    // NOTE: uncommenting this breaks test builds on static imports. Check if this is even needed, or there is another way:
    // import { PlatformTools } from "typeorm/platform/PlatformTools.js";
    // import { MetadataArgsStorage } from "typeorm/metadata-args/MetadataArgsStorage.js";
    // let globalScope = PlatformTools.getGlobalVariable();
    // globalScope.typeormMetadataArgsStorage = new MetadataArgsStorage();

    await connection.close();

    return Config;
  }

  static async resetRecords(
    Model?: typeof MemoriaModel,
    targetState?: ModelRefOrInstance[],
    options?: ModelBuildOptions
  ): Promise<MemoriaModel[]> {
    let Manager = await this.getEntityManager();

    if (Model) {
      await Manager.clear(Model);

      if (targetState) {
        let records = await this.insertAll(Model, targetState, options);

        return await this.resetCache(
          Model,
          records,
          Object.assign({}, options, { revision: false })
        );
      }

      return await this.resetCache(Model, [], options);
    }

    let tableNames = Config.Schemas.map((schema) => `"${schema.target.tableName}"`);

    await Manager.query(`TRUNCATE TABLE ${tableNames.join(", ")} RESTART IDENTITY`); // NOTE: investigate CASCADE case

    return await super.resetRecords(Model, targetState, options);
  }

  static async count(Model: typeof MemoriaModel, query?: QueryObject): Promise<number> {
    let Manager = await this.getEntityManager();

    return query ? await Manager.count(Model, query) : await Manager.count(Model);
  }

  static async find(
    Model: typeof MemoriaModel,
    primaryKey: PrimaryKey | PrimaryKey[],
    options?: ModelBuildOptions
  ): Promise<MemoriaModel[] | MemoriaModel | void> {
    let Manager = await this.getEntityManager();

    try {
      if (Array.isArray(primaryKey)) {
        // TODO: this might also need adjustments/move to normal query
        let foundModels = await Manager.findByIds(Model, primaryKey, {
          order: { [Model.primaryKeyName]: "ASC" },
        });
        return foundModels.map((model) => this.cache(Model, model, options));
      } else if (typeof primaryKey === "number" || typeof primaryKey === "string") {
        let foundModel = await Manager.findOne(Model, primaryKey);
        return this.cache(Model, foundModel, options);
      }
    } catch (error) {
      if (!error.code) {
        throw error;
      } else if (error.code === "22P02") {
        throw new RuntimeError(`${Model.name}.find() called without a valid primaryKey`);
      }

      throw error;
    }

    throw new RuntimeError(`${Model.name}.find() called without a valid primaryKey`);
  }

  static async findBy(
    Model: typeof MemoriaModel,
    queryObject: QueryObject,
    options?: ModelBuildOptions
  ): Promise<MemoriaModel | void> {
    let Manager = await this.getEntityManager();
    let foundModel = await Manager.findOne(Model, queryObject);

    return this.cache(Model, foundModel, options);
  }

  static async findAll(
    Model: typeof MemoriaModel,
    queryObject: QueryObject = {},
    options?: ModelBuildOptions
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

    return result.map((model) => this.cache(Model, model, options));
  }

  static async insert(
    Model: typeof MemoriaModel,
    record: QueryObject | ModelRefOrInstance,
    options?: ModelBuildOptions
  ): Promise<MemoriaModel> {
    let target = Object.keys(record).reduce((result, columnName) => {
      if (Model.columnNames.has(columnName)) {
        return Object.assign(result, { [columnName]: record[columnName] });
      }

      return result;
    }, {});

    try {
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

      return this.cache(Model, result.generatedMaps[0], options);
    } catch (error) {
      if (!error.code) {
        throw error;
      }

      if (error.code === "23505") {
        throw new InsertError(new Changeset(Model.build(target)), {
          id: target[Model.primaryKeyName],
          modelName: Model.name,
          attribute: Model.primaryKeyName,
          message: "already exists",
        });
      } else if (error.code === "22P02") {
        // NOTE: Wrong input type, entered string instead of number

        throw new RuntimeError(
          new Changeset(Model.build(target)),
          `Wrong ${Model.primaryKeyName} input type: entered ${typeof target[
            Model.primaryKeyName
          ]} instead of ${Model.primaryKeyType}`
        );
      }

      throw error;
    }
  }

  static async update(
    Model: typeof MemoriaModel,
    record: ModelRefOrInstance,
    options?: ModelBuildOptions
  ): Promise<MemoriaModel> {
    let primaryKeyName = Model.primaryKeyName;

    try {
      let Manager = await this.getEntityManager();
      let resultRaw = await Manager.createQueryBuilder()
        .update(Model)
        .set(
          Array.from(Model.columnNames).reduce((result: QueryObject, attribute: string) => {
            if (record.hasOwnProperty(attribute)) {
              result[attribute] = record[attribute];
            }

            return result;
          }, {})
        )
        .where(`${primaryKeyName} = :${primaryKeyName}`, {
          [primaryKeyName]: record[primaryKeyName],
        })
        .returning("*")
        .execute();
      let result = resultRaw.raw[0];
      if (!result || !result[Model.primaryKeyName]) {
        throw new UpdateError(new Changeset(Model.build(record)), {
          id: record[Model.primaryKeyName],
          modelName: Model.name,
          attribute: Model.primaryKeyName,
          message: "doesn't exist in database to update",
        });
      }

      if (this.peek(Model, result[Model.primaryKeyName])) {
        return await super.update(Model, result, options); // NOTE: this could be problematic
      }

      return this.cache(Model, result, options) as MemoriaModel;
    } catch (error) {
      throw error;
    }
  }

  // NOTE: test this delete function when id isnt provided or invalid
  static async delete(
    Model: typeof MemoriaModel,
    record: ModelRefOrInstance,
    options?: ModelBuildOptions
  ): Promise<MemoriaModel> {
    let primaryKeyName = Model.primaryKeyName;
    try {
      let Manager = await this.getEntityManager();
      let resultRaw = await Manager.createQueryBuilder()
        .delete()
        .from(Model)
        .where(`${primaryKeyName} = :${primaryKeyName}`, {
          [primaryKeyName]: record[primaryKeyName],
        })
        .returning("*")
        .execute();
      let result = resultRaw.raw[0];
      if (!result || !result[Model.primaryKeyName]) {
        throw new DeleteError(new Changeset(Model.build(record)), {
          id: record[Model.primaryKeyName],
          modelName: Model.name,
          attribute: Model.primaryKeyName,
          message: "doesn't exist in database to delete",
        });
      }

      if (this.peek(Model, result[Model.primaryKeyName])) {
        return await super.delete(Model, result, options); // NOTE: this could be problematic
      }

      return Model.build(result, Object.assign(options || {}, { isNew: false, isDeleted: true }));
    } catch (error) {
      throw error;
    }
  }

  // TODO: check this:
  static async insertAll(
    Model: typeof MemoriaModel,
    records: ModelRefOrInstance[],
    options?: ModelBuildOptions
  ): Promise<MemoriaModel[]> {
    let primaryKey = records.find((record) => record[Model.primaryKeyName]);
    try {
      let Manager = await this.getEntityManager();
      let result = await Manager.createQueryBuilder()
        .insert()
        .into(Model, Model.columnNames)
        .values(records) // NOTE: probably doent need relationships filter as it is
        .returning("*")
        .execute();

      if (primaryKey && typeof primaryKey === "number") {
        let tableName = Manager.connection.entityMetadatas.find(
          (metadata) => metadata.targetName === Model.name
        ).tableName;
        await Manager.query(
          `SELECT setval(pg_get_serial_sequence('${tableName}', '${Model.primaryKeyName}'), (SELECT MAX(${Model.primaryKeyName}) FROM "${tableName}"), true)`
        );
      }

      return result.raw.map((rawResult) => this.cache(Model, rawResult, options));
    } catch (error) {
      console.log(error);
      // TODO: implement custom error handling
      // if (!error.code) {
      //   throw error;
      // }

      // if (error.code === "23505") {
      //   throw new InsertError(new Changeset(Model.build(target)), {
      //     id: target[Model.primaryKeyName],
      //     modelName: Model.name,
      //     attribute: Model.primaryKeyName,
      //     message: "already exists",
      //   });
      // } else if (error.code === "22P02") {
      //   throw new RuntimeError(
      //     new Changeset(Model.build(target)),
      //     `${Model.name}.primaryKeyType is '${Model.primaryKeyType}'. Instead you've tried: ${
      //       target[Model.primaryKeyName]
      //     } with ${typeof target[Model.primaryKeyName]} type`
      //   );
      // }

      throw error;
    }
  }

  // In future, optimize query: https://stackoverflow.com/questions/18797608/update-multiple-rows-in-same-query-using-postgresql
  static async updateAll(
    Model: typeof MemoriaModel,
    records: ModelRefOrInstance[],
    options?: ModelBuildOptions
  ): Promise<MemoriaModel[]> {
    // TODO: model always expects them to be instance!! Do not use save function!
    let Manager = await this.getEntityManager();
    let results = await Manager.save(
      records.map((model) => cleanRelationships(Model, Model.build(model)))
    );

    return results.map((result) => this.cache(Model, result, options));
  }

  static async deleteAll(
    Model: typeof MemoriaModel,
    records: ModelRefOrInstance[],
    options?: ModelBuildOptions
  ): Promise<MemoriaModel[]> {
    let Manager = await this.getEntityManager();
    let targetPrimaryKeys = records.map((model) => model[Model.primaryKeyName]);
    let result = await Manager.createQueryBuilder()
      .delete()
      .from(Model)
      .whereInIds(targetPrimaryKeys)
      .returning("*")
      .execute();

    await this.unloadAll(Model, this.peekAll(Model, targetPrimaryKeys) as MemoriaModel[]);

    return result.raw.map((rawResult) =>
      Model.build(rawResult, Object.assign(options || {}, { isNew: false, isDeleted: true }))
    );
  }
}

function cleanRelationships(Model, instance) {
  Model.relationshipNames.forEach((relationshipKey) => {
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
