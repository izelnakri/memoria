import Model from "../model.js";
import ConfigStore from "./configuration.js";
import { generateUUID } from "../utils.js";
import type { ColumnSchemaDefinition, ColumnDefinition } from "../types";

type DB = { [className: string]: Model[] };

interface DefaultValueReferences {
  [columnName: string]: any; // this can be literally any value but also 'increment', 'uuid', Date
}

export default class ModelStore {
  static _DB: DB = {};
  static getDB(Class: typeof Model): Model[] {
    if (!this._DB[Class.name]) {
      this._DB[Class.name] = [];
    }

    return this._DB[Class.name];
  }

  static _cacheTimeouts = {};
  static setTimeout(cachedModel: Model, timer: number) {
    let Klass = cachedModel.constructor as typeof Model;
    let primaryKey = cachedModel[Klass.primaryKeyName];
    if (!this._cacheTimeouts[Klass.name]) {
      this._cacheTimeouts[Klass.name] = {};
    } else if (this._cacheTimeouts[Klass.name][primaryKey]) {
      clearTimeout(this._cacheTimeouts[Klass.name][primaryKey]);
    }

    if (timer === 0) {
      Klass.Adapter.unload(Klass, cachedModel);
      return;
    }

    this._cacheTimeouts[Klass.name][primaryKey] = setTimeout(
      () => Klass.Adapter.unload(Klass, cachedModel),
      timer
    );
    return this._cacheTimeouts[Klass.name][primaryKey];
  }

  static _defaultValuesCache: {
    [className: string]: {
      insert: DefaultValueReferences;
      update: DefaultValueReferences;
      delete: DefaultValueReferences;
    };
  } = {};
  static getDefaultValues(
    Class: typeof Model,
    operationType: "insert" | "update" | "delete"
  ): DefaultValueReferences {
    if (Class.name in this._defaultValuesCache) {
      return this._defaultValuesCache[Class.name][operationType];
    }

    let columns = ConfigStore.getColumnsMetadata(Class) as ColumnSchemaDefinition;
    this._defaultValuesCache[Class.name] = Object.keys(columns).reduce(
      (result, columnName: string) => {
        let column = columns[columnName] as ColumnDefinition;

        if (column.default) {
          Object.assign(result.insert, { [columnName]: column.default });
        } else if (column.createDate) {
          Object.assign(result.insert, { [columnName]: () => new Date() });
        } else if (column.updateDate) {
          Object.assign(result.insert, { [columnName]: () => new Date() });
          Object.assign(result.update, { [columnName]: () => new Date() });
        } else if (column.deleteDate) {
          Object.assign(result.delete, { [columnName]: () => new Date() });
        } else if (column.generated) {
          Object.assign(result.insert, {
            [columnName]:
              column.generated === "uuid"
                ? generateUUID
                : (Class: typeof Model) => incrementId(Class.Cache as Model[], columnName),
          });
        }

        return result;
      },
      { insert: {}, update: {}, delete: {} }
    );

    return this._defaultValuesCache[Class.name][operationType];
  }

  // TODO: make this name more explicit: smt like resetCacheForTests() perhaps, or resetCache()
  static async resetForTests(): Promise<ConfigStore> {
    await Promise.all(ConfigStore.Adapters.map((Adapter) => Adapter.resetForTests(ConfigStore)));

    return this;
  }
}

// TODO: turn this into a sequence so no need for sorting, faster inserts
function incrementId(DB: Model[], keyName: string) {
  if (!DB || DB.length === 0) {
    return 1;
  }

  let lastIdInSequence = DB.map((model) => model[keyName]).sort((a, b) => a - b);
  // .find((id, index, array) => (index === array.length - 1 ? true : id + 1 !== array[index + 1])); // NOTE: this fills gaps! Maybe mismatches SQL DB implementation
  return lastIdInSequence[lastIdInSequence.length - 1] + 1;
}
