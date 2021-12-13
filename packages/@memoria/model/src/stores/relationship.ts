import Model from "../model.js";
import ConfigStore from "./configuration.js";

type RelationshipType = "BelongsTo" | "OneToOne" | "HasMany" | "ManyToMany";

// TODO: we need to expose this cache to outside changes for "deletion"

// Refresh the cache each time it is retrieved(?)
// type SingularRelationshipValue = null | Model | Promise<Model>;
// type ManyRelationshipValue = null | Model[] | Promise<Model[]>;
// type SingularRelationshipStore = { [relationshipName: string]: SingularRelationshipValue };
// type ManyRelationshipStore = { [relationshipName: string]: ManyRelationshipValue };

// set() model reference could always be the stored model, but then id: null needs its own
// maybe make Cache buckets Class scoped, so its easier to clear
export default class RelationshipStore {
  static BelongsToCache = new WeakMap(); // maybe source primaryKey:
  static OneToOneCache = new WeakMap();

  static HasManyCache = new WeakMap(); // NOTE: when a record gets removed it should also be removed from the array
  static ManyToManyCache = new WeakMap();

  static set(model: Model, relationshipName: string, input: null | Model) {
    let Class = model.constructor as typeof Model;
    let relationshipType = getRelationshipType(model, relationshipName);
    let cache = this[`${relationshipType}Cache`].get(model);
    if (cache) {
      Object.assign(cache, { [relationshipName]: input });
    } else {
      // TODO: this should set the peeked Record or the model but when model change it should also reverse back to peeked Record
      this[`${relationshipType}Cache`].set(model, { [relationshipName]: input });
    }

    if (relationshipType === "BelongsTo") {
      model[ConfigStore.getBelongsToForeignKey(Class, relationshipName)] = input
        ? input[Class.belongsToRelationships[relationshipName].primaryKeyName] || null
        : null;
    }

    return input;
  }

  // NOTE: should refresh the cache all the time
  static get(model: Model, relationshipName: string) {
    let Class = model.constructor as typeof Model;
    let relationshipType = getRelationshipType(model, relationshipName);
    // TODO: this should set the peeked Record or the model but when model change it should also reverse back to peeked Record
    let targetRelationships = this[`${relationshipType}Cache`].get(model);
    if (!targetRelationships) {
      return;
    }

    let cache = targetRelationships[relationshipName];

    if (relationshipType === "BelongsTo") {
      let RelationshipClass = Class.relationshipSummary[relationshipName] as typeof Model;
      let primaryKey = model[ConfigStore.getBelongsToForeignKey(Class, relationshipName) as string];
      if (primaryKey) {
        return RelationshipClass.peek(primaryKey) || cache || RelationshipClass.find(primaryKey);
      }

      return cache || null;
    }

    return cache || null; // TODO: adjust this for hasMany, hasOne, and ManyToMany.
  }

  // static delete(model: Model) {
  //   // TODO: maybe this should really remove it by brute force, no WeakMap
  //   this.BelongsToCache.get(model) ? this.BelongsToCache.delete(model) : null;
  //   this.OneToOneCache.get(model) ? this.OneToOneCache.delete(model) : null;
  //   this.HasManyCache.get(model) ? this.HasManyCache.delete(model) : null;
  //   this.ManyToManyCache.get(model) ? this.ManyToManyCache.delete(model) : null;
  //   // TODO: go over all existing relationships and remove this from their relationship
  // }

  static clear() {
    this.BelongsToCache = new WeakMap();
    this.OneToOneCache = new WeakMap();
    this.HasManyCache = new WeakMap();
    this.ManyToManyCache = new WeakMap();
  }

  // static findRelatedRecords(model: Model) {
  //   // TODO: this is like reverse search to get them
  //   // result should be { foundModel: { relationshipName: inputModel } }
  //   this.BelongsToCache.reduce((result, model) => {
  //     let relationshipSummary =

  //     return result;
  //   }, {});
  // }

  // NOTE: maybe make every relationship, a relationship instance(?), probably not
}

// NOTE: this possibly causes major performance issues
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
