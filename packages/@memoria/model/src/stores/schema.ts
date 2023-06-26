// NOTE: investigate connection.entityMetadatas;
// TRUNCATE TABLE table_name RESTART IDENTITY CASCADE; // vs without CASCADE
import Model from "../model.js";
import type { ModuleDatabase, SchemaDefinition, ColumnSchemaDefinition, ColumnDefinition } from "../types.js";
import type { MemoryAdapter } from "@memoria/adapters";

export default class Schema {
  static get Adapters() {
    let result = new Set();

    this.Schemas.forEach((schema) => result.add(schema.target.Adapter));

    return Array.from(result) as (typeof MemoryAdapter)[];
  }

  static Models: ModuleDatabase<typeof Model> = new Map();
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
      this.Models.set(Class.name, Class);
    }

    return targetSchema;
  }

  static _primaryKeyNameCache: ModuleDatabase<string> = new Map();
  static getPrimaryKeyName(Class: typeof Model): string {
    if (this._primaryKeyNameCache.has(Class.name)) {
      return this._primaryKeyNameCache.get(Class.name) as string;
    }

    let columns = this.getColumnsMetadataFrom(Class);
    let primaryKeyName = Object.keys(columns).find((key) => columns[key].primary) as string;

    this._primaryKeyNameCache.set(Class.name, primaryKeyName);

    if (!primaryKeyName) {
      throw new Error(
        `[@memoria/model] ${Class.name} has no primary key! Please declare one with @PrimaryGeneratedColumn`
      );
    }

    return primaryKeyName;
  }

  static getColumnsMetadataFrom(Class: typeof Model): ColumnSchemaDefinition {
    let schema = this.getSchema(Class);
    if (!schema) {
      throw new Error(`[@memoria/model] No Schema available for ${Class.name}. Did you add the column decorators?`);
    }

    return schema.columns;
  }
  static getColumnMetadata(Class: typeof Model, columnName: string): ColumnDefinition {
    return this.getColumnsMetadataFrom(Class)[columnName];
  }
  static assignColumnMetadata(
    Class: typeof Model,
    columnName: string,
    columnMetadata: ColumnDefinition
  ): ColumnSchemaDefinition {
    let columns = this.getColumnsMetadataFrom(Class);

    columns[columnName] = { ...columns[columnName], ...columnMetadata };

    return columns;
  }

  static _columnNames: ModuleDatabase<Set<string>> = new Map();
  static getColumnNames(Class: typeof Model): Set<string> {
    if (!this._columnNames.has(Class.name)) {
      this._columnNames.set(Class.name, new Set(Object.keys(this.getColumnsMetadataFrom(Class))));
    }

    return this._columnNames.get(Class.name) as Set<string>;
  }

  static async resetSchemas(Class?: typeof Model): Promise<Schema> {
    await Promise.all(this.Adapters.map((Adapter) => Adapter.resetSchemas(this, Class)));

    return this;
  }
}
