// NOTE: investigate connection.entityMetadatas;
// TRUNCATE TABLE my_table RESTART IDENTITY;
// TRUNCATE TABLE table_name RESTART IDENTITY CASCADE; // NOTE: investigate what CASCADE does
// TODO: rewrite this file as store.ts and utilize WeakMap, Map, WeakSet
// TODO: turn _DB into a Map<InstanceWithoutRelationship(?)> -> WeakSet to include the relationships(?) or a WeakMap with WeakSet(?)
import Model from "../model.js";
import type {
  ModuleDatabase,
  SchemaDefinition,
  ColumnSchemaDefinition,
  ColumnDefinition,
} from "../types";
import type { MemoryAdapter } from "@memoria/adapters";

// NOTE: WeakMap not implemented so far because:
// 1- Adapters need to iterate over each schema.target.Adapter (can be done with getSchema() and push to array during insert)
// 2- Cannot produce relationshipSummary -> big limitation
// 3- resetCache and resetRecords gets the target tables/models from Config.Schema
// 4- resetSchemas iterate through all the Adapters [possible]
// 5- Decorators directly push to the schema getting it via getSchema() [possible]

// Maybe move objects to Map for easy clearing for Schema
// Clear nothing architucture -> Never clear Schema by utilizing a WeakMap
// relationshipSummary inject and the mutate maybe from decorator
// TODO: make arrays into classes(?)

export default class Config {
  static get Adapters() {
    let result = new Set();

    this.Schemas.forEach((schema) => result.add(schema.target.Adapter));

    return Array.from(result) as typeof MemoryAdapter[];
  }

  static Schemas: SchemaDefinition[] = [];
  static getSchema(Class: typeof Model): SchemaDefinition {
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

  static _primaryKeyNameCache: ModuleDatabase<string> = new Map();
  static getPrimaryKeyName(Class: typeof Model): string {
    if (this._primaryKeyNameCache.has(Class.name)) {
      return this._primaryKeyNameCache.get(Class.name) as string;
    }

    let columns = this.getColumnsMetadata(Class);
    let primaryKeyName = Object.keys(columns).find((key) => columns[key].primary) as string;

    this._primaryKeyNameCache.set(Class.name, primaryKeyName);

    if (!primaryKeyName) {
      throw new Error(
        `[@memoria/model] ${Class.name} has no primary key! Please declare one with @PrimaryGeneratedColumn`
      );
    }

    return primaryKeyName;
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

  static _columnNames: ModuleDatabase<Set<string>> = new Map();
  static getColumnNames(Class: typeof Model): Set<string> {
    if (!this._columnNames.has(Class.name)) {
      this._columnNames.set(Class.name, new Set(Object.keys(this.getColumnsMetadata(Class))));
    }

    return this._columnNames.get(Class.name) as Set<string>;
  }

  static async resetSchemas(Class: typeof Model): Promise<Config> {
    await Promise.all(this.Adapters.map((Adapter) => Adapter.resetSchemas(this, Class)));

    return this;
  }

  static async resetRecords() {
    await Promise.all(Config.Adapters.map((Adapter) => Adapter.resetRecords()));

    return this;
  }
}
