import Model from "../../model.js";
import Schema from "../schema.js";
import type { ModelName, ModuleDatabase } from "../../types.js";

export type RelationshipType = "BelongsTo" | "OneToOne" | "HasMany" | "ManyToMany";

export interface RelationshipMetadata {
  RelationshipClass: typeof Model;
  relationshipType: RelationshipType;
  foreignKeyColumnName: null | string;
  reverseRelationshipForeignKeyColumnName: null | string;
  reverseRelationshipName: null | string;
}

export interface RelationshipTable {
  [relationshipName: string]: RelationshipMetadata;
}

export interface ReverseRelationshipMetadata {
  TargetClass: typeof Model;
  relationshipName: string;
  relationshipType: RelationshipType;
  foreignKeyColumnName: null | string;
}

export interface ReverseRelationshipsTable {
  ModelName: ReverseRelationshipMetadata[];
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

export default class RelationshipSchema {
  static _relationshipTable: Map<ModelName, RelationshipTable> = new Map();
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

  static _reverseRelationshipTables: ModuleDatabase<ReverseRelationshipsTable> = new Map();
  static getReverseRelationshipsTable(Class: typeof Model): ReverseRelationshipsTable {
    if (!this._reverseRelationshipTables.has(Class.name)) {
      this._reverseRelationshipTables.set(
        Class.name,
        {} as { ModelName: ReverseRelationshipMetadata[] }
      );

      for (let [modelName, relationshipTable] of this._relationshipTable.entries()) {
        Object.keys(relationshipTable).forEach((relationshipName) => {
          let { RelationshipClass, relationshipType, foreignKeyColumnName } = relationshipTable[
            relationshipName
          ];

          if (!this._reverseRelationshipTables.has(RelationshipClass.name)) {
            this._reverseRelationshipTables.set(
              RelationshipClass.name,
              {} as { ModelName: ReverseRelationshipMetadata[] }
            );
          }
          let TargetClass = Schema.Models.get(modelName) as typeof Class;
          let reverseRelationshipTable = this._reverseRelationshipTables.get(
            RelationshipClass.name
          ) as { ModelName: ReverseRelationshipMetadata[] };

          if (!reverseRelationshipTable[TargetClass.name]) {
            reverseRelationshipTable[TargetClass.name] = [];
          }

          reverseRelationshipTable[TargetClass.name].push({
            TargetClass: Schema.Models.get(modelName) as typeof Class, // TODO: get reverseTargetClass! // Schema.Models.get(modelName) as typeof Class,
            relationshipName,
            relationshipType,
            foreignKeyColumnName,
          });
        });
      }
    }

    return this._reverseRelationshipTables.get(Class.name) as ReverseRelationshipsTable;
  }

  // User, photos
  // => TargetClass: Photo, relationshipName: user,
  static getRelationshipMetadataFor(Class: typeof Model, relationshipName: string) {
    let relationshipTable = this.getRelationshipTable(Class);
    let currentMetadata = relationshipTable[relationshipName];

    if (!currentMetadata.reverseRelationshipName) {
      let reverseRelationshipMetadatas = this.getReverseRelationshipsTable(Class);

      // debugger;
      let targetReverseRelationship =
        reverseRelationshipMetadatas[currentMetadata.RelationshipClass.name].find(
          (reverseRelationship) => {
            if (
              currentMetadata.relationshipType === "BelongsTo" &&
              ["OneToOne", "HasMany"].includes(reverseRelationship.relationshipType)
            ) {
              return (
                reverseRelationship.TargetClass.name === currentMetadata.RelationshipClass.name
              );
            } else if (
              reverseRelationship.relationshipType ===
              REVERSE_RELATIONSHIP_LOOKUPS[currentMetadata.relationshipType]
            ) {
              return (
                reverseRelationship.TargetClass.name === currentMetadata.RelationshipClass.name
              );
            }

            return false;
          }
        ) || null;

      // debugger;
      if (targetReverseRelationship) {
        currentMetadata.reverseRelationshipName = targetReverseRelationship.relationshipName;
        currentMetadata.reverseRelationshipForeignKeyColumnName =
          targetReverseRelationship.foreignKeyColumnName;
      }
      // debugger;
    }

    return currentMetadata;
  }

  static _belongsToColumnNames: ModuleDatabase<Set<string>> = new Map();
  static getBelongsToColumnNames(Class: typeof Model): Set<string> {
    if (!this._belongsToColumnNames.has(Class.name)) {
      let belongsToRelationshipsTable = this.getRelationshipTable(Class, "BelongsTo");
      let belongsToColumnNames = new Set() as Set<string>;

      this._belongsToColumnNames.set(Class.name, belongsToColumnNames);

      Object.keys(belongsToRelationshipsTable).forEach((relationshipName) => {
        let { RelationshipClass, foreignKeyColumnName } = belongsToRelationshipsTable[
          relationshipName
        ];
        this.getBelongsToColumnTable(Class)[foreignKeyColumnName as string] = {
          RelationshipClass,
          relationshipName,
          reverseRelationshipName: this.getRelationshipMetadataFor(Class, relationshipName)
            .reverseRelationshipName,
        };
        belongsToColumnNames.add(foreignKeyColumnName as string);
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

  static get relationshipsSummary(): ModuleDatabase<RelationshipSummary> {
    let summary = {};
    for (let modelName of Schema.Models.keys()) {
      let modelRelationTable = this.getRelationshipTable(
        Schema.Models.get(modelName) as typeof Model
      );

      summary[modelName] = Object.keys(modelRelationTable).reduce((result, relationshipName) => {
        let { RelationshipClass, relationshipType } = modelRelationTable[relationshipName];

        result[relationshipName] = ARRAY_ASKING_RELATIONSHIPS.includes(relationshipType)
          ? [RelationshipClass]
          : RelationshipClass;

        return result;
      }, {});
    }

    return summary as ModuleDatabase<RelationshipSummary>;
  }

  static resetSchema(Class?: typeof Model) {
    this._relationshipTable.clear();
    this._reverseRelationshipTables.clear();

    if (Class) {
      this._belongsToColumnNames.delete(Model.name);
      this._belongsToColumnTable.delete(Model.name);
    } else {
      this._belongsToColumnNames.clear();
      this._belongsToColumnTable.clear();
    }

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
