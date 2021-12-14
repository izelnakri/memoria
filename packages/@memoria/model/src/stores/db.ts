import Model from "../model.js";
import Config from "./config.js";
import { generateUUID } from "../utils.js";
import type {
  PrimaryKey,
  ModuleDatabase,
  ColumnSchemaDefinition,
  ColumnDefinition,
} from "../types";

type ModuleSavedRecordDatabase<Value> = ModuleDatabase<Map<PrimaryKey, Value>>;

interface DefaultValueReferences {
  [columnName: string]: any; // NOTE: this can be literally any value but also 'increment', 'uuid', Date
}

// TODO: remove resetForTests from everything, rename it to resetRecords
export default class DB {
  static _DB: ModuleSavedRecordDatabase<Model> = new Map();
  static getDB(Class: typeof Model): Map<PrimaryKey, Model> {
    if (!this._DB.has(Class.name)) {
      this._DB.set(Class.name, new Map());
    }

    return this._DB.get(Class.name) as Map<PrimaryKey, Model>;
  }

  static _cacheTimeouts: ModuleSavedRecordDatabase<number> = new Map();
  static setTimeout(cachedModel: Model, timer: number) {
    let Class = cachedModel.constructor as typeof Model;
    let primaryKey = cachedModel[Class.primaryKeyName];
    let TimeoutDB = this._cacheTimeouts.get(Class.name) || new Map();

    if (!this._cacheTimeouts.has(Class.name)) {
      this._cacheTimeouts.set(Class.name, TimeoutDB);
    } else if (TimeoutDB.get(primaryKey)) {
      clearTimeout(TimeoutDB.get(primaryKey));
    }

    if (timer === 0) {
      Class.Adapter.unload(Class, cachedModel);
      return;
    }

    TimeoutDB.set(
      primaryKey,
      setTimeout(() => Class.Adapter.unload(Class, cachedModel), timer)
    );

    return TimeoutDB.get(primaryKey);
  }

  static _defaultValuesCache: ModuleDatabase<{
    insert: DefaultValueReferences;
    update: DefaultValueReferences;
    delete: DefaultValueReferences;
  }> = new Map();
  static getDefaultValues(
    Class: typeof Model,
    operationType: "insert" | "update" | "delete"
  ): DefaultValueReferences {
    let defaultValues = this._defaultValuesCache.get(Class.name);
    if (defaultValues) {
      return defaultValues[operationType];
    }

    let columns = Config.getColumnsMetadata(Class) as ColumnSchemaDefinition;
    let target = Object.keys(columns).reduce(
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
                : (Class: typeof Model) => incrementId(Class.Cache),
          });
        }

        return result;
      },
      { insert: {}, update: {}, delete: {} }
    );
    this._defaultValuesCache.set(Class.name, target);

    return target[operationType];
  }

  // TODO: make this name more explicit: smt like resetCacheForTests() perhaps, or resetCache()
  static async resetForTests(): Promise<Config> {
    await Promise.all(Config.Adapters.map((Adapter) => Adapter.resetForTests(Config)));

    return this;
  }
}

// TODO: turn this into a sequence so no need for sorting, faster inserts
function incrementId(DB: Map<PrimaryKey, Model>) {
  if (!DB || DB.size === 0) {
    return 1;
  }

  return (Array.from(DB.keys())[DB.size - 1] as number) + 1; // NOTE: maybe instead do [...map][map.size-1][0]
}
