import Model from "./index";
import { ModelRef } from "./index";

type DB = { [className: string]: ModelRef[] };

export default class Store {
  static _primaryKeys: { [className: string]: string } = {};
  static setPrimaryKey(Class: typeof Model, primaryKeyType: string) {
    this._primaryKeys[Class.name] = primaryKeyType;
  }
  static getPrimaryKey(Class: typeof Model): string {
    return this._primaryKeys[Class.name];
  }

  static _DB: DB = {};
  static getDB(Class: typeof Model): ModelRef[] {
    if (!this._DB[Class.name]) {
      this._DB[Class.name] = [];
    }

    return this._DB[Class.name];
  }

  static _columnNames: { [className: string]: Set<string> } = {};
  static getColumnNames(Class: typeof Model): Set<string> {
    if (!this._columnNames[Class.name]) {
      this._columnNames[Class.name] = new Set();
    }

    return this._columnNames[Class.name];
  }

  static _defaultValues: { [className: string]: Set<{ [column: string]: any }> } = {};
  static getDefaultValues(Class: typeof Model): Set<any> {
    if (!this._defaultValues[Class.name]) {
      this._defaultValues[Class.name] = new Set();
    }

    return this._defaultValues[Class.name];
  }

  // NOTE: maybe move this to serializer in future
  static _embedReferences: { [className: string]: { [columnName: string]: any } } = {};
  static getEmbedDataForSerialization(Class: typeof Model) {
    if (!this._embedReferences[Class.name]) {
      this._embedReferences[Class.name] = {};

      return this._embedReferences[Class.name];
    }

    return this._embedReferences[Class.name];
  }

  // NOTE: this could be problematic with decorators!!
  static reset() {
    this._DB = {};
    this._primaryKeys = {};
    this._columnNames = {};
    this._defaultValues = {};
    this._embedReferences = {};
  }
}
