import Model from "../../model.js";
import RelationshipDB from "./db.js";
import RelationshipQuery from "./query.js";
import InstanceDB from "../instance/db.js";
import type { RelationshipType, RelationshipCache, RelationshipMetadata } from "./schema.js";

const NON_FOREIGN_KEY_RELATIONSHIPS = ["OneToOne", "HasMany"];

// NOTE: maybe rename to RelationshipMutation
export default class RelationshipUtils {
  // NOTE: There are two cases when building(transfer/copy without removal), setting on demand
  // Summary: gets reverseRelationshipCache, existingRelationship (if it exists, clean(REMOVE IT))
  // Sets new relationship on the cache, sets foreign key on the model, sets reverse relationship on the target model
  static cleanAndSetBelongsToRelationshipFor(
    model: Model,
    targetRelationship: Model | null,
    metadata: RelationshipMetadata,
    relationshipCache: RelationshipCache
  ) {
    let { foreignKeyColumnName, RelationshipClass, reverseRelationshipName } = metadata;
    let oneToOneReflexiveCache =
      reverseRelationshipName &&
      RelationshipDB.findRelationshipCacheFor(RelationshipClass, reverseRelationshipName, "OneToOne");
    let reverseRelationshipType: RelationshipType = oneToOneReflexiveCache ? "OneToOne" : "HasMany";
    let reverseRelationshipCache =
      oneToOneReflexiveCache ||
      (reverseRelationshipName &&
        RelationshipDB.findRelationshipCacheFor(RelationshipClass, reverseRelationshipName, reverseRelationshipType));
    let existingRelationship = relationshipCache.get(model);
    if (existingRelationship) {
      this.cleanRelationshipsOn(
        model,
        existingRelationship as Model,
        metadata,
        relationshipCache,
        reverseRelationshipCache
      );
    }

    relationshipCache.set(model, targetRelationship);

    model[foreignKeyColumnName as string] = targetRelationship
      ? targetRelationship[RelationshipClass.primaryKeyName]
      : null;

    if (reverseRelationshipType === "OneToOne") {
      this.setReflectiveSideRelationship(targetRelationship, model, metadata, reverseRelationshipCache);
    } else if (reverseRelationshipType === "HasMany") {
      // TODO: implement HasMany
    }
  }

  static cleanAndSetOneToOneRelationshipFor(
    model: Model,
    targetRelationship: Model | null,
    metadata: RelationshipMetadata,
    relationshipCache: RelationshipCache
  ) {
    let { RelationshipClass, reverseRelationshipName, reverseRelationshipType } = metadata;
    let reverseRelationshipCache =
      reverseRelationshipName &&
      RelationshipDB.findRelationshipCacheFor(
        RelationshipClass,
        reverseRelationshipName,
        reverseRelationshipType as string
      );
    let existingRelationship = relationshipCache.get(model);
    if (existingRelationship) {
      this.cleanRelationshipsOn(
        model,
        existingRelationship as Model,
        metadata,
        relationshipCache,
        reverseRelationshipCache
      ); // NOTE: this cleans all the previous reverse relationships
    }

    relationshipCache.set(model, targetRelationship);

    this.setReflectiveSideRelationship(targetRelationship, model, metadata, reverseRelationshipCache);
  }

  static cleanRelationshipsOn(
    source: Model,
    existingRelationship: Model,
    { reverseRelationshipForeignKeyColumnName, relationshipType },
    relationshipCache: RelationshipCache,
    reverseRelationshipCache: RelationshipCache
  ) {
    let reverseRelationships = RelationshipQuery.findReverseRelationships(
      source,
      existingRelationship,
      reverseRelationshipCache
    );
    let SourceClass = source.constructor as typeof Model;
    let sourceIsAlsoReverse = sourceIsInExinstingRelationship(source, existingRelationship, reverseRelationshipCache);
    let freshRemainingSourceReference =
      sourceIsAlsoReverse &&
      Array.from(InstanceDB.getReferences(source))
        .reverse()
        .find((sourceReference) => {
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
            ); // NOTE: This gets the fresh last instance most of the time
          } // TODO: add ManyToMany, HasMany in future
        });

    if (relationshipType === "BelongsTo" || relationshipType === "OneToOne") {
      relationshipCache.delete(source);

      reverseRelationships.forEach((existingTargetRelationshipReference) => {
        return freshRemainingSourceReference
          ? reverseRelationshipCache.set(existingTargetRelationshipReference, freshRemainingSourceReference)
          : reverseRelationshipCache.delete(existingTargetRelationshipReference); // TODO: with HasMany do it differently
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
  }
}

function sourceIsInExinstingRelationship(
  source: Model,
  existingRelationship: Model,
  reverseRelationshipCache: RelationshipCache
) {
  if (!reverseRelationshipCache) {
    return false;
  }

  let cachedRelationship = reverseRelationshipCache && reverseRelationshipCache.get(existingRelationship);
  return Array.isArray(cachedRelationship) ? cachedRelationship.includes(source) : cachedRelationship === source;
}
