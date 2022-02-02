import MemoryAdapter from "./memory/index.js";
import RESTAdapter from "./rest/index.js";
import SQLAdapter from "./sql/index.js";
import HTTP from "./http.js";

export type { HTTPOptions } from "./http.js";

export type primaryKey = number | string;

export interface QueryObject {
  [propName: string]: any;
}

export interface JSObject {
  [propName: string]: any;
}

// export abstract class Adapter {
//   abstract resetCache(targetState: ModelRef[]): ModelRef[];
//   abstract resetRecords(targetState: ModelRef[]): Promise<ModelRef[]>;

//   abstract peek(primaryKey: primaryKey | primaryKey[]): ModelRef | ModelRef[] | void;
//   abstract peekBy(queryObject: object): ModelRef | void;
//   abstract peekAll(queryObject: object): ModelRef[] | void;

//   abstract count(): Promise<number>;
//   abstract find(primaryKey: primaryKey | primaryKey[]): Promise<ModelRef | ModelRef[] | void>;
//   abstract findBy(queryObject: QueryObject): Promise<ModelRef | void>;
//   abstract findAll(queryObject: QueryObject): Promise<ModelRef[] | void>;

//   abstract save(model: ModelRef): Promise<ModelRef>;
//   abstract insert(model: ModelRef): Promise<ModelRef>;
//   abstract update(model: ModelRef): Promise<ModelRef>;
//   abstract unload(model: ModelRef): ModelRef;
//   abstract delete(model: ModelRef): Promise<ModelRef>;

//   abstract saveAll(models: ModelRef[]): Promise<ModelRef>;
//   abstract insertAll(models: ModelRef[]): Promise<ModelRef>;
//   abstract updateAll(models: ModelRef[]): Promise<ModelRef>;
//   abstract unloadAll(models?: ModelRef[]): void;
//   abstract deleteAll(models: ModelRef[]): Promise<void>;

//   // abstract serialize() {}
//   // abstract pushPayload() {}
//   // abstract push() {}
//   // static relationships = [];
//   // static attributes = [];

//   // isDeleted, isEmpty, isError, isLoaded, isLoading, isNew, isReloading, isSaving, isValid, relationships
//   // hasDirtyAttributes, dirtyType, fields, errors
// }

export { HTTP, MemoryAdapter, RESTAdapter, SQLAdapter };
