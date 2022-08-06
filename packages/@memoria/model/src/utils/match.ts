import typeOf, { OBJECT_TYPES } from './type-of.js';
import type { JSObject } from './object.js';
import { get } from './object.js';
import deepEqual from './deep-equal.js';
import getCyclicalReferences from './get-cyclical-references.js';

export const CONSTRUCTORS_THAT_DONT_NEED_TO_INITIALIZE = new Set(['String', 'Number', 'Boolean']);

// it is like deepEqual(?) array works like inside check has One check, but object has a strict check(?)[no should be includes instead too]
// empty object should be strict empty object but having values mean object should have one value
// same applies to empty array



// array + set + fileList uses matchArray(very complex), Map uses matchMap, object uses recursive match() + on everyTrue
export default function match(item: any, patternExpression: any): boolean;
export default function match(item: any[], patternExpression: any[]): boolean;
export default function match(item: JSObject, patternExpression: any): boolean {
  if (item === patternExpression) {
    return true;
  }

  let propertiesType = typeOf(patternExpression);
  if (propertiesType === 'nan') {
    return isNaN(item as any);
  } else if (propertiesType === 'class') {
    if (patternExpression.name === 'Symbol') {
      return item === patternExpression || typeOf(item) === 'symbol';
    } else if (CONSTRUCTORS_THAT_DONT_NEED_TO_INITIALIZE.has(patternExpression.name)) {
      return item === patternExpression || item.constructor === patternExpression;
    }

    return item === patternExpression
      || item instanceof patternExpression
      || itemConstructorIsInConstructorChain(item, patternExpression);
  } else if (Array.isArray(patternExpression)) {
    // TODO: check circular
    if (item instanceof Set) {
      return matchArray(Array.from(item), patternExpression);
    }

    return Array.isArray(item) ? matchArray(item, patternExpression) : false;
  } else if (propertiesType === 'map') {
    // TODO: check circular
    return typeOf(item) === 'map' ? matchMap(item as Map<any, any>, patternExpression) : false;
  } else if (OBJECT_TYPES.has(propertiesType) || OBJECT_TYPES.has(typeOf(item))) {
    if (propertiesType === 'object' && typeOf(item) === 'map') {
      if (item.size === 0) {
        return Object.keys(patternExpression).length === 0;
      }

      // TODO: check circular, filter for every
      // TODO: check and filter circular properties, one/two level deep(?) <- patternExpression can be levels deep circular
      // NOTE: this is harder because Map keys are not only strings(!!)
      let targetItem = Object.fromEntries(item as Map<any, any>);

      // IDEAL ITERATION: iterate from patternExpression, function could be run on every key/value matches

      return Object.getOwnPropertyNames(patternExpression)
        .every((propertyName) => match(targetItem[propertyName], patternExpression[propertyName]));
    } else if (propertiesType === 'object' && Object.keys(patternExpression).length === 0) {
      return typeOf(item) === 'object' && Object.keys(item).length === 0;
    } else if (!item || propertiesType !== 'object' && !(item instanceof patternExpression.constructor)) {
      return false;
    }

    let patternsCylicalReferences = getCyclicalReferences(patternExpression); // this should be single level(!!) due to every calling match again
    let patternsCylicalReferenceKeys = Object.keys(patternsCylicalReferences);
    // NOTE: maybe needs itemsCyclicalReferences filtering for shortcircuit a infinite loop
    if (patternsCylicalReferenceKeys.length > 0) {
      debugger;
      let patternsCylicalReferencesFlat = flattenKeys(patternsCylicalReferences);
      if (!Object.keys(patternsCylicalReferencesFlat).every((refKeyName) => deepEqual(get(patternExpression, refKeyName), get(item, refKeyName)))) { // NOTE: make this deepEqual probably in future
        return false;
      }
    }

    let patternKeys = patternsCylicalReferenceKeys.length === 0
      ? Object.getOwnPropertyNames(patternExpression)
      : Object.getOwnPropertyNames(patternExpression).reduce((result, keyName: string) => {
          if (!patternsCylicalReferenceKeys.includes(keyName)) {
            result.push(keyName);
          }

          return result;
        }, [] as string[]);

    return patternKeys.every((propertyName) => match(item[propertyName], patternExpression[propertyName]));
  } else if (propertiesType === 'date') {
    return typeOf(item) === 'date' ? patternExpression.getTime() === item.getTime() : false;
  } else if (propertiesType === 'set') {
    return typeOf(item) === 'set' ? matchArray(Array.from(item as Set<any>), Array.from(patternExpression)) : false;
  } else if (propertiesType === 'function') {
    return typeOf(item) === 'function' ? item.toString() === patternExpression.toString() : false;
  } else if (propertiesType === 'regexp') {
    return String(item) === String(patternExpression) || patternExpression.test(item);
  } else if (propertiesType === 'symbol') {
    return typeOf(item) === 'symbol' ? item.toString() === patternExpression.toString() : false;
  } else if (propertiesType === 'filelist') {
    return typeOf(item) === 'filelist' ? matchArray(Array.from(item as any[]), Array.from(patternExpression)) : false;
  }

  return false;
}

function itemConstructorIsInConstructorChain(item: Object, constructor: Object) {
  if (item === constructor) {
    return true;
  } else if (Object.getPrototypeOf(item)) {
    return itemConstructorIsInConstructorChain(Object.getPrototypeOf(item), constructor);
  }

  return false
}

function matchArray(items: any[], patternSetArray: any[]): boolean {
  if (patternSetArray.length > items.length) {
    return false;
  } else if (patternSetArray.length === 0) {
    return items.length === 0;
  }

  // TODO: Check if these are needed(probably)
  // let patternsCylicalReferences = getCyclicalReferences(patternSetArray); // this should be single level(!!) due to every calling match again
  // let itemsCyclicalReferences = getCyclicalReferences(items);
  // if (patternsCylicalReferences.size > 0) {
  //   debugger;
  //   // TODO: TODO: TODO:TODO:TODO:TODO:TODO:TODO:TODO:TODO:TODO:TODO:TODO: -> Start from here everything
  //   // TODO: this is wrong because this only gives the fucking indexed zeroes without the content!!
  //   if (!Array.from(patternsCylicalReferences).every((reference) => itemsCyclicalReferences.has(reference))) {
  //     return false;
  //   }
  // }

  // let patternsArrayToLookup = patternsCylicalReferences.size === 0
  //   ? patternSetArray
  //   : patternSetArray.reduce((result, value) => {
  //       if (!patternsCylicalReferences.has(value)) {
  //         result.push(value);
  //       }

  //       return result;
  //     }, [] as any[]);



  // NOTE: remove from items as well
  // let itemsToLookup = Array.from(items).reduce((result, value) => {

  // });
  let itemsToLookup = Array.from(items);

  for (let i = 0; i < patternSetArray.length; i++) {
    let foundItemIndex = itemsToLookup.findIndex((item) => match(item, patternSetArray[i]));
    if (foundItemIndex === -1) {
      return false;
    }

    itemsToLookup.splice(foundItemIndex, 1);
  }

  return true;
}

// in future maybe figure out a way to matchMap() with less iteration(do circular check against patternMap and avoidance just-in-time)
function matchMap(itemMap: Map<any, any>, patternMap: Map<any, any>): boolean {
  // TODO: this should check circular internally
  if (patternMap.size > itemMap.size) {
    return false;
  } else if (patternMap.size === 0) {
    return itemMap.size === 0;
  }

  // let patternMapIsCyclical = isCyclical(patternMap);
  // TODO: also return the key that is cyclical
  // return single cyclical instance reference or many if an object has several(?)
  // if (patternMapIsCyclical && !isCyclical(itemMap)) {
  //   return false;
  //   // NOTE: return false if the patternMapIsCyclical.size > 0 and patternMapIsCyclical keys dont exists in itemMap
  // }

  // TODO: ignore cyclical matches

  let itemMapEntries = Array.from(itemMap.entries());
  for (let [key, value] of patternMap.entries()) {
    let foundItemIndex = itemMapEntries.findIndex(([itemKey, itemValue]) => match(itemKey, key) && match(itemValue, value));
    if (foundItemIndex === -1) {
      return false;
    }

    itemMapEntries.splice(foundItemIndex, 1); // NOTE: this one is bit slow
  }

  return true;
}

function flattenKeys(obj: JSObject, result = {}, parentReference = '') {
  return Object.keys(obj).reduce((result, key) => {
    return typeof obj === 'object' && obj === null
      ? flattenKeys(obj[key], result, parentReference + key + '.')
      : result[parentReference + key] = obj[key];
  }, result);
}
