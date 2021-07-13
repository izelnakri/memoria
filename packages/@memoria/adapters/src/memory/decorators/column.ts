import { Store } from "@memoria/model";

interface ColumnOptions {
  default?: any;
}

// TODO: these are used in the adapter, thus needs to be registered there?
export function Column(target, propertyKey, options: ColumnOptions = {}, descriptor) {
  if (options.default) {
    Store.getDefaultValues(target)[propertyKey] = options.default;
  }
}

export function CreateDateColumn(target, propertyKey, options = {}, descriptor) {
  Store.getDefaultValues(target)[propertyKey] = Date;
}

export function UpdateDateColumn(target, propertyKey, options = {}, descriptor) {
  Store.getDefaultValues(target)[propertyKey] = Date;
}

export function DeleteDateColumn(target, propertyKey, options = {}, descriptor) {} // NOTE: in future: add delete date

export function PrimaryGeneratedColumn(target, propertyKey, strategy) {
  // TODO: strategy is id by default or uuid
  // TODO: do this
}

export function Generated(target, propertyKey, generateFunction) {} // NOTE: this can be uuid or smt else

export default {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  Generated,
};

// NOTE: in future do VersionColumn
// NOTE: implement Enum check, Set column, simple-array, simple-json, @Generated('uuid')
// NOTE: some constraints: length, unique,

// NOTE: Match Schema whenever possible: https://typeorm.io/#/separating-entity-definition
// allows checks, indices, combination
