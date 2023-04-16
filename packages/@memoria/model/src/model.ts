// NOTE: put a warning about extending $Model.insert() with not persisted model instances for $Model.insert(), $Model.cache(), update, delete, insertAll, updateAll, deleteAll. Extensions should care about relationships
import { MemoryAdapter } from "@memoria/adapters";
import { underscore } from "inflected";
import Changeset from "./changeset.js";
import RevisionHistory from "./revision-history.js";
import Serializer, { transformValue } from "./serializer.js";
import { CacheError, ModelError, RuntimeError } from "./errors/index.js";
import {
  Schema,
  DB,
  RelationshipSchema,
  RelationshipDB,
  RelationshipUtils,
  RelationshipQuery,
  InstanceDB,
} from "./stores/index.js";
import { clearObject, primaryKeyTypeSafetyCheck, removeFromArray } from "./utils/index.js";
// import ArrayIterator from "./utils/array-iterator.js";
import type { ModelReference, RelationshipType } from "./index.js";
import HasManyArray from "./has-many-array.js";

export type PrimaryKey = number | string;
type QueryObject = { [key: string]: any };
type ModelRefOrInstance = ModelReference | Model;

const INVALID_BUILD_OBJECT_TYPE = Symbol("null");
const INSTANCE_OBJECT_TYPE = Symbol("instance");
const PURE_BUILD_OBJECT_TYPE = Symbol("object");

interface ModelInstantiateOptions {
  isNew?: boolean;
  isDeleted?: boolean;
  freeze?: boolean;
  // isLastVerifiedInstance: boolean; // or keep a record of snapshots and revisionHistory is the same(?)
}

// model.changeset -> this will have the metadata, but gets generated lazily
// model.changes -> this will have the actual changes and diffing from the previous source record
// model.revision -> this will have the previous source record(?) very error prone

// instanceMetadata
// So model.revision needs to change, get revision.builtAt, reason, and source, revision(needs to be previous model, test this always)
// what interface to get models.instanceMetadata(?) -> { } exposes the private properties

// cached model could have a hasMany and hasOne(?) and it gets locked there(?)
export interface ModelBuildOptions extends ModelInstantiateOptions {
  revision?: boolean;
  cacheDuration?: number; // NOTE: rename it to cacheDuration
  copy?: boolean; // NOTE: it copies by default
  // debug?:
  // tracer?:
  // include?: // NOTE: would be a useful addition for JSONAPIAdapter & GraphQLAdapter
  // source: // build reason
  // builtAt: // build timestamp
}

const LOCK_PROPERTY = {
  configurable: false,
  enumerable: false,
  writable: false,
};

// Make params use match() internally: Email.findBy({ user: userInstance });

// Document .cache() replaces existing cached record! doesnt have defaultValues
// revision strategy, create one revision for: build -> insert, update(if it updates with changes)
// TODO: it can also be that InstanceDB null primaryKey instances need to be moved over on isNew when building or setting.
export default class Model {
  static Adapter: typeof MemoryAdapter = MemoryAdapter;
  static Error: typeof ModelError = ModelError;
  static Serializer: typeof Serializer = Serializer;
  static DEBUG = { Schema, DB, RelationshipSchema, RelationshipDB, RelationshipQuery, InstanceDB };

  static get Cache() {
    return DB.getDB(this);
  }

  static get tableName(): string {
    return underscore(this.name); // TODO: add entity.tableName || underscore(this.name) when feature is available
  }

  static get primaryKeyName(): string {
    return Schema.getPrimaryKeyName(this);
  }

  static get primaryKeyType(): "uuid" | "id" {
    return Schema.getColumnsMetadataFrom(this)[this.primaryKeyName].generated === "uuid" ? "uuid" : "id";
  }

  static get columnNames(): Set<string> {
    return Schema.getColumnNames(this);
  }

  static get relationshipNames(): Set<string> {
    return new Set(Object.keys(RelationshipSchema.getRelationshipTable(this)));
  }

  static getRelationshipTable(relationshipType?: RelationshipType) {
    return RelationshipSchema.getRelationshipTable(this, relationshipType);
  }

  static getMetadataForRelationship(relationshipName: string) {
    return RelationshipSchema.getRelationshipMetadataFor(this, relationshipType);
  }

  // NOTE: transforms strings to datestrings if it is a date column, turns undefined default values to null, doesnt assign default values to an instance
  // NOTE: could do attribute tracking
  // NOTE: test also passing new Model() instances
  // TODO: also invalidate the unpersistedReferenceGroup for RelationshipDB.cache() and delete
  // TODO: in future build tests and assertion throw for changing existing primaryKey to smt else and handle null to smt-else(throw if target primarykey exists)

  // revisionHistory should it be from buildObject or existingInstances, or should there be metadata to check
  static build(buildObject: QueryObject | Model = {}, options?: ModelBuildOptions) {
    if (buildObject instanceof this) {
      if (!buildObject.isBuilt) {
        throw new Error("You should not provide an instantiated but not built model to $Model.build(model)");
      } else if (options && options.copy === false) {
        return buildObject;
      }
    }

    let model = new this(options); // NOTE: this could be changed to only on { copy: true } and make it mutate on other cases
    let primaryKey = buildObject[this.primaryKeyName] || null;
    let existingInstances = InstanceDB.getOrCreateExistingInstancesSet(model, buildObject, primaryKey);

    if (buildObject) {
      if (buildObject.revisionHistory) {
        buildObject.revisionHistory.forEach((revision) => {
          model.revisionHistory.push({ ...revision });
        });
      }
      if (buildObject.changes) {
        Object.keys(buildObject.changes).forEach((key) => {
          model.changes[key] = buildObject.changes[key];
        });
      }
      if (buildObject instanceof this && buildObject.isPersisted) {
        InstanceDB.makeModelPersisted(model);
      }
    }

    let Class = this;
    let belongsToColumnNames = RelationshipSchema.getBelongsToColumnNames(this); // NOTE: this creates Model.belongsToColumnNames once, which is needed for now until static { } Module init closure
    let belongsToTable = RelationshipSchema.getBelongsToColumnTable(this);
    let attributeTrackingEnabledForModel = attributeTrackingEnabled(options);

    Array.from(this.columnNames).forEach((columnName) => {
      if (columnName === this.primaryKeyName) {
        Object.defineProperty(model, columnName, {
          configurable: false,
          enumerable: true,
          get() {
            return primaryKey;
          },
          set(value) {
            let targetValue = value === undefined ? null : value;
            if (this[columnName] === targetValue) {
              return;
            } else if (Class.Cache.get(primaryKey)) {
              throw new Error(
                `${Class.name}:${primaryKey} exists in persisted cache, you can't mutate this records primaryKey ${columnName} without unloading it from cache`
              );
            } else if (targetValue === null) {
              let foundKnownReferences = InstanceDB.getAllKnownReferences(Class).get(primaryKey);
              if (foundKnownReferences) {
                InstanceDB.getAllKnownReferences(Class).delete(primaryKey);
                InstanceDB.getAllUnknownInstances(Class).push(existingInstances);

                existingInstances.forEach((instance) => {
                  if (instance !== this) {
                    instance[columnName] = null;
                  }
                });
              }

              primaryKey = targetValue;

              return attributeTrackingEnabledForModel && dirtyTrackAttribute(this, columnName, targetValue);
            }

            let knownReferencesForTargetValue = InstanceDB.getAllKnownReferences(Class).get(targetValue);
            if (knownReferencesForTargetValue && knownReferencesForTargetValue !== existingInstances) {
              throw new Error(
                `${Class.name}:${targetValue} already exists in cache. Build a class with ${Class.name}.build({ ${columnName}:${targetValue} }) instead of mutating it!`
              );
            }

            let oldPrimaryKey = primaryKey;
            primaryKey = targetValue;

            if (attributeTrackingEnabledForModel) {
              dirtyTrackAttribute(this, columnName, targetValue);
            }

            if (knownReferencesForTargetValue) {
              return;
            } else if (oldPrimaryKey) {
              InstanceDB.getAllKnownReferences(Class).delete(oldPrimaryKey);
              InstanceDB.getAllKnownReferences(Class).set(primaryKey, existingInstances);

              return existingInstances.forEach((instance) => {
                if (instance !== this) {
                  instance[columnName] = primaryKey;
                }
              });
            }

            let unknownInstances = InstanceDB.getAllUnknownInstances(Class);
            if (unknownInstances.includes(existingInstances)) {
              removeFromArray(unknownInstances, existingInstances);

              existingInstances.forEach((instance) => {
                if (instance !== this) {
                  instance[columnName] = primaryKey;
                }
              });

              InstanceDB.getAllKnownReferences(Class).set(targetValue, existingInstances as Set<Model>);
            }
          },
        });
      } else if (attributeTrackingEnabledForModel || belongsToColumnNames.has(columnName)) {
        let cache = getTransformedValue(model, columnName, buildObject);

        return Object.defineProperty(model, columnName, {
          configurable: false,
          enumerable: true,
          get() {
            return cache;
          },
          set(value) {
            if (this[columnName] === value) {
              return;
            } else if (value instanceof Date && this[columnName] && this[columnName].toJSON() === value.toJSON()) {
              return;
            }

            cache = value === undefined ? null : value;

            if (attributeTrackingEnabledForModel) {
              dirtyTrackAttribute(this, columnName, cache);
            }

            // TODO: clean this part up
            if (belongsToColumnNames.has(columnName)) {
              let { RelationshipClass, relationshipName } = belongsToTable[columnName];
              let relationshipCache = RelationshipDB.findRelationshipCacheFor(Class, relationshipName, "BelongsTo");
              let existingRelationship = relationshipCache.get(this);
              let existingRelationshipPrimaryKey =
                existingRelationship && existingRelationship[RelationshipClass.primaryKeyName];
              if (relationshipCache.has(this) && existingRelationshipPrimaryKey !== cache) {
                let metadata = RelationshipSchema.getRelationshipMetadataFor(Class, relationshipName);
                let reverseRelationshipCache =
                  RelationshipDB.findRelationshipCacheFor(
                    metadata.RelationshipClass,
                    metadata.reverseRelationshipName as string,
                    "OneToOne"
                  ) ||
                  RelationshipDB.findRelationshipCacheFor(
                    metadata.RelationshipClass,
                    metadata.reverseRelationshipName as string,
                    "HasMany"
                  );
                if (existingRelationship) {
                  RelationshipUtils.cleanRelationshipsOn(
                    this,
                    existingRelationship,
                    metadata,
                    relationshipCache,
                    reverseRelationshipCache,
                    false
                  );

                  relationshipCache.delete(this);
                }
              } else if (!relationshipCache.has(this)) {
                let metadata = RelationshipSchema.getRelationshipMetadataFor(Class, relationshipName);
                let reverseRelationshipCache =
                  RelationshipDB.findRelationshipCacheFor(
                    metadata.RelationshipClass,
                    metadata.reverseRelationshipName as string,
                    "OneToOne"
                  ) ||
                  RelationshipDB.findRelationshipCacheFor(
                    metadata.RelationshipClass,
                    metadata.reverseRelationshipName as string,
                    "HasMany"
                  );
                let reverseRelationshipInstances: Model[] = reverseRelationshipCache
                  ? InstanceDB.getAllReferences(RelationshipClass).reduce((result: Model[], instanceSet) => {
                      instanceSet.forEach((possibleRelationship) => {
                        let reverseRelationshipResult = reverseRelationshipCache.get(possibleRelationship);
                        if (reverseRelationshipResult === this) {
                          result.push(possibleRelationship);
                        } else if (
                          Array.isArray(reverseRelationshipResult) &&
                          reverseRelationshipResult.includes(this)
                        ) {
                          // result.push(possibleRelationship); // TODO: what to do about this when building hasMany(?)
                        }
                      });
                      return result;
                    }, [])
                  : [];
                if (metadata.reverseRelationshipName) {
                  reverseRelationshipInstances.forEach((reverseRelationshipInstance) => {
                    reverseRelationshipCache.delete(reverseRelationshipInstance);
                  });
                }
              }
            }
          },
        });
      }

      model[columnName] = getTransformedValue(model, columnName, buildObject);
    });

    let relationshipTable = RelationshipSchema.getRelationshipTable(this);
    Object.keys(relationshipTable).forEach((relationshipName) => {
      // TODO: Move all this to a function(?) and clean it up

      let buildObjectType = getBuildObjectType(buildObject, this);
      if (buildObjectType === INSTANCE_OBJECT_TYPE) {
        if (RelationshipDB.has(buildObject as Model, relationshipName)) {
          // NOTE: this messes up nulled belongsTo relationship with foreignKey value(?) - where??
          RelationshipDB.set(model, relationshipName, buildObject[relationshipName]);
        } else {
          // TODO: these caches can be old references as models do get updates, thats why its bad
          // let instanceRelationship = RelationshipDB.findPersistedRecordRelationshipsFor(model, relationshipName);
          // if (instanceRelationship) {
          //   let relationshipCache = RelationshipDB.findRelationshipCacheFor(
          //     Class,
          //     relationshipName,
          //     relationshipTable[relationshipName].relationshipType
          //   );
          //   relationshipCache.set(
          //     model,
          //     Array.isArray(instanceRelationship)
          //       ? new HasManyArray(instanceRelationship, model, relationshipTable[relationshipName])
          //       : instanceRelationship
          //   );
          //   // RelationshipDB.set(model, relationshipName, instanceRelationship);
          // }
        }
      } else if (buildObjectType === PURE_BUILD_OBJECT_TYPE) {
        // debugger;
        if (relationshipName in buildObject) {
          RelationshipDB.set(model, relationshipName, buildObject[relationshipName]);
        } else {
          // TODO: these caches can be old references as models do get updates, thats why its bad
          // let targetRelationship = RelationshipDB.getLastReliableRelationshipFromCache(
          //   model,
          //   relationshipName,
          //   relationshipTable[relationshipName].relationshipType
          // );
          // if (targetRelationship) {
          //   let relationshipCache = RelationshipDB.findRelationshipCacheFor(
          //     Class,
          //     relationshipName,
          //     relationshipTable[relationshipName].relationshipType
          //   );
          //   relationshipCache.set(
          //     model,
          //     Array.isArray(targetRelationship)
          //       ? new HasManyArray(targetRelationship, model, relationshipTable[relationshipName])
          //       : targetRelationship
          //   );
          //   // RelationshipDB.set(model, relationshipName, targetRelationship);
          // }
        }
      }

      Object.defineProperty(model, relationshipName, {
        configurable: false,
        enumerable: true,
        get() {
          return RelationshipDB.get(model, relationshipName);
        },
        set(value) {
          return RelationshipDB.set(model, relationshipName, value);
        },
      });
    });

    existingInstances.add(model);

    return revisionAndLockModel(model, options, buildObject);
  }

  // NOTE: assigns provided values when key is in Model.columnNames, ignores the rest
  static assign(
    model: Model | ModelRefOrInstance | QueryObject,
    objectToAssign: ModelRefOrInstance | QueryObject
  ): Model | ModelRefOrInstance | QueryObject {
    this.columnNames.forEach((columnName) => {
      model[columnName] = transformValue(this, columnName, objectToAssign[columnName]);
    });

    return model; // NOTE: maybe also clear sourceModel.changes;
  }

  // NOTE: this proxies to adapter because JSONAPIAdapter could do its own for example, even when 2nd arg is model instance not payload
  // That payload parsing can happen in the Adapter.cache() the method can recursively call itself & handle payloads in 2nd arg
  static cache(model: ModelRefOrInstance | ModelRefOrInstance[], options?: ModelBuildOptions): Model | Model[] {
    if (Array.isArray(model)) {
      return model.map((singleModel) => this.cache(singleModel, options)) as Model[];
    } else if (!model[this.primaryKeyName]) {
      throw new RuntimeError(new Changeset(this.build(model, { isNew: false })), {
        id: null,
        modelName: this.name,
        attribute: this.primaryKeyName,
        message: "doesn't exist",
      });
    }

    primaryKeyTypeSafetyCheck(model, this);

    // NOTE: this creates revision only for update and if model is not an instance, maybe it shouldnt create on every update when no change is there

    return this.Adapter.cache(this, model, options);
  }

  static resetCache(targetState?: ModelRefOrInstance[], options?: ModelBuildOptions): Model[] {
    checkProvidedFixtures(this, targetState, options);

    return this.Adapter.resetCache(this, targetState, options);
  }

  static async resetRecords(targetState?: ModelRefOrInstance[], options?: ModelBuildOptions): Promise<Model[]> {
    checkProvidedFixtures(this, targetState, options);

    return await this.Adapter.resetRecords(this, targetState, options);
  }

  static peek(primaryKey: PrimaryKey | PrimaryKey[], options?: ModelBuildOptions): Model | Model[] | void {
    if (!primaryKey) {
      throw new RuntimeError(`${this.name}.find(id) or ${this.name}.peek(id) cannot be called without a valid id`);
    }

    return this.Adapter.peek(this, primaryKey, options);
  }

  static peekBy(queryObject: QueryObject, options?: ModelBuildOptions): Model | void {
    return this.Adapter.peekBy(this, queryObject, options);
  }

  static peekAll(queryObject: QueryObject = {}, options?: ModelBuildOptions): Model[] {
    return this.Adapter.peekAll(this, queryObject, options);
  }

  // TODO this might need improved revision control
  static async find(primaryKey: PrimaryKey | PrimaryKey[], options?: ModelBuildOptions): Promise<Model | Model[] | void> {
    let result = await this.Adapter.find(this, primaryKey, options);
    if (result) {
      return Array.isArray(result)
        ? result.map((model) => RelationshipDB.cache(model, "update", model))
        : RelationshipDB.cache(result, "update", result);
    }
  }

  static async findBy(queryObject: QueryObject, options?: ModelBuildOptions): Promise<Model | void> {
    let result = await this.Adapter.findBy(this, queryObject, options);
    if (result) {
      return RelationshipDB.cache(result, "update", result);
    }
  }

  static async findAll(queryObject: QueryObject = {}, options?: ModelBuildOptions): Promise<Model[] | void> {
    let result = await this.Adapter.findAll(this, queryObject, options);
    if (result) {
      return result.map((model) => RelationshipDB.cache(model, "update", model));
    }
  }

  static async insert(record?: QueryObject | ModelRefOrInstance, options?: ModelBuildOptions): Promise<Model> {
    if (record && record[this.primaryKeyName]) {
      primaryKeyTypeSafetyCheck(record, this);
    }

    this.setRecordInTransit(record);

    let model = await this.Adapter.insert(this, record || {}, options);

    if (record instanceof this) {
      record.#_inTransit = false;
      record.#_isNew = false;

      clearObject(record.changes);

      revisionEnabled(options) && model.revisionHistory.add(record);
    }

    return model;
  }

  // cacheTimeout clearing absolutely needed for update(then find should also be able to change it)
  static async update(record: ModelRefOrInstance, options?: ModelBuildOptions): Promise<Model> {
    if (!record || !record[this.primaryKeyName]) {
      throw new RuntimeError(
        new Changeset(this.build(record)),
        "$Model.update() called without a record with primaryKey"
      );
    }

    primaryKeyTypeSafetyCheck(record, this);

    this.setRecordInTransit(record);

    let model = await this.Adapter.update(this, record, options);

    if (record instanceof this) {
      this.unsetRecordInTransit(record);

      clearObject(record.changes);

      revisionEnabled(options) && record.revisionHistory.add(record);
    }

    return model;
  }

  static async save(record: QueryObject | ModelRefOrInstance, options?: ModelBuildOptions): Promise<Model> {
    return shouldInsertOrUpdateARecord(this, record) === "insert"
      ? await this.Adapter.insert(this, record, options)
      : await this.Adapter.update(this, record, options);
  }

  static unload(record: ModelRefOrInstance, options?: ModelBuildOptions): Model {
    if (!record) {
      throw new RuntimeError(new Changeset(this.build(record)), "unload() called without a valid record");
    }

    return this.Adapter.unload(this, record, options);
  }

  static async delete(record: ModelRefOrInstance, options?: ModelBuildOptions): Promise<Model> {
    if (!record || !record[this.primaryKeyName]) {
      throw new RuntimeError(
        new Changeset(this.build(record)),
        "$Model.delete() called without a record with primaryKey"
      );
    }

    primaryKeyTypeSafetyCheck(record, this);

    this.setRecordInTransit(record);

    let result = await this.Adapter.delete(this, record, options);

    if (record instanceof this) {
      record.#_inTransit = false;
      record.#_isDeleted = true;
    }

    return result as Model;
  }

  static async saveAll(records: QueryObject[] | ModelRefOrInstance[], options?: ModelBuildOptions): Promise<Model[]> {
    return records.every((record) => shouldInsertOrUpdateARecord(this, record) === "update")
      ? await this.Adapter.updateAll(this, records as ModelRefOrInstance[], options)
      : await this.Adapter.insertAll(this, records, options);
  }

  static async insertAll(records: QueryObject[], options?: ModelBuildOptions): Promise<Model[]> {
    if (!records || records.length === 0) {
      throw new RuntimeError("$Model.insertAll(records) called without records");
    }

    try {
      records.reduce((result, record) => {
        if (record[this.primaryKeyName]) {
          primaryKeyTypeSafetyCheck(record, this);

          let primaryKey = record[this.primaryKeyName] as PrimaryKey;
          if (primaryKey && result.includes(primaryKey)) {
            throw new RuntimeError(
              `${this.name}.insertAll(records) have duplicate primary key "${primaryKey}" to insert`
            );
          }

          result.push(primaryKey);
        }

        this.setRecordInTransit(record);

        return result;
      }, []);
    } catch (error) {
      records.forEach((record) => this.unsetRecordInTransit(record));
      throw error;
    }

    let models = await this.Adapter.insertAll(this, records, options);

    records.forEach((record) => {
      if (record instanceof this) {
        this.unsetRecordInTransit(record);
        clearObject(record.changes);

        revisionEnabled(options) && record.revisionHistory.add(record);
      }
    });

    return models;
  }

  static async updateAll(records: ModelRefOrInstance[], options?: ModelBuildOptions): Promise<Model[]> {
    if (!records || records.length === 0) {
      throw new RuntimeError("$Model.updateAll(records) called without records");
    }

    records.forEach((record) => {
      if (!record[this.primaryKeyName]) {
        throw new RuntimeError(
          new Changeset(this.build(record)),
          "$Model.updateAll() called without records having primaryKey"
        );
      }
      primaryKeyTypeSafetyCheck(record, this);

      this.setRecordInTransit(record);
    });

    let models = await this.Adapter.updateAll(this, records, options);

    records.forEach((record) => {
      if (record instanceof this) {
        this.unsetRecordInTransit(record);
        clearObject(record.changes);
        revisionEnabled(options) && record.revisionHistory.add(record);
      }
    });

    return models;
  }

  static unloadAll(records?: ModelRefOrInstance[], options?: ModelBuildOptions): Model[] {
    return this.Adapter.unloadAll(this, records, options);
  }

  static async deleteAll(records: ModelRefOrInstance[], options?: ModelBuildOptions): Promise<Model[]> {
    if (!records || records.length === 0) {
      throw new RuntimeError("$Model.deleteAll(records) called without records");
    }

    records.forEach((record) => {
      if (!record[this.primaryKeyName]) {
        throw new RuntimeError(
          new Changeset(this.build(record)),
          "$Model.deleteAll() called without records having primaryKey"
        );
      }

      primaryKeyTypeSafetyCheck(record, this);

      this.setRecordInTransit(record);
    });

    let models = await this.Adapter.deleteAll(this, records, options);

    records.forEach((record) => {
      if (record instanceof this) {
        this.unsetRecordInTransit(record);
        record.isDeleted = true;
      }
    });

    return models;
  }

  static async count(options?: QueryObject): Promise<number> {
    return await this.Adapter.count(this, options);
  }

  static serializer(objectOrArray: Model | Model[]) {
    if (!objectOrArray) {
      return;
    } else if (Array.isArray(objectOrArray)) {
      return (objectOrArray as Array<Model>).map((object) => this.Serializer.serialize(this, object));
    }

    return this.Serializer.serialize(this, objectOrArray as Model);
  }

  static serialize(object: Model) {
    return this.Serializer.serialize(this, object as Model);
  }

  private static setRecordInTransit(record) {
    if (record instanceof this) {
      record.#_inTransit = true;
    }
  }

  private static unsetRecordInTransit(record) {
    if (record instanceof this) {
      record.#_inTransit = false;
    }
  }

  constructor(options?: ModelInstantiateOptions) {
    Object.defineProperty(this, "changes", LOCK_PROPERTY);
    Object.defineProperty(this, "revisionHistory", LOCK_PROPERTY);

    if (options) {
      if ("isNew" in options) {
        this.#_isNew = options.isNew as boolean;
      }
      if ("isDeleted" in options) {
        this.#_isDeleted = options.isDeleted as boolean;
      }
      if ("freeze" in options) {
        this.#_isFrozen = options.freeze as boolean;
      }
    }
  }

  changes: QueryObject = Object.create(null); // NOTE: instead I could also create it between revision / instance diff
  revisionHistory = new RevisionHistory();

  // TODO: is this correct across instances(?)
  get revision() {
    return this.revisionHistory[this.revisionHistory.length - 1] || Object.create(null);
  }

  #_errors: ModelError[] = [];
  get errors(): ModelError[] {
    return this.#_errors;
  }
  set errors(newError: ModelError[]) {
    this.#_errors = newError;
  }

  #_isNew = true;
  get isNew() {
    return this.#_isNew;
  }
  set isNew(value) {
    this.#_isNew = !!value;
  }

  get isBuilt() {
    return Object.isSealed(this);
  }

  #_isFrozen = false;
  get isFrozen() {
    return this.#_isFrozen;
  }

  get isPersisted() {
    let Class = this.constructor as typeof Model;

    return !!InstanceDB.getPersistedModels(Class).get(this[Class.primaryKeyName]);
  }

  #_isDeleted = false;
  get isDeleted() {
    return this.#_isDeleted;
  }
  set isDeleted(value) {
    this.#_isDeleted = !!value;
    this.#_isNew = !value;
  }

  #_inTransit = false;
  get inTransit() {
    return this.#_inTransit;
  }

  get isDirty() {
    return Object.keys(this.changes).length > 0;
  }

  get isLastPersisted() {
    let Class = this.constructor as typeof Model;

    return InstanceDB.getPersistedModels(Class).get(this[Class.primaryKeyName]) === this;
  }

  // get instanceMetadata() {
  //   return {
  //     builtAt: this.#builtAt,
  //     builtBy: this.#builtBy,
  //   };
  // }

  // TODO: this creates it lazy and everytime
  get changeset() {
    return new Changeset(this, this.changes);
  }

  get fetchedRelationships() {
    let Class = this.constructor as typeof Model;
    let relationshipTable = RelationshipSchema.getRelationshipTable(Class);

    // TODO: should I need to include persistedCache(?)
    return Object.keys(relationshipTable).filter((relationshipName) => {
      return RelationshipDB.has(this, relationshipName);
    });
  }

  changedAttributes() {
    if (this.revisionHistory.length === 0) {
      throw new RuntimeError("Tried to call model.changedAttributes() on untracked model, use $Model.build()");
    }

    return Object.keys(this.changes).reduce((result, keyName) => {
      return Object.assign(result, { [keyName]: [this.revision[keyName], this.changes[keyName]] });
    }, {});
  }

  rollbackAttributes() {
    if (this.revisionHistory.length === 0) {
      throw new RuntimeError("Tried to call model.rollbackAttributes() on untracked model, use $Model.build()");
    }

    return Object.keys(this.changes).reduce((result, columnName) => {
      result[columnName] = this.revision[columnName];
      return result;
    }, this);
  }

  toObject() {
    return Array.from((this.constructor as typeof Model).columnNames).reduce((result, columnName) => {
      result[columnName] = this.revision[columnName];
      return result;
    }, Object.create(null));
  }

  toJSON() {
    return (this.constructor as typeof Model).Serializer.serialize(this.constructor as typeof Model, this);
  }

  async reload() {
    let Class = this.constructor as typeof Model;

    return await Class.Adapter.find(Class, this[Class.primaryKeyName]);
  }
}

function revisionEnabled(options?: ModelBuildOptions) {
  return !options || options.revision !== false;
}

function shouldInsertOrUpdateARecord(
  Class: typeof Model,
  record: QueryObject | ModelRefOrInstance
): "insert" | "update" {
  if (!record[Class.primaryKeyName]) {
    return "insert";
  } else if (record instanceof Class) {
    return record.isNew ? "insert" : "update";
  } else if (Class.Cache.get(record[Class.primaryKeyName])) {
    return "update";
  }

  return "insert";
}

function checkProvidedFixtures(Class: typeof Model, fixtureArray, buildOptions) {
  if (Array.isArray(fixtureArray)) {
    fixtureArray.reduce((primaryKeys: Set<PrimaryKey>, targetFixture) => {
      primaryKeyTypeSafetyCheck(targetFixture, Class);

      let primaryKey = targetFixture[Class.primaryKeyName];
      if (!primaryKey) {
        throw new CacheError(new Changeset(Class.build(targetFixture, buildOptions)), {
          id: null,
          modelName: Class.name,
          attribute: Class.primaryKeyName,
          message: "is missing",
        });
      } else if (primaryKeys.has(primaryKey)) {
        throw new RuntimeError(
          `${Class.name}.resetCache(records) have duplicate primary key "${primaryKey}" in records`
        );
      }

      return primaryKeys.add(primaryKey);
    }, new Set([]));
  }
}

function attributeTrackingEnabled(options?: ModelBuildOptions) {
  return !options || options.revision !== false;
}

function dirtyTrackAttribute(model: Model, columnName: string, value: any) {
  if (model.revision[columnName] === value) {
    delete model.changes[columnName];
  } else {
    model.changes[columnName] = value;
  }

  model.errors.forEach((error, errorIndex) => {
    if (error.attribute === columnName) {
      model.errors.splice(errorIndex, 1);
    }
  });
}

function getTransformedValue(model: Model, keyName: string, buildObject?: QueryObject | Model) {
  return buildObject && keyName in buildObject
    ? transformValue(model.constructor as typeof Model, keyName, buildObject[keyName])
    : model[keyName] || null;
}

function getBuildObjectType(buildObject: any, Class: typeof Model) {
  if (!buildObject) {
    return INVALID_BUILD_OBJECT_TYPE;
  } else if (buildObject instanceof Class) {
    return INSTANCE_OBJECT_TYPE;
  } else if (typeof buildObject === "object") {
    return PURE_BUILD_OBJECT_TYPE;
  }

  return INVALID_BUILD_OBJECT_TYPE;
}

function revisionAndLockModel(model, options?, buildObject?) {
  revisionEnabled(options) &&
    !(buildObject instanceof Model && buildObject.isBuilt) &&
    model.revisionHistory.add(model);

  return options && options.freeze ? (Object.freeze(model) as Model) : Object.seal(model);
}
