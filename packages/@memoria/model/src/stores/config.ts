// NOTE: investigate connection.entityMetadatas;
// TRUNCATE TABLE my_table RESTART IDENTITY;
// TRUNCATE TABLE table_name RESTART IDENTITY CASCADE; // NOTE: investigate what CASCADE does
// TODO: rewrite this file as store.ts and utilize WeakMap, Map, WeakSet
// TODO: turn _DB into a Map<InstanceWithoutRelationship(?)> -> WeakSet to include the relationships(?) or a WeakMap with WeakSet(?)
import Model from "../model.js";
import type { SchemaDefinition, ColumnSchemaDefinition, ColumnDefinition } from "../types";
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

  static async resetSchemas(modelName?: string): Promise<Config> {
    await Promise.all(this.Adapters.map((Adapter) => Adapter.resetSchemas(this, modelName)));

    return this;
  }
}
