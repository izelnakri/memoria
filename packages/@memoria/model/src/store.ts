import Model from "./index.js";
import { ModelRef } from "./index.js";
import { ColumnType } from "typeorm/driver/types/ColumnTypes";
import { generateUUID } from "./utils.js";

interface SchemaDefinition {
  name: string;
  target: typeof Model;
  columns: ColumnSchemaDefinition;
  relations: RelationshipSchemaDefinition;
  checks: CheckConstraintDefinition[];
  indices: IndexDefinition[];
  uniques: UniqueIndexDefinition[];
  exclusions: ExclusionConstraintDefinition[];
}

interface ColumnSchemaDefinition {
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

interface RelationshipSchemaDefinition {
  [relationshipName: string]: RelationshipDefinition;
}

// NOTE: this could be different definition: There is global and prop level one:
interface RelationshipDefinition {
  target: Function | string;
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

interface CheckConstraintDefinition {
  name?: string;
  target: typeof Model;
  expression: string;
}

interface ExclusionConstraintDefinition {
  name?: string;
  target: typeof Model;
  expression: string;
}

interface IndexDefinition {
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

interface UniqueIndexDefinition {
  name?: string;
  target: typeof Model;
  columns?: ((object?: any) => any[] | { [key: string]: number }) | string[];
}

interface DefaultValueReferences {
  [columnName: string]: any; // this can be literally any value but also 'increment', 'uuid', Date
}

type DB = { [className: string]: ModelRef[] };

type Entity = any;

export default class Store {
  // NOTE: this is only used by @memoria(not typeorm) to cache SchemaDefinition for different adapters
  static Entities: Entity[] = [];
  static getEntity(Class: typeof Model): Entity {
    return this.Entities.find((entity) => entity.options.name === Class.name);
  }

  static Schemas: SchemaDefinition[] = [];
  static getSchema(Class: typeof Model): SchemaDefinition {
    // TODO: make this is a full schema
    let targetSchema = this.Schemas.find((schema) => schema.name === Class.name);
    if (!targetSchema) {
      targetSchema = {
        name: Class.name,
        target: Class,
        columns: {},
        relations: {},
        checks: [],
        indices: [],
        uniques: [],
        exclusions: [],
      };
      this.Schemas.push(targetSchema);
    }

    return targetSchema;
  }

  static _primaryKeyNameCache: { [className: string]: string } = {};
  static getPrimaryKeyName(Class: typeof Model): string {
    if (Class.name in this._primaryKeyNameCache) {
      return this._primaryKeyNameCache[Class.name];
    }

    let columns = this.getColumnsMetadata(Class);

    this._primaryKeyNameCache[Class.name] = Object.keys(columns).find(
      (key) => columns[key].primary
    ) as string;

    if (!this._primaryKeyNameCache[Class.name]) {
      throw new Error(
        `[@memoria/model] ${Class.name} has no primary key! Please declare one with @PrimaryGeneratedColumn`
      );
    }

    return this._primaryKeyNameCache[Class.name];
  }
  static getColumnsMetadata(Class: typeof Model): ColumnSchemaDefinition {
    let schema = this.getSchema(Class);
    if (!schema) {
      throw new Error(
        `[@memoria/model] No Schema available for ${Class.name}. Did you add the column decorators?`
      );
    }

    return schema.columns;
  }
  static getColumnMetadata(Class: typeof Model, columnName: string): ColumnDefinition {
    return this.getColumnsMetadata(Class)[columnName];
  }
  static assignColumnMetadata(
    Class: typeof Model,
    columnName: string,
    columnMetadata: ColumnDefinition
  ): ColumnSchemaDefinition {
    let columns = this.getColumnsMetadata(Class);

    columns[columnName] = { ...columns[columnName], ...columnMetadata };

    return columns;
  }

  static _columnNames: { [className: string]: Set<string> } = {};
  static getColumnNames(Class: typeof Model): Set<string> {
    if (!this._columnNames[Class.name]) {
      this._columnNames[Class.name] = new Set(Object.keys(this.getColumnsMetadata(Class)));
    }

    return this._columnNames[Class.name];
  }

  static _defaultValuesCache: {
    [className: string]: {
      insert: DefaultValueReferences;
      update: DefaultValueReferences;
      delete: DefaultValueReferences;
    };
  } = {};
  static getDefaultValues(
    Class: typeof Model,
    operationType: "insert" | "update" | "delete"
  ): DefaultValueReferences {
    if (Class.name in this._defaultValuesCache) {
      return this._defaultValuesCache[Class.name][operationType];
    }

    let columns = this.getColumnsMetadata(Class) as ColumnSchemaDefinition;
    this._defaultValuesCache[Class.name] = Object.keys(columns).reduce(
      (result, columnName: string) => {
        let column = columns[columnName] as ColumnDefinition;

        if (column.default) {
          Object.assign(result.insert, { [columnName]: column.default });
        } else if (column.createDate) {
          Object.assign(result.insert, { [columnName]: () => new Date() });
        } else if (column.updateDate) {
          Object.assign(result.insert, { [columnName]: () => new Date() });
          Object.assign(result.update, { [columnName]: () => new Date() });
        } else if (column.deleteDate) {
          Object.assign(result.delete, { [columnName]: () => new Date() });
        } else if (column.generated) {
          Object.assign(result.insert, {
            [columnName]:
              column.generated === "uuid"
                ? generateUUID
                : (Class: typeof Model) => incrementId(Class.Cache as ModelRef[], columnName),
          });
        }

        return result;
      },
      { insert: {}, update: {}, delete: {} }
    );

    return this._defaultValuesCache[Class.name][operationType];
  }

  static _DB: DB = {};
  static getDB(Class: typeof Model): ModelRef[] {
    if (!this._DB[Class.name]) {
      this._DB[Class.name] = [];
    }

    return this._DB[Class.name];
  }

  // NOTE: maybe move this to serializer in future
  static _embedReferences: { [className: string]: { [columnName: string]: any } } = {};
  static getEmbedDataForSerialization(Class: typeof Model) {
    if (!this._embedReferences[Class.name]) {
      this._embedReferences[Class.name] = Class.embedReferences;

      return this._embedReferences[Class.name];
    }

    return this._embedReferences[Class.name];
  }

  static reset() {
    this.Schemas.length = 0;
    for (let cache in this._DB) delete this._DB[cache];
    for (let cache in this._columnNames) delete this._columnNames[cache];
    for (let cache in this._primaryKeyNameCache) delete this._primaryKeyNameCache[cache];
    for (let cache in this._defaultValuesCache) delete this._defaultValuesCache[cache];
    for (let cache in this._embedReferences) {
      // TODO: this only cleans registered data!!
      let embedReferences = this._embedReferences[cache];
      for (let reference in embedReferences) {
        delete embedReferences[reference];
      }
      delete this._embedReferences[cache];
    }
  }
}

function incrementId(DB: ModelRef[], keyName: string) {
  if (!DB || DB.length === 0) {
    return 1;
  }

  let lastIdInSequence = DB.map((model) => model[keyName]).sort((a, b) => a - b);
  // .find((id, index, array) => (index === array.length - 1 ? true : id + 1 !== array[index + 1])); // NOTE: this fills gaps! Maybe mismatches SQL DB implementation
  return lastIdInSequence[lastIdInSequence.length - 1] + 1;
}
