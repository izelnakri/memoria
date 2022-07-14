// NOTE: should create EnumFreeze.method() that freezes the return value of the method?

export default class Enum {
  // NOTE: maybe get the Array.prototype functions here directly(?)

  static uniqBy(array: Array<any>, key: string): any[] {
    let foundValues: string[] = [];
    return array.reduce((result, element) => {
      if (key in element && foundValues.indexOf(element[key]) === -1) {
        foundValues.push(element[key]);
        result.push(element);
      }

      return result;
    }, []);
  }

  static mapBy(array: Array<any>, key: string): any[] {
    return array.map((element) => element[key]);
  }

  // arr.objectsAt([2, 3, 4]);  // ['c', 'd', undefined]
  static objectsAt(array: Array<any>, indexes: number[]): any[] {
    return indexes.map((index) => array[index]);
  }

  static sortBy<T>(array: Array<T>, key: string): Array<T> {
    return array.map((element) => element)
      .sort((a, b) => a[key] - b[key]);
  }

  static findBy(array: Array<any>, key: string, value: any): any {
    return array.find((element) => element[key] === value);
  }

  static filterBy<T>(array: Array<T>, key: string, value: any): Array<T> {
    return array.filter((element) => element[key] === value);
  }

  static getProperties(array: Array<any>, keys: Array<string>): any[] {
    return array.map((element) => {
      return keys.reduce((result, key) => {
        return Object.assign(result, { [key]: element[key] });
      }, {});
    });
  }

  static invoke(array: Array<any>, methodName: string, ...args: Array<any>): any[] {
    return array.map((element) => element[methodName](...args));
  }

  static isAny(array: Array<any>, key: string, value: any): boolean {
    return array.some((element) => element[key] === value);
  }

  static isEvery(array: Array<any>, key: string, value: any): boolean {
    return array.every((element) => element[key] === value);
  }
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
