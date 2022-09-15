// NOTE: in future try to optimize instanceCache(s) with symbol references instead of full instances(?)[each symbol refer to a modelReference]
// NOTE: Two approaches found for updating reference caches on new cache, the 1st one chosen for now for simplicity:
// 1- Update similar instances on CRUD(multicore problematic), 2- DONT update similar instances on CRUD, only persistedRecordsBelongsToCache, and have timeStamp for each revision(?)
// NOTE: in-future maybe create special class/object for HasManyArray -> behaves like Set, has Array prototype methods(filter etc), .lastElement

import Model from "../../model.js";
import RelationshipSchema, { ARRAY_ASKING_RELATIONSHIPS } from "./schema.js";
import RelationshipUtils from "./utils.js";
import RelationshipQuery from "./query.js";
import { RelationshipPromise } from "../../promises/index.js";
import InstanceDB from "../instance/db.js";
import { clearObject } from "../../utils/index.js";
import type { RelationshipMetadata, ReverseRelationshipMetadata } from "./schema.js";
import HasManyArray from "../../has-many-array.js";

type RelationshipTableKey = string; // Example: "MemoryUser:comments"
// type QueryObject = { [key: string]: any };

type RelationshipMap<Value> = Map<RelationshipTableKey, Value>;

type JSObject = { [key: string]: any };

export default class RelationshipDB {
  // NOTE: these instance caches are kept for user changes on relationships that are done prior any CRUD.
  // Each needed because we cant reach otherwise relationships that are mutated & not saved or re-read without reload
  static instanceRecordsBelongsToCache: RelationshipMap<WeakMap<Model, null | Model>> = new Map();
  static instanceRecordsOneToOneCache: RelationshipMap<WeakMap<Model, null | Model>> = new Map();
  static instanceRecordsHasManyCache: RelationshipMap<WeakMap<Model, null | Model[]>> = new Map();
  static instanceRecordsManyToManyCache: RelationshipMap<WeakMap<Model, null | Model[]>> = new Map();

  static findRelationshipCacheFor(Class: typeof Model, relationshipName: string, relationshipType?: string) {
    return this[
      `instanceRecords${
        relationshipType || RelationshipSchema.getRelationshipMetadataFor(Class, relationshipName).relationshipType
      }Cache`
    ].get(`${Class.name}:${relationshipName}`);
  }

  static findRelationshipFor(model: Model, relationshipName: string, relationshipType?: string) {
    return this.findRelationshipCacheFor(model.constructor as typeof Model, relationshipName, relationshipType).get(
      model
    );
  }

  // NOTE: used deciding whether record should be fetched for BelongsTo, OneToOne
  // NOTE: could be used for diffing on HasMany, BelongsTo & OneToOne(when done on CCUD and compare with newly obtained)
  static generateRelationshipFromPersistence(
    model: Model,
    relationshipName: string,
    relationshipMetadata?: RelationshipMetadata
  ) {
    let Class = model.constructor as typeof Model;
    let metadata = relationshipMetadata || RelationshipSchema.getRelationshipMetadataFor(Class, relationshipName);
    let { RelationshipClass, relationshipType, reverseRelationshipForeignKeyColumnName } = metadata;
    if (relationshipType === "BelongsTo") {
      return (
        metadata.foreignKeyColumnName &&
        model[metadata.foreignKeyColumnName] &&
        associate(RelationshipClass.peek(model[metadata.foreignKeyColumnName]) as Model | void, model, relationshipName)
      );
    }

    let primaryKey = model[Class.primaryKeyName];
    if (!primaryKey) {
      return null;
    } else if (relationshipType === "OneToOne") {
      return (
        primaryKey &&
        reverseRelationshipForeignKeyColumnName &&
        associate(
          RelationshipClass.peekBy({ [reverseRelationshipForeignKeyColumnName]: primaryKey }),
          model,
          relationshipName
        )
      );
    } else if (relationshipType === "HasMany") {
      //   // NOTE: this could be problematic
      //   let results = ArrayIterator.filter(
      //     (
      //       this.persistedRecordsBelongsToCache.get(
      //         `${RelationshipClass.name}:${metadata.reverseRelationshipName}`
      //       ) as Map<PrimaryKey, null | BelongsToPrimaryKey>
      //     ).entries(),
      //     ([_, targetModelPrimaryKey]) => targetModelPrimaryKey === primaryKey
      //   );

      //   return results.map((result) => RelationshipClass.peek(result[0]));
      return;
    }
  }

  // NOTE: in future relationshipChanges could be tracked and passed in here for optional optimization
  static cache(result: Model, _type: "insert" | "update", input?: Model | JSObject) {
    let Class = result.constructor as typeof Model;

    Object.keys(RelationshipSchema.getRelationshipTable(Class, "OneToOne")).forEach((relationshipName) => {
      let relationshipCache = this.findRelationshipCacheFor(Class, relationshipName, "OneToOne");

      relationshipCache.get(result) === null && relationshipCache.delete(result);
      input instanceof Class && relationshipCache.get(input) === null && relationshipCache.delete(input);
    });

    let existingReferences = Array.from(InstanceDB.getReferences(result));
    let foundReference = existingReferences.reduce((foundReference, resultReference) => {
      if (result === resultReference) {
        return resultReference;
      }

      Class.columnNames.forEach((columnName) => {
        if (resultReference[columnName] !== result[columnName]) {
          resultReference[columnName] = result[columnName];
        }
      });

      return foundReference;
    }, undefined);
    if (!foundReference) {
      InstanceDB.getReferences(result).add(result);
    }

    // NOTE: walks down and mutates the graph based on received primary key or foreign key updates from server. Really needed.
    // NOTE: this changes all possible relationships where model could be the value relationship!
    // Example: when photo inserted or update (belongsTo gets updated)
    // User:photos should get updated
    // Post:photo should get update
    // photo references get updated
    // Reflexive BelongsTo reference gets updated!!
    let reverseRelationships = RelationshipSchema.getReverseRelationshipsTable(Class);
    Object.keys(reverseRelationships).forEach((relationshipClassName) => {
      this.updateRelationshipsGloballyFromARelationship(
        result,
        reverseRelationships[relationshipClassName],
        existingReferences
      );
    });

    return result;
  }

  // NOTE: this can be optimized for batching
  static updateRelationshipsGloballyFromARelationship(
    targetModel: Model,
    reverseRelationshipMetadatas: ReverseRelationshipMetadata[],
    targetModelInstances: Model[]
  ) {
    let TargetModelClass = targetModel.constructor as typeof Model;
    let possibleReferences = InstanceDB.getAllReferences(reverseRelationshipMetadatas[0].TargetClass) as Array<
      Set<Model>
    >; // NOTE: RelationshipClass
    if (possibleReferences) {
      for (let referenceSet of possibleReferences) {
        referenceSet.forEach((reference) => {
          reverseRelationshipMetadatas.forEach((relationshipMetadata) => {
            if (
              targetModelInstances.some((model) => this.referenceIsRelatedTo(model, reference, relationshipMetadata))
            ) {
              let { TargetClass, relationshipName, relationshipType, foreignKeyColumnName } = relationshipMetadata;
              if (["ManyToMany", "HasMany"].includes(relationshipType)) {
                // TODO: implement in the future: if instance array exists in the cache(for HasMany or ManyToMany) then change the specific element in the array
                return;
              } else if (relationshipType === "BelongsTo") {
                reference[foreignKeyColumnName as string] = targetModel[TargetModelClass.primaryKeyName];
              }

              this.findRelationshipCacheFor(TargetClass, relationshipName, relationshipType).set(
                reference,
                targetModel
              );
            }
          });
        });
      }
    }
  }

  static referenceIsRelatedTo(
    targetModel: Model,
    reference: Model, // reference is different model type
    { relationshipName, relationshipType }: ReverseRelationshipMetadata
  ): void | boolean {
    return this.findRelationshipFor(reference, relationshipName, relationshipType) === targetModel;
    // if (Array.isArray(relationshipValue)) {
    //   return (relationshipValue as Model[]).some((relationshipModel) => relationshipModel === targetModel);
    // }
  }

  // NOTE: Deletes persisted to references, from references to instances, from instances to relationship changes
  static delete(model: Model) {
    let Class = model.constructor as typeof Model;
    let existingReferences = Array.from(InstanceDB.getReferences(model));
    let reverseRelationships = RelationshipSchema.getReverseRelationshipsTable(Class);
    Object.keys(reverseRelationships).forEach((relationshipClassName) => {
      this.deleteRelationshipsGloballyFromARelationship(
        model,
        reverseRelationships[relationshipClassName],
        existingReferences
      );
    });

    let modelsRelationships = RelationshipSchema.getRelationshipTable(Class);
    Object.keys(modelsRelationships).forEach((relationshipName) => {
      let relationship = modelsRelationships[relationshipName];
      let relationshipCache = this.findRelationshipCacheFor(Class, relationshipName, relationship.relationshipType);

      existingReferences.forEach((modelReference) => {
        // TODO: instead reverseRelationships should be removed

        if (relationship.relationshipType === "BelongsTo") {
          modelReference[relationship.foreignKeyColumnName as string] = null;
          relationshipCache.set(modelReference, null); // TODO: do this only for reverse references, break the effect and
        } else if (relationship.relationshipType === "OneToOne") {
          relationshipCache.set(modelReference, null);
        } else if (relationship.relationshipType === "HasMany") {
          let relationshipValue = relationshipCache.get(modelReference);
          if (relationshipValue instanceof HasManyArray) {
            relationshipValue.clear();
          }
          // let relationshipValue = relationshipCache.get(modelReference);
          // if (Array.isArray(relationshipValue)) {
          //   let index = (relationshipValue as Model[]).indexOf(model);
          //   if (index !== -1) {
          //     (relationshipValue as Model[]).splice(index, 1);
          //   }
          // }
        } else if (relationship.relationshipType === "ManyToMany") {
          let relationshipValue = relationshipCache.get(modelReference);
          if (Array.isArray(relationshipValue)) {
            let index = (relationshipValue as Model[]).indexOf(model);
            if (index !== -1) {
              (relationshipValue as Model[]).splice(index, 1);
            }
          }
        }
      });
    });
    existingReferences.forEach((modelReference) => {
      clearObject(modelReference.changes);
    });

    InstanceDB.getReferences(model).clear();

    return model;
  }

  // TODO: this currently only removes belongsTo, not an element from HasMany array!
  static deleteRelationshipsGloballyFromARelationship(
    _targetModel: Model,
    reverseRelationshipMetadatas: ReverseRelationshipMetadata[],
    targetModelInstances: Model[]
  ) {
    let possibleReferences = InstanceDB.getAllReferences(reverseRelationshipMetadatas[0].TargetClass) as Array<
      Set<Model>
    >;
    if (possibleReferences) {
      for (let referenceSet of possibleReferences.values()) {
        referenceSet.forEach((reference) => {
          reverseRelationshipMetadatas.forEach((relationshipMetadata) => {
            if (
              targetModelInstances.some((model) => this.referenceIsRelatedTo(model, reference, relationshipMetadata))
            ) {
              let { TargetClass, relationshipName, relationshipType } = relationshipMetadata;
              let relationshipCache = this.findRelationshipCacheFor(TargetClass, relationshipName, relationshipType);
              if (relationshipCache.get(reference)) {
                reference[relationshipName] = null;
              }
            }
          });
        });
      }
    }
  }

  static clear(Class?: typeof Model) {
    if (Class) {
      throw new Error("RelationshipSchema.clear() by specific model not yet implemented");
    }

    this.clearInstanceRelationships();
    InstanceDB.knownInstances.clear();
    InstanceDB.unknownInstances.clear();

    return [];
  }

  static clearInstanceRelationships() {
    this.instanceRecordsBelongsToCache.clear();
    this.instanceRecordsOneToOneCache.clear();
    this.instanceRecordsHasManyCache.clear();
  }

  static has(model: Model, relationshipName: string, metadata?: RelationshipMetadata) {
    let Class = model.constructor as typeof Model;
    let { relationshipType } = metadata || RelationshipSchema.getRelationshipMetadataFor(Class, relationshipName);

    return RelationshipDB[`instanceRecords${relationshipType}Cache`]
      .get(`${Class.name}:${relationshipName}`)
      ?.has(model);
  }

  static get(model: Model, relationshipName: string, asyncLookup = true) {
    let Class = model.constructor as typeof Model;
    let metadata = RelationshipSchema.getRelationshipMetadataFor(Class, relationshipName);
    if (metadata.relationshipType === "ManyToMany") {
      return null; // TODO: CHANGE THIS when test suite is ready for ManyToMany
    }

    let cache = this.findRelationshipCacheFor(Class, relationshipName, metadata.relationshipType);
    if (cache.has(model)) {
      return cache.get(model);
    } else if (!asyncLookup) {
      return null;
    }

    let reference = buildReferenceFromPersistedCacheOrMemoryOrFetch(model, relationshipName, metadata); // NOTE: optimize this
    if (reference instanceof Promise) {
      return new RelationshipPromise(async (resolve, reject) => {
        let reference = buildReferenceFromPersistedCacheOrMemoryOrFetch(model, relationshipName, metadata); // NOTE: necessary for .reload() otherwise references finalized promise
        try {
          let relationship = await reference;
          if (ARRAY_ASKING_RELATIONSHIPS.has(metadata.relationshipType)) {
            let array = new HasManyArray(relationship, model, metadata);

            cache.set(model, array);

            return resolve(array);
          } else if (relationship) {
            cache.set(model, relationship);
          }

          resolve(relationship);
        } catch (error) {
          reject(error);
        }
      });
    } else if (reference) {
      // NOTE: persisted cache should not be able to build for list relationships, remove this line below:
      if (ARRAY_ASKING_RELATIONSHIPS.has(metadata.relationshipType)) {
        let array = new HasManyArray(reference, model, metadata);

        cache.set(model, array);

        return array;
      }

      cache.set(model, reference);
    }

    return reference;
  }

  // TODO: make this work for hasMany and its array replacement
  // NOTE: it should never remove its own existing copies(same primaryKey, also when primaryKey null gets built)
  // NOTE: it should remove in batches connections(as more instances of certain model exists)
  static set(model: Model, relationshipName: string, input: null | Model, _copySource?: Model) {
    let Class = model.constructor as typeof Model;
    let metadata = RelationshipSchema.getRelationshipMetadataFor(Class, relationshipName);
    let { RelationshipClass, reverseRelationshipName, reverseRelationshipType } = metadata;
    let relationshipCache = this.findRelationshipCacheFor(Class, relationshipName, metadata.relationshipType);
    let existingRelationship = relationshipCache.get(model);

    if (input === undefined) {
      relationshipCache.delete(model);

      if (ARRAY_ASKING_RELATIONSHIPS.has(metadata.relationshipType)) {
        existingRelationship.clear();
      } else if (existingRelationship && reverseRelationshipName) {
        let reverseRelationshipCache = RelationshipDB.findRelationshipCacheFor(
          RelationshipClass,
          reverseRelationshipName,
          reverseRelationshipType as string
        );

        RelationshipUtils.cleanRelationshipsOn(
          existingRelationship,
          model,
          metadata,
          relationshipCache,
          reverseRelationshipCache
        );
      }

      return model;
    }

    let targetRelationship = formatInput(input, model, metadata);
    if (existingRelationship === targetRelationship) {
      // NOTE: This sets the reflection to the recent one due to assignment
      if (targetRelationship && reverseRelationshipName && !ARRAY_ASKING_RELATIONSHIPS.has(metadata.relationshipType)) {
        let reverseRelationshipCache = RelationshipDB.findRelationshipCacheFor(
          RelationshipClass,
          reverseRelationshipName,
          reverseRelationshipType as string
        );

        RelationshipUtils.setReflectiveSideRelationship(
          targetRelationship as Model,
          model,
          metadata,
          reverseRelationshipCache
        );
      }

      return model;
    } else if (metadata.relationshipType === "BelongsTo") {
      return RelationshipUtils.cleanAndSetBelongsToRelationshipFor(
        model,
        targetRelationship,
        metadata,
        relationshipCache
      );
    } else if (metadata.relationshipType === "OneToOne") {
      return RelationshipUtils.cleanAndSetOneToOneRelationshipFor(
        model,
        targetRelationship,
        metadata,
        relationshipCache
      );
    } else if (metadata.relationshipType === "HasMany") {
      if (existingRelationship) {
        existingRelationship.clear();
      }

      relationshipCache.set(model, targetRelationship);

      return model;
    } else {
      if (Array.isArray(input) && !input.every((instance) => instance instanceof Model)) {
        throw new Error(`Tried to set a non model instance value to ${Class.name}.${relationshipName}!`);
      }

      relationshipCache.set(model, Array.isArray(input) ? input : null);
    }

    return model;
  }
}

function formatInput(input, model, metadata) {
  if (ARRAY_ASKING_RELATIONSHIPS.has(metadata.relationshipType)) {
    return input instanceof HasManyArray ? input : new HasManyArray(input, model, metadata);
  }

  return input instanceof Model ? input : null;
}

function buildReferenceFromPersistedCacheOrMemoryOrFetch(
  model: Model,
  relationshipName: string,
  metadata?: RelationshipMetadata
) {
  let foundValue;
  let Class = model.constructor as typeof Model;
  let relationshipMetadata = metadata || RelationshipSchema.getRelationshipMetadataFor(Class, relationshipName);
  let { relationshipType, foreignKeyColumnName } = relationshipMetadata;
  if (relationshipType === "BelongsTo") {
    let foreignKeyValue = model[foreignKeyColumnName as string];
    if (!foreignKeyValue) {
      return null;
    }

    foundValue =
      RelationshipDB.generateRelationshipFromPersistence(model, relationshipName) ||
      RelationshipQuery.findPossibleReferenceInMemory(model, relationshipName, relationshipMetadata);

    return foundValue ? foundValue : Class.Adapter.fetchRelationship(model, relationshipName, relationshipMetadata);
  } else if (relationshipType === "OneToOne") {
    foundValue = RelationshipDB.generateRelationshipFromPersistence(model, relationshipName);
    if (foundValue || foundValue === null) {
      return foundValue;
    }

    foundValue = RelationshipQuery.findPossibleReferenceInMemory(model, relationshipName, relationshipMetadata);
    return foundValue ? foundValue : Class.Adapter.fetchRelationship(model, relationshipName, relationshipMetadata);
  } else if (relationshipType === "HasMany" || relationshipType === "ManyToMany") {
    // return Class.Adapter.fetchRelationship(model, relationshipName, relationshipMetadata);
  }

  return Class.Adapter.fetchRelationship(model, relationshipName, relationshipMetadata);
}

function associate(targetModel: Model | void, model: Model, relationshipName: string) {
  if (targetModel) {
    model[relationshipName] = targetModel;

    return targetModel;
  }
}
