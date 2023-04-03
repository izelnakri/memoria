import InstanceDB from "../instance/db.js";
import RelationshipDB from "./db.js";
import type Model from "../../model.js";
import type { PrimaryKey } from "../../model.js";
import type { RelationshipMetadata } from "./schema.js";

export default class RelationshipQuery {
  // NOTE: lookup is not by latest assignment but by id
  static findPossibleReferenceInMemory(model: Model, metadata: RelationshipMetadata): Model | null | undefined {
    let {
      RelationshipClass,
      relationshipType,
      foreignKeyColumnName,
      reverseRelationshipName,
      reverseRelationshipForeignKeyColumnName,
    } = metadata;
    if (relationshipType === "BelongsTo") {
      if (model[foreignKeyColumnName as string] === null) {
        return null;
      }

      return (
        this.findPossibleReferenceInMemoryByReverseRelationshipInstances(
          model,
          metadata,
          model[foreignKeyColumnName as string]
        ) || this.findPossibleReferenceInMemoryByInstanceReferences(model, metadata, foreignKeyColumnName as string) // TODO: this shouldnt peek
      );
    } else if (relationshipType === "OneToOne") {
      let modelInstances = InstanceDB.getReferences(model);
      let Class = model.constructor as typeof Model;
      let primaryKey = model[Class.primaryKeyName];
      let relationshipFoundFromReverseLookup = Array.from(InstanceDB.getAllReferences(RelationshipClass).values())
        .reverse()
        .reduce((result, possibleRelationshipSet) => {
          if (result) {
            return result;
          }

          return Array.from(possibleRelationshipSet)
            .reverse()
            .find((possibleRelationship) => {
              let primaryKeyValue = possibleRelationship[RelationshipClass.primaryKeyName];
              if (primaryKeyValue && possibleRelationship === RelationshipClass.Cache.get(primaryKeyValue)) {
                return false;
              }

              let someRelationship = RelationshipDB.findRelationshipFor(
                possibleRelationship,
                reverseRelationshipName as string
              );
              if (someRelationship) {
                return modelInstances.has(someRelationship);
              }
              let foreignKeyValue = possibleRelationship[reverseRelationshipForeignKeyColumnName as string];
              return foreignKeyValue && foreignKeyValue === primaryKey;
            });
        }, undefined as Model | undefined);

      return (
        relationshipFoundFromReverseLookup || this.findPossibleReferenceInMemoryByInstanceReferences(model, metadata)
      );
    }
  }

  static findPossibleReferenceInMemoryByReverseRelationshipInstances(
    model: Model,
    metadata: RelationshipMetadata,
    relationshipModelsPrimaryKeyValue: PrimaryKey
  ): Model | null | undefined {
    let Class = model.constructor as typeof Model;
    let { RelationshipClass, reverseRelationshipName } = metadata;
    let possibleRelationshipSet = InstanceDB.getAllKnownReferences(RelationshipClass).get(
      relationshipModelsPrimaryKeyValue
    );
    if (!possibleRelationshipSet) {
      return;
    }
    let modelReferences = InstanceDB.getReferences(model);
    let possibleRelationshipsByTime = Array.from(possibleRelationshipSet).reverse();
    let [foundRelationship, fallbackRelationship] = possibleRelationshipsByTime.reduce(
      (possibleResult, possibleRelationship) => {
        if (possibleResult[0]) {
          return possibleResult;
        }

        let primaryKeyValue = possibleRelationship[Class.primaryKeyName];
        if (possibleRelationship === RelationshipClass.Cache.get(primaryKeyValue)) {
          return possibleResult;
        }

        let possibleReference = reverseRelationshipName
          ? RelationshipDB.findRelationshipFor(possibleRelationship, reverseRelationshipName)
          : undefined;
        if (Array.isArray(possibleReference)) {
          possibleReference.find((reference) => {
            if (reference === model) {
              possibleResult[0] = possibleRelationship;

              return true;
            } else if (!possibleResult[1] && modelReferences.has(reference)) {
              possibleResult[1] = possibleRelationship;

              return true;
            }
          });

          return possibleResult;
        } else if (possibleReference === model) {
          possibleResult[0] = possibleRelationship;
        } else if (modelReferences.has(possibleReference)) {
          possibleResult[1] = possibleRelationship;
        } else if (possibleReference === undefined && !possibleResult[1]) {
          possibleResult[1] = possibleRelationship;
        }

        return possibleResult;
      },
      [undefined, undefined] as Array<Model | null | undefined>
    );

    return foundRelationship || fallbackRelationship;
  }

  static findPossibleReferenceInMemoryByInstanceReferences(
    model: Model,
    metadata: RelationshipMetadata,
    foreignKeyColumnName?: string
  ): Model | null | undefined {
    let Class = model.constructor as typeof Model;
    let primaryKeyValue = model[Class.primaryKeyName];
    let { RelationshipClass, relationshipName, reverseRelationshipName } = metadata;
    let instancesSet = InstanceDB.getReferences(model);
    let modelReferences = Array.from(instancesSet).reverse();
    let foreignKeyValue = foreignKeyColumnName ? model[foreignKeyColumnName] : undefined;
    let modelWithRightRelationship = modelReferences.find((modelReference) => {
      if (foreignKeyColumnName && modelReference[foreignKeyColumnName] !== foreignKeyValue) {
        return false;
      } else if (primaryKeyValue && modelReference === Class.Cache.get(primaryKeyValue)) {
        return false;
      }

      let relationship = RelationshipDB.findRelationshipFor(modelReference, relationshipName);
      if (relationship) {
        let primaryKey = relationship[RelationshipClass.primaryKeyName];
        return !(primaryKey && relationship === RelationshipClass.Cache.get(primaryKey));
      } else if (foreignKeyColumnName) {
        return this.findPossibleReferenceInMemoryByReverseRelationshipInstances(
          modelReference,
          metadata,
          foreignKeyValue
        );
      }
    });

    if (modelWithRightRelationship) {
      return modelWithRightRelationship;
    } else if (foreignKeyValue) {
      let foundRelationship = RelationshipClass.peek(foreignKeyValue);

      return foundRelationship ? foundRelationship : undefined;
    }
  }
}
