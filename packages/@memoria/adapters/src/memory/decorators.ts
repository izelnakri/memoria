interface ColumnOptions {
  default?: any;
}

export function Column(target, propertyKey, options: ColumnOptions = {}, descriptor) {
  if (options.default) {
    target._DEFAULT_ATTRIBUTES[target.name] = target._DEFAULT_ATTRIBUTES[target.name] || {};
    target.DEFAULT_ATTRIBUTES[propertyKey] = options.default;
  }
}

export function PrimaryColumn(target, propertyKey, primaryKeyType, descriptor) {
  // if (primaryKeyType === "uuid") {
  //   return;
  // }
  // target._generatePrimaryKey[target.name]
}

export function CreateDateColumn(target, propertyKey, options = {}, descriptor) {
  target._DEFAULT_ATTRIBUTES[target.name] = target._DEFAULT_ATTRIBUTES[target.name] || {};
  target.DEFAULT_ATTRIBUTES[propertyKey] = Date;
}

export function UpdateDateColumn(target, propertyKey, options = {}, descriptor) {
  // TODO: add update date
  target._DEFAULT_ATTRIBUTES[target.name] = target._DEFAULT_ATTRIBUTES[target.name] || {};
  target.DEFAULT_ATTRIBUTES[propertyKey] = Date;
}

export function DeleteDateColumn(target, propertyKey, options = {}, descriptor) {
  // TODO: add delete date
  // target._DEFAULT_ATTRIBUTES[target.name] = target._DEFAULT_ATTRIBUTES[target.name] || {};
  // target.DEFAULT_ATTRIBUTES[propertyKey] = Date;
}

export default { Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn };

// TODO: implement relationships
// NOTE: in future do VersionColumn
// NOTE: implement Enum check, Set column, simple-array, simple-json, @Generated('uuid')
// NOTE: some constraints: length, unique,

// NOTE: not implementing Embedded entities
// NOTE: not implementing Tree entities
// NOTE: not implementing View entity

// NOTE: Match Schema whenever possible: https://typeorm.io/#/separating-entity-definition
// allows checks, indices, combination
