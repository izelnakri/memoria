import Model from "../model.js";
import { transformValue } from "../serializer.js";
import type { ModelBuildOptions } from "../model.js";

type QueryObject = { [key: string]: any };

export default function defineColumnPropertySetter(model: Model, columnName: string, buildObject: QueryObject | Model = {}, buildOptions: ModelBuildOptions) {
  let cache = getTransformedValue(model, columnName, buildObject);

  return Object.defineProperty(model, columnName, {
    configurable: false,
    enumerable: true,
    get() {
      return cache;
    },
    set(value) {
      if (this[columnName] === value) {
        return value;
      } else if (value instanceof Date && this[columnName] && this[columnName].toJSON() === value.toJSON()) {
        return;
      }

      cache = value === undefined ? null : value;

      buildOptions.revision && dirtyTrackAttribute(this, columnName, cache);
    },
  });
}

function getTransformedValue(model: Model, keyName: string, buildObject?: QueryObject | Model) {
  return buildObject && keyName in buildObject
    ? transformValue(model.constructor as typeof Model, keyName, buildObject[keyName])
    : model[keyName] || null;
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
