import {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from "./column.js";
import { Index, Unique, Check, Exclusion, Generated } from "./other.js";
import {
  OneToOne,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from "./relationship.js";

// NOTE: maybe I can remove one call with: returning the function directly:
export function proxyToAdapter(decoratorName, firstParam?, secondParam?) {
  return function (target, propertyKey, _descriptor) {
    return target.constructor.Adapter.Decorators[decoratorName](
      target.constructor,
      propertyKey,
      firstParam,
      secondParam
    );
  };
}

export default {
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
};

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
};

// NOTE: not implementing Embedded entities, Tree Entities, View Entity
