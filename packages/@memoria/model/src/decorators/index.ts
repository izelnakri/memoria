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
  HasOne,
  HasMany,
  OneToMany,
  BelongsTo,
  // ManyToMany,
  JoinColumn,
  JoinTable,
} from "./relationship.js";

function ManyToMany() {
  throw new Error('ManyToMany decorator is not implemented yet!');
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
  BelongsTo,
  OneToMany,
  HasOne,
  HasMany,
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
  HasOne,
  HasMany,
  OneToMany,
  ManyToMany,
  BelongsTo,
  JoinColumn,
  JoinTable,
};

// NOTE: not implementing Embedded entities, Tree Entities, View Entity
