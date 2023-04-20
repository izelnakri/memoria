import Model from "../../model.js";
import Schema from "../schema.js";
import RelationshipDB from "./db.js";
import type { ModelName, ModuleDatabase } from "../../types.js";

export const ARRAY_ASKING_RELATIONSHIPS = new Set(["HasMany", "ManyToMany"]);

export type RelationshipType = "BelongsTo" | "OneToOne" | "HasMany" | "ManyToMany";
export type RelationshipCache = WeakMap<Model, null | Model | Model[]>;

// TODO: add RelationshipCache and ReverseRelationshipCache here
export interface RelationshipMetadata {
  RelationshipClass: typeof Model;
  RelationshipCache: RelationshipCache;
  relationshipName: string;
  relationshipType: RelationshipType;
  foreignKeyColumnName: null | string;
  SourceClass: typeof Model;
  ReverseRelationshipCache: null | RelationshipCache;
  reverseRelationshipName: null | string;
  reverseRelationshipType: null | RelationshipType;
  reverseRelationshipForeignKeyColumnName: null | string;
}

export interface RelationshipTable {
  [relationshipName: string]: RelationshipMetadata;
}

export interface ReverseRelationshipsTable {
  ModelName: RelationshipMetadata[];
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
  static getRelationshipTable(Class: typeof Model, relationshipTypeFilter?: RelationshipType): RelationshipTable {
    if (!this._relationshipTable.has(Class.name)) {
      Schema.Schemas.forEach((modelSchema) => {
        let SourceClass = modelSchema.target as typeof Class;
        let modelRelations = modelSchema.relations;

        this._relationshipTable.set(
          modelSchema.name,
          Object.keys(modelRelations).reduce((result, relationName) => {
            let relation = modelSchema.relations[relationName];
            let RelationshipClass = typeof relation.target === "function" ? relation.target() : relation.target;
            let relationshipType = MEMORIA_RELATIONSHIP_CONVERSIONS[modelRelations[relationName].type];

            return Object.assign(result, {
              [relationName]: {
                RelationshipClass,
                RelationshipCache: RelationshipDB.findRelationshipCacheFor(SourceClass, relationName, relationshipType),
                relationshipName: relationName,
                relationshipType,
                foreignKeyColumnName:
                  relationshipType === "BelongsTo"
                    ? getTargetRelationshipForeignKey(SourceClass, relationName, RelationshipClass)
                    : null,
                SourceClass,
                ReverseRelationshipCache: null,
                reverseRelationshipForeignKeyColumnName: null,
                reverseRelationshipName: null,
                reverseRelationshipType: null,
              },
            });
          }, {})
        );
      });
    }

    if (relationshipTypeFilter) {
      let relationshipTable = this._relationshipTable.get(Class.name) as RelationshipTable;

      return Object.keys(relationshipTable).reduce((result, relationshipName) => {
        if (relationshipTypeFilter === relationshipTable[relationshipName].relationshipType) {
          result[relationshipName] = relationshipTable[relationshipName];
        }

        return result;
      }, {});
    }

    return this._relationshipTable.get(Class.name) as RelationshipTable;
  }

  // NOTE: Faster lookup/cache needed for updating existing reverse relationships on CRUD, why cant this be the object?
  static _reverseRelationshipTables: ModuleDatabase<ReverseRelationshipsTable> = new Map();
  static getReverseRelationshipsTable(Class: typeof Model): ReverseRelationshipsTable {
    if (!this._reverseRelationshipTables.has(Class.name)) {
      this._reverseRelationshipTables.set(
        Class.name,
        {} as { ModelName: RelationshipMetadata[] } // NOTE: should this include all the relationships here(?)
      );

      for (let [modelName, relationshipTable] of this._relationshipTable.entries()) {
        Object.keys(relationshipTable).forEach((relationshipName) => {
          let { RelationshipClass } = relationshipTable[relationshipName];
          if (!this._reverseRelationshipTables.has(RelationshipClass.name)) {
            this._reverseRelationshipTables.set(RelationshipClass.name, {} as { ModelName: RelationshipMetadata[] });
          }

          let SourceClass = Schema.Models.get(modelName) as typeof Class;
          let reverseRelationshipTable = this._reverseRelationshipTables.get(RelationshipClass.name) as {
            ModelName: RelationshipMetadata[];
          };
          if (!reverseRelationshipTable[SourceClass.name]) {
            reverseRelationshipTable[SourceClass.name] = [];
          }

          reverseRelationshipTable[SourceClass.name].push(relationshipTable[relationshipName]);
        });
      }
    }

    return this._reverseRelationshipTables.get(Class.name) as ReverseRelationshipsTable;
  }

  // Example: getRelationshipMetadataFor(User, 'photos') => { SourceClass: Photo, relationshipName: 'user' }
  static getRelationshipMetadataFor(Class: typeof Model, relationshipName: string) {
    let relationshipTable = this.getRelationshipTable(Class);
    let currentMetadata = relationshipTable[relationshipName];
    if (!currentMetadata.reverseRelationshipName) {
      let reverseRelationshipMetadatas =
        this.getReverseRelationshipsTable(Class)[currentMetadata.RelationshipClass.name];
      let reverseRelationship =
        reverseRelationshipMetadatas &&
        reverseRelationshipMetadatas.find((reverseRelationship) => {
          if (
            currentMetadata.relationshipType === "BelongsTo" &&
            ["OneToOne", "HasMany"].includes(reverseRelationship.relationshipType)
          ) {
            return reverseRelationship.SourceClass.name === currentMetadata.RelationshipClass.name;
          } else if (
            reverseRelationship.relationshipType === REVERSE_RELATIONSHIP_LOOKUPS[currentMetadata.relationshipType]
          ) {
            return reverseRelationship.SourceClass.name === currentMetadata.RelationshipClass.name;
          }

          return false;
        });

      if (reverseRelationship) {
        Object.assign(currentMetadata, {
          reverseRelationshipName: reverseRelationship.relationshipName,
          reverseRelationshipForeignKeyColumnName: reverseRelationship.foreignKeyColumnName,
          reverseRelationshipType: reverseRelationship.relationshipType,
        });
        Object.assign(reverseRelationship, {
          reverseRelationshipName: currentMetadata.relationshipName,
          reverseRelationshipType: currentMetadata.relationshipType,
          reverseRelationshipForeignKeyColumnName: currentMetadata.foreignKeyColumnName,
        });
      }
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
        let { RelationshipClass, foreignKeyColumnName } = belongsToRelationshipsTable[relationshipName];
        this.getBelongsToColumnTable(Class)[foreignKeyColumnName as string] = {
          RelationshipClass,
          relationshipName,
          reverseRelationshipName: this.getRelationshipMetadataFor(Class, relationshipName).reverseRelationshipName,
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
      let modelRelationTable = this.getRelationshipTable(Schema.Models.get(modelName) as typeof Model);

      summary[modelName] = Object.keys(modelRelationTable).reduce((result, relationshipName) => {
        let { RelationshipClass, relationshipType } = modelRelationTable[relationshipName];

        result[relationshipName] = ARRAY_ASKING_RELATIONSHIPS.has(relationshipType)
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
    RelationshipClass.primaryKeyType === "uuid" ? `${relationshipName}_uuid` : `${relationshipName}_id`;
  if (Class.columnNames.has(preferredRelationshipForeignKey)) {
    return preferredRelationshipForeignKey;
  } else if (Class.columnNames.has(`${relationshipName}_uuid`)) {
    return `${relationshipName}_uuid`;
  } else if (Class.columnNames.has(`${relationshipName}_id`)) {
    return `${relationshipName}_id`;
  }

  return preferredRelationshipForeignKey;
}
