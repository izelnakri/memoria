import MemoryAdapter from "./memory/index.js";
import RESTAdapter from "./rest/index.js";
import SQLAdapter from "./sql/index.js";
import {
  // NetworkError,
  AbortError,
  // ConflictError,
  // ForbiddenError,
  // NotFoundError,
  // TimeoutError,
  // UnauthorizedError,
  // ServerError,
} from "./errors/index.js";

export type primaryKey = number | string;

export interface QueryObject {
  [propName: string]: any;
}

// NOTE: also needs Errors:
// AbortError, AdapterError, ForbiddenError, InvalidError, NotFoundError, ServerError, TimeoutError, ConflictError(equates to a HTTP `409 Conflict)
// coalasceFindRequests?

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

export {
  MemoryAdapter,
  RESTAdapter,
  SQLAdapter,
  AbortError,
  // ConflictError,
  // NetworkError,
  // ForbiddenError,
  // NotFoundError,
  // TimeoutError,
  // UnauthorizedError,
  // ServerError,
};
export default {
  MemoryAdapter,
  RESTAdapter,
  SQLAdapter,
  AbortError,
  // ConflictError,
  // NetworkError,
  // ForbiddenError,
  // NotFoundError,
  // TimeoutError,
  // UnauthorizedError,
  // ServerError,
};
