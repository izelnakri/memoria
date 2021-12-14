// NOTE: investigate connection.entityMetadatas;
// TRUNCATE TABLE my_table RESTART IDENTITY;
// TRUNCATE TABLE table_name RESTART IDENTITY CASCADE; // NOTE: investigate what CASCADE does
// TODO: rewrite this file as store.ts and utilize WeakMap, Map, WeakSet
// TODO: turn _DB into a Map<InstanceWithoutRelationship(?)> -> WeakSet to include the relationships(?) or a WeakMap with WeakSet(?)
import Model from "../model.js";
import type { SchemaDefinition, ColumnSchemaDefinition, ColumnDefinition } from "../types";
import type { MemoryAdapter } from "@memoria/adapters";

export interface RelationshipSummary {
  [relationshipName: string]: typeof Model | Array<typeof Model>;
}

interface RelationshipSummaryStore {
  [modelName: string]: RelationshipSummary;
}

// NOTE: WeakMap not implemented so far because:
// 1- Adapters need to iterate over each schema.target.Adapter (can be done with getSchema() and push to array during insert)
// 2- Cannot produce relationshipSummary -> big limitation
// 3- resetCache and resetRecords gets the target tables/models from Config.Schema
// 4- resetSchemas iterate through all the Adapters [possible]
// 5- Decorators directly push to the schema getting it via getSchema() [possible]

// Maybe move objects to Map for easy clearing for Schema
// Clear nothing architucture -> Never clear Schema by utilizing a WeakMap
const arrayAskingRelationships = ["one-to-many", "many-to-many"];
// Stores all the internal data Memoria needs
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

  // static _relationships; // TODO: cache this lookup in future
  static get relationshipsSummary(): RelationshipSummaryStore {
    return this.Schemas.reduce((result, modelSchema) => {
      return Object.assign(result, {
        [modelSchema.name]: Object.keys(modelSchema.relations).reduce((result, relationName) => {
          let relation = modelSchema.relations[relationName];

          return Object.assign(result, {
            [relationName]: arrayAskingRelationships.includes(relation.type)
              ? [relation.target()]
              : relation.target(),
          });
        }, {}),
      });
    }, {});
  }

  static getRelationshipSchemaDefinitions(Class: typeof Model) {
    let schema = this.Schemas.find((schema) => schema.name === Class.name);

    return schema && schema.relations;
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

  static _belongsToColumnNames: { [className: string]: Set<string> } = {};
  static getBelongsToColumnNames(Class: typeof Model): Set<string> {
    if (!this._belongsToColumnNames[Class.name]) {
      this._belongsToColumnNames[Class.name] = new Set();

      Object.keys(Class.belongsToRelationships).forEach((relationshipName) => {
        let relationshipClass = Class.belongsToRelationships[relationshipName];
        let targetRelationshipForeignKey = getTargetRelationshipForeignKey(
          Class,
          relationshipName,
          relationshipClass
        );
        (this.getBelongsToPointers(Class)[targetRelationshipForeignKey] = {
          relationshipName,
          relationshipClass,
        }),
          this._belongsToColumnNames[Class.name].add(targetRelationshipForeignKey);
      });
    }

    return this._belongsToColumnNames[Class.name];
  }
  static getBelongsToForeignKey(Class: typeof Model, relationshipName: string): string {
    let belongsToPointers = this.getBelongsToPointers(Class);

    return Object.keys(belongsToPointers).find(
      (belongsToColumnName) =>
        belongsToPointers[belongsToColumnName].relationshipName === relationshipName
    ) as string;
  }

  static _belongsToPointers: {
    [className: string]: {
      [belongsToColumnForeignKeyName: string]: {
        relationshipName: string;
        relationshipClass: typeof Model;
      };
    };
  } = {};
  static getBelongsToPointers(
    Class: typeof Model
  ): {
    [belongsToColumnForeignKeyName: string]: {
      relationshipName: string;
      relationshipClass: typeof Model;
    };
  } {
    if (!this._belongsToPointers[Class.name]) {
      this._belongsToPointers[Class.name] = {};
    }

    return this._belongsToPointers[Class.name];
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

function getTargetRelationshipForeignKey(
  Class: typeof Model,
  relationshipName: string,
  RelationshipClass: typeof Model
) {
  let preferredRelationshipForeignKey =
    RelationshipClass.primaryKeyType === "uuid"
      ? `${relationshipName}_uuid`
      : `${relationshipName}_id`;
  if (Class.columnNames.has(preferredRelationshipForeignKey)) {
    return preferredRelationshipForeignKey;
  } else if (Class.columnNames.has(`${relationshipName}_uuid`)) {
    return `${relationshipName}_uuid`;
  } else if (Class.columnNames.has(`${relationshipName}_id`)) {
    return `${relationshipName}_id`;
  }

  return preferredRelationshipForeignKey;
}
