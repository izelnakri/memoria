import Model from "../../model.js";
import RelationshipSchema, { ARRAY_ASKING_RELATIONSHIPS } from "./schema.js";
import RelationshipMutation from "./mutation.js";
import RelationshipQuery from "./query.js";
import InstanceDB from "../instance/db.js";
import { clearObject } from "../../utils/index.js";
import type { RelationshipMetadata } from "./schema.js";
import HasManyArray from "../../has-many-array.js";

type RelationshipTableKey = string; // Example: "MemoryUser:comments"
type AnotherModel = Model;
type RelationshipMap<Value> = Map<RelationshipTableKey, Value>;
type JSObject = { [key: string]: any };

// TODO: make some relationshipName arguments just relationshipMetadata so less copying/generating data around
export default class RelationshipDB {
  static instanceRecordsBelongsToCache: RelationshipMap<WeakMap<Model, null | Model>> = new Map();
  // static instanceRecordsBelongsToSettingCache: RelationshipMap<WeakMap<Model, null | Model>> = new Map(); // TODO: Maybe this is needed to hasMany reload logic
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

  // NOTE: null doesnt get cached on fetch
  // NOTE: belongsTo reflective mutations can be done here
  static cacheRelationship(model: Model, metadata: RelationshipMetadata, relationship: Model | Model[] | null) {
    let { relationshipType, RelationshipClass, RelationshipCache, reverseRelationshipType } = metadata;

    // let previousRelationship = cache.get(model);
    if (ARRAY_ASKING_RELATIONSHIPS.has(relationshipType)) {
      // TODO: doesnt clear existing relationship(?)
      let array = new HasManyArray(relationship as Model[], model, metadata);

      // NOTE: This is costly, in future find a way probably a way to optimize it
      this.synchronizeBelongsToAndHasManyReferences(array, metadata);

      RelationshipCache.set(model, array);

      return array;
    }

    if (relationship) {
      RelationshipCache.set(model, relationship);
    }

    if (relationshipType === "BelongsTo") {
      if (reverseRelationshipType === "HasMany") {
        RelationshipMutation.adjustHasManyRelationshipFor(
          relationship as Model,
          model,
          RelationshipSchema.getRelationshipMetadataFor(RelationshipClass, metadata.reverseRelationshipName)
        );
      }

      // let { ReverseRelationshipCache } = metadata;
      // let reverseRelationship = ReverseRelationshipCache.get(relationship);
      // TODO:
      // let reverseRelationshipCache = RelationshipDB.findRelationshipCacheFor(
      //   RelationshipClass,
      //   reverseRelationshipName,
      //   reverseRelationshipType as string
      // );
      // let reverseRelationship = reverseRelationshipCache;
      // previousRelationship or newAssigned reflection(?!?)
      // let reverseRelationshipCache =
    }

    return relationship;
    // NOTE: ChatGPT suggestion
    // RelationshipCache.set(model, relationship);

    // if (relationshipMetadata.relationshipType === "hasMany") {
    //   let hasManyArray = model[relationshipName] as HasManyArray;
    //   if (hasManyArray) {
    //     hasManyArray.setRelationship(relationship as Model[]);
    //   }
    // }
  }

  static synchronizeBelongsToAndHasManyReferences(
    array: HasManyArray,
    { RelationshipClass, ReverseRelationshipCache, reverseRelationshipForeignKeyColumnName }: RelationshipMetadata
  ) {
    if (!array.belongsTo) {
      return array;
    }
    let belongsToModel = array.belongsTo;
    let Class = belongsToModel.constructor as typeof Model;
    let primaryKey = belongsToModel[Class.primaryKeyName];
    let currentBelongsToValues = new Set(array);

    // if its built but not persisted models, keep em
    for (let referenceSet of InstanceDB.getAllReferences(RelationshipClass)) {
      // Photo owner_id
      let [foundReference, _persistedReference, alternativeReference] = Array.from(referenceSet)
        .reverse()
        .reduce(
          (result, reference) => {
            if (primaryKey !== reference[reverseRelationshipForeignKeyColumnName as string]) {
              return result;
            } else if (currentBelongsToValues.has(reference) || !ReverseRelationshipCache.has(reference)) {
              return result;
            }

            let oldReference = ReverseRelationshipCache.get(reference);
            ReverseRelationshipCache.set(reference, belongsToModel);

            if (result[0]) {
              return result;
            } else if (!result[1] && reference.isPersisted) {
              result[1] = InstanceDB.getPersistedModels(RelationshipClass).get(
                reference[RelationshipClass.primaryKeyName]
              ) as Model;
              if (ReverseRelationshipCache.get(result[1]) === belongsToModel) {
                result[0] = result[1];
              } else if (oldReference === belongsToModel) {
                result[2] = reference;
              }

              return result;
            } else if (result[2]) {
              return result;
            }

            let relationship = ReverseRelationshipCache.get(reference);
            if (relationship === array.belongsTo) {
              result[2] = reference;
            }

            return result;
          },
          [null, null, null] as [Model | null, Model | null, Model | null]
        );
      let targetInstance = foundReference || alternativeReference;
      if (targetInstance) {
        // TODO: this should check if the instance has reference!(?)
        array.push(targetInstance);
      }
    }

    return array;
  }

  // NOTE: this can be optimized for batching
  static updateRelationshipsGloballyFromARelationship(
    model: Model,
    reverseRelationshipMetadatas: RelationshipMetadata[],
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
              let { relationshipName, relationshipType, foreignKeyColumnName } = relationshipMetadata;
              if (ARRAY_ASKING_RELATIONSHIPS.has(relationshipType)) {
                let foundCache = relationshipMetadata.RelationshipCache.get(reference) as Model[];
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

  // NOTE: this can be optimized, at a point *before* it is used
  static referenceIsRelatedTo(
    model: Model,
    reference: AnotherModel,
    {
      relationshipName,
      relationshipType,
      SourceClass,
      foreignKeyColumnName,
      reverseRelationshipForeignKeyColumnName,
    }: RelationshipMetadata
  ): void | boolean {
    if (relationshipType === "BelongsTo") {
      return (
        reference[foreignKeyColumnName as string] === model[(model.constructor as typeof Model).primaryKeyName] ||
        this.findRelationshipFor(reference, relationshipName, relationshipType) === model
      );
    } else if (relationshipType === "OneToOne") {
      return (
        model[foreignKeyColumnName as string] === reference[SourceClass.primaryKeyName] ||
        this.findRelationshipFor(reference, relationshipName, relationshipType) === model
      );
    } else if (relationshipType === "HasMany") {
      return model[reverseRelationshipForeignKeyColumnName as string] === reference[SourceClass.primaryKeyName];
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
      let { RelationshipCache, relationshipType, foreignKeyColumnName } = modelsRelationships[relationshipName];

      modelInstancesArray.forEach((modelReference) => {
        if (relationshipType === "BelongsTo") {
          modelReference[foreignKeyColumnName as string] = null; // NOTE: probably remove
          RelationshipCache.set(modelReference, null);
        } else if (relationshipType === "OneToOne") {
          RelationshipCache.set(modelReference, null);
        } else if (relationshipType === "HasMany") {
          modelReference[relationshipName] = [];
        } else if (relationshipType === "ManyToMany") {
          let relationshipValue = RelationshipCache.get(modelReference);
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
    reverseRelationshipMetadatas: RelationshipMetadata[],
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
              let { RelationshipCache, relationshipName } = relationshipMetadata;
              if (RelationshipCache.get(reference)) {
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
    } else if (ARRAY_ASKING_RELATIONSHIPS.has(metadata.relationshipType)) {
      return Class.Adapter.fetchRelationship(model, relationshipName, metadata);
    }

    let result = RelationshipQuery.findPossibleReferenceInMemory(model, metadata);

    return result
      ? RelationshipDB.cacheRelationship(model, metadata, result)
      : Class.Adapter.fetchRelationship(model, relationshipName, metadata);
  }

  // TODO: make this work for hasMany and its array replacement
  // NOTE: it should never remove its own existing copies(same primaryKey, also when primaryKey null gets built)
  // NOTE: it should remove in batches connections(as more instances of certain model exists)
  static set(model: Model, relationshipName: string, input: null | Model | Model[], _copySource?: Model) {
    let Class = model.constructor as typeof Model;
    let metadata = RelationshipSchema.getRelationshipMetadataFor(Class, relationshipName);
    let { RelationshipCache, reverseRelationshipType } = metadata;
    let existingRelationship = RelationshipCache.get(model);

    if (input === undefined) {
      RelationshipCache.delete(model);

      if (ARRAY_ASKING_RELATIONSHIPS.has(metadata.relationshipType)) {
        (existingRelationship as HasManyArray).clear();
      } else if (existingRelationship) {
        RelationshipMutation.cleanRelationshipsOn(model, metadata);
      }

      return model;
    }

    let targetRelationship = generateNewArrayFromInputIfNeeded(input, model, metadata);
    if (existingRelationship === targetRelationship) {
      // NOTE: This sets the reflection to the recent one due to assignment
      if (targetRelationship && metadata.relationshipType !== "HasMany" && reverseRelationshipType !== "HasMany") {
        RelationshipMutation.setReflectiveSideRelationship(model, targetRelationship as Model, metadata);
      }

      return model;
    } else if (metadata.relationshipType === "BelongsTo") {
      return RelationshipMutation.cleanAndSetBelongsToRelationshipFor(
        model,
        targetRelationship as Model | null,
        metadata
      );
    } else if (metadata.relationshipType === "OneToOne") {
      return RelationshipMutation.cleanAndSetOneToOneRelationshipFor(
        model,
        targetRelationship as Model | null,
        metadata
      );
    } else if (metadata.relationshipType === "HasMany") {
      if (existingRelationship) {
        (existingRelationship as HasManyArray).clear();
      }

      RelationshipCache.set(model, new HasManyArray(targetRelationship as Model[], model, metadata));

      // TODO: do reflection(?)

      return model;
    } else {
      // TODO: probably remove this case
      if (Array.isArray(input) && !input.every((instance) => instance instanceof Model)) {
        throw new Error(`Tried to set a non model instance value to ${Class.name}.${relationshipName}!`);
      }

      RelationshipCache.set(model, Array.isArray(input) ? input : null);
    }

    return model;
  }
}

function generateNewArrayFromInputIfNeeded(input, model, metadata) {
  if (ARRAY_ASKING_RELATIONSHIPS.has(metadata.relationshipType)) {
    // return new HasManyArray(input, model, metadata);
    // TODO: change the owner but in a new instance
    return input instanceof HasManyArray ? input : new HasManyArray(input, model, metadata);
  }

  return input instanceof Model ? input : null;
}
