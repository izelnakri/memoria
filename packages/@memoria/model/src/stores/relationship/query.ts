import InstanceDB from "../instance/db.js";
import RelationshipDB from "./db.js";
import type Model from "../../model.js";
import type { PrimaryKey } from "../../model.js";
import type { RelationshipMetadata } from "./schema.js";

export default class RelationshipQuery {
  // NOTE: In future it should score them by lastPersisted = timestamp and get the most fresh reference(?)
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
      } else if (model[foreignKeyColumnName as string]) {
        return InstanceDB.getPersistedModels(RelationshipClass).get(model[foreignKeyColumnName as string]);
      }

      let [relationshipFoundFromReverseLookup, reverseLookupFallback] =
        this.findPossibleReferenceInMemoryByReverseRelationshipInstances(
          model,
          metadata,
          model[foreignKeyColumnName as string]
        );
      if (relationshipFoundFromReverseLookup) {
        return relationshipFoundFromReverseLookup;
      }

      let [relationshipFoundByInstanceReferences, instanceLookupFalback] =
        this.findPossibleReferenceInMemoryByInstanceReferences(model, metadata, foreignKeyColumnName as string);

      return relationshipFoundByInstanceReferences || reverseLookupFallback || instanceLookupFalback;
    } else if (relationshipType === "OneToOne") {
      let modelInstances = InstanceDB.getReferences(model);
      let Class = model.constructor as typeof Model;
      let primaryKey = model[Class.primaryKeyName];
      let latestPersistedInstance = InstanceDB.getPersistedModels(Class).get(primaryKey);
      let [relationshipFoundFromReverseLookup, reverseLookupFallback] = Array.from(
        InstanceDB.getAllReferences(RelationshipClass).values()
      )
        .reverse()
        .reduce(
          (result, possibleRelationshipSet) => {
            if (result[0]) {
              return result;
            }

            return Array.from(possibleRelationshipSet)
              .reverse()
              .reduce((result, possibleRelationship) => {
                if (result[0]) {
                  return result;
                }

                let primaryKeyValue = possibleRelationship[RelationshipClass.primaryKeyName];
                if (primaryKeyValue && possibleRelationship === RelationshipClass.Cache.get(primaryKeyValue)) {
                  return result;
                }

                let someRelationship = RelationshipDB.findRelationshipFor(
                  possibleRelationship,
                  reverseRelationshipName as string
                );
                if (someRelationship && (someRelationship === model || someRelationship === latestPersistedInstance)) {
                  result[possibleRelationship.isLastPersisted ? 0 : 1] = possibleRelationship;

                  return result;
                }

                let foreignKeyValue = possibleRelationship[reverseRelationshipForeignKeyColumnName as string];
                if (foreignKeyValue && foreignKeyValue === primaryKey) {
                  result[1] = possibleRelationship;
                } else if (someRelationship && modelInstances.has(someRelationship)) {
                  result[1] = possibleRelationship;
                }

                return result;
              }, result as [Model | undefined, Model | undefined]);
          },
          [undefined, undefined] as [Model | undefined, Model | undefined]
        );
      if (relationshipFoundFromReverseLookup) {
        return relationshipFoundFromReverseLookup;
      }

      let [relationshipFoundByInstanceReferences, instanceLookupFalback] =
        this.findPossibleReferenceInMemoryByInstanceReferences(model, metadata);

      return relationshipFoundByInstanceReferences || reverseLookupFallback || instanceLookupFalback;
    }
  }

  static findPossibleReferenceInMemoryByReverseRelationshipInstances(
    model: Model,
    metadata: RelationshipMetadata,
    relationshipModelsPrimaryKeyValue: PrimaryKey
  ): [Model | undefined, Model | undefined] {
    let { RelationshipClass, reverseRelationshipName } = metadata;
    let possibleRelationshipSet = InstanceDB.getAllKnownReferences(RelationshipClass).get(
      relationshipModelsPrimaryKeyValue
    );
    if (!possibleRelationshipSet) {
      return [undefined, undefined];
    }
    let Class = model.constructor as typeof Model;
    let modelReferences = InstanceDB.getReferences(model);
    let latestPersistedInstance = InstanceDB.getPersistedModels(Class).get(model[Class.primaryKeyName]);
    let possibleRelationshipsByTime = Array.from(possibleRelationshipSet).reverse();

    return possibleRelationshipsByTime.reduce(
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
            if (reference === model || reference === latestPersistedInstance) {
              possibleResult[possibleRelationship.isLastPersisted ? 0 : 1] = possibleRelationship;

              return true;
            } else if (!possibleResult[1] && modelReferences.has(reference)) {
              possibleResult[1] = possibleRelationship;

              return true;
            }
          });

          return possibleResult;
        } else if (
          possibleReference &&
          (possibleReference === model || possibleReference === latestPersistedInstance)
        ) {
          possibleResult[possibleRelationship.isLastPersisted ? 0 : 1] = possibleRelationship;
        } else if (modelReferences.has(possibleReference)) {
          possibleResult[1] = possibleRelationship;
        } else if (possibleReference === undefined && !possibleResult[1]) {
          // TODO: is this creates bugs?!
          possibleResult[1] = possibleRelationship;
        }

        return possibleResult;
      },
      [undefined, undefined] as [Model | undefined, Model | undefined]
    );
  }

  // TODO: build this: what about the latestPersistedInstance of the relationship side(?)
  static findPossibleReferenceInMemoryByInstanceReferences(
    model: Model,
    metadata: RelationshipMetadata,
    foreignKeyColumnName?: string
  ): [Model | undefined, Model | undefined] {
    let Class = model.constructor as typeof Model;
    let primaryKeyValue = model[Class.primaryKeyName];
    let { RelationshipClass, relationshipName } = metadata;
    let instancesSet = InstanceDB.getReferences(model);
    let latestPersistedInstance = InstanceDB.getPersistedModels(Class).get(primaryKeyValue);
    let modelReferences = Array.from(instancesSet).reverse();
    let foreignKeyValue = foreignKeyColumnName ? model[foreignKeyColumnName] : undefined;
    let result = modelReferences.reduce(
      (result, modelReference) => {
        if (result[0]) {
          return result;
        }

        // TODO: this branch(?)
        if (foreignKeyColumnName && modelReference[foreignKeyColumnName] !== foreignKeyValue) {
          return result;
        } else if (primaryKeyValue && modelReference === Class.Cache.get(primaryKeyValue)) {
          return result;
        }

        let relationship = RelationshipDB.findRelationshipFor(modelReference, relationshipName);
        if (relationship) {
          let primaryKey = relationship[RelationshipClass.primaryKeyName];
          if (primaryKey && relationship === RelationshipClass.Cache.get(primaryKey)) {
            return result;
          } else if (relationship === model || relationship === latestPersistedInstance) {
            result[relationship.isLastPersisted ? 0 : 1] = relationship;
          } else if (instancesSet.has(relationship)) {
            result[1] = relationship;
          }

          return result;
        } else if (foreignKeyColumnName) {
          let [relationshipFoundFromReverseLookup, reverseLookupFallback] =
            this.findPossibleReferenceInMemoryByReverseRelationshipInstances(modelReference, metadata, foreignKeyValue);
          if (relationshipFoundFromReverseLookup) {
            result[relationship.isLastPersisted ? 0 : 1] = relationshipFoundFromReverseLookup;
          } else if (!result[1]) {
            result[1] = reverseLookupFallback;
          }
        }

        return result;
      },
      [undefined, undefined] as [Model | undefined, Model | undefined]
    );
    if (result[0] || result[1]) {
      return result;
    } else if (foreignKeyValue) {
      let foundRelationship = RelationshipClass.peek(foreignKeyValue) as Model | null;

      return foundRelationship ? [undefined, foundRelationship] : [undefined, undefined];
    }

    return [undefined, undefined];
  }
}
