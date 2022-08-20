import typeOf, { OBJECT_TYPES } from "./type-of.js";
import type { JSObject } from "./object.js";
import { getConstructor, instanceOf } from "./constructor.js";
import deepEqual from "./deep-equal.js";
import getCyclicalReferences from "./get-cyclical-references.js";

export const CONSTRUCTORS_THAT_AUTOINIT = new Set(["String", "Number", "Boolean"]);

// NOTE: match() functon works like a pattern-match inclusion check.
// empty object should be strict empty object otherwise object has partial inclusion of the pattern
// same applies to empty array, otherwise array has partial inclusion of the pattern
// classes can be given instead of objects, when class given as pattern, the targets prototype chain should include the given class
// match is cyclical/recursive reference aware, thus it works with any type of JS data including complex instance objects
// developer can simplify the pattern by using the following shorthands:
// Objects instead of map, arrays instead of set, primitives instead of classes, etc.

// TODO: probably implement breadthFirstCompareChild like deepEqual in a specific way
export default function match(item: any, patternExpression: any, isCyclical?: boolean): boolean;
export default function match(item: any[], patternExpression: any[], isCyclical?: boolean): boolean;
export default function match(item: JSObject, patternExpression: any, isCyclical = false): boolean {
  if (item === patternExpression) {
    return true;
  }

  let patternsType = typeOf(patternExpression);
  if (patternsType === "nan") {
    return isNaN(item as any);
  } else if (patternsType === "class") {
    if (patternExpression.name === "Symbol") {
      return typeOf(item) === "symbol";
    } else if (CONSTRUCTORS_THAT_AUTOINIT.has(patternExpression.name)) {
      return getConstructor(item) === patternExpression;
    }

    return instanceOf(item, patternExpression);
  } else if (Array.isArray(patternExpression)) {
    if (item instanceof Set) {
      return isInsideList(Array.from(item), patternExpression);
    }

    return Array.isArray(item) && isInsideList(item, patternExpression);
  } else if (patternsType === "set") {
    return match(item, Array.from(patternExpression));
  } else if (patternsType === "map") {
    return typeOf(item) === "map" && matchMap(item as Map<any, any>, patternExpression);
  } else if (OBJECT_TYPES.has(patternsType)) {
    // TODO: patternsType can also be instance or error here, write tests!!
    if (typeOf(item) === "map" && patternsType === "object") {
      return matchMap(item as Map<any, any>, new Map(Object.entries(patternExpression)));
    } else if (patternsType === "object" && Object.keys(patternExpression).length === 0) {
      return typeOf(item) === "object" && Object.keys(item).length === 0;
    } else if (!item || (patternsType !== "object" && !instanceOf(item, getConstructor(patternExpression)))) {
      return false;
    }

    let patternsCylicalReferences = getCyclicalReferences(patternExpression);
    if (patternsCylicalReferences.length > 0) {
      let itemsCyclicalReferences = getCyclicalReferences(item);
      if (patternsCylicalReferences.length > itemsCyclicalReferences) {
        return false;
      } else if (
        Object.keys(patternsCylicalReferences).some(
          (key) => !deepEqual(itemsCyclicalReferences[key], patternsCylicalReferences[key])
        )
      ) {
        return false;
      }
    }

    return Object.getOwnPropertyNames(patternExpression).every((propertyName) => {
      if (propertyName in patternsCylicalReferences) {
        return isCyclical
          ? deepEqual(item[propertyName], patternExpression[propertyName])
          : match(item[propertyName], patternsCylicalReferences[propertyName], true);
      }

      return match(item[propertyName], patternExpression[propertyName]);
    });
  } else if (patternsType === "date") {
    return typeOf(item) === "date" && patternExpression.getTime() === item.getTime();
  } else if (patternsType === "function") {
    return typeOf(item) === "function" && item.toString() === patternExpression.toString();
  } else if (patternsType === "regexp") {
    return String(item) === String(patternExpression) || patternExpression.test(item);
  } else if (patternsType === "symbol") {
    return typeOf(item) === "symbol" && item.toString() === patternExpression.toString();
  } else if (patternsType === "filelist") {
    return typeOf(item) === "filelist" && isInsideList(Array.from(item as any[]), Array.from(patternExpression));
  }

  return item === patternExpression;
}

function matchMap(itemMap: Map<any, any>, patternMap: Map<any, any>): boolean {
  if (patternMap.size > itemMap.size) {
    return false;
  } else if (patternMap.size === 0) {
    return itemMap.size === 0;
  }

  return isInsideList(Array.from(itemMap.entries()), Array.from(patternMap.entries()));
}

function isInsideList(items: any[], patternList: any[]): boolean {
  if (patternList.length > items.length) {
    return false;
  } else if (patternList.length === 0) {
    return items.length === 0;
  }

  let patternListCylicalReferences = getCyclicalReferences(patternList);
  if (patternListCylicalReferences.length > 0) {
    let itemsCyclicalReferences = getCyclicalReferences(items);
    if (patternListCylicalReferences.length > itemsCyclicalReferences.length) {
      return false;
    } else if (patternListCylicalReferences.some((key) => !deepEqual(itemsCyclicalReferences[key], patternList[key]))) {
      return false;
    }
  }

  let itemEntries = Array.from(items);
  for (let patternElement of patternList) {
    let foundItemIndex = itemEntries.findIndex((itemElement) => {
      return match(itemElement, patternElement, true);
    });
    if (foundItemIndex === -1) {
      return false;
    }

    itemEntries.splice(foundItemIndex, 1); // NOTE: this one is bit slow
  }

  return true;
}
