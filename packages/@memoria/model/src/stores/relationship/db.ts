// TODO: separating $Model.cache() to RelationshipDB.insert() and .update() might be an good optimization when iterating already referenced relationships
// Caches refresh/mutate on CCUD: create, cache(fetch), update, delete
// NOTE: in future try to optimize instanceCache(s) with symbol references instead of full instances(?)[each symbol refer to a modelReference]
// NOTE: Two approaches found for updating reference caches on new cache, the 1st one chosen for now for simplicity:
// 1- Update similar instances on CRUD(multicore problematic), 2- DONT update similar instances on CRUD, only persistedRecordsBelongsToCache, and have timeStamp for each revision(?)
// NOTE: in-future maybe create special class/object for HasManyArray -> behaves like Set, has Array prototype methods(filter etc), .lastElement

// Types:
// instanceRecord
// generatedRecordFromPersistance
// References(Only For Records with PrimaryKey)
import Model from "../../model.js";
import RelationshipSchema from "./schema.js";
import { RelationshipPromise } from "../../promises/index.js";
import type { RelationshipMetadata, ReverseRelationshipMetadata } from "./schema.js";
import type { PrimaryKey } from "../../types.js";

type RelationshipTableKey = string;
type ModelName = string;
type BelongsToPrimaryKey = PrimaryKey;

export default class RelationshipDB {
  static persistedRecordsBelongsToCache: Map<
    RelationshipTableKey,
    Map<PrimaryKey, null | BelongsToPrimaryKey>
  > = new Map();

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

  // NOTE: Used for models with id AND no primaryKey on purpose!
  // NOTE: It is needed for updating instance hasMany Records and deleting references of not persisted records which hold persisted deleted record
  static instanceReferences: Map<ModelName, Map<PrimaryKey | undefined, Set<Model>>> = new Map();

  static getInstanceRecordsCacheForTableKey(
    relationshipTableKey: string,
    relationshipType: string
  ) {
    if (!this[`instanceRecords${relationshipType}Cache`].has(relationshipTableKey)) {
      this[`instanceRecords${relationshipType}Cache`].set(relationshipTableKey, new WeakMap());
    }

    return this[`instanceRecords${relationshipType}Cache`].get(relationshipTableKey);
  }
  static getPersistedRecordsCacheForTableKey(tableKey: string) {
    if (!this.persistedRecordsBelongsToCache.has(tableKey)) {
      this.persistedRecordsBelongsToCache.set(tableKey, new Map());
    }

    return this.persistedRecordsBelongsToCache.get(tableKey) as Map<
      PrimaryKey,
      null | BelongsToPrimaryKey
    >;
  }
  static findInstanceRelationshipFor(model, relationshipName: string, relationshipType?: string) {
    let Class = model.constructor as typeof Model;
    let targetReverseRelationshipType =
      relationshipType ||
      RelationshipSchema.getRelationshipMetadataFor(Class, relationshipName).relationshipType;
    return this.getInstanceRecordsCacheForTableKey(
      `${Class.name}:${relationshipName}`,
      targetReverseRelationshipType
    ).get(model);
  }

  static getModelReferences(Class: typeof Model) {
    if (!this.instanceReferences.has(Class.name)) {
      this.instanceReferences.set(Class.name, new Map());
    }

    return this.instanceReferences.get(Class.name) as Map<PrimaryKey | undefined, Set<Model>>;
  }
  static getModelReferenceFor(Class: typeof Model, primaryKey: PrimaryKey | undefined): Set<Model> {
    let references = this.getModelReferences(Class);
    if (!references.has(primaryKey)) {
      references.set(primaryKey, new Set());
    }

    return references.get(primaryKey) as Set<Model>;
  }

  // Example: RelationshipDB.generateRelationshipFromPersistence(user, 'photos') #=> Photo[]
  // Example: Relationship.generateRelationshipFromPersistence(user, 'email'); #=> Email // looks both sides
  // used deciding whether record should be fetched for BelongsTo, OneToOne
  // used for diffing on HasMany, BelongsTo & OneToOne(provided to CCUD and compare with newly obtained)
  static generateRelationshipFromPersistence(model: Model, relationshipName: string) {
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
      let results = filterInIterator(
        (this.persistedRecordsBelongsToCache.get(
          `${RelationshipClass.name}:${reverseRelationshipName}`
        ) as Map<PrimaryKey, null | BelongsToPrimaryKey>).entries(),
        ([_, targetModelPrimaryKey]) => targetModelPrimaryKey === primaryKey
      );

      return results.map((result) => RelationshipClass.peek(result[0]));
    }
  }

  // TODO: this should also be done for Model.cache() ? RelationshipDB.insert(model) : RelationshipDB.update(model)
  static cache(model: Model, type: "insert" | "update") {
    let Class = model.constructor as typeof Model;
    let primaryKey = model[Class.primaryKeyName];
    let belongsToRelationshipTable = RelationshipSchema.getRelationshipTable(Class, "BelongsTo"); // NOTE: could be costly atm
    let belongsToRelationshipNames = Object.keys(belongsToRelationshipTable);

    belongsToRelationshipNames.forEach((relationshipName) => {
      this.getPersistedRecordsCacheForTableKey(`${Class.name}:${relationshipName}`).set(
        primaryKey,
        model[belongsToRelationshipTable[relationshipName].foreignKeyColumnName as string]
      );
    });

    this.getModelReferenceFor(Class, primaryKey).forEach((modelReference) => {
      this.updateExistingReference(modelReference, model);
    });

    if (type === "insert" && primaryKey) {
      let nullReferences = this.getModelReferenceFor(Class, undefined);
      if (nullReferences.has(model)) {
        nullReferences.delete(model);
        this.getModelReferenceFor(Class, primaryKey).add(model);
      }
    } else if (type === "update") {
      // NOTE: this changes all possible relationships where model could be the value relationship!
      // Example: when photo inserted or update (belongsTo gets updated)
      // User:photos should get updated
      // Post:photo should get update
      // photo references get updated

      // let user; -> change it
      // let change all instance references
      // comments -> comment.photo
      let reverseRelationships = RelationshipSchema.getReverseRelationshipsTable(Class);

      Object.keys(reverseRelationships).forEach((relationshipModelName) => {
        this.updateInstanceCacheReferencesForModelRelationship(
          model,
          relationshipModelName,
          reverseRelationships[relationshipModelName]
        );
      });
    }

    return model;
  }

  static updateExistingReference(referenceModel: Model, targetModel: Model) {
    (targetModel.constructor as typeof Model).columnNames.forEach((columnName) => {
      if (referenceModel[columnName] !== targetModel[columnName]) {
        referenceModel[columnName] = targetModel[columnName]; // NOTE: maybe I need to make them not tracked for revision!
      }
    });

    return referenceModel;
  }

  static updateInstanceCacheReferencesForModelRelationship(
    targetModel: Model,
    relationshipClassName: ModelName,
    reverseRelationshipMetadatas: ReverseRelationshipMetadata[]
  ) {
    let Class = targetModel.constructor as typeof Model;
    let possibleReferences = this.instanceReferences.get(relationshipClassName) as Map<
      PrimaryKey | undefined,
      Set<Model>
    >;
    if (possibleReferences) {
      for (let referenceSet of possibleReferences.values()) {
        referenceSet.forEach((reference) => {
          reverseRelationshipMetadatas.forEach((relationshipMetadata) => {
            let { TargetClass, relationshipName, relationshipType } = relationshipMetadata;
            let tableKey = `${TargetClass.name}:${relationshipName}`;
            // TODO: DO it differently for hasMany and ManyToMany handling
            let relationshipReference = this.getInstanceRecordsCacheForTableKey(
              tableKey,
              relationshipType
            ).get(reference);
            if (
              relationshipReference &&
              relationshipReference[TargetClass.primaryKeyName] ===
                targetModel[Class.primaryKeyName]
            ) {
              this.getInstanceRecordsCacheForTableKey(tableKey, relationshipType).set(
                reference,
                targetModel
              );
            }
          });
        });
      }
    }
  }

  // TODO: this currently only removes belongsTo, not an element from HasMany array!
  static deleteInstanceCacheReferencesForModel(
    targetModel: Model,
    relationshipClassName: ModelName,
    reverseRelationshipMetadatas: ReverseRelationshipMetadata[]
  ) {
    let Class = targetModel.constructor as typeof Model;
    let possibleReferences = this.instanceReferences.get(relationshipClassName) as Map<
      PrimaryKey | undefined,
      Set<Model>
    >;
    if (possibleReferences) {
      for (let referenceSet of possibleReferences.values()) {
        referenceSet.forEach((reference) => {
          reverseRelationshipMetadatas.forEach((relationshipMetadata) => {
            let { TargetClass, relationshipName, relationshipType } = relationshipMetadata;
            let tableKey = `${TargetClass.name}:${relationshipName}`;
            let relationshipReference = this.getInstanceRecordsCacheForTableKey(
              tableKey,
              relationshipType
            ).get(reference);
            if (
              relationshipReference &&
              relationshipReference[Class.primaryKeyName] === targetModel[Class.primaryKeyName]
            ) {
              RelationshipDB.set(reference, relationshipName, null);
            }
          });
        });
      }
    }
  }

  // NOTE: Deletes persisted to references, from references to instances, from instances to relationship changes
  static delete(model: Model) {
    let Class = model.constructor as typeof Model;
    let primaryKey = model[Class.primaryKeyName];
    let belongsToRelationshipKeys = Object.keys(
      RelationshipSchema.getRelationshipTable(Class, "BelongsTo")
    ); // NOTE: could be costly

    belongsToRelationshipKeys.forEach((relationshipName) => {
      this.getPersistedRecordsCacheForTableKey(`${Class.name}:${relationshipName}`).delete(
        primaryKey
      );
    });

    this.getModelReferenceFor(Class, primaryKey).forEach((modelReference) => {
      // TODO: maybe this shouldnt be needed, instead getters should check if the instance exists in instanceReferences instead(?), maybe this is needed for correct @tracked implementation
      // TODO: only removes BelongsTo, NOT HasMany Relationships YET
      belongsToRelationshipKeys.forEach((relationshipName) => {
        this.getInstanceRecordsCacheForTableKey(
          `${Class.name}:${relationshipName}`,
          "BelongsTo"
        ).delete(modelReference);
      });
    });

    let reverseRelationships = RelationshipSchema.getReverseRelationshipsTable(Class);
    Object.keys(reverseRelationships).forEach((relationshipModelName) => {
      // TODO: this removes only based on instanceReferences
      this.deleteInstanceCacheReferencesForModel(
        model,
        relationshipModelName,
        reverseRelationships[relationshipModelName]
      );
    });

    if (primaryKey) {
      // NOTE: This also gets called on $Model.build() so needed
      this.getModelReferenceFor(Class, primaryKey).clear();
    }

    return model;
  }

  static clear(Class?: typeof Model) {
    if (Class) {
      throw new Error("RelationshipSchema.clear() by specific model not yet implemented");
    }

    this.persistedRecordsBelongsToCache.clear();
    this.clearInstanceRelationships();
    this.instanceReferences.clear();

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

  static get(model: Model, relationshipName: string) {
    let Class = model.constructor as typeof Model;
    let metadata = RelationshipSchema.getRelationshipMetadataFor(Class, relationshipName);
    let cache = this.getInstanceRecordsCacheForTableKey(
      `${Class.name}:${relationshipName}`,
      metadata.relationshipType
    );
    if (cache.has(model)) {
      return cache.get(model);
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
      cache.set(model, reference);

      return reference;
    }
  }

  static set(model: Model, relationshipName: string, input: null | Model) {
    let Class = model.constructor as typeof Model;
    let {
      relationshipType,
      foreignKeyColumnName,
      RelationshipClass,
    } = RelationshipSchema.getRelationshipMetadataFor(Class, relationshipName);
    let cache = this.getInstanceRecordsCacheForTableKey(
      `${Class.name}:${relationshipName}`,
      relationshipType
    );

    if (input === undefined) {
      cache.delete(model);
    } else if (relationshipType === "BelongsTo") {
      let relationship = input instanceof Model ? input : null;

      cache.set(model, relationship);
      model[foreignKeyColumnName as string] = relationship
        ? relationship[RelationshipClass.primaryKeyName]
        : null;
    } else if (relationshipType === "OneToOne") {
      cache.set(model, input instanceof Model ? input : null);
    } else {
      if (Array.isArray(input) && !input.every((instance) => instance instanceof Model)) {
        throw new Error(`Trying to set a non model instance to ${Class.name}.${relationshipName}!`);
      }

      cache.set(model, input ? input : null);
    }

    return model;
  }
}

function filterInIterator(iterator, predicate: Function) {
  let result = [];
  for (let iteratorValue in iterator) {
    if (predicate(iteratorValue)) {
      // @ts-ignore
      result.push(iteratorValue);
    }
  }

  return result;
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
