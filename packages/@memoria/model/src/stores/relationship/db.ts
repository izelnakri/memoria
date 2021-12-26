// We should refresh/mutate caches on CCUD: create, cache(fetch), update, delete
// NOTE: Not implemented for ManyToMany which will be important
import Model from "../../model.js";
import RelationshipSchema from "./config.js";
import type { PrimaryKey } from "../../types.js";

// Types:
// instanceRecord
// generatedRecordFromPersistance
// References(Only For Records with PrimaryKey)

type RelationshipTableKey = string;
type BelongsToPrimaryKey = PrimaryKey;

// only hasMany lookups are slightly expensive, and deleting models with them, re-evaluate
// NOTE: maybe seekCachedValue() is undeed if lookups never go to persistedRecordsBelongsToCache

// TODO: NOW question is can CCUD refresh the cache correctly and fast
// TODO: in future try to optimize instanceCache(s) with id references instead of full instance variables(?)
// TODO: investigate if I can optimize or cache relatedRelationships(model) lookup(less iteration)

// TODO: optimize relationshipType lookups

// TODO: Two approaches: Update similar instances on CRUD, NOT update similar instances on CRUD, only persistedRecordsBelongsToCache, and have timeStamp for each revision(?)
// TODO: make it so lazy that most computation happens when instance is (get-ted) not even on crud(?)
export default class RelationshipDB {
  static persistedRecordsBelongsToCache: Map<
    RelationshipTableKey,
    Map<PrimaryKey, null | BelongsToPrimaryKey>
  > = new Map();

  // NOTE: this state is kept for user changes prior CRUD:
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

  // NOTE: this happens on *every* model instantiation:
  // NOTE: maybe add null too lookup keys, probably not needed at the beginning
  static instanceReferences: Map<typeof Model, Map<PrimaryKey, Set<Model>>> = new Map(); // Only used for models with id on purpose! NOTE: needed for updating instance hasMany Records

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
    if (!this.instanceReferences.has(Class)) {
      this.instanceReferences.set(Class, new Map());
    }

    return this.instanceReferences.get(Class);
  }
  static findModelReferences(Class: typeof Model, primaryKey: PrimaryKey): Set<Model> {
    let references = this.getModelReferences(Class) as Map<PrimaryKey, Set<Model>>;

    if (!references.has(primaryKey)) {
      references.set(primaryKey, new Set());
    }

    return references.get(primaryKey) as Set<Model>;
  }

  // Example: RelationshipDB.generateRelationshipFromPersistence(user, 'photos') #=> Photo[]
  // Example: Relationship.generateRelationshipFromPersistence(user, 'email'); #=> Email // looks both sides
  // used deciding whether record should be fetched for BelongsTo, OneToOne
  // used for diffing on HasMany, BelongsTo & OneToOne(provided to CCUD and compare with newly obtained) instead I do a instanceCheck wtf(?)
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
      return model[foreignKeyColumnName] && RelationshipClass.peek(model[foreignKeyColumnName]);
    } else if (relationshipType === "OneToOne") {
      return RelationshipClass.peekBy({ [reverseRelationshipForeignKeyColumnName]: primaryKey });
    } else if (relationshipType === "HasMany") {
      return filterInIterator(
        this.persistedRecordsBelongsToCache.get(
          `${RelationshipClass.name}:${reverseRelationshipName}`
        ),
        (relatedModel) => relatedModel[Class.primaryKeyName] === primaryKey
      );
    }
  }

  // NOTE: Cache is inserted lazily for model instances, these helper methods looks it up from cache references
  // TODO: do not use it for caching, only for diffing on CCUD for the instance cache, small optimization(?) can be large for HasMany
  // NOTE: this could be useful only for optimizating mutatations on similar instances for CCUD, we can also do reflexive lookup if needed
  // static findSnapshotFor(model: Model, relationshipName: string) {
  //   // TODO: problem is we dont know which one is latest, also we dont know the origin of the instance mutation reference!!
  //   // NOTE: thats why naive, update all similar instances approach seems better(but it wont update foreignKey reference changes only existing records, thats what we want(?), but its potentially slower)
  //   return (
  //     this.findInstanceRelationshipRecordsFor(model, relationshipName) ||
  //     this.generateRelationshipFromPersistence(model, relationshipName)
  //   );
  // }

  static insert(model: Model) {
    let Class = model.constructor as typeof Model;
    let primaryKey = model[Model.primaryKeyName];
    let belongsToRelationshipTable = RelationshipSchema.getRelationshipTable(Class, "BelongsTo");

    Object.keys(belongsToRelationshipTable).forEach((relationshipName) => {
      this.getPersistedRecordsCacheForTableKey(`${Class.name}:${relationshipName}`).set(
        primaryKey,
        model[belongsToRelationshipTable[relationshipName].foreignKeyColumnName]
      );
    });

    return this.updateAllInstanceRelationshipsCachesFor(model);
  }

  // TODO: this should also be done for Model.cache() ? RelationshipDB.insert(model) : RelationshipDB.update(model)
  static update(model: Model) {
    let Class = model.constructor as typeof Model;
    let primaryKey = model[Model.primaryKeyName];
    let belongsToRelationshipTable = RelationshipSchema.getRelationshipTable(Class, "BelongsTo");

    Object.keys(belongsToRelationshipTable).forEach((relationshipName) => {
      this.getPersistedRecordsCacheForTableKey(`${Class.name}:${relationshipName}`).set(
        primaryKey,
        model[belongsToRelationshipTable[relationshipName].foreignKeyColumnName]
      );
    });

    return this.updateAllInstanceRelationshipsCachesFor(model);
  }

  static updateAllInstanceRelationshipsCachesFor(model: Model) {
    // TODO: Maybe update from other side needed(?) where Class is the value NOT the key
    // recreate a temp small target Object to iterate: Map<typeof Model, { [relationshipName]: value }>
    // it should only update where the value is the same primaryKey
    let Class = model.constructor as typeof Model;
    let relationshipsToSync = Array.from(Class.relationshipNames).reduce(
      (result, relationshipName) => {
        let map = this.getInstanceRecordsCacheForTableKey(
          `${Class.name}:${relationshipName}`,
          relationshipType
        );
        let value = map.get(model);
        if (value || value === null) {
          result[relationshipName] = value;
        }

        return result;
      },
      {}
    );

    this.findModelReferences(Class, primaryKey).forEach((instance) => {
      if (instance !== model) {
        Object.keys(relationshipsToSync).forEach((relationshipName) => {
          let relationshipType; // TODO:
          let map = this.getInstanceRecordsCacheForTableKey(
            `${Class.name}:${relationshipName}`,
            relationshipType
          );
          map.set(instance, relationshipsToSync[relationshipName]); // TODO: maybe setWithRevisionIfNeeded
        });
      }
    });
  }

  // NOTE: Deletes persisted to references, from references to instances from instances to relationship change
  static delete(model: Model) {
    let Class = model.constructor as typeof Model;
    let relationshipSummary = RelationshipSchema.relationshipsSummary;
    let belongsToColumnTable = RelationshipSchema.getBelongsToColumnTable(Class);
    let instanceSet = this.getModelReferences(Class).get(model[Model.primaryKeyName]);

    instanceSet.forEach((instance) => {
      this.instanceRecordsBelongsToCache.get(Class).delete(instance);
    });
    instanceSet.clear();
    instanceSet.add(model);

    let modelReference = model.isNew ? model : model[Class.primaryKeyName];
    let belongsToReferences = Object.keys(belongsToColumnTable).map((columnName) => {
      let targetInstance = model[belongsToColumnTable[columnName].relationshipName];
      let target = targetInstance[reverseRelationshipName]; // NOTE: do this to all instances(?) if needed

      if (Array.isArray(target)) {
        // hasMany reference case
        // delete from relationship if needed
      } else if (target) {
        // hasOne reference case
        // delete if needed: primaryKey match or instance
      }

      return `${belongsToColumnTable[columnName].relationshipClass.name}:${columnName}`;
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
      // Object.keys(RelationshipSchema.relationshipsSummary).forEach((modelName) => {
      //   if (Class.name !== modelName) {
      //     let relationshipSummary = RelationshipSchema.relationshipsSummary[modelName];
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
    let relationshipType = RelationshipSchema.getRelationshipType(model, relationshipName);
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

function findInIterator(iterator, value) {
  let isFunction = typeof value === "function";
  for (let iteratorValue in iterator) {
    if (isFunction ? iteratorValue === value() : iteratorValue == value) {
      return iteratorValue;
    }
  }
}
function filterInIterator(iterator, value) {
  let result = [];
  let isFunction = typeof value === "function";
  for (let iteratorValue in iterator) {
    if (isFunction ? iteratorValue === value() : iteratorValue == value) {
      result.push(iteratorValue);
    }
  }

  return result;
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
//   return RelationshipSchema[
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
  let relationshipType = RelationshipSchema.getRelationshipType(model, relationshipName);
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
// let RelationshipClass = Array.isArray(Class.relationshipSummary[relationshipName])
//   ? Class.relationshipSummary[relationshipName][0]
//   : Class.relationshipSummary[relationshipName];
