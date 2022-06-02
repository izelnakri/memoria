import InstanceDB from "../instance/db.js";
import RelationshipDB from "./db.js";
import type Model from "../../model.js";

export default class RelationshipQuery {
  static findAllInstancesFor(referenceClass: typeof Model, relationshipCache, value: Model) {
    let result = [] as Model[];
    let targetModels = InstanceDB.getAllReferences(referenceClass);

    targetModels.forEach((instanceSet) => {
      instanceSet.forEach((instance) => {
        if (relationshipCache.get(instance) === value) {
          result.push(instance);
        }
      });
    });

    return result;
  }

  // last one in InstanceDB Set is the most up to date one!! But what if it has changes to

  // we want to find the column so this works, if both foreign keys are same and old one points
  // then get simply the last element in InstanceDB array(?) yes this seems reasonable and hard to be wrong(?) even after mutations
  // instead of getting it from the previous source reference directly

  // x a                y u
  // x a                y u
  // x a                y u
  // x a                y u
  // x a                y u
  // x a                y u

  // TODO: draw this search algorithm
  static findPossibleReferenceInMemory(
    model,
    relationshipName,
    metadata
  ) {
    // NOTE: what if reverse side is also not registered when trying to get the last instance of an instanceGroup
    // NOTE: this probably retrive null references on OneToOne and BelongsTo, but not sure on *all cases*
    let Class = model.constructor as typeof Model;
    let { RelationshipClass, relationshipType, foreignKeyColumnName, reverseRelationshipForeignKeyColumnName, reverseRelationshipName } = metadata;
    let relationshipCache = RelationshipDB.findRelationshipCacheFor(Class, relationshipName);
    let reverseRelationshipCache = RelationshipDB.findRelationshipCacheFor(RelationshipClass, reverseRelationshipName);
    let modelReferences = InstanceDB.getReferences(model);

    if (relationshipType === 'BelongsTo') {
      let sourceTarget = Array.from(modelReferences).find((reference) => {
        if (reference === model) {
          return false;
        }

        return (model[foreignKeyColumnName] && model[foreignKeyColumnName] === reference[foreignKeyColumnName]) &&
          relationshipCache.get(reference); // NOTE: maybe also do optimistic lookup for relationships with null pkey
      });
      let referenceRelationship = sourceTarget && relationshipCache.get(sourceTarget);
      if (referenceRelationship) {
        // NOTE: making sure that last created and referenced one is obtained here:
        return Array.from(InstanceDB.getReferences(referenceRelationship)).reverse().find((relationshipInstance) => {
          return !reverseRelationshipCache.has(relationshipInstance)
            || modelReferences.has(reverseRelationshipCache.has(relationshipInstance));
        });
      }

      return getRelationshipFromAllModelsLookup(model, metadata, reverseRelationshipCache);
    } else if (relationshipType === 'OneToOne') {
      let sourceTarget = Array.from(modelReferences).find((reference) => {
        if (reference === model) {
          return false;
        }
        let relationshipReference = relationshipCache.get(reference);

        return relationshipReference && modelReferences.has(relationshipReference);
      });
      let referenceRelationship = sourceTarget && relationshipCache.get(sourceTarget);
      if (referenceRelationship) {
        return Array.from(InstanceDB.getReferences(referenceRelationship)).reverse().find((relationshipInstance) => {
          return relationshipInstance[reverseRelationshipForeignKeyColumnName] === model[Class.primaryKeyName];
        });
      }

      return getRelationshipFromAllModelsLookup(model, metadata, reverseRelationshipCache);
    }
  }
}

function getRelationshipFromAllModelsLookup(model, metadata, reverseRelationshipCache) {
  let Class = model.constructor as typeof Model;
  let { RelationshipClass, foreignKeyColumnName, relationshipType, reverseRelationshipForeignKeyColumnName } = metadata;
  if (relationshipType === 'BelongsTo') {
    let modelReferences = InstanceDB.getReferences(model);
    let targetRelationshipPrimaryKeyValue = model[foreignKeyColumnName];
    if (targetRelationshipPrimaryKeyValue) {
      let referenceSet = InstanceDB.getAllKnownReferences(RelationshipClass).get(targetRelationshipPrimaryKeyValue);

      return referenceSet && Array.from(referenceSet).reverse().find((instance) => {
        return !reverseRelationshipCache.has(instance) || modelReferences.has(reverseRelationshipCache.get(instance));
      });
    }

    let references = InstanceDB.getAllUnknownInstances(RelationshipClass);
    let relationship;
    references.find((referenceSet) => {
      return Array.from(referenceSet).reverse().find((instance) => {
        if (modelReferences.has(reverseRelationshipCache.get(instance))) {
          relationship = instance;
          return true;
        }
      });
    });

    return relationship;
  } else if (relationshipType === 'OneToOne') {
    let referenceSetList = InstanceDB.getAllReferences(RelationshipClass)
    let relationship;
    let modelPrimaryKey = model[Class.primaryKeyName];
    if (modelPrimaryKey) {
      referenceSetList.find((referenceSet) => {
        return Array.from(referenceSet).reverse().find((instance) => {
          if (instance[reverseRelationshipForeignKeyColumnName] === modelPrimaryKey) {
            relationship = instance;
            return true;
          }
        });
      });

      return relationship;
    }

    let modelReferences = InstanceDB.getReferences(model);

    referenceSetList.find((referenceSet) => {
      return Array.from(referenceSet).reverse().find((instance) => {
        if (modelReferences.has(reverseRelationshipCache.get(instance))) {
          relationship = instance;
          return true;
        }
      });
    });

    return relationship;
  }
}
  // let result = [] as Model[];
  //   let targetModels = InstanceDB.getAllReferences(TargetModel); // TODO: this is costly reduce it
  //   targetModels.forEach((instanceSet) => {
  //     instanceSet.forEach((instance) => {
  //       if (relationshipCache.get(instance) === source) {
  //         result.push(instance);
  //       }
  //     });

  // x a                y u
  // x a                y u
  // x a                y u
  // x a                y u
  // x a                y u
  // x a                y u

  //   });
