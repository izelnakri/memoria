import Config from "../config.js";
import type { RelationOptions, JoinColumnOptions, JoinTableOptions } from "../types.js";

type ObjectType<T> = { new (): T } | Function;

// TODO: clean-up repetition
export function OneToOne<T>(
  typeFunctionOrTarget: string | ((type?: any) => ObjectType<T>),
  inverseSideOrOptions?: string | ((object: T) => any) | RelationOptions,
  options?: RelationOptions
) {
  return function (target: any, propertyName: string, descriptor: any) {
    let inverseSideProperty: string | ((object: T) => any);
    if (typeof inverseSideOrOptions === "object") {
      options = <RelationOptions>inverseSideOrOptions;
    } else {
      inverseSideProperty = <string | ((object: T) => any)>inverseSideOrOptions;
    }

    if (!options) {
      options = {} as RelationOptions;
    }

    // now try to determine it its lazy relation
    let isLazy = options && options.lazy === true ? true : false;
    if (!isLazy && Reflect && (Reflect as any).getMetadata) {
      // automatic determination
      let reflectedType = (Reflect as any).getMetadata("design:type", target, propertyName);
      if (
        reflectedType &&
        typeof reflectedType.name === "string" &&
        reflectedType.name.toLowerCase() === "promise"
      ) {
        isLazy = true;
      }
    }

    let foundRelation = Config.getSchema(target.constructor).relations[propertyName];
    Config.getSchema(target.constructor).relations[propertyName] = Object.assign(
      {},
      foundRelation,
      {
        target: typeFunctionOrTarget,
        type: "one-to-one",
        // @ts-ignore
        inverseSide: inverseSideProperty,
        lazy: isLazy,
        eager: options.eager,
        persistence: options.persistence,
        primary: options.primary,
        joinTable: false, // boolean | JoinTableOptions | JoinTableMultipleColumnsOptions;
        joinColumn: false, // boolean | JoinColumnOptions | JoinColumnOptions[];
        treeParent: false,
        treeChildren: false,
        cascade: options.cascade, // boolean | ("insert" | "update" | "remove" | "soft-remove" | "recover")[];
        default: null, // any;
        nullable: options.nullable,
        onDelete: options.onDelete,
        onUpdate: options.onUpdate,
        deferrable: options.deferrable,
        orphanedRowAction: options.orphanedRowAction,
      }
    );

    return target.constructor.Adapter.Decorators.OneToOne(
      typeFunctionOrTarget,
      inverseSideOrOptions,
      options
    )(target.constructor, propertyName, descriptor);
  };
}

export function ManyToOne<T>(
  typeFunctionOrTarget: string | ((type?: any) => ObjectType<T>),
  inverseSideOrOptions?: string | ((object: T) => any) | RelationOptions,
  options?: RelationOptions,
  type?: "many-to-one" | "one-to-one"
) {
  return function (target: any, propertyName: string, descriptor: any) {
    // Normalize parameters.
    let inverseSideProperty: string | ((object: T) => any);
    if (typeof inverseSideOrOptions === "object") {
      options = <RelationOptions>inverseSideOrOptions;
    } else {
      inverseSideProperty = <string | ((object: T) => any)>inverseSideOrOptions;
    }
    if (!options) {
      options = {} as RelationOptions;
    }

    // Now try to determine if it is a lazy relation.
    let isLazy = options && options.lazy === true;
    if (!isLazy && Reflect && (Reflect as any).getMetadata) {
      // automatic determination
      let reflectedType = (Reflect as any).getMetadata("design:type", target, propertyName);
      if (
        reflectedType &&
        typeof reflectedType.name === "string" &&
        reflectedType.name.toLowerCase() === "promise"
      ) {
        isLazy = true;
      }
    }

    let foundRelation = Config.getSchema(target.constructor).relations[propertyName];
    Config.getSchema(target.constructor).relations[propertyName] = Object.assign(
      {},
      foundRelation,
      {
        target: typeFunctionOrTarget,
        type: type || "many-to-one",
        // @ts-ignore
        inverseSide: inverseSideProperty,
        lazy: isLazy,
        eager: options.eager,
        persistence: options.persistence,
        primary: options.primary,
        joinTable: false, // boolean | JoinTableOptions | JoinTableMultipleColumnsOptions;
        joinColumn: false, // boolean | JoinColumnOptions | JoinColumnOptions[];
        treeParent: false, // should change with Decorator
        treeChildren: false,
        cascade: options.cascade, // boolean | ("insert" | "update" | "remove" | "soft-remove" | "recover")[];
        default: null, // any;
        nullable: options.nullable,
        onDelete: options.onDelete,
        onUpdate: options.onUpdate,
        deferrable: options.deferrable,
        orphanedRowAction: options.orphanedRowAction,
      }
    );

    return target.constructor.Adapter.Decorators.ManyToOne(
      typeFunctionOrTarget,
      inverseSideOrOptions,
      options
    )(target.constructor, propertyName, descriptor);
  };
}

export function OneToMany<T>(
  typeFunctionOrTarget: string | ((type?: any) => ObjectType<T>),
  inverseSideOrOptions: string | ((object: T) => any),
  options?: RelationOptions
) {
  return function (target: any, propertyName: string, descriptor: any) {
    // TODO: inverse
    if (!options) {
      options = {};
    }

    let isLazy = options && options.lazy === true;
    if (!isLazy && Reflect && (Reflect as any).getMetadata) {
      let reflectedType = (Reflect as any).getMetadata("design:type", target, propertyName);
      if (
        reflectedType &&
        typeof reflectedType.name === "string" &&
        reflectedType.name.toLowerCase() === "promise"
      ) {
        isLazy = true;
      }
    }

    let foundRelation = Config.getSchema(target.constructor).relations[propertyName];
    Config.getSchema(target.constructor).relations[propertyName] = Object.assign(
      {},
      foundRelation,
      {
        target: typeFunctionOrTarget,
        type: "one-to-many",
        // inverseSide: inverseSideProperty,
        lazy: isLazy,
        eager: options.eager,
        persistence: options.persistence,
        primary: options.primary,
        joinTable: false, // boolean | JoinTableOptions | JoinTableMultipleColumnsOptions;
        joinColumn: false, // boolean | JoinColumnOptions | JoinColumnOptions[];
        treeParent: false,
        treeChildren: false,
        cascade: options.cascade, // boolean | ("insert" | "update" | "remove" | "soft-remove" | "recover")[];
        default: null, // any;
        nullable: options.nullable,
        onDelete: options.onDelete,
        onUpdate: options.onUpdate,
        deferrable: options.deferrable,
        orphanedRowAction: options.orphanedRowAction,
      }
    );

    return target.constructor.Adapter.Decorators.OneToMany(
      typeFunctionOrTarget,
      inverseSideOrOptions,
      options
    )(target.constructor, propertyName, descriptor);
  };
}

export function ManyToMany<T>(
  typeFunctionOrTarget: string | ((type?: any) => ObjectType<T>),
  inverseSideOrOptions?: string | ((object: T) => any) | RelationOptions,
  options?: RelationOptions
) {
  return function (target: any, propertyName: string, descriptor: any) {
    // normalize parameters
    let inverseSideProperty: string | ((object: T) => any);
    if (typeof inverseSideOrOptions === "object") {
      options = <RelationOptions>inverseSideOrOptions;
    } else {
      inverseSideProperty = <string | ((object: T) => any)>inverseSideOrOptions;
    }
    if (!options) {
      options = {} as RelationOptions;
    }

    // now try to determine it its lazy relation
    let isLazy = options.lazy === true;
    if (!isLazy && Reflect && (Reflect as any).getMetadata) {
      // automatic determination
      let reflectedType = (Reflect as any).getMetadata("design:type", target, propertyName);
      if (
        reflectedType &&
        typeof reflectedType.name === "string" &&
        reflectedType.name.toLowerCase() === "promise"
      ) {
        isLazy = true;
      }
    }

    let foundRelation = Config.getSchema(target.constructor).relations[propertyName];
    Config.getSchema(target.constructor).relations[propertyName] = Object.assign(
      {},
      foundRelation,
      {
        target: typeFunctionOrTarget,
        type: "many-to-many",
        // @ts-ignore
        inverseSide: inverseSideProperty,
        lazy: isLazy,
        eager: options.eager,
        persistence: options.persistence,
        primary: options.primary,
        // joinTable: false, // boolean | JoinTableOptions | JoinTableMultipleColumnsOptions;
        // joinColumn: false, // boolean | JoinColumnOptions | JoinColumnOptions[];
        treeParent: false,
        treeChildren: false,
        cascade: options.cascade, // boolean | ("insert" | "update" | "remove" | "soft-remove" | "recover")[];
        default: null, // any;
        nullable: options.nullable,
        onDelete: options.onDelete,
        onUpdate: options.onUpdate,
        deferrable: options.deferrable,
        orphanedRowAction: options.orphanedRowAction,
      }
    );

    return target.constructor.Adapter.Decorators.ManyToMany(
      typeFunctionOrTarget,
      inverseSideOrOptions,
      options
    )(target.constructor, propertyName, descriptor);
  };
}

export function JoinColumn(optionsOrOptionsArray?: JoinColumnOptions | JoinColumnOptions[]) {
  return function (target: any, propertyName: string, descriptor: any) {
    let targetRelationship = Config.getSchema(target.constructor).relations[propertyName];
    if (!targetRelationship) {
      throw new Error(
        `@JoinColumn() on ${target.constructor.name} requires relationship declaration first`
      );
    }
    let options = Array.isArray(optionsOrOptionsArray)
      ? optionsOrOptionsArray
      : [optionsOrOptionsArray || {}];

    targetRelationship.joinColumn = options.map((options) => {
      return {
        target: target.constructor,
        propertyName: propertyName,
        name: options.name,
        referencedColumnName: options.referencedColumnName,
      };
    });

    return target.constructor.Adapter.Decorators.JoinColumn(optionsOrOptionsArray)(
      target.constructor,
      propertyName,
      descriptor
    );
  };
}

export function JoinTable(options: JoinTableOptions = {}) {
  return function (target: any, propertyName: string, descriptor: any) {
    let targetRelationship = Config.getSchema(target.constructor).relations[propertyName];
    if (!targetRelationship) {
      throw new Error(
        `@JoinTable() on ${target.constructor.name} requires relationship declaration first`
      );
    }

    targetRelationship.joinTable = {
      target: target.constructor,
      propertyName: propertyName,
      name: options.name,
      joinColumns: options.joinColumn ? [options.joinColumn] : options.joinColumns,
      inverseJoinColumns: options.inverseJoinColumn
        ? [options.inverseJoinColumn]
        : options.inverseJoinColumns,
      schema: options && options.schema ? options.schema : undefined,
      database: options && options.database ? options.database : undefined,
    };

    return target.constructor.Adapter.Decorators.JoinTable(options)(
      target.constructor,
      propertyName,
      descriptor
    );
  };
}

export const HasMany = OneToMany;
export const BelongsTo = ManyToOne;

export function HasOne<T>(
  typeFunctionOrTarget: string | ((type?: any) => ObjectType<T>),
  inverseSideOrOptions?: string | ((object: T) => any) | RelationOptions,
  options?: RelationOptions
) {
  return ManyToOne(typeFunctionOrTarget, inverseSideOrOptions, options, "one-to-one");
}

export default {
  OneToOne,
  ManyToOne,
  BelongsTo,
  OneToMany,
  HasMany,
  HasOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
};
// NOTE: not done: RelationId

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
