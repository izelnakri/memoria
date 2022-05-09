import Model from "../../model.js";
import RelationshipDB from "./db.js";
import type { RelationshipType } from "./schema.js";
// import type { PrimaryKey } from "../../types.js";

export type RelationshipCache = WeakMap<Model, null | Model | Model[]>;

const NON_FOREIGN_KEY_RELATIONSHIPS = ['OneToOne', 'HasMany'];

// NOTE: maybe rename to RelationshipReflection
export default class RelationshipUtils {
  // TODO: warn if an existing instance in cache has different relationship
  // NOTE: two cases when building(transfer/copy without removal), setting on demand
  static cleanAndSetBelongsToRelationshipFor(model, targetRelationship, metadata, relationshipCache) {
    let { RelationshipClass, reverseRelationshipName } = metadata; // reverseRelationshipType
    // NOTE: this creates a weakmap for a "possible relationship"(?), do we want this(?)
    let oneToOneReflexiveCache =
      reverseRelationshipName &&
      RelationshipDB.findRelationshipCacheFor(RelationshipClass, reverseRelationshipName, "OneToOne");
    let reverseRelationshipType: RelationshipType = oneToOneReflexiveCache ? 'OneToOne' : 'HasMany';
    let reverseRelationshipCache =
      oneToOneReflexiveCache ||
      (reverseRelationshipName &&
         RelationshipDB.findRelationshipCacheFor(RelationshipClass, reverseRelationshipName, reverseRelationshipType));
    let previousRelationship = relationshipCache.get(model);
    if (previousRelationship) {
      this.cleanRelationshipsOn(
        previousRelationship,
        model,
        metadata,
        relationshipCache,
        reverseRelationshipCache
      );
    }

    if (targetRelationship) {
      this.cleanRelationshipsOn(
        model,
        targetRelationship as Model,
        {
          relationshipType: reverseRelationshipType,
          reverseRelationshipType: metadata.relationshipType,
          foreignKeyColumnName: metadata.reverseRelationshipForeignKeyColumnName,
          reverseRelationshipForeignKeyColumnName: metadata.foreignKeyColumnName,
        },
        reverseRelationshipCache,
        relationshipCache,
      );
    }

    relationshipCache.set(model, targetRelationship);

    model[metadata.foreignKeyColumnName as string] = targetRelationship
      ? targetRelationship[metadata.RelationshipClass.primaryKeyName]
      : null;

    this.setReflectiveSideRelationship(targetRelationship, model, metadata, reverseRelationshipCache);
  }

  // TODO: warn if an existing instance in cache has different relationship during setting from one side
  static cleanAndSetOneToOneRelationshipFor(model, targetRelationship, metadata, relationshipCache) {
    let { RelationshipClass, reverseRelationshipName } = metadata;
    let reverseRelationshipType: RelationshipType = 'BelongsTo';
    let reverseRelationshipCache =
      reverseRelationshipName &&
      RelationshipDB.findRelationshipCacheFor(RelationshipClass, reverseRelationshipName, reverseRelationshipType);
    let previousRelationship = relationshipCache.get(model);
    if (previousRelationship) {
      this.cleanRelationshipsOn(previousRelationship, model, metadata, relationshipCache, reverseRelationshipCache);
    }

    if (targetRelationship) {
      this.cleanRelationshipsOn(
        model,
        targetRelationship as Model,
        {
          relationshipType: reverseRelationshipType,
          reverseRelationshipType: metadata.relationshipType,
          foreignKeyColumnName: metadata.reverseRelationshipForeignKeyColumnName,
          reverseRelationshipForeignKeyColumnName: metadata.foreignKeyColumnName,
        },
        reverseRelationshipCache,
        relationshipCache,
      );
    }

    relationshipCache.set(model, targetRelationship);

    this.setReflectiveSideRelationship(targetRelationship, model, metadata, reverseRelationshipCache);
  }

  static cleanRelationshipsOn(
    targetRelationship: Model,
    source: Model,
    { foreignKeyColumnName, reverseRelationshipForeignKeyColumnName, relationshipType, reverseRelationshipType },
    cache,
    reflectionCache,
  ) {
    // TODO: ForHasMany here remove the element from the array
    cleanFromSide(
      targetRelationship,
      source,
      { relationshipType, foreignKeyColumnName, reverseRelationshipForeignKeyColumnName },
      cache,
      reflectionCache
    );
    cleanFromSide(
      source,
      targetRelationship,
      {
        relationshipType: reverseRelationshipType,
        foreignKeyColumnName: reverseRelationshipForeignKeyColumnName,
        reverseRelationshipForeignKeyColumnName: foreignKeyColumnName
      },
      reflectionCache,
      cache
    );
  }

  static setReflectiveSideRelationship(targetRelationship: null | Model, model: Model, { relationshipType, reverseRelationshipForeignKeyColumnName }, reverseRelationshipCache: RelationshipCache) {
    // TODO: make this work for HasMany Arrays in future
    if (targetRelationship) {
      if (!reverseRelationshipCache) {
        throw Error(`BUG ReflectionCache could not be found!: relationshipCache could not be found on ${model.constructor.name}:${targetRelationship.constructor.name} ${relationshipType}`);
      }

      reverseRelationshipCache.set(targetRelationship, model);

      if (reverseRelationshipForeignKeyColumnName && NON_FOREIGN_KEY_RELATIONSHIPS.includes(relationshipType)) {
        targetRelationship[reverseRelationshipForeignKeyColumnName] = model[(model.constructor as typeof Model).primaryKeyName];
      }
    }

    // TODO: add to array or create array with one element:
    // hasManyReflexiveCache.get(relationship).add(model);
  }
}

function cleanFromSide(
  targetRelationship,
  source,
  { relationshipType, foreignKeyColumnName, reverseRelationshipForeignKeyColumnName  },
  cache,
  reflectionCache
) {
  let existingTargetRelationshipReferences = findRelationships(
    targetRelationship,
    cache,
    source
  );
  existingTargetRelationshipReferences.forEach((existingTargetRelationship) => { // targetRelationshipInstance
    let foundOtherSideRelationships = findRelationships(
      source,
      reflectionCache,
      existingTargetRelationship
    );
    foundOtherSideRelationships.forEach((foundOtherSideRelationship) => { // sourceInstance
      cache.delete(foundOtherSideRelationship);

      if (relationshipType === 'BelongsTo' && foreignKeyColumnName) {
        foundOtherSideRelationship[foreignKeyColumnName] = null;
      } else if (NON_FOREIGN_KEY_RELATIONSHIPS.includes(relationshipType) && reverseRelationshipForeignKeyColumnName) {
        existingTargetRelationship[reverseRelationshipForeignKeyColumnName] = null;
      }
    });

    reflectionCache.delete(existingTargetRelationship);

    if (relationshipType === 'BelongsTo' && foreignKeyColumnName) {
      source[foreignKeyColumnName] = null;
    } else if (NON_FOREIGN_KEY_RELATIONSHIPS.includes(relationshipType) && reverseRelationshipForeignKeyColumnName) {
      existingTargetRelationship[reverseRelationshipForeignKeyColumnName] = null;
    }
  });
}

function findRelationships(
  targetModel,
  relationshipCache,
  source: Model
) {
  if (relationshipCache.get(source) === targetModel) {
    return Array.isArray(targetModel) ? targetModel : [targetModel];
  } else {
    return [];
  }
}
