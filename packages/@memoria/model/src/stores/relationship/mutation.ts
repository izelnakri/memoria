import Model from "../../model.js";
import RelationshipDB from "./db.js";
import RelationshipQuery from "./query.js";
import InstanceDB from "../instance/db.js";
import type { RelationshipMetadata } from "./schema.js";

// const NON_FOREIGN_KEY_RELATIONSHIPS = ["OneToOne", "HasMany"];
const SINGLE_VALUE_RELATIONSHIPS = ["BelongsTo", "OneToOne"];

export default class RelationshipMutation {
  // NOTE: There are two cases when building(transfer/copy without removal), setting on demand
  // Summary: gets reverseRelationshipCache, existingRelationship (if it exists, clean(REMOVE IT))
  // Sets new relationship on the cache, sets foreign key on the model, sets reverse relationship on the target model
  static cleanAndSetBelongsToRelationshipFor(
    model: Model,
    targetRelationship: Model | null,
    metadata: RelationshipMetadata
  ) {
    let { foreignKeyColumnName, RelationshipClass, RelationshipCache, reverseRelationshipType } = metadata;
    let existingRelationship = RelationshipCache.get(model);

    existingRelationship && this.cleanRelationshipsOn(model, metadata, existingRelationship as Model);

    RelationshipCache.set(model, targetRelationship);

    model[foreignKeyColumnName as string] = targetRelationship
      ? targetRelationship[RelationshipClass.primaryKeyName]
      : null;

    if (reverseRelationshipType === "OneToOne") {
      this.setReflectiveSideRelationship(model, targetRelationship, metadata);
    } else if (reverseRelationshipType === "HasMany") {
      // TODO: implement HasMany
    }
  }

  static cleanAndSetOneToOneRelationshipFor(
    model: Model,
    targetRelationship: Model | null,
    metadata: RelationshipMetadata
  ) {
    let { RelationshipCache } = metadata;
    let existingRelationship = RelationshipCache.get(model);

    existingRelationship && this.cleanRelationshipsOn(model, metadata, existingRelationship as Model); // NOTE: this cleans all the previous reverse relationships

    RelationshipCache.set(model, targetRelationship);

    this.setReflectiveSideRelationship(model, targetRelationship, metadata);
  }

  static cleanRelationshipsOn(
    source: Model,
    metadata: RelationshipMetadata,
    existingRelationship?: Model | null | undefined
  ) {
    let {
      reverseRelationshipForeignKeyColumnName,
      RelationshipClass,
      relationshipType,
      RelationshipCache,
      ReverseRelationshipCache,
      reverseRelationshipType,
    } = metadata;
    let reverseRelationships = RelationshipQuery.findReverseRelationships(source, RelationshipClass, metadata); // NOTE: costly query
    let SourceClass = source.constructor as typeof Model;
    let freshRemainingSourceReferenceToExistingRelationship =
      existingRelationship &&
      reverseRelationships.length > 0 &&
      Array.from(InstanceDB.getReferences(source))
        .reverse()
        .find((sourceReference) => {
          if (sourceReference === source) {
            return false;
          } else if (SourceClass.Cache.get(sourceReference[SourceClass.primaryKeyName]) === sourceReference) {
            return false;
          }

          if (relationshipType === "BelongsTo") {
            return RelationshipCache.get(sourceReference) === existingRelationship;
          } else if (relationshipType === "OneToOne") {
            return (
              existingRelationship[reverseRelationshipForeignKeyColumnName as string] ===
                source[SourceClass.primaryKeyName] && RelationshipCache.get(sourceReference) !== null
            ); // NOTE: This gets the fresh last instance most of the time
          } else if (relationshipType === "HasMany") {
          } // TODO: add ManyToMany, HasMany in future. This might get the fresh last instance most of the time
        });

    if (SINGLE_VALUE_RELATIONSHIPS.includes(relationshipType)) {
      RelationshipCache.delete(source);

      reverseRelationships.forEach((existingTargetRelationshipReference) => {
        if (SINGLE_VALUE_RELATIONSHIPS.includes(reverseRelationshipType)) {
          return freshRemainingSourceReferenceToExistingRelationship
            ? ReverseRelationshipCache.set(
                existingTargetRelationshipReference,
                freshRemainingSourceReferenceToExistingRelationship
              )
            : ReverseRelationshipCache.delete(existingTargetRelationshipReference); // TODO: with HasMany do it differently
        }

        let targetReverseRelationship = ReverseRelationshipCache.get(existingTargetRelationshipReference) as Model[];
        if (targetReverseRelationship) {
          debugger;
          let targetIndex = targetReverseRelationship.findIndex((relationship) => relationship === source);
          if (targetIndex !== -1) {
            targetReverseRelationship.splice(targetIndex, 1);
          }
        }
      });
    }
  }

  static setReflectiveSideRelationship(
    model: Model,
    targetRelationship: null | Model,
    { relationshipType, reverseRelationshipForeignKeyColumnName, ReverseRelationshipCache }
  ) {
    // TODO: make this work for HasMany Arrays in future
    if (targetRelationship) {
      ReverseRelationshipCache.set(targetRelationship, model);

      if (relationshipType === "OneToOne") {
        targetRelationship[reverseRelationshipForeignKeyColumnName] =
          model[(model.constructor as typeof Model).primaryKeyName];
      }
    }
  }

  // NOTE: this only changes one reference, not all references
  static adjustHasManyRelationshipFor(model: Model, targetRelationship: Model, metadata: RelationshipMetadata) {
    let existingRelationship = metadata.RelationshipCache.get(model);
    let targetRelationshipInstances = InstanceDB.getReferences(targetRelationship);

    if (Array.isArray(existingRelationship)) {
      let foundIndex = existingRelationship.findIndex((relationship) => targetRelationshipInstances.has(relationship));
      if (foundIndex === -1) {
        return existingRelationship.push(targetRelationship);
      }

      let foundRelationship = existingRelationship[foundIndex];
      if (foundRelationship !== targetRelationship) {
        existingRelationship[foundIndex] = targetRelationship;
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

// function sourceIsInExinstingRelationship(
//   source: Model,
//   existingRelationship: Model,
//   ReverseRelationshipCache: RelationshipCache
// ) {
//   let cachedRelationship = ReverseRelationshipCache.get(existingRelationship);
//   return Array.isArray(cachedRelationship) ? cachedRelationship.includes(source) : cachedRelationship === source;
// }
