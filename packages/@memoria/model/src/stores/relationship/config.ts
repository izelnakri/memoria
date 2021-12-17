import Model from "../../model.js";
import Config from "../config.js";
import type { ModuleDatabase } from "../../types.js";

const arrayAskingRelationships = ["one-to-many", "many-to-many"];

export interface RelationshipSummary {
  [relationshipName: string]: typeof Model | Array<typeof Model>;
}

interface BelongsToPointers {
  [belongsToColumnForeignKeyName: string]: {
    relationshipName: string;
    relationshipClass: typeof Model;
  };
}

// NOTE: in-future maybe create special class/object for HasManyArray -> behaves like Set, has Array prototype methods(filter etc)
export default class RelationshipConfig {
  static _relationshipsSummary; // TODO: cache this lookup in future, also make it a map
  static get relationshipsSummary(): { [modelName: string]: RelationshipSummary } {
    if (!this._relationshipsSummary) {
      this._relationshipsSummary = Config.Schemas.reduce((result, modelSchema) => {
        result[modelSchema.name] = Object.keys(modelSchema.relations).reduce(
          (result, relationName) => {
            let relation = modelSchema.relations[relationName];

            return Object.assign(result, {
              [relationName]: arrayAskingRelationships.includes(relation.type)
                ? [relation.target()]
                : relation.target(),
            });
          },
          {}
        );

        return result;
      }, {});
    }

    return this._relationshipsSummary;
  }

  static getRelationshipSchemaDefinitions(Class: typeof Model) {
    let schema = Config.Schemas.find((schema) => schema.name === Class.name);

    return schema && schema.relations;
  }

  static _belongsToColumnNames: ModuleDatabase<Set<string>> = new Map();
  static getBelongsToColumnNames(Class: typeof Model): Set<string> {
    if (!this._belongsToColumnNames.has(Class.name)) {
      let belongsToColumnNames = new Set() as Set<string>;

      this._belongsToColumnNames.set(Class.name, belongsToColumnNames);

      Object.keys(Class.belongsToRelationships).forEach((relationshipName) => {
        let relationshipClass = Class.belongsToRelationships[relationshipName];
        let targetRelationshipForeignKey = getTargetRelationshipForeignKey(
          Class,
          relationshipName,
          relationshipClass
        );
        this.getBelongsToPointers(Class)[targetRelationshipForeignKey] = {
          relationshipName,
          relationshipClass,
        };
        belongsToColumnNames.add(targetRelationshipForeignKey);
      });
    }

    return this._belongsToColumnNames.get(Class.name) as Set<string>;
  }
  static getBelongsToForeignKey(Class: typeof Model, relationshipName: string): string {
    let belongsToPointers = this.getBelongsToPointers(Class);

    return Object.keys(belongsToPointers).find(
      (belongsToColumnName) =>
        belongsToPointers[belongsToColumnName].relationshipName === relationshipName
    ) as string;
  }

  static _belongsToPointers: ModuleDatabase<BelongsToPointers> = new Map();
  static getBelongsToPointers(Class: typeof Model): BelongsToPointers {
    if (!this._belongsToPointers.has(Class.name)) {
      this._belongsToPointers.set(Class.name, {});
    }

    return this._belongsToPointers.get(Class.name) as BelongsToPointers;
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
