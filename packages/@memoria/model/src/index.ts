import Model from "./model";
import Store from "./store";
export {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Generated,
} from "./decorators/index";

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
export { Store };

// Query, Serialization and Reset interface

// find, findAll, findBy, peek, peekAll, peekBy, save, insert, update, remove, delete(deleting from memory vs delete req!!), destroy
// relationship setting and fetching
// destroy

// insertAll, updateAll, destroyAll
// Error Handlings

// User.getErrors(userInstance or Instances) // -> same array

// [UserError{ message: '', type: '', snapshot, changeset }] -> Error Tracking
// pushRecord(json);
// transitionaryStates: isPresisted, isNew, etc, isSaved
