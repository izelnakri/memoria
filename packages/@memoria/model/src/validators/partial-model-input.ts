import { RelationshipSchema } from "../stores/index.js";
import type { BelongsToRelationshipMetadata } from "../stores/relationship/schema.js";
import { RuntimeError } from "../errors/index.js";
import { RelationshipPromise } from "../promises/index.js";
import Model from "../model.js";

type JSObject = { [key: string]: any };

export default function validatePartialModelInput(input: JSObject, Class: typeof Model) {
  if (input && !(input instanceof Class)) {
    let relationshipNames = RelationshipSchema.getRelationshipTable(Class);
    let belongsToRelationships = RelationshipSchema.getRelationshipTable(Class, "BelongsTo");

    return Object.keys(input).reduce((result: JSObject, keyName) => {
      if (Class.columnNames.has(keyName)) {
        result[keyName] = input[keyName];

        return result;
      } else if (!(keyName in relationshipNames)) {
        throw new RuntimeError(
          `${keyName} is not a valid attribute for a ${Class.name} partial! Provided { ${keyName}: ${input[keyName]} }`
        );
      }

      result[keyName] = input[keyName];

      if (keyName in belongsToRelationships) {
        let { RelationshipClass, foreignKeyColumnName } = relationshipNames[keyName] as BelongsToRelationshipMetadata;
        if (foreignKeyColumnName in input) {
          if (input[keyName]) {
            if (
              !(input[keyName] instanceof RelationshipPromise) &&
              input[keyName][RelationshipClass.primaryKeyName] !== input[foreignKeyColumnName]
            ) {
              throw new RuntimeError(
                `You cannot provide different ${foreignKeyColumnName}: ${input[foreignKeyColumnName]} and ${keyName}.${
                  RelationshipClass.primaryKeyName
                }: ${input[keyName][RelationshipClass.primaryKeyName]} for ${Class.name} partial!`
              );
            }
          } else if (input[keyName] === null && input[foreignKeyColumnName] !== null) {
            throw new RuntimeError(
              `You cannot provide different ${foreignKeyColumnName}: ${input[foreignKeyColumnName]} and ${keyName}: null for ${Class.name} partial!`
            );
          }

          return Object.assign(result, { [foreignKeyColumnName]: input[foreignKeyColumnName] });
        } else if (!input[keyName]) {
          result[foreignKeyColumnName as string] = null;
        } else if (input[keyName] && RelationshipClass.primaryKeyName in input[keyName]) {
          result[foreignKeyColumnName as string] = input[keyName][RelationshipClass.primaryKeyName];
        }
      }

      return result;
    }, {} as JSObject);
  }

  return input;
}
