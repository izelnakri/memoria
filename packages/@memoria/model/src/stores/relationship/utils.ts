import Model from "../../model.js";
import RelationshipDB from "./db.js";
import InstanceDB from "../instance/db.js";
import type { RelationshipType } from "./schema.js";

export type RelationshipCache = WeakMap<Model, null | Model | Model[]>;

const NON_FOREIGN_KEY_RELATIONSHIPS = ["OneToOne", "HasMany"];

// NOTE: maybe rename to RelationshipReflection
export default class RelationshipUtils {
  // NOTE: two cases when building(transfer/copy without removal), setting on demand
  static cleanAndSetBelongsToRelationshipFor(model, targetRelationship, metadata, relationshipCache) {
    let { RelationshipClass, reverseRelationshipName } = metadata; // reverseRelationshipType
    let oneToOneReflexiveCache =
      reverseRelationshipName &&
      RelationshipDB.findRelationshipCacheFor(RelationshipClass, reverseRelationshipName, "OneToOne");
    let reverseRelationshipType: RelationshipType = oneToOneReflexiveCache ? "OneToOne" : "HasMany";
    let reverseRelationshipCache =
      oneToOneReflexiveCache ||
      (reverseRelationshipName &&
        RelationshipDB.findRelationshipCacheFor(RelationshipClass, reverseRelationshipName, reverseRelationshipType));
    let previousRelationship = relationshipCache.get(model);
    // TODO: DO Reflection correctly for BelongsTo <-> HasMany

    if (previousRelationship) {
      this.cleanRelationshipsOn(model, previousRelationship, metadata, relationshipCache, reverseRelationshipCache);
    }

    relationshipCache.set(model, targetRelationship);

    model[metadata.foreignKeyColumnName as string] = targetRelationship
      ? targetRelationship[metadata.RelationshipClass.primaryKeyName]
      : null;

    if (reverseRelationshipType === "OneToOne") {
      this.setReflectiveSideRelationship(targetRelationship, model, metadata, reverseRelationshipCache);
    }
    // TODO: also implement a strategy for HasMany
  }

  static cleanAndSetOneToOneRelationshipFor(model, targetRelationship, metadata, relationshipCache) {
    let { RelationshipClass, reverseRelationshipName } = metadata;
    let reverseRelationshipType: RelationshipType = "BelongsTo";
    let reverseRelationshipCache =
      reverseRelationshipName &&
      RelationshipDB.findRelationshipCacheFor(RelationshipClass, reverseRelationshipName, reverseRelationshipType);
    let previousRelationship = relationshipCache.get(model);
    if (previousRelationship) {
      this.cleanRelationshipsOn(model, previousRelationship, metadata, relationshipCache, reverseRelationshipCache); // TODO: this doesnt clean insertedGroup on OneToOne, model is updatedGroup, previousRelationship is secondPhoto
    }

    relationshipCache.set(model, targetRelationship);

    this.setReflectiveSideRelationship(targetRelationship, model, metadata, reverseRelationshipCache);
  }

  static cleanRelationshipsOn(
    source: Model,
    existingRelationship: Model,
    { foreignKeyColumnName, reverseRelationshipName, reverseRelationshipForeignKeyColumnName, relationshipType },
    relationshipCache,
    reflectionCache,
    mutateForeignKey = true
  ) {
    let relationshipInstances =
      relationshipType === "OneToOne"
        ? findBelongsToRelationshipsFor(
            existingRelationship,
            source,
            relationshipCache,
            reflectionCache,
            relationshipType
          ) // NOTE: this needs to be improved for all
        : findOneToOneRelationshipFor(existingRelationship, source, reflectionCache, relationshipType);
    let sourceReferences = findDirectRelationshipsFor(source, existingRelationship, reflectionCache);
    let SourceClass = source.constructor as typeof Model;
    let otherSourceReferences =
      sourceReferences.length > 0
        ? Array.from(InstanceDB.getReferences(source)).filter((sourceReference) => {
            if (sourceReference === source) {
              return false;
            } else if (SourceClass.Cache.get(sourceReference[SourceClass.primaryKeyName]) === sourceReference) {
              return false;
            }

            if (relationshipType === "BelongsTo") {
              return relationshipCache.get(sourceReference) === existingRelationship;
            } else if (NON_FOREIGN_KEY_RELATIONSHIPS.includes(relationshipType)) {
              return (
                existingRelationship[reverseRelationshipForeignKeyColumnName] === source[SourceClass.primaryKeyName] &&
                relationshipCache.get(sourceReference) !== null
              );
            } // NOTE: add ManyToMany in future
          })
        : [];
    let otherSourceReference =
      otherSourceReferences.length > 0 ? otherSourceReferences[otherSourceReferences.length - 1] : null;

    if (relationshipType === "BelongsTo") {
      sourceReferences.forEach((sourceInstance) => {
        relationshipCache.delete(sourceInstance);

        if (mutateForeignKey && foreignKeyColumnName) {
          sourceInstance[foreignKeyColumnName] = null;
        }
      });

      if (reverseRelationshipName) {
        relationshipInstances.forEach((existingTargetRelationshipReference) => {
          if (otherSourceReference) {
            reflectionCache.set(existingTargetRelationshipReference, otherSourceReference); // with HasMany different
          } else {
            reflectionCache.delete(existingTargetRelationshipReference);
          }
        });
      }
    } else if (relationshipType === "OneToOne") {
      relationshipInstances.forEach((existingTargetRelationshipReference) => {
        if (otherSourceReference) {
          reflectionCache.set(existingTargetRelationshipReference, otherSourceReference);
        } else {
          reflectionCache.delete(existingTargetRelationshipReference);
        }

        if (mutateForeignKey && reverseRelationshipForeignKeyColumnName && otherSourceReference) {
          existingTargetRelationshipReference[reverseRelationshipForeignKeyColumnName] =
            otherSourceReference[SourceClass.primaryKeyName];
        }
      });

      sourceReferences.forEach((sourceInstances) => {
        relationshipCache.delete(sourceInstances);
      });
    }
  }

  static setReflectiveSideRelationship(
    targetRelationship: null | Model,
    model: Model,
    { relationshipType, reverseRelationshipForeignKeyColumnName },
    reverseRelationshipCache: RelationshipCache
  ) {
    // TODO: make this work for HasMany Arrays in future
    if (reverseRelationshipCache && targetRelationship) {
      reverseRelationshipCache.set(targetRelationship, model);

      if (reverseRelationshipForeignKeyColumnName && NON_FOREIGN_KEY_RELATIONSHIPS.includes(relationshipType)) {
        targetRelationship[reverseRelationshipForeignKeyColumnName] =
          model[(model.constructor as typeof Model).primaryKeyName];
      }
    }
  }

  // TODO: these 2 are wrong, when insert() happens and it replaces the previous data
  // BUGGY CASE: targetRelationship is insertedPhoto, relationshipArray.belongsTo is user
  static addHasManyRelationshipFor(relationshipArray, targetRelationship) {
    if (relationshipArray.belongsTo && relationshipArray.metadata.reverseRelationshipName) {
      // TODO: dont do this everytime: Scenario:
      // 1. insert() is called on a model with a HasMany relationship
      // Photo.insert makes -> user.photos[0] = insertedPhoto; |> changing it from photo
      // Then relationshipArray.belongsTo is user not insertedUser
      // insertedPhoto.owner should be insertedUser

      // TODO: instead it should just change reverserRelationshipForeignKeyColumnName maybe(?)
      // let targetPrimaryKey = relationshipArray.belongsTo[relationshipArray.metadata.RelationshipClass.primaryKeyName];
      let { SourceClass, relationshipName } = relationshipArray.metadata;
      let relationshipCache = RelationshipDB.findRelationshipCacheFor(SourceClass, relationshipName, "HasMany");
      let references = InstanceDB.getReferences(targetRelationship);

      let targetUser =
        Array.from(InstanceDB.getReferences(relationshipArray.belongsTo))
          .reverse()
          .find((reference) => {
            let models = relationshipCache.get(reference);
            if (models) {
              return models.some((model) => references.has(model)); // NOTE: should this be targetRelationship or above in instances?
            }
          }) || relationshipArray.belongsTo;
      targetRelationship[relationshipArray.metadata.reverseRelationshipName] = targetUser; // this is not reflexive?

      // let { RelationshipClass, reverseRelationshipName } = relationshipArray.metadata;
      // let reverseRelationshipCache = RelationshipDB.findRelationshipCacheFor(
      //   RelationshipClass,
      //   reverseRelationshipName,
      //   "BelongsTo"
      // );
      // let previousRelationship = reverseRelationshipCache.get(targetRelationship);
      // if (previousRelationship) {
      //   this.cleanRelationshipsOn(
      //     previousRelationship,
      //     targetRelationship,
      //     relationshipArray.metadata,
      //     reverseRelationshipCache,
      //     null,
      //     false
      //   );
      // }
    }
  }

  static removeHasManyRelationshipFor(relationshipArray, targetRelationship) {
    if (relationshipArray.belongsTo && relationshipArray.metadata.reverseRelationshipName) {
      let targetRelationshipInstances = InstanceDB.getReferences(targetRelationship);
      let { relationshipName } = relationshipArray.metadata;
      let fallback = Array.from(InstanceDB.getReferences(relationshipArray.belongsTo))
        .reverse()
        .find((reference) => {
          let hasManyRecords = reference[relationshipName];
          if (Array.isArray(hasManyRecords)) {
            return hasManyRecords.some((record) => targetRelationshipInstances.has(record));
          }
        });

      targetRelationship[relationshipArray.metadata.reverseRelationshipName] = fallback || null; // TODO: instead, resort to another possible reference(?)
      // TODO: clean reflexive references(?)
    }

    console.log("is window.insertedUser for removal", targetRelationship === window.insertedUser);
  }
}

// NOTE: this needs to improve, doesnt give the right results all the time(?!), Querying needs to get better
function findDirectRelationshipsFor(targetModel: Model, source: Model, relationshipCache) {
  if (!relationshipCache) {
    return [];
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

function findBelongsToRelationshipsFor(
  existingRelationship: Model,
  source: Model,
  relationshipCache,
  reflectionCache,
  relationshipType
) {
  if (!reflectionCache) {
    return [];
  } else if (relationshipType === "OneToOne") {
    let result = new Set() as Set<Model>;
    let targetModels = InstanceDB.getAllReferences(existingRelationship.constructor as typeof Model); // TODO: this is costly reduce it
    targetModels.forEach((instanceSet) => {
      instanceSet.forEach((instance) => {
        if (reflectionCache.get(instance) === source) {
          result.add(instance);
        }
      });
    });

    if (existingRelationship && relationshipCache.get(source) === existingRelationship) {
      // NOTE: is this really needed?!?
      result.add(existingRelationship);
    }

    return Array.from(result);
  }

  return [];
}

function findOneToOneRelationshipFor(targetModel: Model, source: Model, reflectionCache, relationshipType) {
  if (!reflectionCache) {
    return [];
  } else if (relationshipType === "BelongsTo") {
    let result = new Set() as Set<Model>;
    let targetModels = InstanceDB.getAllReferences(targetModel.constructor as typeof Model); // TODO: this is costly reduce it
    targetModels.forEach((instanceSet) => {
      instanceSet.forEach((instance) => {
        if (reflectionCache.get(instance) === source) {
          result.add(instance);
        }
      });
    });

    return Array.from(result);
  }

  return [];
}
