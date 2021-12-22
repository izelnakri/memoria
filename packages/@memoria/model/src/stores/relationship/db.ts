import Model from "../../model.js";
import RelationshipConfig from "./config.js";
import type { PrimaryKey } from "../../types.js";

// Mutation functions:
// referenceAdd(model, relationshipName, value)
// referenceChange(model, relationshipName, from, to)
// referenceDelete(model, relationshipName) all intendend with setReference() atm

// Types:
// instanceRecord
// instanceSnapshot(if doesnt exist, generate)
// generatedRecordFromPersistance
// References(Only For Records with PrimaryKey)

type RelationshipType = "BelongsTo" | "OneToOne" | "HasMany" | "ManyToMany";
type RelationshipTableKey = string;
type BelongsToPrimaryKey = PrimaryKey;

// We should refresh/mutate caches on CCUD: create, cache(fetch), update, delete
// only hasMany lookups are slightly expensive, and deleting models with them, re-evaluate
// NOTE: maybe seekCachedValue() is undeed if lookups never go to persistedRecordsBelongsToCache

// NOTE: Not adjusted for ManyToMany which will be important
// I might really need a Graph here instead in future:

// TODO: NOW question is can CCUD refresh the cache correctly and fast
export default class RelationshipDB {
  static persistedRecordsBelongsToCache: Map<
    RelationshipTableKey,
    Map<PrimaryKey, null | BelongsToPrimaryKey>
  > = new Map();

  // NOTE: this state is kept for user changes prior CRUD:
  // When getting relationship we do reflexive lookup for (belongsTo & hasMany) if it doesnt exist in direct instance cache
  static instanceRecordsBelongsToCache: Map<
    RelationshipTableKey,
    WeakMap<Model, null | Model>
  > = new Map();

  // TODO: is OneToOne still needed(?), yes because we cant reach otherwise, prior CCUD mutated relationship on re-read without reload
  static instanceRecordsOneToOneCache: Map<
    RelationshipTableKey,
    WeakMap<Model, null | Model>
  > = new Map(); // NOTE: can be done in instanceReferences(?)

  static instanceRecordsHasManyCache: Map<
    RelationshipTableKey,
    WeakMap<Model, null | Model[]>
  > = new Map();

  // NOTE: this happens on *every* model instantiation:
  // NOTE: maybe add null too lookup keys, probably not needed at the beginning
  static instanceReferences: Map<typeof Model, Map<PrimaryKey, Set<Model>>> = new Map(); // Only used for models with id on purpose! NOTE: needed for updating instance hasMany Records

  static getModelReferences(Class: typeof Model) {
    if (!this.instanceReferences.has(Class)) {
      this.instanceReferences.set(Class, new Map());
    }

    return this.instanceReferences.get(Class);
  }
  static findModelReferences(Class: typeof Model, primaryKey: PrimaryKey): Set<Model> {
    let references = this.getModelReferences(Class) as Map<PrimaryKey, Set<Model>>;

    return (references.has(primaryKey)
      ? references.get(primaryKey)
      : references.set(primaryKey, new Set())) as Set<Model>;
  }
  static getInstanceRecordsCacheForTableKey(
    relationshipTableKey: string,
    relationshipType: string
  ) {
    if (!this[`instanceRecords${relationshipType}Cache`].has(relationshipTableKey)) {
      this[`instanceRecords${relationshipType}Cache`].set(relationshipTableKey, new WeakMap());
    }

    return this[`instanceRecords${relationshipType}Cache`].get(relationshipTableKey);
  }
  static findInstanceRelationshipRecordsFor(
    model,
    relationshipName: string,
    relationshipType: string
  ) {
    let Class = model.constructor as typeof Model;
    return this.getInstanceRecordsCacheForTableKey(
      `${Class.name}:${relationshipName}`,
      relationshipType
    ).get(model);
  }

  // Example: RelationshipDB.generateRelationshipFromPersistence(user, 'photos', 'HasMany')
  // Example: Relationship.generateRelationshipFromPersistence(user, 'email', OneToOne); // looks both sides
  // used deciding whether record should be fetched for BelongsTo, OneToOne
  // used for diffing on HasMany, BelongsTo & OneToOne(provided to CCUD and compare with newly obtained)
  static generateRelationshipFromPersistence(
    model: Model,
    relationshipName: string,
    relationshipType: string,
    RelationshipClass: typeof Model
  ) {
    // let RelationshipClass = Array.isArray(Class.relationshipSummary[relationshipName])
    //   ? Class.relationshipSummary[relationshipName][0]
    //   : Class.relationshipSummary[relationshipName];
    // TODO: these will use lookup direct cache first, then possibilities for a final snapshots. It creates a optimistic snapshot for hasMany Records
  }

  // TODO: Refactor these query methods below, logic is wrong
  // NOTE: Cache is inserted lazily for model instances, these helper methods looks it up from cache references
  static findBelongsToInstanceSnapshotFor(
    model: Model,
    relationshipName: string,
    TargetRelationship: typeof Model
  ) {
    let Class = model.constructor as typeof Model;
    let tableKey = `${Class.name}:${relationshipName}`;

    let cachedBelongsTo = peekRecord(
      TargetRelationship,
      this.instanceRecordsBelongsToCache.get(tableKey)?.get(model)
    ); // also check if it happens reverse + instanceDirect + belongsToDirect + belongsToReflection + instanceReflection

    return seekCachedValue(
      cachedBelongsTo,
      peekRecord(
        TargetRelationship,
        this.persistedRecordsBelongsToCache.get(tableKey)?.get(model[Class.primaryKeyName])
      )
    );
  }

  static findOneToOneInstanceSnapshotFor(model, relationshipName) {
    let Class = model.constructor;
    let RelationshipModel = model.relationshipSummary[relationshipName];
    let reverseRelationships = RelationshipModel.relationshipSummary;
    let targetReverseRelationshipName = Object.keys(reverseRelationships).find(
      (relationshipName) => {
        return (
          !Array.isArray(reverseRelationships[relationshipName]) &&
          reverseRelationships[relationshipName].name === Class.name
        );
      }
    );
    let targetValue = model.isNew ? model : model[Class.primaryKeyName];
    let tableKey = `${RelationshipModel.name}:${targetReverseRelationshipName}`;

    return peekRecord(
      RelationshipModel,
      seekCachedValue(
        findKeyByValue(getBelongsToRecords("instance")[tableKey], targetValue),
        findKeyByValue(getBelongsToRecords("persisted")[tableKey], targetValue)
      )
    );
  }

  // TODO: this is not right logic as HasMany might still be missing records,
  // mutation on it should be done on belongsTo(?) only on CCUD on single record

  // reflexive mutation on HasMany(?) yes can be done against the search(is it cheap(?))

  // TODO: do not use it for caching, only for diffing on CCUD for the instance cache
  static findHasManyRecordsInstanceSnapshotFor(model, relationshipName) {
    let Class = model.constructor;
    let RelationshipModel = model.relationshipSummary[relationshipName][0];
    let reverseRelationships = RelationshipModel.relationshipSummary;
    let targetReverseRelationshipName = Object.keys(reverseRelationships).find(
      (relationshipName) => {
        return (
          Array.isArray(reverseRelationships[relationshipName]) &&
          reverseRelationships[relationshipName][0].name === Class.name
        );
      }
    );
    let targetValue = model.isNew ? model : model[Class.primaryKeyName];
    let targetTableKey = `${RelationshipModel.name}:${targetReverseRelationshipName}`;
    let targetReferences = seekCachedValue(
      findKeysByValue(getBelongsToRecords("instance")[targetTableKey], targetValue), // not true
      findKeysByValue(getBelongsToRecords("persisted")[targetTableKey], targetValue)
    );

    return targetReferences.map((reference) => peekRecord(RelationshipModel, reference));
  }

  static insert(model: Model) {}

  static cache(model: Model) {}

  // TODO: does diffing for adding or replacing relationship records
  static update(model: Model) {} // NOTE: This will be used for fetch as well, when fetching no need to set anything(no storage on instanceRecordsBelongsToCache, no store smt(?))

  // NOTE: Deletes persisted to references, from references to instances from instances to relationship change
  static delete(model: Model) {
    let Class = model.constructor as typeof Model;
    let relationshipSummary = RelationshipConfig.relationshipsSummary;
    let belongsToPointers = RelationshipConfig.getBelongsToPointers(Class);
    let instanceSet = this.getModelReferences(Class).get(model[Model.primaryKeyName]);

    instanceSet.forEach((instance) => {
      this.instanceRecordsBelongsToCache.get(Class).delete(instance);
    });
    instanceSet.clear();
    instanceSet.add(model);

    let modelReference = model.isNew ? model : model[Class.primaryKeyName];
    let belongsToReferences = Object.keys(belongsToPointers).map((columnName) => {
      let targetInstance = model[belongsToPointers[columnName].relationshipName];
      let target = targetInstance[reverseRelationshipName]; // NOTE: do this to all instances(?) if needed

      if (Array.isArray(target)) {
        // hasMany reference case
        // delete from relationship if needed
      } else if (target) {
        // hasOne reference case
        // delete if needed: primaryKey match or instance
      }

      return `${belongsToPointers[columnName].relationshipClass.name}:${columnName}`;
    });

    belongsToReferences.forEach((reference) => {
      this.persistedRecordsBelongsToCache.get(reference).delete(modelReference);
    });
  }

  static clear(Class?: typeof Model) {
    if (Class) {
      // TODO: maybe add helper functions
      // Class.belongsToRelationships.forEach((relationshipName) => {
      //   this.persistedRecordsBelongsToCache.get(`${Class.name}:${relationshipName}`).clear();
      // });
      // Object.keys(RelationshipConfig.relationshipsSummary).forEach((modelName) => {
      //   if (Class.name !== modelName) {
      //     let relationshipSummary = RelationshipConfig.relationshipsSummary[modelName];
      //     Object.keys(relationshipSummary).forEach((relationshipName) => {
      //       let summaryDefinition = relationshipSummary[relationshipName];
      //       if (
      //         Array.isArray(summaryDefinition) &&
      //         summaryDefinition[0].relationshipClass.name === Class.name
      //       ) {
      //         // TODO: remove from the instances
      //       } else if (summaryDefinition.relationshipClass.name === Class.name) {
      //         // TODO: remove from persistedRecordsBelongsToCache
      //         // TODO: remove from the instances
      //       }
      //     });
      //   }
      // });
      // this.instanceReferences.get(Class.name).clear();
      // return [];
    }

    this.persistedRecordsBelongsToCache.clear();
    this.clearInstanceRelationships();

    for (const referenceMap of this.instanceReferences.values()) {
      referenceMap.clear();
    }

    return [];
  }

  static clearInstanceRelationships() {
    this.instanceRecordsBelongsToCache.clear();
    this.instanceRecordsOneToOneCache.clear();
    this.instanceRecordsHasManyCache.clear();
  }

  static getRelationshipFromInstanceCache(model: Model, relationshipName: string) {
    let Class = model.constructor;

    return this.instanceRecordsBelongsToCache
      .get(`${Class.name}:${relationshipName}`)
      ?.get(model) as void | WeakMap<Model, PrimaryKey | Model>;
  }

  // NOTE: this does fetching if needed
  static get(model: Model, relationshipName: string) {
    let Class = model.constructor;
    let map = this.instanceRecordsBelongsToCache.get(
      `${Class.name}:${relationshipName}`
    ) as WeakMap<Model, BelongsToPrimaryKey | Model>;

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

  // NOTE: this gets called lazily(!!)
  static set(model: Model, relationshipName: string, input: null | Model) {
    // NOTE: this should change models foreignKey on assignment!
    let Class = model.constructor;
    let relationshipType = getRelationshipType(model, relationshipName);
    if (relationshipType === "BelongsTo") {
      let map = this.getInstanceRecordsCacheForTableKey(
        `${Class.name}:${relationshipName}`,
        relationshipType
      );
      map.set(
        model,
        input instanceof Model
          ? input[(input.constructor as typeof Model).primaryKeyName] || input
          : null
      );
    }

    return model;
  }
}

function peekRecord(
  TargetRelationship: typeof Model,
  reference: BelongsToPrimaryKey | Model | void
) {
  return typeof reference === "number" || typeof reference === "string"
    ? TargetRelationship.peek(reference)
    : reference;
}

// function getBelongsToRecords(reference = "instance") {
//   return RelationshipConfig[
//     reference === "instance" ? "instanceRecordsBelongsToCache" : "persistedRecordsBelongsToCache"
//   ];
// }

function seekCachedValue(firstValue, secondValue) {
  return firstValue || firstValue === null ? firstValue : secondValue;
}

function findKeyByValue(map, targetValue) {
  for (const [key, value] of map.entries()) {
    if (value === targetValue) {
      return key;
    }
  }
}

function findKeysByValue(
  map: BelongsToCache<PrimaryKey | Model>,
  targetValue
): Array<PrimaryKey | Model> {
  let result = [] as Array<PrimaryKey | Model>;
  for (const [key, value] of map.entries()) {
    if (value === targetValue) {
      result.push(key);
    }
  }

  return result;
}

function buildReferenceFromPersistedCache(model: Model, relationshipName: string) {
  let Class = model.constructor as typeof Model;
  let RelationshipClass = Array.isArray(Class.relationshipSummary[relationshipName])
    ? Class.relationshipSummary[relationshipName][0]
    : Class.relationshipSummary[relationshipName];
  let relationshipType = getRelationshipType(model, relationshipName);
  let foundValue;
  if (relationshipType === "BelongsTo" || relationshipType === "OneToOne") {
    foundValue = RelationshipDB.generateRelationshipFromPersistence(
      model,
      relationshipName,
      relationshipType,
      RelationshipClass
    );
  } else if (relationshipType === "HasMany") {
    foundValue = RelationshipDB.findInstanceRelationshipRecordsFor(
      model,
      relationshipName,
      relationshipType
    );
  }

  if (foundValue || foundValue === null) {
    return foundValue;
  }

  return Class.Adapter.fetchRelationship(
    model,
    RelationshipClass,
    relationshipType,
    relationshipName
  );
}

// NOTE: this possibly causes major performance issues
// TODO: maybe this can be optimized(!!);
function getRelationshipType(model: Model, relationshipName: string): RelationshipType {
  let Class = model.constructor as typeof Model;

  if (Object.keys(Class.belongsToRelationships).find((name) => name === relationshipName)) {
    return "BelongsTo";
  } else if (Object.keys(Class.hasOneRelationships).find((name) => name === relationshipName)) {
    return "OneToOne";
  } else if (Object.keys(Class.hasManyRelationships).find((name) => name === relationshipName)) {
    return "HasMany";
  } else if (Object.keys(Class.manyToManyRelationships).find((name) => name === relationshipName)) {
    return "ManyToMany";
  }

  throw new Error(`${relationshipName} relationship not found on ${Class.name}`);
}
