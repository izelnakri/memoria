import Model from "../model.js";
import InstanceDB from "../stores/instance/db.js";
import type { ModelBuildOptions } from "../model.js";
import { removeFromArray } from "../utils/index.js";

export type PrimaryKey = number | string;

type QueryObject = { [key: string]: any };

export default function definePrimaryKeySetter(model: Model, columnName: string, buildObject: QueryObject | Model = {}, buildOptions: ModelBuildOptions, existingInstances: Set<Model>) {
  let Class = model.constructor as typeof Model;
  let primaryKey = buildObject[Class.primaryKeyName] || null;

  return Object.defineProperty(model, columnName, {
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

        return buildOptions.revision && dirtyTrackAttribute(this, columnName, targetValue);
      }

      let knownReferencesForTargetValue = InstanceDB.getAllKnownReferences(Class).get(targetValue);
      if (knownReferencesForTargetValue && knownReferencesForTargetValue !== existingInstances) {
        throw new Error(
          `${Class.name}:${targetValue} already exists in cache. Build a class with ${Class.name}.build({ ${columnName}:${targetValue} }) instead of mutating it!`
        );
      }

      let oldPrimaryKey = primaryKey;
      primaryKey = targetValue;

      if (buildOptions.revision) {
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
