// TODO: separating Schema.cache() to insert() and update() might be an good optimization when iterating already referenced relationships
// NOTE: I could use WeakRef abstractions but then could be inconsistent
// Or maybe manual deletion with reference optimization(using a data structure, probably graph)
// We should refresh/mutate caches on CCUD: create, cache(fetch), update, delete
// NOTE: Not implemented for ManyToMany which will be important, also HasMany not correctly implemented on .cache() and .delete()
import Model from "../../model.js";
import RelationshipSchema from "./schema.js";
import type { RelationshipType } from "./schema.js";
import type { PrimaryKey } from "../../types.js";

// Types:
// instanceRecord
// generatedRecordFromPersistance
// References(Only For Records with PrimaryKey)

type RelationshipTableKey = string;
type ModelName = string;
type BelongsToPrimaryKey = PrimaryKey;

// NOTE: in future try to optimize instanceCache(s) with id references instead of full instance variables(?)
// TODO: Two approaches: Update similar instances on CRUD, NOT update similar instances on CRUD, only persistedRecordsBelongsToCache, and have timeStamp for each revision(?)
// TODO: make it so lazy that most computation happens when instance is (get-ted) not even on crud(?)

// TODO: insert should also add it to instanceReferences(maybe not(?)) on constructor does it
// TODO: if .isNew built it should also add it to persistedRecordsBelongsToCache
export default class RelationshipDB {
  static persistedRecordsBelongsToCache: Map<
    RelationshipTableKey,
    Map<PrimaryKey, null | BelongsToPrimaryKey>
  > = new Map();

  // NOTE: these instance caches are kept for user changes done prior CRUD:
  static instanceRecordsBelongsToCache: Map<
    RelationshipTableKey,
    WeakMap<Model, null | Model>
  > = new Map();

  // TODO: is OneToOne still needed because we cant reach otherwise relationships that are mutated and not saved or re-read without reload
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

  // NOTE: this happens on *every* model instantiation(with id):
  // NOTE: maybe add null too lookup keys, probably not needed at the beginning
  static instanceReferences: Map<ModelName, Map<PrimaryKey, Set<Model>>> = new Map(); // Only used for models with id on purpose! NOTE: needed for updating instance hasMany Records

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
  static findInstanceRelationshipRecordsFor(
    model,
    relationshipName: string,
    relationshipType?: string
  ) {
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

    return this.instanceReferences.get(Class.name) as Map<PrimaryKey, Set<Model>>;
  }
  static findModelReferences(Class: typeof Model, primaryKey: PrimaryKey): Set<Model> {
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
      return filterInIterator(
        this.persistedRecordsBelongsToCache.get(
          `${RelationshipClass.name}:${reverseRelationshipName}`
        ),
        (relatedModel) => relatedModel[Class.primaryKeyName] === primaryKey
      );
    }
  }

  // TODO: this should also be done for Model.cache() ? RelationshipDB.insert(model) : RelationshipDB.update(model)
  static cache(model: Model, type: "insert" | "update") {
    let Class = model.constructor as typeof Model;
    let primaryKey = model[Class.primaryKeyName];
    let belongsToRelationshipTable = RelationshipSchema.getRelationshipTable(Class, "BelongsTo"); // NOTE: could be costly
    let generatedRelationships = {};

    this.findModelReferences(Class, primaryKey).forEach((modelReference) => {
      this.updateExistingReference(modelReference, model);

      Object.keys(belongsToRelationshipTable).forEach((relationshipName) => {
        let { RelationshipClass, foreignKeyColumnName } = belongsToRelationshipTable[
          relationshipName
        ];

        if (!(relationshipName in generatedRelationships)) {
          let foreignKeyValue =
            model[belongsToRelationshipTable[relationshipName].foreignKeyColumnName as string];

          generatedRelationships[relationshipName] =
            foreignKeyValue === null ? null : RelationshipClass.peek(foreignKeyValue);

          // NOTE: change persistedRecordsBelongsToCache once for belongsToRelationship
          this.getPersistedRecordsCacheForTableKey(`${Class.name}:${relationshipName}`).set(
            primaryKey,
            model[foreignKeyColumnName as string]
          );
        }

        let instanceCache = this.findInstanceRelationshipRecordsFor(
          modelReference,
          relationshipName,
          "BelongsTo"
        ).get(modelReference);
        if (instanceCache || instanceCache === null) {
          RelationshipClass.columnNames.forEach((columnName) => {
            if (instanceCache[columnName] !== generatedRelationships[relationshipName]) {
              instanceCache[columnName] = generatedRelationships[relationshipName]; // NOTE: maybe I need to make them not tracked for revision!
            }
          });
        }
      });
    });

    if (type === "update") {
      // NOTE: this changes all possible relationships where model could be the value relationship!
      // Example: when photo inserted or update (belongsTo gets updated)
      // User:photos should get updated
      // Post:photo should get update
      // photo references get updated

      // let user; -> change it
      // let change all instance references
      // comments -> comment.photo
      let reverseRelationships = RelationshipSchema.getReverseRelationshipTable(Class);
      Object.keys(reverseRelationships).forEach((tableKey) => {
        this.updateInstanceCacheReferencesForModelRelationship(
          tableKey,
          reverseRelationships[tableKey].relationshipType,
          model
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

  // TODO: this can be optimized by batching RelationshipTableKey[] PER ReferenceClass type
  static updateInstanceCacheReferencesForModelRelationship(
    tableKey: RelationshipTableKey,
    relationshipType: RelationshipType,
    targetModel: Model
  ) {
    let referenceClassName = tableKey.split(":")[0] as string;
    let tableKeyReferenceMap = this.instanceReferences.get(referenceClassName) as Map<
      PrimaryKey,
      Set<Model>
    >;
    let Class = targetModel.constructor as typeof Model;

    for (let referenceSet of tableKeyReferenceMap.values()) {
      referenceSet.forEach((reference) => {
        // TODO: DO it differently for hasMany and ManyToMany handling
        let relationshipReference = this.getInstanceRecordsCacheForTableKey(
          tableKey,
          relationshipType
        ).get(reference);
        if (
          relationshipReference &&
          relationshipReference[Class.primaryKeyName] === targetModel[Class.primaryKeyName]
        ) {
          this.getInstanceRecordsCacheForTableKey(tableKey, relationshipType).set(
            reference,
            targetModel
          );
        }
      });
    }
  }

  // TODO: this can be optimized by batching RelationshipTableKey[] PER ReferenceClass type
  static deleteInstanceCacheReferencesForModel(
    tableKey: RelationshipTableKey,
    relationshipType: RelationshipType,
    targetModel: Model
  ) {
    let referenceClassName = tableKey.split(":")[0] as string;
    let tableKeyReferenceMap = this.instanceReferences.get(referenceClassName) as Map<
      PrimaryKey,
      Set<Model>
    >;
    let Class = targetModel.constructor as typeof Model;

    for (let referenceSet of tableKeyReferenceMap.values()) {
      referenceSet.forEach((reference) => {
        // TODO: DO it differently for hasMany and ManyToMany handling
        let relationshipReference = this.getInstanceRecordsCacheForTableKey(
          tableKey,
          relationshipType
        ).get(reference);
        if (
          relationshipReference &&
          relationshipReference[Class.primaryKeyName] === targetModel[Class.primaryKeyName]
        ) {
          this.getInstanceRecordsCacheForTableKey(tableKey, relationshipType).delete(
            relationshipReference
          );
        }
      });
    }
  }

  // NOTE: Deletes persisted to references, from references to instances from instances to relationship change
  // NOTE: maybe implement a reverseRelationships
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

    this.findModelReferences(Class, primaryKey).forEach((modelReference) => {
      belongsToRelationshipKeys.forEach((relationshipName) => {
        this.findInstanceRelationshipRecordsFor(
          modelReference,
          relationshipName,
          "BelongsTo"
        ).delete(modelReference);
      });
    });

    let reverseRelationships = RelationshipSchema.getReverseRelationshipTable(Class);
    Object.keys(reverseRelationships).forEach((tableKey) => {
      this.deleteInstanceCacheReferencesForModel(
        tableKey,
        reverseRelationships[tableKey].relationshipType,
        model
      );
    });

    if (primaryKey) {
      this.findModelReferences(Class, primaryKey).clear();
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

  static get(model: Model, relationshipName: string) {
    let Class = model.constructor as typeof Model;
    let { relationshipType } = RelationshipSchema.getRelationshipMetadataFor(
      Class,
      relationshipName
    );
    let map = this.getInstanceRecordsCacheForTableKey(
      `${Class.name}:${relationshipName}`,
      relationshipType
    );
    let reference = map.get(model);
    if (reference === undefined) {
      reference = buildReferenceFromPersistedCache(model, relationshipName);
      if (reference instanceof Promise) {
        reference.then((relationshipModel) => map.set(model, relationshipModel));
      } else if (reference) {
        map.set(model, reference);
      }
    }

    return reference;
  }

  static set(model: Model, relationshipName: string, input: null | Model) {
    let Class = model.constructor as typeof Model;
    let {
      relationshipType,
      foreignKeyColumnName,
      RelationshipClass,
    } = RelationshipSchema.getRelationshipMetadataFor(Class, relationshipName);
    let map = this.getInstanceRecordsCacheForTableKey(
      `${Class.name}:${relationshipName}`,
      relationshipType
    );

    if (relationshipType === "BelongsTo") {
      let relationship = input instanceof Model ? input : null;

      map.set(model, relationship);
      map[foreignKeyColumnName] = relationship
        ? relationship[RelationshipClass.primaryKeyName]
        : null;
    } else if (relationshipType === "OneToOne") {
      map.set(model, input instanceof Model ? input : null);
    } else if (Array.isArray(input) && input.every((instance) => instance instanceof Model)) {
      map.set(model, input);
    } else {
      map.set(model, null);
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

function buildReferenceFromPersistedCache(model: Model, relationshipName: string) {
  let Class = model.constructor as typeof Model;
  let relationshipMetadata = RelationshipSchema.getRelationshipMetadataFor(Class, relationshipName);
  let { relationshipType, foreignKeyColumnName } = relationshipMetadata;

  if (relationshipType === "BelongsTo" && !model[foreignKeyColumnName as string]) {
    return null;
  }

  let foundValue;

  if (relationshipType === "BelongsTo" || relationshipType === "OneToOne") {
    foundValue = RelationshipDB.generateRelationshipFromPersistence(model, relationshipName);
  } else if (relationshipType === "HasMany" || relationshipType === "ManyToMany") {
    foundValue = RelationshipDB.findInstanceRelationshipRecordsFor(
      model,
      relationshipName,
      relationshipType
    );
  }

  if (foundValue || foundValue === null) {
    return foundValue;
  }

  return Class.Adapter.fetchRelationship(model, relationshipName, relationshipMetadata);
}
