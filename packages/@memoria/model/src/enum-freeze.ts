import Enum from "./enum.js";

// NOTE: only guarantees return value is frozen, not that the object is frozen
export default class EnumFreeze {
  static uniqBy(array: Array<any>, key: string): readonly any[] {
    return Object.freeze(Enum.uniqBy(array, key));
  }

  static mapBy(array: Array<any>, key: string): readonly any[] {
    return Object.freeze(Enum.mapBy(array, key));
  }

  static objectsAt(array: Array<any>, indexes: number[]): readonly any[] {
    return Object.freeze(Enum.objectsAt(array, indexes));
  }

  static sortBy(array: Array<any>, ..._key: string[]): readonly any[] {
    return Object.freeze(Enum.sortBy(array, ...arguments));
  }

  static findBy(array: Array<any>, key: string, value: any): any {
    return Object.freeze(Enum.findBy(array, key, value));
  }

  static filterBy(array: Array<any>, key: string, value: any): readonly any[] {
    return Object.freeze(Enum.filterBy(array, key, value));
  }

  static getProperties(array: Array<any>, keys: Array<string>): readonly any[] {
    return Object.freeze(Enum.getProperties(array, keys));
  }

  static isAny(array: Array<any>, key: string, value: any): boolean {
    return Object.freeze(Enum.isAny(array, key, value));
  }

  static isEvery(array: Array<any>, key: string, value: any): boolean {
    return Object.freeze(Enum.isEvery(array, key, value));
  }
}
