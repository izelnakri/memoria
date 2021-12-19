import Model from "../../model.js";
import RelationshipConfig from "./config.js";
import type { PrimaryKey } from "../../types.js";

// Mutation functions:
// referenceAdd()
// referenceChange()
// referenceDelete() all intendend with setReference() atm

type RelationshipType = "BelongsTo" | "OneToOne" | "HasMany" | "ManyToMany";
type RelationshipTableKey = string;
type BelongsToPrimaryKey = PrimaryKey;

// Refresh the cache each time it is retrieved(?), no: instead we mutate it on insert, update, delete, and fetch

// only hasMany lookups are slightly expensive, and deleting models with them
// NOTE: maybe seekCachedValue() is undeed if lookups never go to persistedRecordsBelongsToCache

// NOTE: Not adjusted for ManyToMany which will be important
export default class RelationshipDB {
  static persistedRecordsBelongsToCache: Map<
    RelationshipTableKey,
    Map<PrimaryKey, BelongsToPrimaryKey>
  > = new Map();
  static instanceRecordsBelongsToCache: Map<
    RelationshipTableKey,
    WeakMap<Model, BelongsToPrimaryKey | Model>
  > = new Map(); // this is important because we dont want to change the persisted record, reretrival NOTE: make query methods account for this, we cant make this a weakMap in future(?) Map<RelationshipTableKey, WeakMap<Key, BelongsToPrimaryKey | Model>>
  static instanceReferences: Map<typeof Model, Map<PrimaryKey, Set<Model>>> = new Map(); // Only used for models with id on purpose! NOTE: needed for updating instance hasMany Records

  static getModelReferences(Class: typeof Model) {
    if (!this.instanceReferences.has(Class)) {
      this.instanceReferences.set(Class, new Map());
    }

    return this.instanceReferences.get(Class);
  }
  static findModelReferences(Class: typeof Model, primaryKey: PrimaryKey): Set<Model> {
    let references = this.getModelReferences(Class) as Map<PrimaryKey, Set<Model>>;

    return (references.has(primaryKey) ? references.get(primaryKey) : references.set(primaryKey, new Set())) as Set<Model>;
  }
  static getInstanceRecordsBelongsToCache(relationshipTableKey: string) {
    if (!this.instanceRecordsBelongsToCache.has(relationshipTableKey)) {
      this.instanceRecordsBelongsToCache.set(relationshipTableKey, new WeakMap());
    }

    return this.instanceRecordsBelongsToCache.get(relationshipTableKey) as WeakMap<Model, BelongsToPrimaryKey | Model>;
  }

  // NOTE: Cache is inserted lazily for model instances, these helper methods looks it up from cache references
  static findBelongsToFor(
    model: Model,
    relationshipName: string,
    TargetRelationship: typeof Model
  ) {
    let Class = model.constructor as typeof Model;
    let tableKey = `${Class.name}:${relationshipName}`;
    let cachedBelongsTo = peekRecord(
      TargetRelationship,
      this.instanceRecordsBelongsToCache.get(tableKey)?.get(model)
    );

    return model.isNew
      ? cachedBelongsTo
      : seekCachedValue(
          peekRecord(
            TargetRelationship,
            this.persistedRecordsBelongsToCache.get(tableKey)?.get(model[Class.primaryKeyName])
          ),
          cachedBelongsTo
        );
  }

  static findOneToOneFor(model, relationshipName) {
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

  // NOTE: a persistance cannot update an instances hasMany yet, this is a problem, special array proxy can solve this problem
  static findHasManyRecordsFor(model, relationshipName) {
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
      findKeysByValue(getBelongsToRecords("instance")[targetTableKey], targetValue),
      findKeysByValue(getBelongsToRecords("persisted")[targetTableKey], targetValue)
    );

    return targetReferences.map((reference) => peekRecord(RelationshipModel, reference));
  }

  static insert(model: Model) {}

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
    this.instanceRecordsBelongsToCache.clear();

    for (const referenceMap of this.instanceReferences.values()) {
      referenceMap.clear();
    }

    return [];
  }

  static getRelationshipFromInstanceCache(model: Model, relationshipName: string) {
    let Class = model.constructor;

    return this.instanceRecordsBelongsToCache
      .get(`${Class.name}:${relationshipName}`)
      ?.get(model) as void | WeakMap<Model, PrimaryKey | Model>;
  }

  // NOTE: this does fetching if needed
  static getReference(model: Model, relationshipName: string) {
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
  static setReference(model: Model, relationshipName: string, input: null | Model) { // NOTE: this should change models foreignKey on assignment!
    let Class = model.constructor;
    let map = this.getInstanceRecordsBelongsToCache(`${Class.name}:${relationshipName}`);
    let relationshipType = getRelationshipType(model, relationshipName);
    if (relationshipType === "BelongsTo") {
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

function getBelongsToRecords(reference = "instance") {
  return RelationshipConfig[
    reference === "instance" ? "instanceRecordsBelongsToCache" : "persistedRecordsBelongsToCache"
  ];
}

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
  if (relationshipType === "BelongsTo") {
    let foundValue = RelationshipDB.findBelongsToFor(model, relationshipName, RelationshipClass);
    if (!foundValue && foundValue !== null) {
      return Class.Adapter.fetchRelationship(
        model,
        relationshipName,
        relationshipType,
        RelationshipClass
      );
    }
  }
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
