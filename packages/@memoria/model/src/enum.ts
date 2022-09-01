import compare from "./utils/compare.js";
import { get } from "./utils/object.js";
import deepEqual from "./utils/deep-equal.js";
import match from "./utils/match.js";

// TODO: provide object interface for these:
// mapBy(array), findBy(object), uniqBy(array), sortBy(array), filterBy(object), isAny(object), isEvery(object)
// NOTE: maybe get the Array.prototype functions here directly(?)
export default class Enum {
  static uniqBy(array: Array<any>, key: string): any[] {
    let foundValues = [] as any[];
    return array.reduce((result, element) => {
      if (!Reflect.has(element, key)) {
        throw new Error(`uniqBy: Key ${key} not found in an element of the array.`);
      }

      let targetValue = get(element, key);
      if (!isInFoundValues(foundValues, targetValue)) {
        foundValues.push(targetValue);
        result.push(element);
      }

      return result;
    }, []);
  }

  static mapBy(array: Array<any>, key: string): any[] {
    return array.map((element) => {
      if (!Reflect.has(element, key)) {
        throw new Error(`mapBy: Key ${key} not found in an element of the array.`);
      }

      return get(element, key);
    });
  }

  static objectsAt(array: Array<any>, indexes: number[]): any[] {
    return indexes.map((index) => array[index]);
  }

  static sortBy<T>(array: Array<T>, ..._key: string[]): Array<T> {
    let sortKeys = Array.isArray(arguments[1]) ? arguments[1] : Array.from(arguments).slice(1);

    return Array.from(array).sort((elementOne, elementTwo) => {
      for (let i = 0; i < sortKeys.length; i++) {
        let key = sortKeys[i];
        let compareValue = compare(get(elementOne, key), get(elementTwo, key));
        if (compareValue) {
          return compareValue; // return 1 or -1 else continue to the next sortKey
        }
      }

      return 0;
    });
  }

  static findBy(array: Array<any>, key: string, value: any): any {
    return array.find((element) => match(get(element, key), value)) || null;
  }

  static filterBy<T>(array: Array<T>, key: string, value: any): Array<T> {
    return array.filter((element) => match(get(element, key), value));
  }

  static getProperties(array: Array<any>, keys: Array<string>): any[] {
    return array.map((element) => {
      return keys.reduce((result, key) => Object.assign(result, { [key]: element[key] }), {});
    });
  }

  static isAny(array: Array<any>, key: string, value: any): boolean {
    return array.some((element) => match(get(element, key), value));
  }

  static isEvery(array: Array<any>, key: string, value: any): boolean {
    return array.every((element) => match(get(element, key), value));
  }
}

function isInFoundValues(foundValues: any[], value: any): boolean {
  return foundValues.some((foundValue) => deepEqual(foundValue, value));
}

// NOTE: maybe in future when |> in JS: add concat, find, includes, filter, indexOf, at, reverse, get, set, shift,
// unshift, slice,splice, push, sort, uniq, without, forEach, map, reduce, reduceRight etc from Elixir

// From Elixir: every/all, any, at, chunk_by, chunk_every, concat, count, countUntil, dedup(uniq), uniqBy,
// drop(like shift, but can accept negative index for inverse and returns the array itself), dropEvery, dropWhile
// forEach, isEmpty, fetch(?, maybe better than at cuz throw and returns existance + value), find, filter, findIndex,
// findValue(The return value is considered to be found when the result is truthy), flat, flatMap, frequencies
// frequenciesBy, groupBy, Enum.of()(deep and shallow copy(?)), join, map, mapEvery, mapJoin, mapReduce, max, maxBy,
// includes, min, minBy, minMax, minMaxBy, product(?), random, reduce, reverse, slice, sort, sortBy, sum, take(?)
// withIndex(?), | insertAt, removeAt
