import Model from "../../model.js";
import Config from "../config.js";

const arrayAskingRelationships = ["one-to-many", "many-to-many"];

export interface RelationshipSummary {
  [relationshipName: string]: typeof Model | Array<typeof Model>;
}

interface RelationshipSummaryStore {
  [modelName: string]: RelationshipSummary;
}

export default class RelationshipConfig {
  // static _relationships; // TODO: cache this lookup in future
  static get relationshipsSummary(): RelationshipSummaryStore {
    return Config.Schemas.reduce((result, modelSchema) => {
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
    let schema = Config.Schemas.find((schema) => schema.name === Class.name);

    return schema && schema.relations;
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
