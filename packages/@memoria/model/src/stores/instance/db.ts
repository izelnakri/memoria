import Model from "../../model.js";
import type { PrimaryKey } from "../../types.js";

type ModelName = string;
type JSObject = { [key: string]: any };
type ModelReferences = Set<Model>;

export default class InstanceDB {
  // NOTE: It is needed for updating instance hasMany Records and deleting references of not persisted records which hold persisted deleted record
  static knownInstances: Map<ModelName, Map<PrimaryKey, Set<Model>>> = new Map();
  static unknownInstances: Map<ModelName, Array<Set<Model>>> = new Map();
  static persistedModels: Map<ModelName, Map<PrimaryKey, Model>> = new Map();

  static getAllKnownReferences(Class: typeof Model) {
    if (!this.knownInstances.has(Class.name)) {
      this.knownInstances.set(Class.name, new Map());
    }

    return this.knownInstances.get(Class.name) as Map<PrimaryKey, Set<Model>>;
  }

  static getAllUnknownInstances(Class: typeof Model): Array<Set<Model>> {
    if (!this.unknownInstances.has(Class.name)) {
      this.unknownInstances.set(Class.name, []);
    }

    return this.unknownInstances.get(Class.name) as Array<Set<Model>>;
  }

  static getAllReferences(Class: typeof Model): Array<Set<Model>> {
    return Array.from(this.getAllKnownReferences(Class).values()).concat(this.getAllUnknownInstances(Class));
  }

  static getPersistedModels(Class: typeof Model) {
    if (!this.persistedModels.has(Class.name)) {
      this.persistedModels.set(Class.name, new Map());
    }

    return this.persistedModels.get(Class.name);
  }

  static isPersisted(modelReferences: ModelReferences) {
    return modelReferences.values().next().value.isPersisted;
  }

  static makeModelPersisted(model: Model) {
    let Class = model.constructor as typeof Model;
    let persistedModelsMap = this.getPersistedModels(Class);

    persistedModelsMap.set(model[Class.primaryKeyName as string], model);
  }

  static getReferences(model: Model): Set<Model> {
    // NOTE: this includes the model itself
    let Class = model.constructor as typeof Model;

    return model[Class.primaryKeyName]
      ? (this.getAllKnownReferences(Class).get(model[Class.primaryKeyName as string]) as Set<Model>)
      : this.getAllUnknownInstances(Class).find((modelSet) => modelSet.has(model)) ||
          (Array.from(this.getAllKnownReferences(Class).values()).find((set) => set.has(model)) as Set<Model>);
  }

  static getOrCreateExistingInstancesSet(model: Model, buildObject: JSObject, primaryKey?: PrimaryKey) {
    let Class = model.constructor as typeof Model;

    if (primaryKey) {
      let references = this.getAllKnownReferences(Class);
      let foundInstanceSet = references.get(primaryKey);
      if (!foundInstanceSet) {
        foundInstanceSet = new Set();
        references.set(primaryKey, foundInstanceSet);
      }

      return foundInstanceSet;
    } else if (buildObject instanceof Model) {
      let references = this.getAllUnknownInstances(Class);
      let foundInstanceSet = references.find((modelSet) => modelSet.has(buildObject as Model));
      if (!foundInstanceSet) {
        foundInstanceSet = new Set([model]);
        foundInstanceSet.add(model);
        references.push(foundInstanceSet);
      }

      return foundInstanceSet;
    }

    let foundInstanceSet: Set<Model> = new Set([model]);
    this.getAllUnknownInstances(Class).push(foundInstanceSet);

    return foundInstanceSet;
  }
}
