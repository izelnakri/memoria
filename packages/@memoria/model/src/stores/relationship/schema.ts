import Model from "../../model.js";
import Schema from "../schema.js";
import RelationshipDB from "./db.js";
import type { ModelName, ModuleDatabase } from "../../types.js";

export const ARRAY_ASKING_RELATIONSHIPS = new Set(["HasMany", "ManyToMany"]);

export type RelationshipType = "BelongsTo" | "OneToOne" | "HasMany" | "ManyToMany";
export type RelationshipCache = WeakMap<Model, null | Model | Model[]>;

export interface RelationshipMetadata {
  RelationshipClass: typeof Model;
  RelationshipCache: RelationshipCache;
  relationshipName: string;
  relationshipType: RelationshipType;
  foreignKeyColumnName: null | string;
  SourceClass: typeof Model;
  // TODO: Create a runtime error when HasMany, HasOne or BelongsTo gets defined without a Reflective metadata on the target class
  ReverseRelationshipCache: RelationshipCache;
  reverseRelationshipName: string;
  reverseRelationshipType: RelationshipType;
  reverseRelationshipForeignKeyColumnName: null | string;
}

export interface RelationshipTable {
  [relationshipName: string]: RelationshipMetadata;
}

export interface ReverseRelationshipsTable {
  ModelName: RelationshipMetadata[];
}

interface BelongsToColumnTable {
  [belongsToColumnForeignKeyName: string]: RelationshipMetadata;
}

export interface RelationshipSummary {
  [relationshipName: string]: typeof Model | Array<typeof Model>;
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
      const ReverseRelationshipTables = this._reverseRelationshipTables;

      Schema.Schemas.forEach((modelSchema) => {
        let SourceClass = modelSchema.target as typeof Class;
        let modelRelations = modelSchema.relations;

        if (!ReverseRelationshipTables.has(SourceClass.name)) {
          ReverseRelationshipTables.set(SourceClass.name, {} as ReverseRelationshipsTable);
        }

        this._relationshipTable.set(
          modelSchema.name,
          Object.keys(modelRelations).reduce((result, relationshipName) => {
            let relation = modelSchema.relations[relationshipName];
            let RelationshipClass = typeof relation.target === "function" ? relation.target() : relation.target;
            // let reflectiveRelationshipTable = this.getRelationshipTable(RelationshipClass);
            let relationshipType = MEMORIA_RELATIONSHIP_CONVERSIONS[modelRelations[relationshipName].type];

            if (!ReverseRelationshipTables.has(RelationshipClass.name)) {
              ReverseRelationshipTables.set(RelationshipClass.name, {} as ReverseRelationshipsTable);
            }

            let reverseRelationshipTable = ReverseRelationshipTables.get(
              RelationshipClass.name
            ) as ReverseRelationshipsTable;
            if (!reverseRelationshipTable[SourceClass.name]) {
              reverseRelationshipTable[SourceClass.name] = [];
            }

            let metadata = {
              RelationshipClass,
              get RelationshipCache() {
                return RelationshipDB.findRelationshipCacheFor(
                  this.SourceClass,
                  this.relationshipName,
                  this.relationshipType
                );
              },
              relationshipName: relationshipName,
              relationshipType,
              foreignKeyColumnName:
                relationshipType === "BelongsTo"
                  ? getTargetRelationshipForeignKey(SourceClass, relationshipName, RelationshipClass)
                  : null,
              SourceClass,
              get ReverseRelationshipCache() {
                if (!this.reverseRelationshipName || !this.reverseRelationshipType) {
                  let targetReverseRelationship =
                    this.relationshipType === "BelongsTo" ? "@HasOne or @HasMany" : "@BelongsTo";
                  throw new Error(
                    `ReverseRelationship lookup not available for ${this.SourceClass.name} ${this.relationshipName}. You need to define a ` +
                      `${targetReverseRelationship} that targets ${this.SourceClass.name} on ${this.RelationshipClass.name} class!`
                  );
                }

                return RelationshipDB.findRelationshipCacheFor(
                  this.RelationshipClass,
                  this.reverseRelationshipName,
                  this.reverseRelationshipType
                );
              },
              reverseRelationshipForeignKeyColumnName: null,
              reverseRelationshipName: null,
              reverseRelationshipType: null,
            };

            reverseRelationshipTable[SourceClass.name].push(metadata);

            return Object.assign(result, { [relationshipName]: metadata });
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
    return this._reverseRelationshipTables.get(Class.name) as ReverseRelationshipsTable;
  }

  // Example: getRelationshipMetadataFor(User, 'photos') => { SourceClass: Photo, relationshipName: 'user' }
  static getRelationshipMetadataFor(Class: typeof Model, relationshipName: string) {
    let relationshipTable = this.getRelationshipTable(Class);
    let relationshipMetadata = relationshipTable[relationshipName];
    if (!relationshipMetadata.reverseRelationshipName) {
      let { foreignKeyColumnName, relationshipName, relationshipType, RelationshipClass } = relationshipMetadata;
      let reverseRelationshipMetadatas = this.getReverseRelationshipsTable(Class)[RelationshipClass.name];
      let reverseRelationship =
        reverseRelationshipMetadatas &&
        reverseRelationshipMetadatas.find((reverseRelationship) => {
          if (
            relationshipType === "BelongsTo" &&
            ["OneToOne", "HasMany"].includes(reverseRelationship.relationshipType)
          ) {
            return reverseRelationship.SourceClass.name === RelationshipClass.name;
          } else if (reverseRelationship.relationshipType === REVERSE_RELATIONSHIP_LOOKUPS[relationshipType]) {
            return reverseRelationship.SourceClass.name === RelationshipClass.name;
          }

          return false;
        });
      if (!reverseRelationship) {
        // NOTE: in future generate missing relationships/fkey column yourself.
        let targetReverseRelationship = relationshipType === "BelongsTo" ? "@HasOne or @HasMany" : "@BelongsTo";
        throw new Error(
          `ReverseRelationship lookup not available for ${Class.name} ${relationshipName}. You need to define a ` +
            `${targetReverseRelationship} that targets ${Class.name} on ${RelationshipClass.name} class!`
        );
      }

      Object.assign(relationshipMetadata, {
        reverseRelationshipName: reverseRelationship.relationshipName,
        reverseRelationshipForeignKeyColumnName: reverseRelationship.foreignKeyColumnName,
        reverseRelationshipType: reverseRelationship.relationshipType,
      });
      Object.assign(reverseRelationship, {
        reverseRelationshipName: relationshipName,
        reverseRelationshipType: relationshipType,
        reverseRelationshipForeignKeyColumnName: foreignKeyColumnName,
      });
    }

    return relationshipMetadata;
  }

  // NOTE: Faster lookup/cache for BelongsTo relationshipMetadata Query
  static _belongsToColumnTable: ModuleDatabase<BelongsToColumnTable> = new Map();
  static getBelongsToColumnTable(Class: typeof Model): BelongsToColumnTable {
    if (!this._belongsToColumnTable.has(Class.name)) {
      this._belongsToColumnTable.set(Class.name, {});
    }

    return this._belongsToColumnTable.get(Class.name) as BelongsToColumnTable;
  }

  static _belongsToColumnNames: ModuleDatabase<Set<string>> = new Map();
  static getBelongsToColumnNames(Class: typeof Model): Set<string> {
    if (!this._belongsToColumnNames.has(Class.name)) {
      let belongsToColumnNames = new Set() as Set<string>;

      this._belongsToColumnNames.set(Class.name, belongsToColumnNames);

      let belongsToRelationshipsTable = this.getRelationshipTable(Class, "BelongsTo");
      Object.keys(belongsToRelationshipsTable).forEach((relationshipName) => {
        let relationshipMetadata = belongsToRelationshipsTable[relationshipName];
        let foreignKeyColumnName = relationshipMetadata.foreignKeyColumnName as string;

        this.getBelongsToColumnTable(Class)[foreignKeyColumnName] = relationshipMetadata;
        belongsToColumnNames.add(foreignKeyColumnName);
      });
    }

    return this._belongsToColumnNames.get(Class.name) as Set<string>;
  }

  static get relationshipsSummary(): ModuleDatabase<RelationshipSummary> {
    return Array.from(Schema.Models.keys()).reduce((result, modelName) => {
      let modelRelationTable = this.getRelationshipTable(Schema.Models.get(modelName) as typeof Model);

      return {
        ...result,
        [modelName]: Object.keys(modelRelationTable).reduce((modelRelationships, relationshipName) => {
          let { RelationshipClass, relationshipType } = modelRelationTable[relationshipName];

          modelRelationships[relationshipName] = ARRAY_ASKING_RELATIONSHIPS.has(relationshipType)
            ? [RelationshipClass]
            : RelationshipClass;

          return modelRelationships;
        }, {}),
      };
    }, {}) as ModuleDatabase<RelationshipSummary>;
  }

  static resetSchema(Class?: typeof Model) {
    this._relationshipTable.clear();
    this._reverseRelationshipTables.clear();

    if (Class) {
      this._belongsToColumnNames.delete(Model.name);
      this._belongsToColumnTable.delete(Model.name);

      return this;
    }

    this._belongsToColumnNames.clear();
    this._belongsToColumnTable.clear();

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
