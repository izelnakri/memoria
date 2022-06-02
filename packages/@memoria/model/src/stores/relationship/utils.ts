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
//    if (targetRelationship) {
//      this.cleanRelationshipsOn(
//        targetRelationship as Model,
//        model,
//        {
//          relationshipType: reverseRelationshipType,
//          reverseRelationshipType: metadata.relationshipType,
//          foreignKeyColumnName: metadata.reverseRelationshipForeignKeyColumnName,
//          reverseRelationshipForeignKeyColumnName: metadata.foreignKeyColumnName,
//        },
//        reverseRelationshipCache,
//        relationshipCache,
//      );
//    }

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

    // TODO: maybe do this?!?
    // if (targetRelationship) {
    //   this.cleanRelationshipsOn(
    //     targetRelationship as Model,
    //     model,
    //     {
    //       relationshipType: reverseRelationshipType,
    //       reverseRelationshipType: metadata.relationshipType,
    //       reverseRelationshipName: metadata.relationshipName,
    //       foreignKeyColumnName: metadata.reverseRelationshipForeignKeyColumnName,
    //       reverseRelationshipForeignKeyColumnName: metadata.foreignKeyColumnName,
    //     },
    //     reverseRelationshipCache,
    //     relationshipCache,
    //   );
    // }

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
    { foreignKeyColumnName, relationshipName, reverseRelationshipName, reverseRelationshipForeignKeyColumnName, relationshipType },
    relationshipCache,
    reflectionCache,
    mutateForeignKey = true
  ) {
    let relationshipInstances = relationshipType === 'OneToOne'
      ? findBelongsToRelationshipsFor(existingRelationship, source, relationshipCache, reflectionCache, relationshipType) // NOTE: this needs to be improved for all
      : findOneToOneRelationshipFor(existingRelationship, source, relationshipCache, reflectionCache, relationshipType);
    debugger;

    // NOTE: problem, we were only able to retrive needed relationshipInstances from reflectionCache lookup logic(!!)
    let sourceReferences = findDirectRelationshipsFor(source, existingRelationship, reflectionCache, relationshipType); // includesBelongsTo // TODO: this doesnt find all the relationships

    let SourceClass = source.constructor as typeof Model;
    // let ExistingRelationshipClass = existingRelationship.constructor as typeof Model;
    // let existingRelationshipReferences = InstanceDB.getReferences(existingRelationship);

    let otherSourceReferences = sourceReferences.length > 0 ? Array.from(InstanceDB.getReferences(source))
      .filter((sourceReference) => {
        if (sourceReference === source) {
          return false;
        } else if (SourceClass.Cache.get(sourceReference[SourceClass.primaryKeyName]) === sourceReference) {
          return false;
        }
        // return true;

        if (relationshipType === 'BelongsTo') {
          return relationshipCache.get(sourceReference) === existingRelationship; // NOTE: This cant be cachedSource because cachedSources dont have relationship
        } else if (NON_FOREIGN_KEY_RELATIONSHIPS.includes(relationshipType)) {
          return existingRelationship[reverseRelationshipForeignKeyColumnName] === source[SourceClass.primaryKeyName]; // NOTE: refer to group of instances not this
        } // NOTE: add ManyToMany in future
      }) : [];
    let otherSourceReference = otherSourceReferences.length > 0 ? otherSourceReferences[otherSourceReferences.length - 1] : null;

    if (relationshipType === 'BelongsTo') {
      debugger;
      sourceReferences.forEach((sourceInstance) => {
        relationshipCache.delete(sourceInstance);

        if (mutateForeignKey && foreignKeyColumnName) {
          sourceInstance[foreignKeyColumnName] = null;
        }
      });

      // relationshipInstances should be all relationship references in this case(4)
      // noo only do it if reference is not in the same source group
      if (reverseRelationshipName) {
        relationshipInstances.forEach((existingTargetRelationshipReference) => { // targetRelationshipInstance (once)
          // reflectionCache.set(existingTargetRelationshipReference, otherSourceReference); // with HasMany different
          if (otherSourceReference) {
            reflectionCache.set(existingTargetRelationshipReference, otherSourceReference); // with HasMany different
          } else {
            reflectionCache.delete(existingTargetRelationshipReference);
          }

          //
        });
      }
    } else if (relationshipType === 'OneToOne') {
      relationshipInstances.forEach((existingTargetRelationshipReference) => { // sourceInstance
        // reflectionCache.set(existingTargetRelationshipReference, otherSourceReference);
        if (otherSourceReference) {
          reflectionCache.set(existingTargetRelationshipReference, otherSourceReference);
        } else {
          reflectionCache.delete(existingTargetRelationshipReference);
        }

        if (mutateForeignKey && reverseRelationshipForeignKeyColumnName) {
          existingTargetRelationshipReference[reverseRelationshipForeignKeyColumnName] = otherSourceReference
            ? otherSourceReference[SourceClass.primaryKeyName]
            : null;
        }
      });

      sourceReferences.forEach((sourceInstances) => {
        relationshipCache.delete(sourceInstances);
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

// TODO: this needs to improve, doesnt give the right results all the time(!!!), Querying needs to get better

// let relationshipInstances = findRelationshipsFor(existingRelationship, source, relationshipCache, relationshipType); // oneToOne
function findDirectRelationshipsFor(
  targetModel: Model,
  source: Model,
  relationshipCache,
  relationshipType
) {
  if (!relationshipCache) {
    return [];
  }

  // go to all sources and check which ones point to targetModel
  // in BelongsTo source all ones that has the foreign key, and then also possibly the same instance
  // put them in an array and return it(!!)


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

function findBelongsToRelationshipsFor(
  targetModel: Model, // instances
  source: Model, //
  relationshipCache,
  reflectionCache,
  relationshipType
) {
  if (!reflectionCache) {
    return [];
  } else if (relationshipType === 'OneToOne') {
    let result = new Set() as Set<Model[]>
    let targetModels = InstanceDB.getAllReferences(targetModel.constructor as typeof Model); // TODO: this is costly reduce it
    targetModels.forEach((instanceSet) => {
      instanceSet.forEach((instance) => {
        if (reflectionCache.get(instance) === source) {
          result.add(instance);
        }
      });
    });
    if (targetModel && relationshipCache.get(source) === targetModel) { // NOTE: is this really needed?!?
      result.add(targetModel);
    }

    return Array.from(result);
  }

  return [];
}

function findOneToOneRelationshipFor(
  targetModel: Model,
  source: Model,
  relationshipCache,
  reflectionCache,
  relationshipType
) {
  if (!reflectionCache) {
    return [];
  } else if (relationshipType === 'BelongsTo') {
    let result = new Set() as Set<Model[]>
    let targetModels = InstanceDB.getAllReferences(targetModel.constructor as typeof Model); // TODO: this is costly reduce it
    // let sourcePrimaryKey = source[(source.constructor as typeof Model).primaryKeyName];

    targetModels.forEach((instanceSet) => {
      instanceSet.forEach((instance) => {
        if (reflectionCache.get(instance) === source) {
          result.add(instance);
        }
        // also target the below under certain conditions:
        // else if (sourcePrimaryKey && targetModelIsEdgeModel && reflectionCache.has(instance) sourcePrimaryKey === instance[foreignKeyColumnName]) {

        // }
      });
    });
    // if (targetModel && relationshipCache.get(source) === targetModel) { // NOTE: is this really needed?!?
    //   result.add(targetModel);
    // }

    return Array.from(result);
  }

  return [];
}

// function findReverseRelationshipsFor(
//   targetModel: Model,
//   source: Model,
//   relationshipCache,
//   relationshipType
// ) {
//   if (!relationshipCache) {
//     return [];
//   // } else if (relationshipType === 'OneToOne') {
//   // let result = [] as Model[];

//   // InstanceDB.getReferences(source).forEach((sourceReference) => {
//   //   if (relationshipCache.get(sourceReference) === targetModel) {
//   //     result.push(sourceInstance);
//   //   }
//   // });

//   // return result;


//   //   let TargetModel = targetModel.constructor as typeof Model;
//   // let result = [] as Model[];
//   //   let targetModels = InstanceDB.getAllReferences(TargetModel); // TODO: this is costly reduce it
//   //   targetModels.forEach((instanceSet) => {
//   //     instanceSet.forEach((instance) => {
//   //       if (relationshipCache.get(instance) === source) {
//   //         result.push(instance);
//   //       }
//   //     });
//   //   });

//   //   return result;
//   }

//   let cachedRelationship = relationshipCache && relationshipCache.get(source);
//   if (cachedRelationship === targetModel) {
//     return Array.isArray(targetModel) ? targetModel : [targetModel];
//   } else if (Array.isArray(cachedRelationship)) {
//     return cachedRelationship.filter((relationship) => {
//       return Array.isArray(targetModel) ? targetModel.includes(relationship) : targetModel === relationship;
//     });
//   }

//   return [];
// }

