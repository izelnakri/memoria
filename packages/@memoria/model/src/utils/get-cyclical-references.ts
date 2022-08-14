export interface JSObject {
  [propName: string]: any;
}

interface ParentReferenceMap {
  [keyName: string]: JSObject
}

import { get } from './object.js';

// NOTE: This should receive a function to execute in the future it doesnt play well with .every due to return value, instead make something with this predicate function(?)
// { x: SOMETHING, y: SOMETHING2, z: [SOMETHING3, { a: { b: { c: [SOMETHING4] } } }] }
export default function getCyclicalReferences(
  currentObject: any,
  shouldFilterToObject: boolean = true,
  seenMap: WeakMap<JSObject, ParentReferenceMap> = new WeakMap(),
  resultInput?: any,
  targetSourceObject?: JSObject | Map<any, any>,
  currentKeyName: string = ''
) {
  let result = resultInput || createResultObject(currentObject);
  let sourceObject = targetSourceObject || currentObject;
  if (!currentObject || typeof currentObject !== 'object') {
    return result;
  } else if (currentKeyName !== '') {
    let existingReferenceMap = seenMap.get(currentObject);
    if (!existingReferenceMap) {
      seenMap.set(currentObject, { [currentKeyName as string]: currentObject as JSObject });
    } else {
      let cyclicalKeyName = Object.keys(existingReferenceMap).find((key) => currentKeyName.startsWith(key)) as string;
      if (cyclicalKeyName) {
        if (!get(result, cyclicalKeyName as string)) {
          let fullReference = existingReferenceMap[cyclicalKeyName as string];
          let reference = hasFirstLevelCyclicalReferenceToParent(fullReference, sourceObject) || !shouldFilterToObject
            ? fullReference
            : getCyclicalReferences(fullReference, false);

          setDeeplyNestedObject(result, sourceObject, cyclicalKeyName, reference);
        }

        return result;
      }

      existingReferenceMap[currentKeyName as string] = currentObject as JSObject;
    }
  }

  if (currentObject instanceof Map || currentObject instanceof Set) {
    for (let [keyName, currentValue] of currentObject) {
      getCyclicalReferences(currentValue, shouldFilterToObject, seenMap, result, sourceObject, buildKeyName(currentKeyName, keyName));
    }
  } else {
    for (let key in currentObject) {
      getCyclicalReferences(currentObject[key], shouldFilterToObject, seenMap, result, sourceObject, buildKeyName(currentKeyName, key));
    }
  }

  return cleanupEmptyValuesInResult(result);
}

function hasFirstLevelCyclicalReferenceToParent(fullReference: JSObject, parentObject: JSObject) {
  if (fullReference instanceof Map || fullReference instanceof Set) {
    for (let [_, currentValue] of fullReference) {
      if (currentValue === parentObject) {
        return true;
      }
    }
  } else {
    for (let key in fullReference) {
      if (fullReference[key] === parentObject) {
        return true;
      }
    }
  }

  return false;
}

function createResultObject(currentObject: any) {
  return currentObject instanceof Set || currentObject instanceof Array ? [] : {};
}

function buildKeyName(currentKeyName: string, nextKeyName: string): string {
  return currentKeyName === '' ? nextKeyName : `${currentKeyName}.${nextKeyName}`;
}

function setDeeplyNestedObject(targetObject: JSObject, targetSourceObject: JSObject, keyName: string, cyclicalValue: JSObject) {
  let sourceObject = targetSourceObject || cyclicalValue;
  let keyNames = keyName.split('.');
  let lastObject = keyNames.reduce((result: JSObject, keyName: string, index: number) => {
    if (result[keyName]) {
      return result[keyName];
    } else if (index === keyNames.length - 1) {
      return result;
    }

    let currentKeyName = keyNames.slice(0, index + 1).join('.');
    let referenceObject = get(targetObject, currentKeyName)
      ? get(targetObject, currentKeyName)
      : get(sourceObject, currentKeyName) || result;
    let valueToSet = Array.isArray(referenceObject) ? [] : {};

    if (Array.isArray(result)) {
      result.push(valueToSet);
    } else {
      result[currentKeyName] = valueToSet;
    }

    return valueToSet;
  }, targetObject);

  if (Array.isArray(lastObject)) {
    lastObject.push(cyclicalValue);
  } else {
    lastObject[keyName.split('.').pop() as string] = cyclicalValue;
  }

  return targetObject;
}

function cleanupEmptyValuesInResult(result: JSObject, map = new WeakMap()) {
  if (!result || typeof result !== 'object' || map.get(result)) {
    return result;
  }

  map.set(result, true);

  if (result instanceof Map || result instanceof Set) {
    for (let [_, currentValue] of result) {
      cleanupEmptyValuesInResult(currentValue, map);
    }
  } else if (Array.isArray(result)) {
    for (let currentValue of result) {
      cleanupEmptyValuesInResult(currentValue, map);
      if (currentValue === undefined) {
        result = result.filter((value: any) => value !== undefined);
      }
    }
  } else {
    for (let key in result) {
      cleanupEmptyValuesInResult(result[key], map);
    }
  }

  return result;
}
