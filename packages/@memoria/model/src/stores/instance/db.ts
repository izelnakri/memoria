import Model from "../../model.js";
import type { PrimaryKey } from "../../types.js";

type ModelName = string;
// type BelongsToPrimaryKey = PrimaryKey;
type QueryObject = { [key: string]: any };

// TODO: two things: build({ id: 5 }) could be isNew BUT may have id: 5 persisted in database

export default class InstanceDB {
  // NOTE: It is needed for updating instance hasMany Records and deleting references of not persisted records which hold persisted deleted record
  static knownInstances: Map<ModelName, Map<PrimaryKey, Set<Model>>> = new Map();
  static unknownInstances: Map<ModelName, Array<Set<Model>>> = new Map(); // NOTE: also do primaryKey setting handling(!!) there needs to be a warning on this, this needs to be clear

  static getAllKnownReferences(Class: typeof Model) {
    if (!this.knownInstances.has(Class.name)) {
      this.knownInstances.set(Class.name, new Map());
    }

    return this.knownInstances.get(Class.name) as Map<PrimaryKey, Set<Model>>;
  }

  static getAllUnknownInstances(Class: typeof Model) {
    if (!this.unknownInstances.has(Class.name)) {
      this.unknownInstances.set(Class.name, []);
    }

    return this.unknownInstances.get(Class.name) as Array<Set<Model>>;
  }

  static getAllReferences(Class: typeof Model) : Array<Set<Model>> {
    return Array.from(this.getAllKnownReferences(Class).values())
      .concat(this.getAllUnknownInstances(Class));
  }

  static getReferences(model: Model) : Set<Model> | void { // NOTE: this includes the model itself
    let Class = model.constructor as typeof Model;

    return model[Class.primaryKeyName] ?
      this.getAllKnownReferences(Class).get(model[Class.primaryKeyName as string]) :
      this.getAllUnknownInstances(Class).find((modelSet) => modelSet.has(model));
  }
}
