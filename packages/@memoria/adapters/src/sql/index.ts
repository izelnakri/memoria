import { Connection, createConnection, EntitySchema } from "typeorm";
import Decorators from "./decorators/index.js";
import MemoryAdapter from "../memory/index.js";
import MemoriaModel, {
  Changeset,
  Schema,
  DeleteError,
  InsertError,
  UpdateError,
  RuntimeError,
  RelationshipPromise,
  RelationshipSchema,
  RelationshipDB,
} from "@memoria/model";
import { prepareTargetObjectFromInstance } from "../utils.js";
import type { PrimaryKey, ModelReference, ModelBuildOptions, RelationshipMetadata } from "@memoria/model";

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
      entities: Schema.Schemas.map((schema) => new EntitySchema(schema)),
      ...{ logging: this.logging, host: this.host, port: this.port, ...this.CONNECTION_OPTIONS },
    })) as Connection;

    return this._connection;
  }

  static async getEntityManager() {
    let connection = await this.getConnection();
    return connection.manager;
  }

  static async resetSchemas(Schema, Model?: typeof MemoriaModel): Promise<Schema> {
    if (Model) {
      throw new RuntimeError("$Model.resetSchemas($Model) not supported for SQLAdapter yet. Use $Model.resetSchemas()");
    }
    let connection = await this.getConnection();

    await connection.dropDatabase();
    await super.resetSchemas(Schema, Model);

    // TODO: check if this is needed to clear typeorm MetadataArgsStore:
    // NOTE: uncommenting this breaks test builds on static imports. Check if this is even needed, or there is another way:
    // import { PlatformTools } from "typeorm/platform/PlatformTools.js";
    // import { MetadataArgsStorage } from "typeorm/metadata-args/MetadataArgsStorage.js";
    // let globalScope = PlatformTools.getGlobalVariable();
    // globalScope.typeormMetadataArgsStorage = new MetadataArgsStorage();

    await connection.close();

    return Schema;
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

        return await this.resetCache(Model, records, Object.assign({}, options, { revision: false }));
      }

      return await this.resetCache(Model, [], options);
    }

    let tableNames = Schema.Schemas.map((schema) => `"${schema.target.tableName}"`);

    await Manager.query(`TRUNCATE TABLE ${tableNames.join(", ")} RESTART IDENTITY`); // NOTE: investigate CASCADE case

    return await super.resetRecords(Model, targetState, options);
  }

  static async count(Model: typeof MemoriaModel, query?: QueryObject): Promise<number> {
    let Manager = await this.getEntityManager();

    return query ? await Manager.count(Model, query) : await Manager.count(Model);
  }

  // TODO: handle when one of the ids dont exist!
  static async find(
    Model: typeof MemoriaModel,
    primaryKey: PrimaryKey | PrimaryKey[],
    options?: ModelBuildOptions
  ): Promise<MemoriaModel[] | MemoriaModel | null> {
    let Manager = await this.getEntityManager();

    try {
      if (Array.isArray(primaryKey)) {
        // TODO: this might also need adjustments/move to normal query
        let foundModels = await Manager.findByIds(Model, primaryKey, {
          order: { [Model.primaryKeyName]: "ASC" },
        });
        // TODO: this might be problematic with null models!!
        return foundModels.map((model) => this.cache(Model, toJSON(model), options));
      } else if (typeof primaryKey === "number" || typeof primaryKey === "string") {
        let foundModel = await Manager.findOne(Model, primaryKey);
        return foundModel && this.cache(Model, toJSON(foundModel), options);
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
  ): Promise<MemoriaModel | null> {
    let Manager = await this.getEntityManager();
    let foundModel = await Manager.findOne(Model, getTargetKeysFromInstance(queryObject));

    return foundModel ? this.cache(Model, toJSON(foundModel), options) : null;
  }

  static async findAll(
    Model: typeof MemoriaModel,
    queryObject: QueryObject = {},
    options?: ModelBuildOptions
  ): Promise<MemoriaModel[] | null> {
    let Manager = await this.getEntityManager();
    let query = await Manager.createQueryBuilder(Model, Model.tableName).orderBy(
      `${Model.tableName}.${Model.primaryKeyName}`,
      "ASC"
    );

    if (queryObject) {
      let objectToQuery = getTargetKeysFromInstance(queryObject);
      query.where(buildWhereSQLQueryFromObject(Model.tableName, objectToQuery), objectToQuery);
    }

    let result = await query.getMany();

    return result.map((model) => this.cache(Model, toJSON(model), options));
  }

  static async insert(
    Model: typeof MemoriaModel,
    record: QueryObject | ModelRefOrInstance,
    options?: ModelBuildOptions
  ): Promise<MemoriaModel> {
    let target = Object.keys(record).reduce((result, columnName) => {
      if (columnName !== Model.primaryKeyName && Model.columnNames.has(columnName)) {
        return Object.assign(result, { [columnName]: record[columnName] });
      } else if (columnName === Model.primaryKeyName && record[columnName]) {
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

      return this.cache(
        Model,
        Model.assign(prepareTargetObjectFromInstance(record, Model), result.generatedMaps[0]) as ModelRefOrInstance,
        options
      );
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
          `Wrong ${Model.primaryKeyName} input type: entered ${typeof target[Model.primaryKeyName]} instead of ${
            Model.primaryKeyType
          }`
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

      if (Model.Cache.get(result[Model.primaryKeyName])) {
        return await super.update(Model, Model.assign(record, result), options);
      }

      return this.cache(Model, Model.assign(record, result) as ModelRefOrInstance, options) as MemoriaModel;
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

      if (Model.Cache.get(result[Model.primaryKeyName])) {
        return await super.delete(Model, Model.assign(result, resultRaw.raw[0]) as ModelRefOrInstance, options);
      }

      return Model.build(
        Model.assign(result, resultRaw.raw[0]),
        Object.assign(options || {}, { isNew: false, isDeleted: true })
      );
    } catch (error) {
      throw error;
    }
  }

  // TODO: check/test this:
  static async insertAll(
    Model: typeof MemoriaModel,
    records: ModelRefOrInstance[],
    options?: ModelBuildOptions
  ): Promise<MemoriaModel[]> {
    let primaryKey = records.find((record) => record[Model.primaryKeyName]);
    try {
      let Manager = await this.getEntityManager();
      let targetRecords = records.map((record) => ({ ...record }));
      let result = await Manager.createQueryBuilder()
        .insert()
        .into(Model, Model.columnNames)
        .values(targetRecords) // NOTE: probably doent need relationships filter as it is
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

      return result.raw.map((rawResult, index) =>
        this.cache(Model, Model.assign(targetRecords[index], rawResult) as ModelRefOrInstance, options)
      );
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
    let results = await Manager.save(records.map((model) => cleanRelationships(Model, Model.build(model))));

    return results.map((result, index) =>
      this.cache(Model, Model.assign(records[index], result) as ModelRefOrInstance, options)
    );
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

    return result.raw.map((rawResult, index) =>
      Model.build(
        Model.assign(records[index], rawResult),
        Object.assign(options || {}, { isNew: false, isDeleted: true })
      )
    );
  }

  static fetchRelationship(model: MemoriaModel, relationshipName: string, relationshipMetadata?: RelationshipMetadata) {
    let Model = model.constructor as typeof MemoriaModel;
    let metadata = relationshipMetadata || RelationshipSchema.getRelationshipMetadataFor(Model, relationshipName);
    let { SourceClass, relationshipType, RelationshipClass, reverseRelationshipName } = metadata;

    return new RelationshipPromise(async (resolve, reject) => {
      try {
        if (relationshipType === "BelongsTo") {
          let foreignKeyColumnName = metadata.foreignKeyColumnName as string;
          if (!model[foreignKeyColumnName]) {
            return resolve(RelationshipDB.cacheRelationship(model, metadata, null));
          }

          let relationshipModel = await RelationshipClass.find(model[foreignKeyColumnName]);
          if (!relationshipModel) {
            return resolve(RelationshipDB.cacheRelationship(model, metadata, null));
            // NOTE: now doesnt throw to match REST behavior
            // throw new NotFoundError(
            //   {},
            //   `${RelationshipClass.tableName} table record with ${RelationshipClass.primaryKeyName}:${model[foreignKeyColumnName]} not found`
            // );
          }

          return resolve(RelationshipDB.cacheRelationship(model, metadata, relationshipModel));
        } else if (relationshipType === "OneToOne") {
          let reverseRelationshipForeignKeyColumnName = metadata.reverseRelationshipForeignKeyColumnName as string;
          if (!reverseRelationshipForeignKeyColumnName || !reverseRelationshipName) {
            throw new Error(
              `${RelationshipClass.name} missing a foreign key column or @BelongsTo declaration for ${SourceClass.name} on ${relationshipName} @hasOne relationship!`
            );
          }

          let relationship = model[Model.primaryKeyName]
            ? await RelationshipClass.findBy({
                [reverseRelationshipForeignKeyColumnName]: model[Model.primaryKeyName],
              })
            : null;
          // if (!relationshipModel) {
          //   return resolve(RelationshipDB.cacheRelationship(model, metadata, null));
          //   // NOTE: now doesnt throw to match REST behavior
          //   // throw new NotFoundError(
          //   //   {},
          //   //   `${RelationshipClass.tableName} table record with ${RelationshipClass.primaryKeyName}:${model[reverseRelationshipForeignKeyColumnName]} not found`
          //   // );
          // }

          return resolve(RelationshipDB.cacheRelationship(model, metadata, relationship));
        } else if (relationshipType === "HasMany") {
          let reverseRelationshipForeignKeyColumnName = metadata.reverseRelationshipForeignKeyColumnName as string;
          if (!reverseRelationshipForeignKeyColumnName) {
            throw new Error(
              `${RelationshipClass.name} missing a foreign key column for ${SourceClass.name} on ${relationshipName} @hasMany relationship!`
            );
          }

          let relationship = model[Model.primaryKeyName]
            ? await RelationshipClass.findAll({
                [reverseRelationshipForeignKeyColumnName]: model[Model.primaryKeyName],
              })
            : [];
          // NOTE: peekAll generate new instances each time, this is a feature, not a bug(?). That way when we mutate foreignKey of existing record, hasMany array stays in tact

          return resolve(RelationshipDB.cacheRelationship(model, metadata, relationship));
        }
      } catch (error) {
        return reject(error);
      }

      return reject("ManyToMany fetchRelationship not implemented yet");
    });
  }
}

function toJSON(model: MemoriaModel): ModelRefOrInstance {
  let Class = model.constructor as typeof MemoriaModel;

  return Array.from(Class.columnNames).reduce((result: ModelRefOrInstance, columnName: string) => {
    if (model[columnName] === undefined) {
      result[columnName] = null;
    } else {
      result[columnName] = model[columnName];
    }

    return result;
  }, {} as ModelRefOrInstance);
}

function cleanRelationships(Model, instance) {
  let relationshipTable = RelationshipSchema.getRelationshipTable(Model);
  Object.keys(relationshipTable).forEach((relationshipKey) => {
    if (relationshipKey in instance) {
      let { relationshipType } = relationshipTable[relationshipKey];
      RelationshipDB.findRelationshipCacheFor(Model, relationshipKey, relationshipType).set(instance, undefined);
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

function getTargetKeysFromInstance(query: QueryObject) {
  let Class = query.constructor as typeof MemoriaModel;

  if (Class.columnNames) {
    return Array.from(Class.columnNames).reduce((result: QueryObject, columnName) => {
      result[columnName] = query[columnName];

      return result;
    }, {});
  }

  return query;
}
