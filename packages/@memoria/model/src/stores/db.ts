import Model from "../model.js";
import Schema from "./schema.js";
import { generateUUID } from "../utils/index.js";
import type { PrimaryKey, ModuleDatabase, ColumnSchemaDefinition, ColumnDefinition } from "../types.js";

type ModuleSavedRecordDatabase<Value> = ModuleDatabase<Map<PrimaryKey, Value>>;

interface DefaultValueReferences {
  [columnName: string]: any; // NOTE: this can be literally any value but also 'increment', 'uuid', Date
}

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
      return Class.Cache.get(primaryKey) && Class.Adapter.unload(Class, cachedModel);
    }

    TimeoutDB.set(
      primaryKey,
      setTimeout(() => Class.Cache.get(primaryKey) && Class.Adapter.unload(Class, cachedModel), timer)
    );

    return TimeoutDB.get(primaryKey);
  }

  static _defaultValuesCache: ModuleDatabase<{
    insert: DefaultValueReferences;
    update: DefaultValueReferences;
    delete: DefaultValueReferences;
  }> = new Map();
  static getDefaultValues(Class: typeof Model, operationType: "insert" | "update" | "delete"): DefaultValueReferences {
    let defaultValues = this._defaultValuesCache.get(Class.name);
    if (defaultValues) {
      return defaultValues[operationType];
    }

    let columns = Schema.getColumnsMetadataFrom(Class) as ColumnSchemaDefinition;
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
              column.generated === "uuid" ? generateUUID : (Class: typeof Model) => incrementId(Class.Cache),
          });
        }

        return result;
      },
      { insert: {}, update: {}, delete: {} }
    );
    this._defaultValuesCache.set(Class.name, target);

    return target[operationType];
  }

  static async resetCache(): Promise<Schema> {
    for (const map of this._DB.values()) {
      map.clear();
    }

    return this;
  }

  static async resetRecords(): Promise<Schema> {
    await Promise.all(Schema.Adapters.map((Adapter) => Adapter.resetRecords()));

    return this;
  }
}

function incrementId(DB: Map<PrimaryKey, Model>) {
  if (!DB || DB.size === 0) {
    return 1;
  }

  return (Array.from(DB.keys())[DB.size - 1] as number) + 1; // NOTE: maybe instead do [...map][map.size-1][0]
}
