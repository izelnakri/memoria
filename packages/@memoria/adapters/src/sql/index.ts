import { Connection, createConnection, EntitySchema } from "typeorm";
import Decorators from "./decorators/index.js";
import MemoriaModel, { Store } from "@memoria/model";
import type { ModelRef } from "@memoria/model";

type primaryKey = number | string;
type QueryObject = { [key: string]: any };

interface FreeObject {
  [key: string]: any;
}

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
  static _connection: FreeObject = null;
  static async getConnection() {
    if (this._connection && this._connection.isConnected) {
      return this._connection;
    }

    Store.Entities = Store.Schemas.map((schema) => new EntitySchema(schema));
    // @ts-ignore
    this._connection = (await createConnection({
      entities: Store.Entities,
      ...this.CONNECTION_OPTIONS,
    })) as Connection;

    return this._connection;
  }
  static getRepository(connection, Class: typeof MemoriaModel) {
    return connection.getRepository(Store.getEntity(Class));
  }

  static build(Model: typeof MemoriaModel, options): MemoriaModel {
    let model = new Model(options);

    Object.keys(model).forEach((keyName: string) => {
      model[keyName] = model[keyName] || keyName in options ? options[keyName] : null;
    });

    return Object.seal(model);
  }

  static push(model: QueryObject): MemoriaModel {}

  static resetCache(Model: typeof MemoriaModel, targetState?: ModelRef[]): MemoriaModel[] {}

  static async resetRecords(
    Model: typeof MemoriaModel,
    targetState?: ModelRef[]
  ): Promise<MemoriaModel[]> {}

  static peek(
    Model: typeof MemoriaModel,
    primaryKey: primaryKey | primaryKey[]
  ): MemoriaModel[] | MemoriaModel | void {}

  static peekBy(Model: typeof MemoriaModel, queryObject: object): MemoriaModel | void {}

  static peekAll(Model: typeof MemoriaModel, queryObject: object = {}): MemoriaModel[] | void {}

  static async count(Model: typeof MemoriaModel): Promise<number> {}

  static async find(
    Model: typeof MemoriaModel,
    primaryKey: primaryKey | primaryKey[]
  ): Promise<MemoriaModel[] | MemoriaModel | void> {}

  static async findBy(
    Model: typeof MemoriaModel,
    queryObject: object
  ): Promise<MemoriaModel | void> {}

  static async findAll(
    Model: typeof MemoriaModel,
    queryObject: object = {}
  ): Promise<MemoriaModel[] | void> {}

  static cache(Model: typeof MemoriaModel, fixture: ModelRef): MemoriaModel {}

  static async save(Model: typeof MemoriaModel, model: ModelRef): Promise<MemoriaModel> {}

  static async insert(Model: typeof MemoriaModel, model: QueryObject): Promise<MemoriaModel> {
    let connection = await this.getConnection();
    let Repo = this.getRepository(connection, Model);

    return await Repo.save(Repo.create(model || {}));
  }

  static async update(Model: typeof MemoriaModel, record: ModelRef): Promise<ModelRef> {
    let connection = await this.getConnection();
    let Repo = this.getRepository(connection, Model);
  }

  // TODO: HANDLE deleteDate generation
  static unload(Model: typeof MemoriaModel, record: ModelRef): ModelRef {}

  static async delete(Model: typeof MemoriaModel, record: ModelRef): Promise<MemoriaModel> {
    let connection = await this.getConnection();
    let Repo = this.getRepository(connection, Model);
  }

  static async saveAll(Model: typeof MemoriaModel, models: ModelRef[]): Promise<MemoriaModel[]> {}

  static async insertAll(Model: typeof MemoriaModel, models: ModelRef[]): Promise<MemoriaModel[]> {}

  static async updateAll(Model: typeof MemoriaModel, models: ModelRef[]): Promise<MemoriaModel[]> {}

  static unloadAll(Model: typeof MemoriaModel, models?: ModelRef[]): void {}

  static async deleteAll(Model: typeof MemoriaModel, models: ModelRef[]): Promise<void> {}
}
