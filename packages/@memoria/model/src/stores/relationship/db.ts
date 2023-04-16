import Model from "../../model.js";
import RelationshipSchema, { ARRAY_ASKING_RELATIONSHIPS } from "./schema.js";
import RelationshipUtils from "./utils.js";
import RelationshipQuery from "./query.js";
import InstanceDB from "../instance/db.js";
import { clearObject } from "../../utils/index.js";
import type { RelationshipMetadata, ReverseRelationshipMetadata } from "./schema.js";
import HasManyArray from "../../has-many-array.js";

type RelationshipTableKey = string; // Example: "MemoryUser:comments"
type AnotherModel = Model;
type RelationshipMap<Value> = Map<RelationshipTableKey, Value>;
type JSObject = { [key: string]: any };

export default class RelationshipDB {
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

  // NOTE: in future relationshipChanges could be tracked and passed in here for optional optimization
  // TODO: old id references should be checked from input/outputRecord diff
  // TODO: remove this input and change it with options: { embedInstructions: { relationshipName: Relationship } }
  static cache(outputRecord: Model, _type: "insert" | "update", _input: Model | JSObject, cachedRecord?: Model) {
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
    // Reflexive BelongsTo references gets updated!!
    let reverseRelationships = RelationshipSchema.getReverseRelationshipsTable(Class);
    Object.keys(reverseRelationships).forEach((relationshipClassName) => {
      this.updateRelationshipsGloballyFromARelationship(
        outputRecord,
        reverseRelationships[relationshipClassName],
        modelInstances
      );
    });
    if (cachedRecord) {
      cachedRecord.fetchedRelationships.forEach((relationshipName: string) => {
        RelationshipDB.findRelationshipCacheFor(Class, relationshipName).delete(cachedRecord);
      });
    }

    // NOTE: TRY: dont delete references related to the same model, only delete references related to the same model with different id(?)
    outputRecord.fetchedRelationships.forEach((relationshipName: string) => {
      let relationship = RelationshipDB.findRelationshipFor(outputRecord, relationshipName);
      if (relationship && relationship[(relationship.constructor as typeof Model).primaryKeyName]) {
        RelationshipDB.findRelationshipCacheFor(Class, relationshipName).delete(outputRecord);
      }
    });

    InstanceDB.makeModelPersisted(outputRecord);

    return outputRecord;
  }

  static cacheRelationship(model: Model, metadata: RelationshipMetadata, relationship: Model | Model[] | null) {
    let Class = model.constructor as typeof Model;
    let cache = RelationshipDB.findRelationshipCacheFor(Class, metadata.relationshipName, metadata.relationshipType);
    if (ARRAY_ASKING_RELATIONSHIPS.has(metadata.relationshipType)) {
      let array = new HasManyArray(relationship as Model[], model, metadata);

      cache.set(model, array);

      return array;
    } else if (relationship) {
      cache.set(model, relationship);
    }

    return relationship;
    // NOTE: ChatGPT suggestion
    // relationshipCache.set(model, relationship);

    // if (relationshipMetadata.relationshipType === "hasMany") {
    //   let hasManyArray = model[relationshipName] as HasManyArray;
    //   if (hasManyArray) {
    //     hasManyArray.setRelationship(relationship as Model[]);
    //   }
    // }
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
              modelInstancesArray.some((model) => this.referenceIsRelatedTo(model, reference, relationshipMetadata))
            ) {
              let { SourceClass, relationshipName, relationshipType, foreignKeyColumnName } = relationshipMetadata;
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
                reference[foreignKeyColumnName as string] = model[Class.primaryKeyName];
              }

              reference[relationshipName] = model;
            }
          });
        });
      }
    }
  }

  static referenceIsRelatedTo(
    model: Model,
    reference: AnotherModel,
    { relationshipName, relationshipType, SourceClass, foreignKeyColumnName }: ReverseRelationshipMetadata
  ): void | boolean {
    if (
      relationshipType === "BelongsTo" &&
      reference[foreignKeyColumnName as string] === model[(model.constructor as typeof Model).primaryKeyName]
    ) {
      return true;
    } else if (
      relationshipType === "OneToOne" &&
      model[foreignKeyColumnName as string] === reference[SourceClass.primaryKeyName]
    ) {
      return true;
    }

    let relationshipValue = this.findRelationshipFor(reference, relationshipName, relationshipType);
    if (Array.isArray(relationshipValue)) {
      return relationshipValue.some((anyModel) => model === anyModel);
    } else if (relationshipValue) {
      return model === relationshipValue;
    }
  }

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
      let { relationshipType, foreignKeyColumnName } = modelsRelationships[relationshipName];
      let relationshipCache = this.findRelationshipCacheFor(Class, relationshipName, relationshipType);

      modelInstancesArray.forEach((modelReference) => {
        if (relationshipType === "BelongsTo") {
          modelReference[foreignKeyColumnName as string] = null; // NOTE: probably remove
          relationshipCache.set(modelReference, null);
        } else if (relationshipType === "OneToOne") {
          relationshipCache.set(modelReference, null);
        } else if (relationshipType === "HasMany") {
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
        } else if (relationshipType === "ManyToMany") {
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

    InstanceDB.getPersistedModels(Model).delete(model[Class.primaryKeyName]);
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
              modelInstancesArray.some((model) => this.referenceIsRelatedTo(model, reference, relationshipMetadata))
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
    InstanceDB.persistedModels.clear();

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
    } else if (metadata.relationshipType === "BelongsTo" && !model[metadata.foreignKeyColumnName as string]) {
      return RelationshipDB.cacheRelationship(model, metadata, null);
    }

    let result = RelationshipQuery.findPossibleReferenceInMemory(model, metadata);

    return result ? RelationshipDB.cacheRelationship(model, metadata, result) : Class.Adapter.fetchRelationship(model, relationshipName, metadata);
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
        targetRelationship as Model | null,
        metadata,
        relationshipCache
      );
    } else if (metadata.relationshipType === "OneToOne") {
      return RelationshipUtils.cleanAndSetOneToOneRelationshipFor(
        model,
        targetRelationship as Model | null,
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
}

function formatInput(input, model, metadata) {
  if (ARRAY_ASKING_RELATIONSHIPS.has(metadata.relationshipType)) {
    // return new HasManyArray(input, model, metadata);
    // TODO: change the owner but in a new instance
    return input instanceof HasManyArray ? input : new HasManyArray(input, model, metadata);
  }

  return input instanceof Model ? input : null;
}
