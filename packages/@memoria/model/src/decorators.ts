const proxyToAdapter = (decoratorName, options) => {
  return function (target, propertyKey, descriptor) {
    return target.constructor.Adapter.Decorators[decoratorName](
      target.constructor,
      propertyKey,
      options,
      descriptor
    );
  };
};

export function Column(keyOrOptions = {}, options?) {
  let optionsObject = typeof keyOrOptions === "string" ? { type: keyOrOptions } : keyOrOptions;
  return proxyToAdapter("Column", { ...optionsObject, ...options });
}

export function CreateDateColumn(options) {
  return proxyToAdapter("CreateDateColumn", options);
}

export function UpdateDateColumn(options) {
  return proxyToAdapter("UpdateDateColumn", options);
}

export function DeleteDateColumn(options) {
  return proxyToAdapter("DeleteDateColumn", options);
}

export function PrimaryColumn(keyOrOptions = {}, options) {
  let optionsObject = typeof keyOrOptions === "string" ? { type: keyOrOptions } : keyOrOptions;
  return Column({ ...optionsObject, ...options, primary: true });
}

export function PrimaryGeneratedColumn(strategy) {
  return proxyToAdapter("PrimaryGeneratedColumn", strategy);
}

export function Generated(generateFunction) {
  return proxyToAdapter("Generated", generateFunction);
}

export default {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Generated,
};

// Relationship Columns

// @Index column
// @Unique column
// @Check column
// @Exclusion
// @Transaction
// Table customizations are under Entity

// TODO: implement relationships
// NOTE: in future do VersionColumn
// NOTE: implement Enum check, Set column, simple-array, simple-json, @Generated('uuid')
// NOTE: some constraints: length, unique,

// NOTE: not implementing Embedded entities, Tree Entities, View Entity

// NOTE: Match Schema whenever possible: https://typeorm.io/#/separating-entity-definition
// allows checks, indices, combination

// TODO: there is:
// @OneToOne  // belongsTo
// @ManyToOne // belongsTo
// @OneToMany // hasMany
// @ManyToMany // manyToMany
// ignore @JoinTable and @JoinColumn

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
