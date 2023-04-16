import Changeset from "./changeset.js";
export type { ChangesetErrorItem } from "./changeset.js";
import Enum from "./enum.js";
import EnumFreeze from "./enum-freeze.js";
import HasManyArray from "./has-many-array.js";
export {
  Schema,
  DB,
  InstanceDB,
  RelationshipDB,
  RelationshipQuery,
  RelationshipSchema,
  RelationshipUtils,
} from "./stores/index.js";
export type {
  RelationshipType,
  RelationshipSummary,
  RelationshipTable,
  RelationshipMetadata,
} from "./stores/relationship/schema.js";
import Model from "./model.js";
export type { ModelBuildOptions } from "./model.js";
export type {
  PrimaryKey,
  ModelName,
  ModuleDatabase,
  DecoratorBucket,
  ColumnDefinition,
  RelationshipDefinition,
  RelationshipDefinitionStore,
} from "./types.js";
export type { ErrorMetadata } from "./errors/index.js";
export {
  AbortError,
  ModelError,
  CacheError,
  ChangesetError,
  DeleteError,
  InsertError,
  RuntimeError,
  UpdateError,
  NetworkError,
  ForbiddenError,
  NotFoundError,
  TimeoutError,
  UnauthorizedError,
  ConflictError,
  ServerError,
} from "./errors/index.js";
export { LazyPromise, hash, RelationshipPromise } from "./promises/index.js";
import Serializer from "./serializer.js";
export { transformValue } from "./serializer.js";
export {
  clearObject,
  compare,
  deepEqual,
  generateUUID,
  primaryKeyTypeSafetyCheck,
  match,
  get,
  instanceOf,
  isCyclical,
  getCyclicalReferences,
  getConstructor,
  set,
  getProperties,
  setProperties,
  printSchema,
  printColumns,
  printRelationships,
  typeOf,
} from "./utils/index.js";
export {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Generated,
  Index,
  Unique,
  Check,
  Exclusion,
  OneToOne,
  BelongsTo,
  ManyToOne,
  OneToMany,
  HasOne,
  HasMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from "./decorators/index.js";

type RequireOnlyOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, undefined>>;
  }[Keys];

export interface ModelReferenceShape {
  id?: number;
  uuid?: string;
  [propName: string]: any;
}
export type ModelReference = RequireOnlyOne<ModelReferenceShape, "id" | "uuid">;
export interface QueryObject {
  [propName: string]: any;
}
export default Model;

export { Changeset, Enum, EnumFreeze, Serializer, HasManyArray };

// User.getErrors(userInstance or Instances) // -> same array
// pushRecord(json);
