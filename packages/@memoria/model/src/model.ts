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
  RelationshipQuery,
  RelationshipDB,
  RelationshipMutation,
  InstanceDB,
} from "./stores/index.js";
import { clearObject, primaryKeyTypeSafetyCheck } from "./utils/index.js";
import { validatePartialModelInput } from "./validators/index.js";
// import ArrayIterator from "./utils/array-iterator.js";
import type { ModelReference, RelationshipType } from "./index.js";
import definePrimaryKeySetter from "./setters/primary-key.js";
import definedColumnPropertySetter from "./setters/column-property.js";
import defineForeignKeySetter from "./setters/foreign-key.js";

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
}

export interface ModelBuildOptions extends ModelInstantiateOptions {
  revision?: boolean; // TODO: rename this to trackChanges?
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

// Document .cache() replaces existing cached record! doesnt have defaultValues
// revision strategy, create one revision for: build -> insert, update(if it updates with changes)
export default class Model {
  static Adapter: typeof MemoryAdapter = MemoryAdapter;
  static Error: typeof ModelError = ModelError;
  static Serializer: typeof Serializer = Serializer;
  static DEBUG = {
    // NOTE: Rename this to Stores
    Schema,
    DB,
    RelationshipSchema,
    RelationshipDB,
    RelationshipQuery,
    RelationshipMutation,
    InstanceDB,
  };

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
    return RelationshipSchema.getRelationshipMetadataFor(this, relationshipName);
  }

  // NOTE: transforms strings to datestrings if it is a date column, turns undefined default values to null, doesnt assign default values to an instance
  // NOTE: could do attribute tracking
  static build(buildObject: QueryObject | Model = {}, options?: ModelBuildOptions) {
    if (buildObject instanceof this) {
      if (!buildObject.isBuilt) {
        throw new Error("You should not provide an instantiated but not built model to $Model.build(model)");
      } else if (options && options.copy === false) {
        return buildObject;
      }
    }

    let buildOptions = { copy: false, revision: true, ...options };
    let model = new this(buildOptions); // TODO: Move buildObject validations here

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

    let belongsToColumnNames = RelationshipSchema.getBelongsToColumnNames(this); // NOTE: this creates Model.belongsToColumnNames once, which is needed for now until static { } Module init closure
    let belongsToTable = RelationshipSchema.getBelongsToColumnTable(this);
    let existingInstances = InstanceDB.getOrCreateExistingInstancesSet(
      model,
      buildObject,
      buildObject[this.primaryKeyName] || null
    ); // NOTE: This shouldnt create an empty set if validations fail

    Array.from(this.columnNames).forEach((columnName) => {
      if (columnName === this.primaryKeyName) {
        definePrimaryKeySetter(model, columnName, buildObject, buildOptions, existingInstances);
      } else if (belongsToColumnNames.has(columnName)) {
        defineForeignKeySetter(model, columnName, buildObject, buildOptions, belongsToTable[columnName]);
      } else if (buildOptions.revision) {
        definedColumnPropertySetter(model, columnName, buildObject, buildOptions);
      }
    });

    // NOTE: At this point model is not in existingInstances array because validations can run and throw exceptions!
    // Removed the generation on InstanceDB.getOrCreateExistingInstancesSet when primaryKey is not there
    existingInstances.add(model);

    let relationshipTable = RelationshipSchema.getRelationshipTable(this);
    Object.keys(relationshipTable).forEach((relationshipName) => {
      let buildObjectType = getBuildObjectType(buildObject, this);
      if (buildObjectType === INSTANCE_OBJECT_TYPE && RelationshipDB.has(buildObject as Model, relationshipName)) {
        RelationshipDB.set(model, relationshipName, buildObject[relationshipName]);
      } else if (buildObjectType === PURE_BUILD_OBJECT_TYPE && relationshipName in buildObject) {
        RelationshipDB.set(model, relationshipName, buildObject[relationshipName]); // TODO: There needs to be a good filter for pure object assignments
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

    // existingInstances.add(model);

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

  static peek(primaryKey: PrimaryKey | PrimaryKey[], options?: ModelBuildOptions): Model | Model[] | null {
    if (!primaryKey) {
      throw new RuntimeError(`${this.name}.find(id) or ${this.name}.peek(id) cannot be called without a valid id`);
    }

    return this.Adapter.peek(this, primaryKey, options);
  }

  static peekBy(queryObject: QueryObject, options?: ModelBuildOptions): Model | null {
    return this.Adapter.peekBy(this, validatePartialModelInput(queryObject, this), options);
  }

  static peekAll(queryObject: QueryObject = {}, options?: ModelBuildOptions): Model[] {
    return this.Adapter.peekAll(this, validatePartialModelInput(queryObject, this), options);
  }

  static async find(
    primaryKey: PrimaryKey | PrimaryKey[],
    options?: ModelBuildOptions
  ): Promise<Model | Model[] | null> {
    let result = await this.Adapter.find(this, primaryKey, options);
    if (result) {
      return Array.isArray(result)
        ? result.map((model) => RelationshipDB.cache(model, "update", model))
        : RelationshipDB.cache(result, "update", result);
    }

    return result;
  }

  static async findBy(queryObject: QueryObject, options?: ModelBuildOptions): Promise<Model | null> {
    let result = await this.Adapter.findBy(this, validatePartialModelInput(queryObject, this), options);

    return result ? RelationshipDB.cache(result, "update", result) : null;
  }

  static async findAll(queryObject: QueryObject = {}, options?: ModelBuildOptions): Promise<Model[] | null> {
    let result = await this.Adapter.findAll(this, validatePartialModelInput(queryObject, this), options);

    return result ? result.map((model) => RelationshipDB.cache(model, "update", model)) : null;
  }

  // TODO: BUG when you have relationship references but no foreign key provided as pure object then attribute dont get sent along
  static async insert(record?: QueryObject | ModelRefOrInstance, options?: ModelBuildOptions): Promise<Model> {
    if (record && record[this.primaryKeyName]) {
      primaryKeyTypeSafetyCheck(record, this);
    }

    this.setRecordInTransit(record);

    let model = await this.Adapter.insert(this, validatePartialModelInput(record, this) || {}, options);

    if (record instanceof this) {
      record.#_inTransit = false;
      record.#_isNew = false;

      clearObject(record.changes);

      revisionEnabled(options) && model.revisionHistory.add(record);
    }

    return model;
  }

  static async update(record: ModelRefOrInstance, options?: ModelBuildOptions): Promise<Model> {
    if (!record || !record[this.primaryKeyName]) {
      throw new RuntimeError(
        new Changeset(this.build(record)),
        "$Model.update() called without a record with primaryKey"
      );
    }

    primaryKeyTypeSafetyCheck(record, this);

    this.setRecordInTransit(record);

    let model = await this.Adapter.update(this, validatePartialModelInput(record, this), options);

    if (record instanceof this) {
      this.unsetRecordInTransit(record);

      clearObject(record.changes);

      revisionEnabled(options) && record.revisionHistory.add(record);
    }

    return model;
  }

  static async save(record: QueryObject | ModelRefOrInstance, options?: ModelBuildOptions): Promise<Model> {
    return shouldInsertOrUpdateARecord(this, record) === "insert"
      ? await this.Adapter.insert(this, validatePartialModelInput(record, this), options)
      : await this.Adapter.update(this, validatePartialModelInput(record, this), options);
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
    return records.some((record) => shouldInsertOrUpdateARecord(this, record) === "insert")
      ? await this.Adapter.insertAll(this, validatePartialModelInputs(records, this), options)
      : await this.Adapter.updateAll(this, validatePartialModelInputs(records, this) as ModelRefOrInstance[], options);
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

    let models = await this.Adapter.insertAll(this, validatePartialModelInputs(records, this), options);

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

    let models = await this.Adapter.updateAll(this, validatePartialModelInputs(records, this), options);

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

  private static setRecordInTransit(record: any) {
    if (record instanceof this) {
      record.#_inTransit = true;
    }
  }

  private static unsetRecordInTransit(record: any) {
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

  get isInMemoryCachedRecord() {
    let Class = this.constructor as typeof Model;

    return this === Class.Cache.get(this[Class.primaryKeyName]);
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

  get changeset() {
    return new Changeset(this, this.changes);
  }

  get fetchedRelationships() {
    return Object.keys(RelationshipSchema.getRelationshipTable(this.constructor as typeof Model)).filter(
      (relationshipName) => RelationshipDB.has(this, relationshipName)
    );
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

function validatePartialModelInputs(objects: QueryObject[], Class: typeof Model) {
  return objects.map((object) => validatePartialModelInput(object, Class));
}
