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
      debugger;
      this.cleanRelationshipsOn(
        model,
        previousRelationship,
        metadata,
        relationshipCache,
        reverseRelationshipCache
      );
      debugger; // TODO: this should correctly clear the relationship
    }

    if (targetRelationship) {
      this.cleanRelationshipsOn(
        targetRelationship as Model,
        model,
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
      this.cleanRelationshipsOn(model, previousRelationship, metadata, relationshipCache, reverseRelationshipCache); // TODO: this doesnt clean insertedGroup on OneToOne, model is updatedGroup, previousRelationship is secondPhoto
    }

    if (targetRelationship) {
      this.cleanRelationshipsOn(
        targetRelationship as Model,
        model,
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
  //
  // finding recors, cleaning records
  // console.log('existingTargetRelationshipReferences is', existingTargetRelationshipReferences);
  // secondPhoto.group = null; doesnt clear updatedGroup.photo but updatedGroup.photo is secondPhoto
  // let foundOtherSideRelationships = relationshipType === 'OneToOne'
  //   ? Array.from(InstanceDB.getReferences(source)).filter((source) => relationshipCache.get(source) === existingTargetRelationship)
  //   : findRelationshipsFor(
  //     source,
  //     existingTargetRelationship,
  //     reflectionCache,
  //     relationshipType
  //   );

  // NOTE: try this:
  static cleanRelationshipsOn(
    source: Model,
    existingRelationship: Model,
    { foreignKeyColumnName, relationshipName, reverseRelationshipForeignKeyColumnName, relationshipType },
    relationshipCache,
    reflectionCache,
    mutateForeignKey = true
  ) {
    let relationshipInstances = findRelationshipsFor(existingRelationship, source, relationshipCache, relationshipType); // oneToOne
    let sourceReflections = findRelationshipsFor(source, existingRelationship, reflectionCache, relationshipType); // includesBelongsTo // TODO: this doesnt find all the relationships

    let SourceClass = source.constructor as typeof Model;
    let ExistingRelationshipClass = existingRelationship.constructor as typeof Model;
    // let existingRelationshipReferences = InstanceDB.getReferences(existingRelationship);
    let otherSourceReferences = sourceReflections.length > 0 ? Array.from(InstanceDB.getReferences(source))
      .filter((sourceReference) => {
        if (sourceReference === source) {
          return false;
        } else if (SourceClass.Cache.get(sourceReference[SourceClass.primaryKeyName]) === sourceReference) {
          return false;
        }
        return true;

        if (relationshipType === 'BelongsTo') {
          return sourceReference[foreignKeyColumnName] === existingRelationship[ExistingRelationshipClass.primaryKeyName];
        } else if (NON_FOREIGN_KEY_RELATIONSHIPS.includes(relationshipType)) {
          return existingRelationship[reverseRelationshipForeignKeyColumnName] === source[SourceClass.primaryKeyName]; // TODO: refer to group of instances not this
        } // NOTE: add ManyToMany in future
      }) : [];
    let otherSourceReference = otherSourceReferences.length > 0 ? otherSourceReferences[otherSourceReferences.length - 1] : null;

    debugger;
    if (relationshipType === 'BelongsTo') {
      sourceReflections.forEach((sourceInstance) => {
        reflectionCache.set(sourceInstance, null);

        if (mutateForeignKey && foreignKeyColumnName) {
          sourceInstance[foreignKeyColumnName] = null;
        }
      });

      relationshipInstances.forEach((existingTargetRelationshipReference) => { // targetRelationshipInstance (once)
        relationshipCache.set(existingTargetRelationshipReference, otherSourceReference); // with HasMany different
      });
    } else if (relationshipType === 'OneToOne') {
      relationshipInstances.forEach((existingTargetRelationshipReference) => { // sourceInstance
        reflectionCache.set(existingTargetRelationshipReference, otherSourceReference);

        if (mutateForeignKey && reverseRelationshipForeignKeyColumnName) {
          existingTargetRelationshipReference[reverseRelationshipForeignKeyColumnName] = otherSourceReference
            ? otherSourceReference[SourceClass.primaryKeyName]
            : null;
        }
      });

      sourceReflections.forEach((sourceInstances) => { // targetRelationshipInstance(belongsTos)
        relationshipCache.set(sourceInstances, null);
      });
    }
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

// let relationshipInstances = findRelationshipsFor(existingRelationship, source, relationshipCache, relationshipType); // oneToOne
function findRelationshipsFor(
  targetModel: Model,
  source: Model,
  relationshipCache,
  relationshipType
) {
  if (!relationshipCache) {
    return [];
  // } else if (relationshipType === 'OneToOne') {
  //   let TargetModel = targetModel.constructor as typeof Model;
  //   let result = [] as Model[];
  //   let targetModels = InstanceDB.getAllReferences(TargetModel); // TODO: this is costly reduce it
  //   targetModels.forEach((instanceSet) => {
  //     instanceSet.forEach((instance) => {
  //       if (relationshipCache.get(instance) === source) {
  //         result.push(instance);
  //       }
  //     });
  //   });

  //   return result;
  }

  let cachedRelationship = relationshipCache && relationshipCache.get(source);
  if (cachedRelationship === targetModel) {
    return Array.isArray(targetModel) ? targetModel : [targetModel];
  } else if (Array.isArray(cachedRelationship)) {
    return cachedRelationship.filter((relationship) => {
      return Array.isArray(targetModel) ? targetModel.includes(relationship) : targetModel === relationship;
    });
  }

  return [];
}

