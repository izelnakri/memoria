import type Model from "./index.js";
import type { ColumnType } from "typeorm/driver/types/ColumnTypes";

export type PrimaryKey = number | string;
export type ModelName = string;
export type ModuleDatabase<Value> = Map<ModelName, Value>;

export interface DecoratorBucket {
  [decoratorKey: string]: any;
}

export interface SchemaDefinition {
  name: string;
  target: typeof Model;
  columns: ColumnSchemaDefinition;
  relations: RelationshipDefinitionStore;
  checks: CheckConstraintDefinition[];
  indices: IndexDefinition[];
  uniques: UniqueIndexDefinition[];
  exclusions: ExclusionConstraintDefinition[];
}

export interface ColumnSchemaDefinition {
  [columnName: string]: ColumnDefinition;
}

export interface ColumnDefinition {
  type?: ColumnType;
  primary?: boolean;
  generated?: true | "increment" | "uuid"; // created by decorator
  unique?: boolean;
  comment?: string;
  default?: any;
  enum?: any[] | Object;
  precision?: number;
  nullable?: boolean;
  length?: number;
  readonly?: boolean;
  createDate?: boolean; // created by decorator
  updateDate?: boolean; // created by decorator
  deleteDate?: boolean; // created by decorator
}

export interface RelationOptions {
  cascade?: boolean | ("insert" | "update" | "remove" | "soft-remove" | "recover")[];
  nullable?: boolean;
  onDelete?: "RESTRICT" | "CASCADE" | "SET NULL" | "DEFAULT" | "NO ACTION";
  onUpdate?: "RESTRICT" | "CASCADE" | "SET NULL" | "DEFAULT" | "NO ACTION";
  deferrable?: "INITIALLY IMMEDIATE" | "INITIALLY DEFERRED";
  primary?: boolean;
  createForeignKeyConstraints?: boolean;
  lazy?: boolean;
  eager?: boolean;
  persistence?: boolean;
  orphanedRowAction?: "nullify" | "delete";
}

export interface JoinColumnOptions {
  target?: any;
  propertyName?: string;

  name?: string;

  referencedColumnName?: string;
}

export interface JoinTableOptions {
  target?: any;
  propertyName?: string;

  /**
   * Name of the table that will be created to store values of the both tables (join table).
   * By default is auto generated.
   */
  name?: string;

  /**
   * First column of the join table.
   */
  joinColumn?: JoinColumnOptions;
  joinColumns?: JoinColumnOptions[];

  /**
   * Second (inverse) column of the join table.
   */
  inverseJoinColumn?: JoinColumnOptions;
  inverseJoinColumns?: JoinColumnOptions[];

  database?: string;
  schema?: string;
}

export interface RelationshipDefinitionStore {
  [relationshipName: string]: RelationshipDefinition;
}

// NOTE: this could be different definition: There is global and prop level one:
export interface RelationshipDefinition {
  target: Function;
  type: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
  inverseSide?: string;
  lazy?: boolean;
  eager?: boolean;
  persistence?: boolean;
  primary?: boolean;
  /**
   * Join table options of this column. If set to true then it simply means that it has a join table.
   */
  joinTable?: boolean | JoinTableOptions;

  /**
   * Join column options of this column. If set to true then it simply means that it has a join column.
   */
  joinColumn?: boolean | JoinColumnOptions | JoinColumnOptions[];

  /**
   * Indicates if this is a parent (can be only many-to-one relation) relation in the tree tables.
   */
  treeParent?: boolean;

  /**
   * Indicates if this is a children (can be only one-to-many relation) relation in the tree tables.
   */
  treeChildren?: boolean;
  cascade?: boolean | ("insert" | "update" | "remove" | "soft-remove" | "recover")[];
  default?: any;
  nullable?: boolean;
  onDelete?: "RESTRICT" | "CASCADE" | "SET NULL" | "DEFAULT" | "NO ACTION";
  onUpdate?: "RESTRICT" | "CASCADE" | "SET NULL" | "DEFAULT" | "NO ACTION";
  deferrable?: "INITIALLY IMMEDIATE" | "INITIALLY DEFERRED";
  orphanedRowAction?: "nullify" | "delete";
}

export interface CheckConstraintDefinition {
  name?: string;
  target: typeof Model;
  expression: string;
}

export interface ExclusionConstraintDefinition {
  name?: string;
  target: typeof Model;
  expression: string;
}

export interface IndexDefinition {
  name?: string;
  target: typeof Model;
  columns?: ((object?: any) => any[] | { [key: string]: number }) | string[];
  synchronize?: boolean;
  unique?: boolean;
  spatial?: boolean; // columns cannot contain null
  where: any;
  fulltext: boolean;
  parser: any;
  sparse: boolean;
  background: boolean;
  expireAfterSeconds: number | void;
}

export interface UniqueIndexDefinition {
  name?: string;
  target: typeof Model;
  columns?: ((object?: any) => any[] | { [key: string]: number }) | string[];
}
