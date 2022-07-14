import typeOf, { OBJECT_TYPES } from './type-of.js';
import type { JSObject } from './object.js';

export const CONSTRUCTORS_THAT_DONT_NEED_TO_INITIALIZE = new Set(['String', 'Number', 'Boolean']);

export default function match(item: any, patternExpression: any): boolean;
export default function match(item: any[], patternExpression: any[]): boolean;
export default function match(item: JSObject, patternExpression: any): boolean {
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
    if (item instanceof Set) {
      return matchArray(Array.from(item), patternExpression);
    }

    return Array.isArray(item) ? matchArray(item, patternExpression) : false;
  } else if (propertiesType === 'map') {
    return typeOf(item) === 'map' ? matchMap(item as Map<any, any>, patternExpression) : false;
  } else if (OBJECT_TYPES.has(propertiesType) || OBJECT_TYPES.has(typeOf(item))) {
    if (propertiesType === 'object' && typeOf(item) === 'map') {
      if (item.size === 0) {
        return Object.keys(patternExpression).length === 0;
      }

      let targetItem = Object.fromEntries(item as Map<any, any>);

      return Object.getOwnPropertyNames(patternExpression)
        .every((propertyName) => match(targetItem[propertyName], patternExpression[propertyName]));
    } else if (propertiesType === 'object' && Object.keys(patternExpression).length === 0) {
      return typeOf(item) === 'object' && Object.keys(item).length === 0;
    } else if (propertiesType !== 'object' && !(item instanceof patternExpression.constructor)) {
      return false;
    }

    return Object.getOwnPropertyNames(patternExpression)
      .every((propertyName) => match(item[propertyName], patternExpression[propertyName]));
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

  return item === patternExpression;
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

  let itemsToLookup = Array.from(items);
  let result = true;

  for (let i = 0; i < patternSetArray.length; i++) {
    let foundItemIndex = itemsToLookup.findIndex((item) => match(item, patternSetArray[i]));
    if (foundItemIndex === -1) {
      return false;
    }

    itemsToLookup.splice(foundItemIndex, 1);
  }

  return result;
}

function matchMap(itemMap: Map<any, any>, patternMap: Map<any, any>): boolean {
  if (patternMap.size > itemMap.size) {
    return false;
  } else if (patternMap.size === 0) {
    return itemMap.size === 0;
  }

  let itemMapEntries = Array.from(itemMap.entries());
  let result = true;

  for (let [key, value] of patternMap.entries()) {
    let foundItemIndex = itemMapEntries.findIndex(([itemKey, itemValue]) => match(itemKey, key) && match(itemValue, value));
    if (foundItemIndex === -1) {
      return false;
    }

    itemMapEntries.splice(foundItemIndex, 1);
  }

  return result;
}
