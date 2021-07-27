import MemoryAdapter from "../memory/index.js";

export default class RESTAdapter extends MemoryAdapter {
  // static async resetRecords(
  //   Model: typeof MemoriaModel,
  //   targetState?: ModelRef[]
  // ): Promise<MemoriaModel[]> {
  //   // return this.resetCache(Model, targetState);
  // }
  // static async count(Model: typeof MemoriaModel): Promise<number> {
  //   // return Model.Cache.length;
  // }
  // static async find(
  //   Model: typeof MemoriaModel,
  //   primaryKey: primaryKey | primaryKey[]
  // ): Promise<MemoriaModel[] | MemoriaModel | void> {
  //   // return this.peek(Model, primaryKey);
  // }
  // static async findBy(
  //   Model: typeof MemoriaModel,
  //   queryObject: object
  // ): Promise<MemoriaModel | void> {
  //   // return this.peekBy(Model, queryObject);
  // }
  // static async findAll(
  //   Model: typeof MemoriaModel,
  //   queryObject: object = {}
  // ): Promise<MemoriaModel[] | void> {
  //   // return this.peekAll(Model, queryObject);
  // }
  // static async save(Model: typeof MemoriaModel, model: ModelRef): Promise<MemoriaModel> {}
  // static async insert(Model: typeof MemoriaModel, model: QueryObject): Promise<MemoriaModel> {}
  // static async update(Model: typeof MemoriaModel, record: ModelRef): Promise<ModelRef> {}
  // static async delete(Model: typeof MemoriaModel, record: ModelRef): Promise<MemoriaModel> {}
  // static async saveAll(Model: typeof MemoriaModel, models: ModelRef[]): Promise<MemoriaModel[]> {}
  // static async insertAll(Model: typeof MemoriaModel, models: ModelRef[]): Promise<MemoriaModel[]> {}
  // static async updateAll(Model: typeof MemoriaModel, models: ModelRef[]): Promise<MemoriaModel[]> {}
  // static async deleteAll(Model: typeof MemoriaModel, models: ModelRef[]): Promise<void> {}
}
