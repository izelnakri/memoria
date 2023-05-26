import Model from "../model.js";
import { RelationshipMutation } from "../stores/index.js";
import type { RelationshipMetadata } from "../stores/index.js";
import { transformValue } from "../serializer.js";
import type { ModelBuildOptions } from "../model.js";

type QueryObject = { [key: string]: any };

export default function defineForeignKeySetter(
  model: Model,
  columnName: string,
  buildObject: QueryObject | Model = {},
  buildOptions: ModelBuildOptions,
  relationshipMetadata: RelationshipMetadata
) {
  let { RelationshipClass, RelationshipCache, relationshipName } = relationshipMetadata;
  let cache = buildObject && buildObject[relationshipName] && RelationshipClass.primaryKeyName in buildObject[relationshipName]
    ? buildObject[relationshipName][RelationshipClass.primaryKeyName] || getTransformedValue(model, columnName, buildObject)
    : getTransformedValue(model, columnName, buildObject);

  debugger;
  // TODO: add the mutation here for once, is this really needed(?)
  return Object.defineProperty(model, columnName, {
    configurable: false,
    enumerable: true,
    get() {
      return cache;
    },
    set(value) {
      if (this[columnName] === value) {
        return value;
      } else if (value instanceof Date && this[columnName] && this[columnName].toJSON() === value.toJSON()) {
        return;
      }

      cache = value === undefined ? null : value;

      buildOptions.revision && dirtyTrackAttribute(this, columnName, cache);

      if (!RelationshipCache.has(this)) {
        return RelationshipMutation.cleanRelationshipsOn(this, relationshipMetadata); // works for reverse relationships(OneToOne and HasMany)
      }

      let existingRelationship = RelationshipCache.get(this) as Model | null;
      if (existingRelationship === null) {
        RelationshipCache.delete(this);
      } else if (
        existingRelationship &&
        existingRelationship[relationshipMetadata.RelationshipClass.primaryKeyName] !== cache
      ) {
        RelationshipMutation.cleanRelationshipsOn(this, relationshipMetadata);
      }
    },
  });
}

function getTransformedValue(model: Model, keyName: string, buildObject?: QueryObject | Model) {
  return buildObject && keyName in buildObject
    ? transformValue(model.constructor as typeof Model, keyName, buildObject[keyName])
    : model[keyName] || null;
}

function dirtyTrackAttribute(model: Model, columnName: string, value: any) {
  if (model.revision[columnName] === value) {
    delete model.changes[columnName];
  } else {
    model.changes[columnName] = value;
  }

  model.errors.forEach((error, errorIndex) => {
    if (error.attribute === columnName) {
      model.errors.splice(errorIndex, 1);
    }
  });
}
