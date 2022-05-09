import Model from "../../model.js";
import RelationshipDB from "./db.js";
import InstanceDB from "../instance/db.js";
import type { RelationshipType } from "./schema.js";
// import type { PrimaryKey } from "../../types.js";

export type RelationshipCache = WeakMap<Model, null | Model | Model[]>;

// NOTE: maybe rename to RelationshipReflection.
// pass the args as { relationshipCache: , reflectionCache } to metadata
export default class RelationshipUtils {
  // TODO: warn if an existing instance in cache has different relationship
  // NOTE: two cases when building(transfer/copy without removal), setting on demand
  static cleanAndSetBelongsToRelationshipFor(model, targetRelationship, metadata, relationshipCache) {
    let Class = model.constructor as typeof Model;
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
          RelationshipClass: Class,
          relationshipType: reverseRelationshipType,
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

    if (reverseRelationshipCache) {
      this.setReflectiveRelationship(targetRelationship, model, reverseRelationshipType, reverseRelationshipCache);
    }
  }

  // TODO: warn if an existing instance in cache has different relationship during setting from one side
  static cleanAndSetOneToOneRelationshipFor(model, targetRelationship, metadata, relationshipCache) {
    let Class = model.constructor as typeof Model;
    let {
      RelationshipClass, foreignKeyColumnName, reverseRelationshipName, reverseRelationshipForeignKeyColumnName
    } = metadata;
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
          RelationshipClass: Class,
          relationshipType: reverseRelationshipType,
          foreignKeyColumnName: metadata.reverseRelationshipForeignKeyColumnName,
          reverseRelationshipForeignKeyColumnName: metadata.foreignKeyColumnName,
        },
        reverseRelationshipCache,
        relationshipCache,
      );
    }

    if (previousRelationship && (!targetRelationship || targetRelationship !== previousRelationship)) {
      previousRelationship[reverseRelationshipForeignKeyColumnName] = null;
    }

    relationshipCache.set(model, targetRelationship);

    if (targetRelationship instanceof Model) {
      if (reverseRelationshipForeignKeyColumnName) {
        targetRelationship[reverseRelationshipForeignKeyColumnName] = model[Class.primaryKeyName];
      }
    }

    this.setReflectiveRelationship(targetRelationship, model, reverseRelationshipType, reverseRelationshipCache);
  }

  static cleanRelationshipsOn( // NOTE: FOR SUCCESFUL CRUD
    targetRelationship: Model,
    source: Model,
    { RelationshipClass, foreignKeyColumnName, reverseRelationshipForeignKeyColumnName, relationshipType },
    cache,
    reflectionCache,
  ) {
    // TODO: this whole shit needs to clean up because not fully correct
    // TODO: ForHasMany here remove the element from the array

    let existingReflections = findRelationships(
      targetRelationship,
      RelationshipClass,
      cache,
      source
    );
    existingReflections.forEach((existingReflection) => {
      reflectionCache.delete(existingReflection);

      if (reverseRelationshipForeignKeyColumnName) {
        existingReflection[reverseRelationshipForeignKeyColumnName] = null;
      }

      let foundOtherSideRelationships = findRelationships(
        existingReflection,
        targetRelationship.constructor,
        reflectionCache,
        source
      );
      foundOtherSideRelationships.forEach((foundOtherSideRelationship) => {
        cache.delete(foundOtherSideRelationship);

        if (foreignKeyColumnName) {
          foundOtherSideRelationship[foreignKeyColumnName] = null;
        }
      });
    });
  }

  static setReflectiveRelationship(targetRelationship: Model | void, model: Model, _relationshipType: RelationshipType, reflectionCache: RelationshipCache) {
    if (targetRelationship) {
      if (!reflectionCache) {
        throw Error(`BUG ReflectionCache could not be found!: relationshipCache could not be found on ${model.constructor.name}:${targetRelationship.constructor.name} ${_relationshipType}`);
      }

      reflectionCache.set(targetRelationship, model);
    }

    // TODO: different handle for hasMany cases
    // TODO: add to array or create array with one element:
    // hasManyReflexiveCache.get(relationship).add(model);
  }
}

// NOTE: make it performant in the future by doing the filter here(result should not include for the same primaryKey as the primaryKey)
// NOTE: this needs metadata so it can remove stuff
function findRelationships(
  targetModel,
  RelationshipClass,
  relationshipCache,
  source: Model
) {
  let result: Model[] = [];
  let possibleReferences = InstanceDB.getAllReferences(RelationshipClass);

  for (let referenceSet of possibleReferences) {
    for (let reference of referenceSet) {
      // if (source[(source.constructor as typeof Model).primaryKeyName] !== reference[RelationshipClass.primaryKeyName]) {
        if (relationshipCache.get(source) === targetModel) {
          result.push(reference);
        }
      // }
    }
  }

  return result;
}
