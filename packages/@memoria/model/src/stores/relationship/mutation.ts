import Model from "../../model.js";
import RelationshipDB from "./db.js";
import RelationshipQuery from "./query.js";
import InstanceDB from "../instance/db.js";
import type { RelationshipMetadata } from "./schema.js";

const SINGLE_VALUE_RELATIONSHIPS = ["BelongsTo", "OneToOne"];
type AnotherModel = Model;

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

    this.removeOrSetFallbackReverseRelationshipsFor(model, metadata, targetRelationship);

    RelationshipCache.set(model, targetRelationship);

    model[foreignKeyColumnName as string] = targetRelationship
      ? targetRelationship[RelationshipClass.primaryKeyName]
      : null;

    if (reverseRelationshipType === "OneToOne") {
      this.setReflectiveSideRelationship(model, targetRelationship, metadata);
    } else if (reverseRelationshipType === "HasMany") {
      this.setReflectiveSideRelationship(model, targetRelationship, metadata);
    }
  }

  static cleanAndSetOneToOneRelationshipFor(
    model: Model,
    targetRelationship: Model | null,
    metadata: RelationshipMetadata
  ) {
    this.removeOrSetFallbackReverseRelationshipsFor(model, metadata);

    metadata.RelationshipCache.set(model, targetRelationship);

    this.setReflectiveSideRelationship(model, targetRelationship, metadata);
  }

  static removeOrSetFallbackReverseRelationshipsFor(
    source: Model,
    metadata: RelationshipMetadata,
    targetRelationship?: AnotherModel | null
  ) {
    let existingRelationship = metadata.RelationshipCache.get(source) as Model;
    let existingRelationshipReferences = existingRelationship && InstanceDB.getReferences(existingRelationship);
    if (targetRelationship && targetRelationship === existingRelationship) {
      return;
    }
    let {
      reverseRelationshipForeignKeyColumnName,
      foreignKeyColumnName,
      relationshipType,
      RelationshipCache,
      ReverseRelationshipCache,
      reverseRelationshipType,
    } = metadata;
    if (relationshipType === "HasMany" || relationshipType === "ManyToMany") {
      throw new Error(
        `removeOrSetFallbackReverseRelationshipsFor ${relationshipType} should never hit based on the written logic!!`
      );
    }

    // TODO: Whole algorithm here needs to CHANGE!! Comparison and mutation should be correct and apply to all instances(?)
    let reverseRelationshipsPointingToSource = RelationshipQuery.findReverseRelationships(source, metadata);
    // NOTE: this needs to be a merge of all the **same side** other instance relationships pointing to the **existing** relationship **not** the source
    let SourceClass = source.constructor as typeof Model;

    let freshRemainingSourceReferenceToExistingRelationship =
      existingRelationship &&
      (!existingRelationshipReferences || !existingRelationshipReferences.has(targetRelationship)) &&
      // NOTE: check if sourceInstancesPointingToExistingRelationship.length > 1 or 0
      // (reverseRelationshipsPointingToSource.length > 0 || sourceInstancesPointingToExistingRelationship.length > 1) && // TODO: is this check correct?!?, it was merely an update but we cant know which records to update/replace properly
      Array.from(InstanceDB.getReferences(source))
        .reverse()
        .find((sourceReference) => {
          if (sourceReference === source) {
            return false;
          } else if (SourceClass.Cache.get(sourceReference[SourceClass.primaryKeyName]) === sourceReference) {
            return false;
          }

          if (relationshipType === "BelongsTo") {
            return (
              RelationshipCache.get(sourceReference) === existingRelationship ||
              (existingRelationship[SourceClass.primaryKeyName] &&
                sourceReference[foreignKeyColumnName as string] === existingRelationship[SourceClass.primaryKeyName])
            );
          } else if (relationshipType === "OneToOne") {
            return (
              existingRelationship[reverseRelationshipForeignKeyColumnName as string] ===
                source[SourceClass.primaryKeyName] && RelationshipCache.get(sourceReference) !== null
            ); // NOTE: This gets the fresh last instance most of the time
          }
        });

    if (SINGLE_VALUE_RELATIONSHIPS.includes(relationshipType)) {
      RelationshipCache.delete(source);

      reverseRelationshipsPointingToSource.forEach((existingRelationshipReference) => {
        if (SINGLE_VALUE_RELATIONSHIPS.includes(reverseRelationshipType)) {
          return freshRemainingSourceReferenceToExistingRelationship
            ? ReverseRelationshipCache.set(
                existingRelationshipReference,
                freshRemainingSourceReferenceToExistingRelationship
              )
            : ReverseRelationshipCache.delete(existingRelationshipReference);
        }

        let targetReverseRelationship = ReverseRelationshipCache.get(existingRelationshipReference) as Model[];
        if (targetReverseRelationship && existingRelationshipReference !== targetRelationship) {
          let targetIndex = targetReverseRelationship.findIndex((relationship) => relationship === source);
          if (targetIndex !== -1 && targetReverseRelationship[targetIndex] === source) {
            freshRemainingSourceReferenceToExistingRelationship
              ? (targetReverseRelationship[targetIndex] = freshRemainingSourceReferenceToExistingRelationship)
              : targetReverseRelationship.splice(targetIndex, 1);
          }
        }
      });
    }
  }

  static setReflectiveSideRelationship(
    model: Model,
    targetRelationship: null | Model,
    {
      relationshipType,
      reverseRelationshipType,
      reverseRelationshipForeignKeyColumnName,
      ReverseRelationshipCache,
    }: RelationshipMetadata
  ) {
    if (targetRelationship) {
      if (reverseRelationshipType === "HasMany") {
        let existingRelationship = ReverseRelationshipCache.get(targetRelationship) as Model[];
        if (existingRelationship && !existingRelationship.includes(model)) {
          existingRelationship.push(model);
        }
      } else {
        ReverseRelationshipCache.set(targetRelationship, model);
      }

      if (relationshipType !== "BelongsTo") {
        targetRelationship[reverseRelationshipForeignKeyColumnName] =
          model[(model.constructor as typeof Model).primaryKeyName];
      }
    }
  }

  static adjustHasManyRelationshipFor(model: Model, targetRelationship: Model, metadata: RelationshipMetadata) {
    let existingRelationship = metadata.RelationshipCache.get(model);
    let targetRelationshipInstances = InstanceDB.getReferences(targetRelationship);

    if (Array.isArray(existingRelationship)) {
      let foundIndex = existingRelationship.findIndex((relationship) => targetRelationshipInstances.has(relationship));
      if (foundIndex === -1) {
        return existingRelationship.push(targetRelationship);
      }
    }
  }

  static addHasManyRelationshipFor(relationshipArray, targetRelationship) {
    if (relationshipArray.belongsTo && relationshipArray.metadata.reverseRelationshipName) {
      let { SourceClass, relationshipName } = relationshipArray.metadata;
      let relationshipCache = RelationshipDB.findRelationshipCacheFor(SourceClass, relationshipName, "HasMany");
      let references = InstanceDB.getReferences(targetRelationship);

      let targetUser =
        Array.from(InstanceDB.getReferences(relationshipArray.belongsTo))
          .reverse()
          .find((reference) => {
            let models = relationshipCache.get(reference);
            if (models) {
              return models.some((model) => references.has(model));
            }
          }) || relationshipArray.belongsTo;

      targetRelationship[relationshipArray.metadata.reverseRelationshipName] = targetUser;
    }
  }

  static removeHasManyRelationshipFor(relationshipArray, targetRelationship) {
    if (relationshipArray.belongsTo && relationshipArray.metadata.reverseRelationshipName) {
      relationshipArray.metadata.ReverseRelationshipCache.delete(targetRelationship);
    }
  }
}
