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
import type { RelationshipMetadata, RelationshipType, ReverseRelationshipMetadata } from "./schema.js";
import type { PrimaryKey } from "../../types.js";

type RelationshipTableKey = string; // Example: "MemoryUser:comments"
// type ModelName = string;
type BelongsToPrimaryKey = PrimaryKey;
// type QueryObject = { [key: string]: any };

// NOTE: will be refactored/cleaned up after full test suite
export default class RelationshipDB {
  static persistedRecordsBelongsToCache: Map<
    RelationshipTableKey,
    Map<PrimaryKey, null | BelongsToPrimaryKey>
  > = new Map(); // NOTE: remove null here

  // NOTE: these instance caches are kept for user changes on relationships that are done prior any CRUD:
  static instanceRecordsBelongsToCache: Map<
    RelationshipTableKey,
    WeakMap<Model, null | Model>
  > = new Map();

  // NOTE: OneToOne still needed because we cant reach otherwise relationships that are mutated and not saved or re-read without reload
  static instanceRecordsOneToOneCache: Map<
    RelationshipTableKey,
    WeakMap<Model, null | Model>
  > = new Map();

  static instanceRecordsHasManyCache: Map<
    RelationshipTableKey,
    WeakMap<Model, null | Model[]>
  > = new Map();

  static instanceRecordsManyToManyCache: Map<
    RelationshipTableKey,
    WeakMap<Model, null | Model[]>
  > = new Map();

  static getPersistedRecordsCacheForTableKey(relationshipTableKey: string) {
    if (!this.persistedRecordsBelongsToCache.has(relationshipTableKey)) {
      this.persistedRecordsBelongsToCache.set(relationshipTableKey, new Map());
    }

    return this.persistedRecordsBelongsToCache.get(relationshipTableKey) as Map<
      PrimaryKey,
      null | BelongsToPrimaryKey
    >;
  }

  static findPersistedRecordsCacheFor(Class: typeof Model, relationshipName: string) {
    return this.getPersistedRecordsCacheForTableKey(`${Class.name}:${relationshipName}`);
  }

  static getInstanceRecordsCacheForTableKey(
    relationshipType: string,
    relationshipTableKey: string
  ) {
    let relationshipCache = this[`instanceRecords${relationshipType}Cache`];
    if (relationshipCache) {
      if (!relationshipCache.has(relationshipTableKey)) {
        relationshipCache.set(relationshipTableKey, new WeakMap());
      }

      return relationshipCache.get(relationshipTableKey);
    }
  }

  static findRelationshipCacheFor(Class: typeof Model, relationshipName: string, relationshipType?: string) {
    return this.getInstanceRecordsCacheForTableKey(
      relationshipType ||
      RelationshipSchema.getRelationshipMetadataFor(Class, relationshipName).relationshipType,
      `${Class.name}:${relationshipName}`
    );
  }

  static findRelationshipFor(model: Model, relationshipName: string, relationshipType?: string) {
    let Class = model.constructor as typeof Model;

    this.findRelationshipCacheFor(Class, relationshipName, relationshipType).get(model);
  }

  // used deciding whether record should be fetched for BelongsTo, OneToOne
  // used for diffing on HasMany, BelongsTo & OneToOne(when done on CCUD and compare with newly obtained)
  static generateRelationshipFromPersistence(model: Model, relationshipName: string) { // Example: RelationshipDB.generateRelationshipFromPersistence(user, 'photos') #=> Photo[]
    let Class = model.constructor as typeof Model;
    let primaryKey = model[Class.primaryKeyName];
    if (!primaryKey) {
      return;
    }

    let {
      RelationshipClass,
      relationshipType,
      foreignKeyColumnName,
      reverseRelationshipName,
      reverseRelationshipForeignKeyColumnName,
    } = RelationshipSchema.getRelationshipMetadataFor(Class, relationshipName);
    if (relationshipType === "BelongsTo") {
      return (
        foreignKeyColumnName &&
        model[foreignKeyColumnName] &&
        RelationshipClass.peek(model[foreignKeyColumnName])
      );
    } else if (relationshipType === "OneToOne") {
      return (
        reverseRelationshipForeignKeyColumnName &&
        RelationshipClass.peekBy({ [reverseRelationshipForeignKeyColumnName]: primaryKey })
      );
    } else if (relationshipType === "HasMany") {
      let results = ArrayIterator.filter(
        (this.persistedRecordsBelongsToCache.get(
          `${RelationshipClass.name}:${reverseRelationshipName}`
        ) as Map<PrimaryKey, null | BelongsToPrimaryKey>).entries(),
        ([_, targetModelPrimaryKey]) => targetModelPrimaryKey === primaryKey
      );

      return results.map((result) => RelationshipClass.peek(result[0]));
    }
  }

  // TODO: this should move related references to certain id.
  // NOTE: in future relationshipChanges could be tracked and passed in here for optional optimization
  static cache(model: Model) {
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

    let existingReferences = InstanceDB.getReferences(model);
    let foundReference = ArrayIterator.reduce(existingReferences, (foundReference, modelReference) => {
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
      existingReferences.add(model);
    }

    // NOTE: this changes all possible relationships where model could be the value relationship!
    // Example: when photo inserted or update (belongsTo gets updated)
    // User:photos should get updated
    // Post:photo should get update
    // photo references get updated
    // Reflexive BelongsTo reference gets updated!!

    // NOTE: walks down and mutates the graph based on received primary key or foreign key updates from server.(Is it really needed?)
    let reverseRelationships = RelationshipSchema.getReverseRelationshipsTable(Class);
    Object.keys(reverseRelationships).forEach((relationshipClassName) => {
      this.updateRelationshipsGloballyFromARelationship(
        model,
        reverseRelationships[relationshipClassName]
      );
    });

    return model;
  }

  static updateRelationshipsGloballyFromARelationship(
    targetModel: Model,
    reverseRelationshipMetadatas: ReverseRelationshipMetadata[]
  ) {
    let targetModels = Array.from(InstanceDB.getReferences(targetModel));
    let possibleReferences = InstanceDB.getAllReferences(reverseRelationshipMetadatas[0].TargetClass) as Array<Set<Model>>; // NOTE: RelationshipClass
    if (possibleReferences) {
      for (let referenceSet of possibleReferences) {
        referenceSet.forEach((reference) => {
          reverseRelationshipMetadatas.forEach((relationshipMetadata) => {
            if (
              targetModels.some((model) => this.referenceIsRelatedTo(model, reference, relationshipMetadata))
            ) {
              let {
                TargetClass,
                relationshipName,
                foreignKeyColumnName,
                relationshipType,
              } = relationshipMetadata;
              if (['ManyToMany', 'HasMany'].includes(relationshipType)) {
                // NOTE: implement in the future
                return;
              }

              if (relationshipType === "BelongsTo") {
                let Class = targetModel.constructor as typeof Model;

                reference[foreignKeyColumnName as string] = targetModel[Class.primaryKeyName]; // TODO: this should be better
              }

              this.findRelationshipCacheFor(TargetClass, relationshipName, relationshipType)
                .set(reference, targetModel);
              // TODO: if instance array exists in the cache(for HasMany or ManyToMany) then change the specific element in the array
            }
          });
        });
      }
    }
  }

  // NOTE: this runs on every instance of a model during relation cache refreshes, needs to be fast
  static referenceIsRelatedTo(
    targetModel: Model,
    reference: Model, // reference is different model type
    {
      TargetClass,
      relationshipName,
      relationshipType,
      reverseRelationshipName,
    }: ReverseRelationshipMetadata
  ): void | boolean {
    return (
      this.modelIsInRelationship(
        this.findRelationshipCacheFor(TargetClass, relationshipName, relationshipType)
          .get(reference),
        targetModel
      ) ||
      this.modelIsInRelationship(
        this.get(targetModel, reverseRelationshipName as string, false),
        reference
      )
    );
  }

  static modelIsInRelationship(relationshipValue, modelToSearch: Model) {
    if (relationshipValue && !(relationshipValue instanceof Promise)) {
      let primaryKeyName = (modelToSearch.constructor as typeof Model).primaryKeyName;

      if (Array.isArray(relationshipValue)) {
        return (relationshipValue as Model[]).some(
          (relationshipModel) => relationshipModel[primaryKeyName] === modelToSearch[primaryKeyName]
        );
      }

      return relationshipValue[primaryKeyName] === modelToSearch[primaryKeyName];
    }
  }

  // NOTE: Deletes persisted to references, from references to instances, from instances to relationship changes
  // TODO: this removes null references(too much)
  static delete(model: Model) {
    let Class = model.constructor as typeof Model;
    let belongsToRelationshipKeys = Object.keys(
      RelationshipSchema.getRelationshipTable(Class, "BelongsTo")
    ); // NOTE: could be costly

    belongsToRelationshipKeys.forEach((relationshipName) => {
      this.findPersistedRecordsCacheFor(Class, relationshipName).delete(model[Class.primaryKeyName]);
    });

    InstanceDB.getReferences(model).forEach((modelReference) => {
      belongsToRelationshipKeys.forEach((relationshipName) => {
        this.findRelationshipCacheFor(Class, relationshipName, "BelongsTo").delete(modelReference);
      });
      // TODO: only removes BelongsTo, NOT HasMany and other Relationships YET
    });

    let reverseRelationships = RelationshipSchema.getReverseRelationshipsTable(Class);
    Object.keys(reverseRelationships).forEach((relationshipClassName) => {
      this.deleteRelationshipsGloballyFromARelationship(
        model,
        reverseRelationships[relationshipClassName]
      );
    });

    InstanceDB.getReferences(model).clear();

    return model;
  }

  // TODO: this currently only removes belongsTo, not an element from HasMany array!
  static deleteRelationshipsGloballyFromARelationship(
    targetModel: Model,
    reverseRelationshipMetadatas: ReverseRelationshipMetadata[]
  ) {
    let Class = targetModel.constructor as typeof Model;
    let possibleReferences = InstanceDB.getAllReferences(reverseRelationshipMetadatas[0].TargetClass) as Array<Set<Model>>;
    if (possibleReferences) {
      for (let referenceSet of possibleReferences.values()) {
        referenceSet.forEach((reference) => {
          reverseRelationshipMetadatas.forEach((relationshipMetadata) => {
            if (this.referenceIsRelatedTo(targetModel, reference, relationshipMetadata)) {
              // TODO: this only does checks for BelongsTo, this needs to change
              let {
                TargetClass,
                relationshipName,
                relationshipType,
                foreignKeyColumnName,
              } = relationshipMetadata;
              let relationshipCache = this.findRelationshipCacheFor(TargetClass, relationshipName, relationshipType);
              let relationshipReference = relationshipCache.get(reference);

              if (
                relationshipReference &&
                relationshipReference[Class.primaryKeyName] === targetModel[Class.primaryKeyName]
              ) {
                relationshipCache.set(reference, null);

                if (relationshipType === "BelongsTo" && foreignKeyColumnName) {
                  reference[foreignKeyColumnName] = null;
                }
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

  // TODO: should not remove existing references on same type of model ever()
  // TODO: should remove existing reference on only the same instance(!) and if we are doing runtime set(!) model.rel = someRel
  // NOTE: it should never remove its own existing copies(same primaryKey, also when primaryKey null gets built)
  // NOTE: it should remove in batches connections(as more instances of certain model exists)

  // TODO: REFACTOR THIS
  static set(model: Model, relationshipName: string, input: null | Model, copySource?: Model) {
    let Class = model.constructor as typeof Model;
    let metadata = RelationshipSchema.getRelationshipMetadataFor(Class, relationshipName);
    let cache = this.findRelationshipCacheFor(Class, relationshipName, metadata.relationshipType);

    if (input === undefined) {
      cache.delete(model); // TODO: add reflection cleanup to existing relationship if exists

      return model;
    }

    // let previousRelationship = cache.get(model);
    // let previousRelationship = model[relationshipName];
    // TODO: for reflexive clear previous reference(2 sides), add cache, add new reference
    let targetRelationship = formatInput(input, metadata.relationshipType);
    if (cache.get(model) === targetRelationship) {
      let { RelationshipClass, reverseRelationshipName, reverseRelationshipType } = metadata;

      if (targetRelationship && reverseRelationshipName) {
        let reverseRelationshipCache = RelationshipDB.findRelationshipCacheFor(RelationshipClass, reverseRelationshipName, reverseRelationshipType as string);

        RelationshipUtils.setReflectiveRelationship(targetRelationship as Model, model, reverseRelationshipType as RelationshipType, reverseRelationshipCache);
      }

      return model;
    } else if (metadata.relationshipType === "BelongsTo") {
      return RelationshipUtils.cleanAndSetBelongsToRelationshipFor(model, targetRelationship, metadata, cache);
    } else if (metadata.relationshipType === "OneToOne") {
      return RelationshipUtils.cleanAndSetOneToOneRelationshipFor(model, targetRelationship, metadata, cache);
    } else {
      if (Array.isArray(input) && !input.every((instance) => instance instanceof Model)) {
        throw new Error(
          `Tried to set a non model instance value to ${Class.name}.${relationshipName}!`
        );
      }

      cache.set(model, Array.isArray(input) ? input : null);
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
  let Class = model.constructor as typeof Model;
  let relationshipMetadata =
    metadata || RelationshipSchema.getRelationshipMetadataFor(Class, relationshipName);
  let { RelationshipClass, relationshipType, foreignKeyColumnName } = relationshipMetadata;
  let foundValue;

  if (relationshipType === "BelongsTo") {
    let foreignKeyValue = model[foreignKeyColumnName as string];
    if (!foreignKeyValue) {
      return null;
    }

    foundValue = RelationshipDB.generateRelationshipFromPersistence(model, relationshipName);
    if (!foundValue && foundValue !== null) {
      foundValue = RelationshipClass.peek(foreignKeyValue);
    }
  } else if (relationshipType === "OneToOne") {
    let primaryKeyValue = model[Class.primaryKeyName];
    foundValue = RelationshipDB.generateRelationshipFromPersistence(model, relationshipName);
    if (!foundValue && foundValue !== null && primaryKeyValue) {
      foundValue = RelationshipClass.peekBy({
        [relationshipMetadata.reverseRelationshipForeignKeyColumnName as string]: primaryKeyValue,
      });
    }
  } else if (relationshipType === "HasMany" || relationshipType === "ManyToMany") {
    return Class.Adapter.fetchRelationship(model, relationshipName, relationshipMetadata);
  }

  if (foundValue || foundValue === null) {
    return foundValue;
  }

  return Class.Adapter.fetchRelationship(model, relationshipName, relationshipMetadata);
}
