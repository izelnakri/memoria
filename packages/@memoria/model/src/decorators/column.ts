import Store from "../store.js";
import type { ColumnDefinition } from "../store.js";
import type { ColumnType } from "typeorm/driver/types/ColumnTypes";

// NOTE: options manglings here are done for defaultValue generation
export function Column(
  keyOrOptions: ColumnDefinition | ColumnType = { type: "varchar" },
  options?: ColumnDefinition
) {
  let optionsObject =
    typeof keyOrOptions === "string" ? { type: keyOrOptions as ColumnType } : keyOrOptions;

  return proxyColumnToAdapter("Column", {
    nullable: false,
    ...optionsObject,
    ...options,
  });
}

export function CreateDateColumn(options?: ColumnDefinition) {
  return proxyColumnToAdapter("CreateDateColumn", {
    type: "timestamp with time zone",
    nullable: false,
    createDate: true,
    ...options,
  });
}

export function UpdateDateColumn(options?: ColumnDefinition) {
  return proxyColumnToAdapter("UpdateDateColumn", {
    type: "timestamp with time zone",
    nullable: false,
    updateDate: true,
    ...options,
  });
}

export function DeleteDateColumn(options?: ColumnDefinition) {
  return proxyColumnToAdapter("DeleteDateColumn", {
    type: "timestamp with time zone",
    nullable: true,
    deleteDate: true,
    ...options,
  });
}

export function PrimaryColumn(keyOrOptions = {}, options?: ColumnDefinition) {
  let optionsObject = typeof keyOrOptions === "string" ? { type: keyOrOptions } : keyOrOptions;
  return Column({
    type: "int",
    primary: true,
    nullable: false,
    ...optionsObject,
    ...options,
  });
}

export function PrimaryGeneratedColumn(
  strategyOrOptions?: string | ColumnDefinition,
  options?: ColumnDefinition
) {
  let firstParamOptions = {};
  let targetStrategy;
  if (!strategyOrOptions || strategyOrOptions === "increment") {
    targetStrategy = "increment";
  } else if (strategyOrOptions === "uuid") {
    targetStrategy = "uuid";
  } else if (strategyOrOptions instanceof Object) {
    targetStrategy = strategyOrOptions.generated || "increment";
    Object.assign(firstParamOptions, strategyOrOptions);
  } else {
    targetStrategy = "increment";
  }

  return proxyColumnToAdapter("PrimaryGeneratedColumn", {
    primary: true,
    nullable: false,
    type: targetStrategy === "uuid" ? "uuid" : "int",
    generated: targetStrategy as true | "uuid" | "increment",
    ...firstParamOptions,
    ...options,
  });
}

export default {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryColumn,
  PrimaryGeneratedColumn,
};

function proxyColumnToAdapter(decoratorName: string, firstParam: ColumnDefinition) {
  return function (target: any, propertyKey: string, _descriptor: any) {
    Store.setColumnMetadata(target.constructor, propertyKey, firstParam);

    return target.constructor.Adapter.Decorators[decoratorName](
      target.constructor,
      propertyKey,
      firstParam
    );
    // (target.constructor, propertyKey, descriptor);
  };
}

// NOTE: in future do VersionColumn
// NOTE: implement Enum check, Set column, simple-array, simple-json, @Generated('uuid')
// NOTE: some constraints: length, unique,
