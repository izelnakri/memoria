import InstanceDB from "../instance/db.js";
import RelationshipDB from "./db.js";
import type Model from "../../model.js";
import type { PrimaryKey } from "../../model.js";
import type { RelationshipMetadata, RelationshipCache } from "./schema.js";

export default class RelationshipMutation {
  // NOTE: In future it should score them by lastPersisted = timestamp and get the most fresh reference(?)
  // TODO: BelongsTo lookup should add or edit instance on the hasMany array(if needed)(do it across all possible arrays(?) here there is iteration though?
  //
  // builtPhoto.owner lookup assigns append to secondUser.photos anotherSecondUser.photos
  //

  // static refreshHasManyRelationships(model: Model, metadata: RelationshipMetadata) {

  // }

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
        let targetModel = InstanceDB.getPersistedModels(RelationshipClass).get(model[foreignKeyColumnName as string]);
        if (
          !targetModel ||
          !reverseRelationshipName ||
          RelationshipDB.findRelationshipFor(targetModel, reverseRelationshipName as string) !== null
        ) {
          return targetModel;
        }
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
      let modelIsCachedModel = Class.Cache.get(primaryKey) === model;
      let [relationshipFoundFromReverseLookup, reverseLookupFallback, cachedReferencePrimaryKey] = Array.from(
        InstanceDB.getAllReferences(RelationshipClass).values()
      )
        .reverse()
        .reduce((result, possibleRelationshipSet) => {
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
              let foreignKeyValue = possibleRelationship[reverseRelationshipForeignKeyColumnName as string];
              if (primaryKeyValue && possibleRelationship === RelationshipClass.Cache.get(primaryKeyValue)) {
                if (foreignKeyValue && foreignKeyValue === primaryKey) {
                  result[2] = primaryKeyValue;
                }

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

              if (!modelIsCachedModel && foreignKeyValue && foreignKeyValue === primaryKey) {
                result[1] = possibleRelationship;
              } else if (someRelationship && modelInstances.has(someRelationship)) {
                result[1] = possibleRelationship;
              }

              return result;
            }, result as [Model | undefined, Model | undefined, PrimaryKey | undefined]);
        }, Object.seal([undefined, undefined, undefined]) as [Model | undefined, Model | undefined, PrimaryKey | undefined]);
      if (relationshipFoundFromReverseLookup) {
        return relationshipFoundFromReverseLookup;
      }

      let [relationshipFoundByInstanceReferences, instanceLookupFalback] =
        this.findPossibleReferenceInMemoryByInstanceReferences(model, metadata);

      let result = relationshipFoundByInstanceReferences || reverseLookupFallback || instanceLookupFalback;
      if (result) {
        return result;
      }

      let cacheCopy = cachedReferencePrimaryKey ? RelationshipClass.peek(cachedReferencePrimaryKey) : undefined;
      if (cacheCopy) {
        return cacheCopy as Model;
      }
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
    if (!possibleRelationshipSet || !InstanceDB.isPersisted(possibleRelationshipSet)) {
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

  static findPossibleReferenceInMemoryByInstanceReferences(
    model: Model,
    metadata: RelationshipMetadata,
    foreignKeyColumnName?: string
  ): [Model | undefined, Model | undefined] {
    if (!model.isPersisted) {
      return [undefined, undefined];
    }

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

  static findReverseRelationships(
    source: Model,
    existingRelationship: Model,
    reverseRelationshipCache: RelationshipCache
  ) {
    if (reverseRelationshipCache) {
      return Array.from(
        InstanceDB.getAllReferences(existingRelationship.constructor as typeof Model).reduce((result, instanceSet) => {
          instanceSet.forEach((instance) => {
            if (reverseRelationshipCache.get(instance) === source) {
              result.add(instance);
            }
          });

          return result;
        }, new Set() as Set<Model>)
      );
    }

    return [];
  }
}
