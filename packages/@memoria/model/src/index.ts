import Changeset from "./changeset.js";
export type { ChangesetErrorItem } from "./changeset.js";
export { ConfigStore, DB, RelationshipStore } from "./stores/index.js";
export type { RelationshipSummary } from "./stores/configuration.js";
import Model from "./model.js";
export type { ModelBuildOptions } from "./model.js";
export type {
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
import Serializer from "./serializer.js";
export { transformValue } from "./serializer.js";
export {
  clearObject,
  generateUUID,
  primaryKeyTypeSafetyCheck,
  get,
  set,
  getProperties,
  setProperties,
} from "./utils.js";
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

export { Changeset, Serializer };

// relationship setting and fetching
// User.getErrors(userInstance or Instances) // -> same array
// pushRecord(json);
