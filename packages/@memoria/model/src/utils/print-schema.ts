import Model from "../model.js";
import RelationshipSchema from "../stores/relationship/schema.js";
import Schema from "../stores/schema.js";

export function printSchema(models?: { [ModelName: string]: Model }) {
  let targetModels = models || Model.DEBUG.Schema.Models;

  return Object.keys(targetModels).reduce((result, modelName, index) => {
    if (index === 0) {
      console.log("========================");
    }

    printColumns(targetModels[modelName]);
    printRelationships(targetModels[modelName]);

    result.push(targetModels[modelName]);

    return result;
  }, [] as Model[]);
}

export function printColumns(ModelClass: typeof Model) {
  console.log(`${ModelClass.name} Columns:`);
  console.log("------------------------");

  let belongsToColumnNames = RelationshipSchema.getBelongsToColumnNames(ModelClass);
  let belongsToTable = ModelClass.getRelationshipTable("BelongsTo");

  ModelClass.columnNames.forEach((columnName) => {
    let columnInfo = Schema.getSchema(ModelClass).columns[columnName];

    if (belongsToColumnNames.has(columnName)) {
      let belongsToRelationshipName = Object.keys(belongsToTable).find(
        (relationshipName) => belongsToTable[relationshipName].foreignKeyColumnName === columnName
      ) as string;
      let { RelationshipClass, reverseRelationshipName } = belongsToTable[belongsToRelationshipName];

      console.log(
        `${columnName}: ${columnInfo.type} -> ${RelationshipClass.name}(${instanceName(
          RelationshipClass
        )}.${reverseRelationshipName})`
      );
    } else {
      console.log(`${columnName}: ${columnInfo.type}`);
    }
  });
  console.log("------------------------");
}

export function printRelationships(ModelClass: typeof Model) {
  console.log(`${ModelClass.name} Relationships:`);
  console.log("------------------------");

  let relationships = ModelClass.getRelationshipTable();
  Object.keys(relationships).forEach((relationshipName) => {
    let {
      RelationshipClass,
      relationshipType,
      foreignKeyColumnName,
      reverseRelationshipForeignKeyColumnName,
      reverseRelationshipName,
    } = relationships[relationshipName];

    if (relationshipType === "BelongsTo") {
      console.log(
        `${instanceName(ModelClass)}.${relationshipName}[foreign key: ${instanceName(
          ModelClass
        )}.${foreignKeyColumnName}] -> ${relationshipType} -> ${RelationshipClass.name}(${instanceName(
          RelationshipClass
        )}.${reverseRelationshipName})`
      );
    } else {
      console.log(
        `${instanceName(ModelClass)}.${relationshipName} -> ${relationshipType} -> ${
          RelationshipClass.name
        }(foreign key: ${instanceName(RelationshipClass)}.${reverseRelationshipForeignKeyColumnName})`
      );
    }
  });
  console.log("========================");
}

function instanceName(ModelClass: typeof Model) {
  return ModelClass.name.toLowerCase();
}
