import Model from "./model.js";
import Config from "./config.js";
export type { ColumnDefinition } from "./types.js";
export { generateUUID } from "./utils.js";
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
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from "./decorators/index.js";

type RequireOnlyOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, undefined>>;
  }[Keys];

export interface ModelRefShape {
  id?: number;
  uuid?: string;
  [propName: string]: any;
}
export type ModelRef = RequireOnlyOne<ModelRefShape, "id" | "uuid">;
export interface QueryObject {
  [propName: string]: any;
}
export default Model;

export { Config };

// Serialization
// relationship setting and fetching
// insertAll, updateAll, destroyAll
// Error Handlings

// User.getErrors(userInstance or Instances) // -> same array

// [UserError{ message: '', type: '', snapshot, changeset }] -> Error Tracking
// pushRecord(json);
// transitionaryStates: isPresisted, isNew, etc, isSaved
