import Model from "../../model.js";
import RelationshipDB from "./db.js";
import InstanceDB from "../instance/db.js";
import type { PrimaryKey } from "../../types.js";


// NOTE: maybe rename to RelationshipReflection.
export default class RelationshipUtils {
  static cleanAndSetBelongsToRelationshipFor(model, targetRelationship, metadata, cache) { // metadata
    let Class = model.constructor as typeof Model;
    let { RelationshipClass, reverseRelationshipName } = metadata;
    // NOTE: this creates a weakmap for a "possible relationship", do we want this(?)
    let oneToOneReflexiveCache =
      reverseRelationshipName &&
      RelationshipDB.findRelationshipCacheFor(RelationshipClass, reverseRelationshipName, "OneToOne");
    let hasManyReflexiveCache =
      oneToOneReflexiveCache ||
      (reverseRelationshipName &&
         RelationshipDB.findRelationshipCacheFor(RelationshipClass, reverseRelationshipName, "HasMany"));

    // RelationshipClass contrary to the targetRelationship
    // cache is RelationshipClass cache
    if (oneToOneReflexiveCache) {
      // NOTE: two cases when building(transfer/copy without removal), setting on demand
      // NOTE: right now it removes all relationships, it should only remove related relationships which are non-primary key possibilities on build() and runtime()
      // NOTE: also how to know which arent(?)
      debugger; // before cache exists
      this.cleanRelationshipFromOneSideMetadata( // TODO: research this
        model,
        metadata,
        cache,
        oneToOneReflexiveCache,
        model
      );
      debugger; // cache cleans

      if (targetRelationship) { // TODO: change this to if reflection exists
        // TODO: this should clean both sides!!
        // NOTE: finder finds the first occurance but we dont want that when building
        this.cleanRelationshipFromOneSideMetadata(
          model,
          {
            RelationshipClass: Class,
            reverseRelationshipForeignKeyColumnName: metadata.foreignKeyColumnName,
            relationshipType: "OneToOne",
          },
          oneToOneReflexiveCache,
          cache,
          targetRelationship as Model
        );
      }
    } else if (hasManyReflexiveCache) {
      // TODO: here remove the element from the array
    }

    cache.set(model, targetRelationship);

    model[metadata.foreignKeyColumnName as string] = targetRelationship
      ? targetRelationship[metadata.RelationshipClass.primaryKeyName]
      : null;

    if (targetRelationship) {
      if (oneToOneReflexiveCache) {
        oneToOneReflexiveCache.set(targetRelationship, model);
      } else if (hasManyReflexiveCache) {
        // TODO: add to array or create array with one element:
        // hasManyReflexiveCache.get(relationship).add(model);
      }
    }
  }

  static cleanAndSetOneToOneRelationshipFor(model, targetRelationship, metadata, cache) {
    // let previousRelationship = cache.get(model);
    let Class = model.constructor as typeof Model;
    let { RelationshipClass, foreignKeyColumnName, reverseRelationshipName, reverseRelationshipForeignKeyColumnName } = metadata;
    console.log('reverseRelationshipName IS');
    console.log(reverseRelationshipName);
    let reflexiveSideCache =
      reverseRelationshipName &&
      RelationshipDB.findRelationshipCacheFor(RelationshipClass, reverseRelationshipName, "BelongsTo");

    this.cleanRelationshipFromOneSideMetadata(model, metadata, cache, reflexiveSideCache, model);

    if (targetRelationship) {
      this.cleanRelationshipFromOneSideMetadata(
        model,
        {
          RelationshipClass: Class,
          reverseRelationshipForeignKeyColumnName: foreignKeyColumnName,
          relationshipType: "BelongsTo",
        },
        reflexiveSideCache,
        cache,
        targetRelationship as Model
      );
    }

    cache.set(model, targetRelationship);

    if (targetRelationship instanceof Model) {
      if (reverseRelationshipForeignKeyColumnName) {
        targetRelationship[reverseRelationshipForeignKeyColumnName] = model[Class.primaryKeyName];
      }

      reflexiveSideCache && reflexiveSideCache.set(targetRelationship, model);
    }
  }

  // TODO: REFACTOR THIS
  // NOTE: implement this in implementation
  static cleanRelationshipFromOneSideMetadata(
    source: Model,
    { RelationshipClass, reverseRelationshipForeignKeyColumnName, relationshipType },
    cache,
    reflectionCache,
    targetRelationship: Model
  ) {
    // TODO: this should be aware of primaryKey
    // NOTE: dont find itself(and all instances with same primaryKey)

    let existingReflections = findRelationships(
      RelationshipClass,
      reflectionCache,
      targetRelationship,
      source instanceof RelationshipClass ? source : null
    );
    let foreignKeyRemoved = false;
    existingReflections.forEach((existingReflection) => {
      reflectionCache.delete(existingReflection);

      if (
        !foreignKeyRemoved &&
        relationshipType === "BelongsTo" &&
        reverseRelationshipForeignKeyColumnName
      ) {
        foreignKeyRemoved = true;
        targetRelationship[reverseRelationshipForeignKeyColumnName] = null;
      }

      let TargetRelationshipClass = targetRelationship.constructor as typeof Model;
      let foundOtherSideRelationships = findRelationships(
        targetRelationship.constructor,
        cache,
        existingReflection,
        source instanceof TargetRelationshipClass ? source : null
      );
      foundOtherSideRelationships.forEach((foundOtherSideRelationship) => {
        cache.delete(foundOtherSideRelationship);

        if (
          !foreignKeyRemoved &&
          ["HasMany", "OneToOne"].includes(relationshipType) &&
          reverseRelationshipForeignKeyColumnName
        ) {
          foreignKeyRemoved = true;
          existingReflection[reverseRelationshipForeignKeyColumnName] = null;
        }
      });
    });
  }
}

// NOTE: make it performant in the future by doing the filter here(result should not include for the same primaryKey as the primaryKey)
function findRelationships(
  RelationshipClass,
  relationshipCache,
  targetModel,
  source?: Model | null
) {
  // NOTE: ignore should be a primaryKey if instance exists or the instance itself(null build case)
  let result: Model[] = [];
  let possibleReferences = InstanceDB.getAllReferences(RelationshipClass);
  for (let referenceSet of possibleReferences) {
    for (let reference of referenceSet) {
      if (referenceIsNotSource(source, reference[RelationshipClass.primaryKeyName])) {
        if (relationshipCache.get(reference) === targetModel) {
          result.push(reference);
        }
      }
    }
  }

  return result;
}

function referenceIsNotSource(
  source: undefined | null | Model,
  referencePrimaryKey: void | PrimaryKey
) {
  return source ? source[(source.constructor as typeof Model).primaryKeyName] !== referencePrimaryKey : true;
}
