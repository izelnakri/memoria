import Model from "../model.js";
import { RelationshipMutation, RelationshipSchema } from "../stores/index.js";
import type { RelationshipMetadata } from "../stores/index.js";
import { transformValue } from "../serializer.js";
import type { ModelBuildOptions } from "../model.js";
import { validateRelationshipInput } from "../validators/index.js";

type QueryObject = { [key: string]: any };

export default function defineForeignKeySetter(
  model: Model,
  columnName: string,
  buildObject: QueryObject | Model = {},
  buildOptions: ModelBuildOptions,
  relationshipMetadata: RelationshipMetadata
) {
  let { RelationshipCache } = relationshipMetadata;
  let cache = hasProvidedRelationship(buildObject, relationshipMetadata)
    ? generateForeignKeyValueFromRelationshipOrProvidedValue(model, columnName, buildObject, relationshipMetadata)
    : getTransformedValue(model, columnName, buildObject);

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

function hasProvidedRelationship(buildObject: QueryObject | Model, { RelationshipCache, relationshipName }: RelationshipMetadata) {
  return buildObject instanceof Model ? !!RelationshipCache.has(buildObject) : relationshipName in buildObject;
}

function generateForeignKeyValueFromRelationshipOrProvidedValue(
  model: Model,
  columnName: string,
  buildObject: QueryObject | Model,
  relationshipMetadata : RelationshipMetadata
) {
  let { RelationshipClass, relationshipName, reverseRelationshipName } = relationshipMetadata;
  let relationshipReference = buildObject[relationshipName];
  if (!relationshipReference || !(RelationshipClass.primaryKeyName in relationshipReference)) {
    return getTransformedValue(model, columnName, buildObject);
  } else if (buildObject[columnName] !== undefined) {
    let reverseMetadata = RelationshipSchema.getRelationshipMetadataFor(RelationshipClass, reverseRelationshipName);

    validateRelationshipInput(
      reverseMetadata.relationshipType === 'HasMany' ? [buildObject] : buildObject,
      model.constructor as typeof Model,
      reverseMetadata
    );
  }

  return relationshipReference[RelationshipClass.primaryKeyName] || getTransformedValue(model, columnName, buildObject);
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
