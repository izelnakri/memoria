import Model from "@memoria/model";
import type { ColumnDefinition } from "@memoria/model";

export function Column(_target: typeof Model, _propertyKey: string, _options: ColumnDefinition, _descriptor: any) {
  return function (_object: ColumnDefinition, _propertyName: string) {};
}

export function CreateDateColumn(
  _target: typeof Model,
  _propertyKey: string,
  _options: ColumnDefinition,
  _descriptor: any
) {
  return function (_object: ColumnDefinition, _propertyName: string) {};
}

export function UpdateDateColumn(
  _target: typeof Model,
  _propertyKey: string,
  _options: ColumnDefinition,
  _descriptor: any
) {
  return function (_object: ColumnDefinition, _propertyName: string) {};
}

export function DeleteDateColumn(
  _target: typeof Model,
  _propertyKey: string,
  _options: ColumnDefinition,
  _descriptor: any
) {
  return function (_object: ColumnDefinition, _propertyName: string) {};
}

// NOTE: in future: add delete date

export function PrimaryColumn(
  _target: typeof Model,
  _propertyKey: string,
  _options: ColumnDefinition,
  _descriptor: any
) {
  return function (_object: ColumnDefinition, _propertyName: string) {};
}
export function PrimaryGeneratedColumn(_target: typeof Model, _propertyKey: string, _strategy: string) {
  return function (_object: ColumnDefinition, _propertyName: string) {};
}

export default {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
};

// NOTE: in future do VersionColumn
// NOTE: implement Enum check, Set column, simple-array, simple-json, @Generated('uuid')
// NOTE: some constraints: length, unique,

// NOTE: Match Schema whenever possible: https://typeorm.io/#/separating-entity-definition
// allows checks, indices, combination
