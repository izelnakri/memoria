import Model from "../../model.js";
import Schema from "../schema.js";
import type { ModuleDatabase } from "../../types.js";

export type RelationshipType = "BelongsTo" | "OneToOne" | "HasMany" | "ManyToMany";

export interface RelationshipTable {
  [relationshipName: string]: {
    RelationshipClass: typeof Model;
    relationshipType: RelationshipType;
    foreignKeyColumnName: null | string;
    reverseRelationshipForeignKeyColumnName: null | string;
    reverseRelationshipName: null | string;
  };
}

export interface RelationshipSummary {
  [relationshipName: string]: typeof Model | Array<typeof Model>;
}

interface BelongsToColumnTable {
  [belongsToColumnForeignKeyName: string]: {
    RelationshipClass: typeof Model;
    relationshipName: string;
    reverseRelationshipName: null | string;
  };
}

const ARRAY_ASKING_RELATIONSHIPS = ["HasMany", "ManyToMany"];
const MEMORIA_RELATIONSHIP_CONVERSIONS = {
  "one-to-one": "OneToOne",
  "many-to-one": "BelongsTo",
  "one-to-many": "HasMany",
  "many-to-many": "ManyToMany",
};
const REVERSE_RELATIONSHIP_LOOKUPS = {
  OneToOne: "BelongsTo",
  HasMany: "BelongsTo",
  ManyToMany: "ManyToMany",
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
                RelationshipClass,
                relationshipType,
                foreignKeyColumnName:
                  relationshipType === "BelongsTo"
                    ? getTargetRelationshipForeignKey(
                        modelSchema.target, // NOTE: maybe this is modelSchema.target()
                        relationName,
                        RelationshipClass
                      )
                    : null,
                reverseRelationshipForeignKeyColumnName: null,
                reverseRelationshipName: null,
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
        let { RelationshipClass, relationshipType } = modelRelationTable[relationshipName];

        result[relationshipName] = ARRAY_ASKING_RELATIONSHIPS.includes(relationshipType)
          ? [RelationshipClass]
          : RelationshipClass;

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
        let { RelationshipClass, foreignKeyColumnName } = belongsToRelationshipsTable[
          relationshipName
        ];
        this.getBelongsToColumnTable(Class)[foreignKeyColumnName] = {
          RelationshipClass,
          relationshipName,
          reverseRelationshipName: this.getReverseRelationshipName(Class, relationshipName),
        };
        belongsToColumnNames.add(foreignKeyColumnName);
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

  static getForeignKeyColumnName(Class: typeof Model, relationshipName: string) {
    let relationshipTable = this.getRelationshipTable(Class);

    return relationshipTable[relationshipName].foreignKeyColumnName;
  }

  static getReverseRelationshipTable(Class: typeof Model, relationshipName: string) {
    let { RelationshipClass } = this.getRelationshipTable(Class)[relationshipName]; // TODO: maybe do this getOrCacheReverseRelationshipTable as well always

    return this.getRelationshipTable(RelationshipClass);
  }

  // NOTE: in future this can be smarter with new decorator API Changes:
  static getReverseRelationshipName(Class: typeof Model, relationshipName: string) {
    let relationshipTable = this.getOrCacheReverseRelationshipTable(Class, relationshipName);

    return relationshipTable[relationshipName].reverseRelationshipName;
  }

  static getReverseRelationshipForeignColumnName(Class: typeof Model, relationshipName: string) {
    let relationshipTable = this.getOrCacheReverseRelationshipTable(Class, relationshipName);

    return relationshipTable[relationshipName].reverseRelationshipForeignKeyColumnName;
  }

  static getOrCacheReverseRelationshipTable(Class: typeof Model, relationshipName: string) {
    let relationshipTable = this.getRelationshipTable(Class);
    let currentMetadata = relationshipTable[relationshipName];

    if (
      !currentMetadata.foreignKeyColumnName &&
      !currentMetadata.reverseRelationshipForeignKeyColumnName
    ) {
      let reverseRelationshipTable = this.getReverseRelationshipTable(Class, relationshipName);
      let reverseRelationshipName =
        Object.keys(reverseRelationshipTable).find((reverseRelationshipName) => {
          let { RelationshipClass, relationshipType } = reverseRelationshipTable[
            reverseRelationshipName
          ];

          if (
            currentMetadata.relationshipType === "BelongsTo" &&
            ["OneToOne", "HasMany"].includes(relationshipType)
          ) {
            return RelationshipClass.name === Class.name;
          } else if (
            relationshipType === REVERSE_RELATIONSHIP_LOOKUPS[currentMetadata.relationshipType]
          ) {
            return RelationshipClass.name === Class.name;
          }

          return false;
        }) || null;

      if (reverseRelationshipName) {
        currentMetadata.reverseRelationshipName = reverseRelationshipName;
        currentMetadata.reverseRelationshipForeignKeyColumnName =
          reverseRelationshipTable[reverseRelationshipName].foreignKeyColumnName;
      }
    }

    return relationshipTable;
  }

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
