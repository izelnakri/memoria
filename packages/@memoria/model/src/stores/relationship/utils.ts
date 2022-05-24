import Model from "../../model.js";
import RelationshipDB from "./db.js";
import InstanceDB from "../instance/db.js";
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

  // fetchedGroup.photo = newPhoto; // this cleans fetchedPhoto.photo(group_id to null) which should make previous references to null  <->
  // assert.equal(group.photo, photo); // TODO: this cleans photo as well, probably not(?)

  // updatedGroup.photo = null; // NOTE: when this happens secondPhoto.group(updatedGroup) is null , insertedGroup just gets it from updatedGroup
  // assert.equal(insertedGroup.photo, null); // deepEqual(insertedGroup.photo, secondPhoto); if _id = null then remove all relationships
  // FIX for OneToOne
  static cleanRelationshipsOn(
    existingRelationship: Model,
    source: Model,
    { foreignKeyColumnName, reverseRelationshipForeignKeyColumnName, relationshipType, reverseRelationshipType },
    relationshipCache,
    reflectionCache,
  ) {
    let existingTargetRelationshipReferences = findRelationshipsFor(
      existingRelationship,
      source,
      relationshipCache,
    );
    existingTargetRelationshipReferences.forEach((existingTargetRelationship) => { // targetRelationshipInstance
      // let foundOtherSideRelationships = relationshipType === 'OneToOne'
      //   ? Array.from(InstanceDB.getReferences(source)).filter((source) => relationshipCache.get(source) === existingTargetRelationship)
      //   : findRelationshipsFor(
      //     source,
      //     existingTargetRelationship,
      //     reflectionCache,
      //     relationshipType
      //   );
      let foundOtherSideRelationships = findRelationshipsFor(
        source,
        existingTargetRelationship,
        reflectionCache,
      );
      foundOtherSideRelationships.forEach((foundOtherSideRelationship) => { // sourceInstance
        // relationshipCache.delete(foundOtherSideRelationship);
        relationshipCache.set(foundOtherSideRelationship, null);

        if (relationshipType === 'BelongsTo' && foreignKeyColumnName) {
          foundOtherSideRelationship[foreignKeyColumnName] = null;
        } else if (NON_FOREIGN_KEY_RELATIONSHIPS.includes(relationshipType) && reverseRelationshipForeignKeyColumnName) {
          existingTargetRelationship[reverseRelationshipForeignKeyColumnName] = null;
        }
      });

      if (reflectionCache) {
        // reflectionCache.delete(existingTargetRelationship);
        reflectionCache.set(existingTargetRelationship, null);
      }

      if (relationshipType === 'BelongsTo' && foreignKeyColumnName) {
        source[foreignKeyColumnName] = null;
      } else if (NON_FOREIGN_KEY_RELATIONSHIPS.includes(relationshipType) && reverseRelationshipForeignKeyColumnName) {
        existingTargetRelationship[reverseRelationshipForeignKeyColumnName] = null;
      }
    });
  }

  static setReflectiveSideRelationship(targetRelationship: null | Model, model: Model, { relationshipType, reverseRelationshipForeignKeyColumnName, reverseRelationshipType }, reverseRelationshipCache: RelationshipCache) {
    // TODO: make this work for HasMany Arrays in future
    if (reverseRelationshipCache && targetRelationship) {
      reverseRelationshipCache.set(targetRelationship, model);

      if (reverseRelationshipForeignKeyColumnName && NON_FOREIGN_KEY_RELATIONSHIPS.includes(relationshipType)) {
        targetRelationship[reverseRelationshipForeignKeyColumnName] = model[(model.constructor as typeof Model).primaryKeyName];
      }
    }

    // TODO: add to array or create array with one element:
    // hasManyReflexiveCache.get(relationship).add(model);
  }
}

function findRelationshipsFor(
  targetModel: Model,
  source: Model,
  relationshipCache,
) {
  if (relationshipCache && relationshipCache.get(source) === targetModel) {
    return Array.isArray(targetModel) ? targetModel : [targetModel];
  } else {
    return [];
  }
}
