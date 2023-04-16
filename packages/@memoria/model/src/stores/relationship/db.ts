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
type AnotherModel = Model;
// type QueryObject = { [key: string]: any };

type RelationshipMap<Value> = Map<RelationshipTableKey, Value>;
// type PrimaryKey = string | number;

type JSObject = { [key: string]: any };

export default class RelationshipDB {
  // NOTE: these instance caches are kept for user changes on relationships that are done prior any CRUD.
  // Each needed because we cant reach otherwise relationships that are mutated & not saved or re-read without reload
  static instanceRecordsBelongsToCache: RelationshipMap<WeakMap<Model, null | Model>> = new Map();
  static instanceRecordsOneToOneCache: RelationshipMap<WeakMap<Model, null | Model>> = new Map();
  static instanceRecordsHasManyCache: RelationshipMap<WeakMap<Model, null | Model[]>> = new Map();
  static instanceRecordsManyToManyCache: RelationshipMap<WeakMap<Model, null | Model[]>> = new Map();
  static persistedRecordRelationshipsCache: RelationshipMap<Map<PrimaryKey, Model | Model[]>> = new Map(); // NOTE: maybe add null later // TODO: This is not cleared, make a clearing strategy

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

  static findPersistedRecordRelationshipsCache(Class: typeof Model, relationshipName: string) {
    return this.persistedRecordRelationshipsCache.get(`${Class.name}:${relationshipName}`);
  }

  static findPersistedRecordRelationshipsFor(model: Model, relationshipName: string) {
    let Class = model.constructor as typeof Model;

    return this.persistedRecordRelationshipsCache
      .get(`${Class.name}:${relationshipName}`)
      .get(model[Class.primaryKeyName]);
  }

  static setPersistentRelationshipCache(model: Model, relationshipName: string, relationship: Model | Model[]) {
    let Class = model.constructor as typeof Model;

    return this.findPersistedRecordRelationshipsCache(Class, relationshipName).set(
      model[Class.primaryKeyName],
      relationship
    );
  }

  // NOTE: in future relationshipChanges could be tracked and passed in here for optional optimization
  // NOTE: It updates the column values of existing references
  // TODO: old id references should be checked from input/outputRecord diff
  static cache(outputRecord: Model, _type: "insert" | "update", _input: Model | JSObject, cachedRecord?: Model) {
    // TODO: dont delete references related to the same model, only delete references related to the same model with different id
    let Class = outputRecord.constructor as typeof Model;
    cachedRecord = cachedRecord || Class.Cache.get(outputRecord[Class.primaryKeyName]);

    // NOTE: update columnNames of all existing outputRecord references
    let modelInstances = InstanceDB.getReferences(outputRecord);
    Array.from(modelInstances).forEach((modelInstance) => {
      if (outputRecord === modelInstance) {
        return;
      }

      Class.columnNames.forEach((columnName) => {
        if (modelInstance[columnName] !== outputRecord[columnName]) {
          modelInstance[columnName] = outputRecord[columnName];
        }
      });
    });

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
        outputRecord,
        reverseRelationships[relationshipClassName],
        modelInstances
      );
    });
    if (cachedRecord) {
      // NOTE: is this necessary?, try to remove it in future
      cachedRecord.fetchedRelationships.forEach((relationshipName: string) => {
        RelationshipDB.setPersistentRelationshipCache(outputRecord, relationshipName, outputRecord[relationshipName]);
        RelationshipDB.findRelationshipCacheFor(Class, relationshipName).delete(cachedRecord);
      });
    }

    // Array.from(modelInstances).forEach((modelInstance) => {
    //   modelInstance.fetchedRelationships.forEach((relationshipName: string) => {
    //     RelationshipDB.findRelationshipCacheFor(Class, relationshipName).delete(modelInstance);
    //   });
    // });

    // NOTE: update the cache on instances that has the cachedRecord primaryKey, make them all point to the new outputRecord
    // outputRecord.fetchedRelationships.forEach((relationshipName: string) => {
    //   RelationshipDB.findRelationshipCacheFor(Class, relationshipName).delete(outputRecord);
    // });

    return outputRecord;
  }

  // NOTE: this can be optimized for batching
  static updateRelationshipsGloballyFromARelationship(
    model: Model,
    reverseRelationshipMetadatas: ReverseRelationshipMetadata[],
    modelInstances: Set<Model>
  ) {
    let Class = model.constructor as typeof Model;
    let modelInstancesArray = Array.from(modelInstances);
    let referenceInstances = InstanceDB.getAllReferences(reverseRelationshipMetadatas[0].SourceClass) as Array<
      Set<Model>
    >;
    if (referenceInstances) {
      for (let referenceSet of referenceInstances) {
        referenceSet.forEach((reference) => {
          reverseRelationshipMetadatas.forEach((relationshipMetadata) => {
            if (
              modelInstancesArray.some((model) =>
                this.referenceIsRelatedTo(model, reference, modelInstances, relationshipMetadata)
              ) // NOTE: this looks up from the reverseSide what about the other side?
            ) {
              let { SourceClass, relationshipName, relationshipType, foreignKeyColumnName } = relationshipMetadata;
              debugger;
              // NOTE: relationshipType is always on the models class?
              if (ARRAY_ASKING_RELATIONSHIPS.has(relationshipType)) {
                let relationshipCache = this.findRelationshipCacheFor(SourceClass, relationshipName, relationshipType);
                let foundCache = relationshipCache.get(reference);
                if (foundCache) {
                  let references = InstanceDB.getReferences(model);
                  let targetIndex = foundCache.findIndex((model) => references.has(model));
                  if (targetIndex !== -1) {
                    foundCache[targetIndex] = model;
                  } else {
                    foundCache.push(model); // TODO: This should be index preserving
                  }
                }

                return foundCache;
              } else if (relationshipType === "BelongsTo") {
                debugger;
                reference[foreignKeyColumnName as string] = model[Class.primaryKeyName];
                // RelationshipDB.findRelationshipCacheFor(SourceClass, relationshipName).delete(reference);
              } else if (relationshipType === "OneToOne") {
                // let reverseMetadata = RelationshipSchema.getRelationshipMetadataFor(SourceClass, relationshipName);
                // debugger;
                // if (reverseMetadata && reverseMetadata.reverseRelationshipForeignKeyColumnName) {
                //   debugger;
                //   reference[reverseMetadata.reverseRelationshipForeignKeyColumnName as string] =
                //     model[Class.primaryKeyName];
                // }
                // RelationshipDB.findRelationshipCacheFor(SourceClass, relationshipName).delete(reference);
              }

              // TODO: this needs to be reflective?
              reference[relationshipName] = model;
              // debugger;
              // return this.findRelationshipCacheFor(SourceClass, relationshipName, relationshipType).set(
              //   reference,
              //   model
              // );
            }
          });
        });
      }
    }
  }

  static referenceIsRelatedTo(
    model: Model,
    reference: AnotherModel, // reference is different model type
    modelInstances: Set<Model>,
    reverseMetadata: ReverseRelationshipMetadata
  ): void | boolean {
    let Class = model.constructor as typeof Model;
    let { relationshipName, relationshipType, SourceClass, foreignKeyColumnName } = reverseMetadata;
    debugger;
    if (relationshipType === "BelongsTo" && reference[foreignKeyColumnName as string] === model[Class.primaryKeyName]) {
      return true;
    } else if (
      relationshipType === "OneToOne" &&
      model[foreignKeyColumnName as string] === reference[SourceClass.primaryKeyName]
    ) {
      return true;
    }

    let relationshipValue = this.findRelationshipFor(reference, relationshipName, relationshipType);
    if (Array.isArray(relationshipValue)) {
      return relationshipValue.some((anyModel) => modelInstances.has(anyModel));
    } else if (relationshipValue) {
      return modelInstances.has(relationshipValue);
    }
  }

  // NOTE: Deletes persisted to references, from references to instances, from instances to relationship changes
  // TODO: should this delete persistedRecordsRelationshipCache?
  // TODO: adjust the cache accordingly
  static delete(model: Model) {
    let Class = model.constructor as typeof Model;
    let modelInstances = InstanceDB.getReferences(model);
    let modelInstancesArray = Array.from(modelInstances);
    let reverseRelationships = RelationshipSchema.getReverseRelationshipsTable(Class);
    Object.keys(reverseRelationships).forEach((relationshipClassName) => {
      this.deleteRelationshipsGloballyFromARelationship(
        model,
        reverseRelationships[relationshipClassName],
        modelInstances
      );
    });

    let modelsRelationships = RelationshipSchema.getRelationshipTable(Class);
    Object.keys(modelsRelationships).forEach((relationshipName) => {
      let relationship = modelsRelationships[relationshipName];
      let relationshipCache = this.findRelationshipCacheFor(Class, relationshipName, relationship.relationshipType);

      modelInstancesArray.forEach((modelReference) => {
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
    modelInstancesArray.forEach((modelReference) => {
      clearObject(modelReference.changes);
    });

    InstanceDB.getReferences(model).clear();

    return model;
  }

  // TODO: this currently only removes belongsTo, not an element from HasMany array!
  static deleteRelationshipsGloballyFromARelationship(
    _model: Model,
    reverseRelationshipMetadatas: ReverseRelationshipMetadata[],
    modelInstances: Set<Model>
  ) {
    let modelInstancesArray = Array.from(modelInstances);
    let possibleReferences = InstanceDB.getAllReferences(reverseRelationshipMetadatas[0].SourceClass) as Array<
      Set<Model>
    >;
    if (possibleReferences) {
      for (let referenceSet of possibleReferences.values()) {
        referenceSet.forEach((reference) => {
          reverseRelationshipMetadatas.forEach((relationshipMetadata) => {
            if (
              modelInstancesArray.some((model) =>
                this.referenceIsRelatedTo(model, reference, modelInstances, relationshipMetadata)
              )
            ) {
              let { SourceClass, relationshipName, relationshipType } = relationshipMetadata;
              let relationshipCache = this.findRelationshipCacheFor(SourceClass, relationshipName, relationshipType);
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
    this.persistedRecordRelationshipsCache.clear();
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
  static set(model: Model, relationshipName: string, input: null | Model | Model[], _copySource?: Model) {
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
      if (
        targetRelationship &&
        reverseRelationshipName &&
        !ARRAY_ASKING_RELATIONSHIPS.has(metadata.relationshipType) &&
        !ARRAY_ASKING_RELATIONSHIPS.has(reverseRelationshipType as string)
      ) {
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
      if (reverseRelationshipType === "HasMany") {
        // TODO: move this whole block to RelationshipUtils.cleanAndSetRelationshipFor(?)
        relationshipCache.set(model, targetRelationship);

        model[metadata.foreignKeyColumnName as string] = targetRelationship
          ? targetRelationship[metadata.RelationshipClass.primaryKeyName]
          : null;

        // TODO: maybe do something here

        return;
      }

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

      relationshipCache.set(model, new HasManyArray(targetRelationship as Model[], model, metadata));

      return model;
    } else {
      if (Array.isArray(input) && !input.every((instance) => instance instanceof Model)) {
        throw new Error(`Tried to set a non model instance value to ${Class.name}.${relationshipName}!`);
      }

      relationshipCache.set(model, Array.isArray(input) ? input : null);
    }

    return model;
  }

  // NOTE: can you remove this(?)
  static getLastReliableRelationshipFromCache(model: Model, relationshipName: string, relationshipType: string) {
    let Class = model.constructor as typeof Model;
    let primaryKey = model[Class.primaryKeyName];
    if (!primaryKey) {
      return null;
    }

    // let relationshipCache = RelationshipDB.findRelationshipCacheFor(Class, relationshipName, relationshipType);
    // let cachedModel = Class.Cache.get(primaryKey);
    // let cachedModelRelationship = cachedModel && relationshipCache.get(cachedModel);
    let cachedModelRelationship = this.findPersistedRecordRelationshipsFor(model, relationshipName);
    if (cachedModelRelationship) {
      return cachedModelRelationship;
    }

    // let instanceRecords = Array.from(InstanceDB.getReferences(model)).reverse();
    // for (let instance of instanceRecords) {
    //   let instanceRelationship = instance.isPersisted && relationshipCache.get(instance);
    //   if (instanceRelationship) {
    //     return instanceRelationship;
    //   }
    // }
  }
}

function formatInput(input, model, metadata) {
  if (ARRAY_ASKING_RELATIONSHIPS.has(metadata.relationshipType)) {
    // return new HasManyArray(input, model, metadata);
    // TODO: change the owner but in a new instance
    return input instanceof HasManyArray ? input : new HasManyArray(input, model, metadata);
  }

  return input instanceof Model ? input : null;
}

function buildReferenceFromPersistedCacheOrMemoryOrFetch(
  model: Model,
  relationshipName: string,
  metadata?: RelationshipMetadata
) {
  let Class = model.constructor as typeof Model;
  let relationshipMetadata = metadata || RelationshipSchema.getRelationshipMetadataFor(Class, relationshipName);
  let { relationshipType, foreignKeyColumnName } = relationshipMetadata;

  if (relationshipType === "BelongsTo") {
    let foreignKeyValue = model[foreignKeyColumnName as string];
    if (!foreignKeyValue) {
      return null;
    }

    return (
      RelationshipQuery.findPossibleReferenceInMemory(model, relationshipMetadata) ||
      Class.Adapter.fetchRelationship(model, relationshipName, relationshipMetadata)
    );
  } else if (relationshipType === "OneToOne") {
    return (
      RelationshipQuery.findPossibleReferenceInMemory(model, relationshipMetadata) ||
      Class.Adapter.fetchRelationship(model, relationshipName, relationshipMetadata)
    );
  }

  return Class.Adapter.fetchRelationship(model, relationshipName, relationshipMetadata);
}
