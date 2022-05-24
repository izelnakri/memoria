// relationship tracking(very complex) - on build, set AND CRUD(is on crud needed(?))
// Caches refresh/mutate on CCUD: create, cache(fetch), update, delete
// NOTE: in future try to optimize instanceCache(s) with symbol references instead of full instances(?)[each symbol refer to a modelReference]
// NOTE: Two approaches found for updating reference caches on new cache, the 1st one chosen for now for simplicity:
// 1- Update similar instances on CRUD(multicore problematic), 2- DONT update similar instances on CRUD, only persistedRecordsBelongsToCache, and have timeStamp for each revision(?)
// NOTE: in-future maybe create special class/object for HasManyArray -> behaves like Set, has Array prototype methods(filter etc), .lastElement

// Types:
// instanceRecord
// generatedRecordFromPersistance

import Model from "../../model.js";
import RelationshipSchema, { ARRAY_ASKING_RELATIONSHIPS } from "./schema.js";
import RelationshipUtils from "./utils.js";
import { RelationshipPromise } from "../../promises/index.js";
import InstanceDB from "../instance/db.js";
import ArrayIterator from "../../utils/array-iterator.js";
import { clearObject } from "../../utils/index.js";
import type { RelationshipMetadata, ReverseRelationshipMetadata } from "./schema.js";
import type { PrimaryKey } from "../../types.js";

type RelationshipTableKey = string; // Example: "MemoryUser:comments"
type BelongsToPrimaryKey = PrimaryKey;
// type QueryObject = { [key: string]: any };

type RelationshipMap<Value> = Map<RelationshipTableKey, Value>;
type PrimaryKeyPointerMap = Map<PrimaryKey, null | BelongsToPrimaryKey> // NOTE: remove null here

// NOTE: will be refactored/cleaned up after full test suite
export default class RelationshipDB {
  static persistedRecordsBelongsToCache: RelationshipMap<PrimaryKeyPointerMap> = new Map();

  // NOTE: these instance caches are kept for user changes on relationships that are done prior any CRUD.
  // Each needed because we cant reach otherwise relationships that are mutated & not saved or re-read without reload
  static instanceRecordsBelongsToCache: RelationshipMap<WeakMap<Model, null | Model>> = new Map();
  static instanceRecordsOneToOneCache: RelationshipMap<WeakMap<Model, null | Model>> = new Map();
  static instanceRecordsHasManyCache: RelationshipMap<WeakMap<Model, null | Model[]>> = new Map();
  static instanceRecordsManyToManyCache: RelationshipMap<WeakMap<Model, null | Model[]>> = new Map();

  static findPersistedRecordsCacheFor(Class: typeof Model, relationshipName: string) {
    return this.persistedRecordsBelongsToCache.get(`${Class.name}:${relationshipName}`) as PrimaryKeyPointerMap;
  }

  // NOTE: very heavy hit needs to be fast
  static findRelationshipCacheFor(Class: typeof Model, relationshipName: string, relationshipType?: string) {
    return this[`instanceRecords${
      relationshipType ||
      RelationshipSchema.getRelationshipMetadataFor(Class, relationshipName).relationshipType
    }Cache`].get(`${Class.name}:${relationshipName}`);
  }

  static findRelationshipFor(model: Model, relationshipName: string, relationshipType?: string) {
    return this.findRelationshipCacheFor(model.constructor as typeof Model, relationshipName, relationshipType)
      .get(model);
  }

  // used deciding whether record should be fetched for BelongsTo, OneToOne
  // used for diffing on HasMany, BelongsTo & OneToOne(when done on CCUD and compare with newly obtained)
  static generateRelationshipFromPersistence(model: Model, relationshipName: string) { // Example: RelationshipDB.generateRelationshipFromPersistence(user, 'photos') #=> Photo[]
    let Class = model.constructor as typeof Model;
    let metadata = RelationshipSchema.getRelationshipMetadataFor(Class, relationshipName);
    let { RelationshipClass, relationshipType, reverseRelationshipForeignKeyColumnName } = metadata;
    if (relationshipType === "BelongsTo") {
      return (
        metadata.foreignKeyColumnName &&
        model[metadata.foreignKeyColumnName] &&
        RelationshipClass.peek(model[metadata.foreignKeyColumnName])
      )
    }

    let primaryKey = model[Class.primaryKeyName];
    if (!primaryKey) {
      return;
    } else if (relationshipType === "OneToOne") {
      return (
        reverseRelationshipForeignKeyColumnName &&
        RelationshipClass.peekBy({ [reverseRelationshipForeignKeyColumnName]: primaryKey })
      );
    } else if (relationshipType === "HasMany") {
      // NOTE: this could be problematic
      let results = ArrayIterator.filter(
        (this.persistedRecordsBelongsToCache.get(
          `${RelationshipClass.name}:${metadata.reverseRelationshipName}`
        ) as Map<PrimaryKey, null | BelongsToPrimaryKey>).entries(),
        ([_, targetModelPrimaryKey]) => targetModelPrimaryKey === primaryKey
      );

      return results.map((result) => RelationshipClass.peek(result[0]));
    }
  }

  // TODO: this should move related references to certain id cache
  // NOTE: in future relationshipChanges could be tracked and passed in here for optional optimization
  static cache(model: Model, _type: "insert" | "update") {
    // TODO: this should try to add to References if it doesnt exist(delete removes even the built ones from cache)
    let Class = model.constructor as typeof Model;
    let primaryKey = model[Class.primaryKeyName];
    let belongsToRelationshipTable = RelationshipSchema.getRelationshipTable(Class, "BelongsTo"); // NOTE: could be costly atm

    Object.keys(belongsToRelationshipTable).forEach((relationshipName) => {
      this.findPersistedRecordsCacheFor(Class, relationshipName).set(
        primaryKey,
        model[belongsToRelationshipTable[relationshipName].foreignKeyColumnName as string]
      );
    });

    let existingReferences = Array.from(InstanceDB.getReferences(model));
    let foundReference = existingReferences.reduce((foundReference, modelReference) => {
      if (model === modelReference) {
        return modelReference;
      }

      Class.columnNames.forEach((columnName) => {
        if (modelReference[columnName] !== model[columnName]) {
          modelReference[columnName] = model[columnName]; // NOTE: maybe I need to make them not tracked for revision!
        }
      });

      return foundReference;
    }, undefined);
    if (!foundReference) {
      InstanceDB.getReferences(model).add(model);
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
        model,
        reverseRelationships[relationshipClassName],
        existingReferences
      );
    });

    return model;
  }

  // NOTE: this can be optimized for batching
  static updateRelationshipsGloballyFromARelationship(
    targetModel: Model,
    reverseRelationshipMetadatas: ReverseRelationshipMetadata[],
    targetModelInstances: Model[]
  ) {
    let TargetModelClass = targetModel.constructor as typeof Model;
    let possibleReferences = InstanceDB.getAllReferences(reverseRelationshipMetadatas[0].TargetClass) as Array<Set<Model>>; // NOTE: RelationshipClass
    if (possibleReferences) {
      for (let referenceSet of possibleReferences) {
        referenceSet.forEach((reference) => {
          reverseRelationshipMetadatas.forEach((relationshipMetadata) => {
            if (
              targetModelInstances.some((model) => this.referenceIsRelatedTo(model, reference, relationshipMetadata))
              // TODO: filtering needs to be better(?)
            ) {
              let {
                TargetClass,
                relationshipName,
                foreignKeyColumnName,
                relationshipType,
                // reverseRelationshipName,
                // reverseRelationshipType
              } = relationshipMetadata;
              if (['ManyToMany', 'HasMany'].includes(relationshipType)) {
                // TODO: implement in the future: if instance array exists in the cache(for HasMany or ManyToMany) then change the specific element in the array
                return;
              }
              // let existingRelationshipValue = this.findRelationshipCacheFor(TargetModelClass, reverseRelationshipName as string, reverseRelationshipType as string)
              //   .get(targetModel);

              // there is source and model(model is end result), source isnt
              if (relationshipType === "BelongsTo") {
                reference[foreignKeyColumnName as string] = targetModel[TargetModelClass.primaryKeyName];
              }

              // TODO: this updates all to targetModel, is that correct(?)
              this.findRelationshipCacheFor(TargetClass, relationshipName, relationshipType)
                .set(reference, targetModel);
            }
          });
        });
      }
    }
  }

  static referenceIsRelatedTo(
    targetModel: Model,
    reference: Model, // reference is different model type
    {
      relationshipName,
      relationshipType,
    }: ReverseRelationshipMetadata
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
        if (relationship.relationshipType === 'BelongsTo') {
          modelReference[relationship.foreignKeyColumnName as string] = null;
          this.findPersistedRecordsCacheFor(Class, relationshipName).delete(model[Class.primaryKeyName]);
        }

        relationshipCache.set(modelReference, null);
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
    let possibleReferences = InstanceDB.getAllReferences(reverseRelationshipMetadatas[0].TargetClass) as Array<Set<Model>>;
    if (possibleReferences) {
      for (let referenceSet of possibleReferences.values()) {
        referenceSet.forEach((reference) => {
          reverseRelationshipMetadatas.forEach((relationshipMetadata) => {
            if (targetModelInstances.some((model) => this.referenceIsRelatedTo(model, reference, relationshipMetadata))) {
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

    this.persistedRecordsBelongsToCache.clear();
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
    let { relationshipType } =
      metadata || RelationshipSchema.getRelationshipMetadataFor(Class, relationshipName);

    return RelationshipDB[`instanceRecords${relationshipType}Cache`]
      .get(`${Class.name}:${relationshipName}`)
      ?.has(model);
  }

  static get(model: Model, relationshipName: string, asyncLookup = true) {
    let Class = model.constructor as typeof Model;
    let metadata = RelationshipSchema.getRelationshipMetadataFor(Class, relationshipName);
    if (metadata.relationshipType === 'ManyToMany' || metadata.relationshipType === 'HasMany') {
      return null; // TODO: CHANGE THIS
    }

    let cache = this.findRelationshipCacheFor(Class, relationshipName, metadata.relationshipType);
    if (cache.has(model)) {
      return cache.get(model);
    } else if (!asyncLookup) {
      return null;
    }

    let reference = buildReferenceFromPersistedCacheOrFetch(model, relationshipName, metadata); // NOTE: optimize this
    if (reference instanceof Promise) {
      return new RelationshipPromise(async (resolve, reject) => {
        let reference = buildReferenceFromPersistedCacheOrFetch(model, relationshipName, metadata); // NOTE: necessary for .reload() otherwise references finalized promise
        try {
          let relationship = await reference;
          cache.set(model, relationship);

          resolve(relationship);
        } catch (error) {
          reject(error);
        }
      });
    } else {
      // NOTE: Removing this is currently tricky but this could be a nice lazy optimization:
      // maybe check has here
      cache.set(model, reference);

      return reference;
    }
  }

  // TODO: should remove existing reference on only the same instance(!) and if we are doing runtime set(!) model.rel = someRel
  // NOTE: it should never remove its own existing copies(same primaryKey, also when primaryKey null gets built)
  // NOTE: it should remove in batches connections(as more instances of certain model exists)

  // TODO: REFACTOR THIS
  static set(model: Model, relationshipName: string, input: null | Model, _copySource?: Model) {
    let Class = model.constructor as typeof Model;
    let metadata = RelationshipSchema.getRelationshipMetadataFor(Class, relationshipName);
    let { RelationshipClass, reverseRelationshipName, reverseRelationshipType } = metadata;
    let relationshipCache = this.findRelationshipCacheFor(Class, relationshipName, metadata.relationshipType);
    let existingRelationship = relationshipCache.get(model);

    if (input === undefined) {
      relationshipCache.delete(model); // TODO: add reflection cleanup to existing relationship if exists

      if (existingRelationship && reverseRelationshipName) {
        let reverseRelationshipCache = RelationshipDB.findRelationshipCacheFor(RelationshipClass, reverseRelationshipName, reverseRelationshipType as string);

        RelationshipUtils.cleanRelationshipsOn(existingRelationship, model, metadata, relationshipCache, reverseRelationshipCache);
      }

      return model;
    }

    // let previousRelationship = cache.get(model);
    // let previousRelationship = model[relationshipName];
    // TODO: for reflexive clear previous reference(2 sides), add cache, add new reference
    let targetRelationship = formatInput(input, metadata.relationshipType);
    if (existingRelationship === targetRelationship) { // null === null
      if (targetRelationship && reverseRelationshipName) {
        let reverseRelationshipCache = RelationshipDB.findRelationshipCacheFor(RelationshipClass, reverseRelationshipName, reverseRelationshipType as string);

        RelationshipUtils.setReflectiveSideRelationship(targetRelationship as Model, model, metadata, reverseRelationshipCache);
      }

      return model;
    } else if (metadata.relationshipType === "BelongsTo") {
      return RelationshipUtils.cleanAndSetBelongsToRelationshipFor(model, targetRelationship, metadata, relationshipCache);
    } else if (metadata.relationshipType === "OneToOne") {
      return RelationshipUtils.cleanAndSetOneToOneRelationshipFor(model, targetRelationship, metadata, relationshipCache);
    } else {
      if (Array.isArray(input) && !input.every((instance) => instance instanceof Model)) {
        throw new Error(
          `Tried to set a non model instance value to ${Class.name}.${relationshipName}!`
        );
      }

      relationshipCache.set(model, Array.isArray(input) ? input : null);
    }

    return model;
  }
}

function formatInput(input, relationshipType) {
  if (ARRAY_ASKING_RELATIONSHIPS.includes(relationshipType)) {
    return Array.isArray(input) ? input : null;
  }

  return input instanceof Model ? input : null;
}

function buildReferenceFromPersistedCacheOrFetch(
  model: Model,
  relationshipName: string,
  metadata?: RelationshipMetadata
) {
  let foundValue;
  let Class = model.constructor as typeof Model;
  let relationshipMetadata =
    metadata || RelationshipSchema.getRelationshipMetadataFor(Class, relationshipName);
  let { relationshipType, foreignKeyColumnName } = relationshipMetadata;
  if (relationshipType === "BelongsTo") {
    let foreignKeyValue = model[foreignKeyColumnName as string];
    if (!foreignKeyValue) {
      return null;
    }

    foundValue = RelationshipDB.generateRelationshipFromPersistence(model, relationshipName);
  } else if (relationshipType === "OneToOne") {
    foundValue = RelationshipDB.generateRelationshipFromPersistence(model, relationshipName);
    if (foundValue || foundValue === null) {
      return foundValue;
    }

    foundValue = computeFromPreviousReference(model, relationshipName);
  } else if (relationshipType === "HasMany" || relationshipType === "ManyToMany") {
    return Class.Adapter.fetchRelationship(model, relationshipName, relationshipMetadata);
  }

  if (foundValue || foundValue === null) {
    return foundValue;
  }

  return Class.Adapter.fetchRelationship(model, relationshipName, relationshipMetadata);
}

function computeFromPreviousReference(model, relationshipName) {
  let references = Array.from(InstanceDB.getReferences(model));
  // let targetReference = model.revisionHistory[model.revisionHistory.length - 1];
  let targetReference = references.reverse().find((reference) => reference !== model && !reference.isDirty);

  return targetReference && RelationshipDB.findRelationshipFor(targetReference, relationshipName, "OneToOne");
}
