import Model from "../../model.js";
import Schema from "../schema.js";
import type { ModuleDatabase } from "../../types.js";

export type RelationshipType = "BelongsTo" | "OneToOne" | "HasMany" | "ManyToMany";

export interface RelationshipTable {
  [relationshipName: string]: {
    relationshipType: string;
    relationshipClass: typeof Model;
    foreignKeyColumnName: string;
    // reverseRelationshipName // TODO: in future use this as reference for reverseRelationship lookups
    // reverseRelationshipColumn
  };
}

export interface RelationshipSummary {
  [relationshipName: string]: typeof Model | Array<typeof Model>;
}

interface BelongsToColumnTable {
  [belongsToColumnForeignKeyName: string]: {
    relationshipName: string;
    relationshipClass: typeof Model;
    // reverseRelationshipName // TODO: in future use this as reference for reverseRelationship lookups
  };
}

const ARRAY_ASKING_RELATIONSHIPS = ["HasMany", "ManyToMany"];
const MEMORIA_RELATIONSHIP_CONVERSIONS = {
  "one-to-one": "OneToOne",
  "many-to-one": "BelongsTo",
  "one-to-many": "HasMany",
  "many-to-many": "ManyToMany",
};

// NOTE: in-future maybe create special class/object for HasManyArray -> behaves like Set, has Array prototype methods(filter etc)
export default class RelationshipSchema {
  static getRelationshipSchemaDefinitions(Class: typeof Model) {
    let schema = Schema.Schemas.find((schema) => schema.name === Class.name);

    return schema && schema.relations;
  }

  static _relationshipTable: Map<string, RelationshipTable> = new Map();
  static getRelationshipTable(
    Class: typeof Model,
    relationshipType?: RelationshipType
  ): RelationshipTable {
    if (!this._relationshipTable.has(Class.name)) {
      Schema.Schemas.forEach((modelSchema) => {
        let modelRelations = modelSchema.relations;

        this._relationshipTable.set(
          modelSchema.name,
          Object.keys(modelRelations).reduce((result, relationName) => {
            let relation = modelSchema.relations[relationName];
            let RelationshipClass =
              typeof relation.target === "function" ? relation.target() : relation.target;
            let relationshipType =
              MEMORIA_RELATIONSHIP_CONVERSIONS[modelRelations[relationName].type];

            return Object.assign(result, {
              [relationName]: {
                relationshipType,
                relationshipClass: RelationshipClass,
                foreignKeyColumnName:
                  relationshipType === "BelongsTo"
                    ? getTargetRelationshipForeignKey(
                        modelSchema.target, // NOTE: maybe this is modelSchema.target()
                        relationName,
                        RelationshipClass
                      )
                    : null,
              },
            });
          }, {})
        );
      });
    }

    if (relationshipType) {
      let relationshipTable = this._relationshipTable.get(Class.name) as RelationshipTable;

      return Object.keys(relationshipTable).reduce((result, relationshipName) => {
        if (relationshipType === relationshipTable[relationshipName].relationshipType) {
          result[relationshipName] = relationshipTable[relationshipName];
        }

        return result;
      }, {});
    }

    return this._relationshipTable.get(Class.name) as RelationshipTable;
  }

  static get relationshipsSummary(): { [modelName: string]: RelationshipSummary } {
    let summary = {};
    for (let [modelName, modelRelationTable] of this._relationshipTable.entries()) {
      summary[modelName] = Object.keys(modelRelationTable).reduce((result, relationshipName) => {
        let metadata = modelRelationTable[relationshipName];

        result[relationshipName] = ARRAY_ASKING_RELATIONSHIPS.includes(metadata.relationshipType)
          ? [metadata.relationshipClass]
          : metadata.relationshipClass;

        return result;
      }, {});
    }

    return summary;
  }

  static _belongsToColumnNames: ModuleDatabase<Set<string>> = new Map();
  static getBelongsToColumnNames(Class: typeof Model): Set<string> {
    if (!this._belongsToColumnNames.has(Class.name)) {
      let belongsToRelationshipsTable = Class.getRelationshipTable("BelongsTo");
      let belongsToColumnNames = new Set() as Set<string>;

      this._belongsToColumnNames.set(Class.name, belongsToColumnNames);

      Object.keys(belongsToRelationshipsTable).forEach((relationshipName) => {
        let relationshipClass = belongsToRelationshipsTable[relationshipName].relationshipClass;
        let targetRelationshipForeignKey = getTargetRelationshipForeignKey(
          Class,
          relationshipName,
          relationshipClass
        );
        // TODO: this should probably be in getBelongsToColumnTable:
        this.getBelongsToColumnTable(Class)[targetRelationshipForeignKey] = {
          relationshipName,
          relationshipClass,
        };
        belongsToColumnNames.add(targetRelationshipForeignKey);
      });
    }

    return this._belongsToColumnNames.get(Class.name) as Set<string>;
  }

  static _belongsToColumnTable: ModuleDatabase<BelongsToColumnTable> = new Map();
  static getBelongsToColumnTable(Class: typeof Model): BelongsToColumnTable {
    if (!this._belongsToColumnTable.has(Class.name)) {
      this._belongsToColumnTable.set(Class.name, {});
    }

    return this._belongsToColumnTable.get(Class.name) as BelongsToColumnTable;
  }

  static getForeignKeyColumnName(Class: typeof Model, relationshipName: string): string {
    let relationshipTable = this.getRelationshipTable(Class);

    return relationshipTable[relationshipName].foreignKeyColumnName;
  }

  static getReverseRelationshipTable(Class: typeof Model, relationshipName: string) {
    let relationshipTable = this.getRelationshipTable(Class);
    let RelationshipClass = relationshipTable[relationshipName].relationshipClass;

    return this.getRelationshipTable(RelationshipClass);
  }

  static getReverseRelationshipTableKey() {}

  static getRelationshipType(Class: typeof Model, relationshipName: string): RelationshipType {
    let relationshipTable = this.getRelationshipTable(Class);
    if (relationshipTable && relationshipTable[relationshipName]) {
      return relationshipTable[relationshipName].relationshipType as RelationshipType;
    }

    throw new Error(`${relationshipName} relationship not found on ${Class.name}`);
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
