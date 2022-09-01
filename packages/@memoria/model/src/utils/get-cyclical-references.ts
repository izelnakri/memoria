export interface JSObject {
  [propName: string]: any;
}

interface ParentReferenceMap {
  [keyName: string]: JSObject;
}

import { get } from "./object.js";

// NOTE: make this breadth-first

// NOTE: This should receive a function to execute in the future it doesnt play well with .every due to return value, instead make something with this predicate function(?)
// { x: SOMETHING, y: SOMETHING2, z: [SOMETHING3, { a: { b: { c: [SOMETHING4] } } }] }
// OR it could be: { x: SOMETHING, y: SOMETHING2, z.$actualIndex: SOMETHING3, z.$actualIndex2.a.b.c.$actualIndex3
export default function getCyclicalReferences(
  currentObject: any,
  shouldFilterToObject: boolean = true,
  seenMap: WeakMap<JSObject, ParentReferenceMap> = new WeakMap(),
  result: JSObject = createResultObject(currentObject),
  sourceObject: JSObject | Map<any, any> = currentObject,
  currentKeyName: string = ""
) {
  if (!currentObject || typeof currentObject !== "object") {
    return result;
  } else if (currentKeyName !== "") {
    let existingReferences = seenMap.get(currentObject);
    if (!existingReferences) {
      seenMap.set(currentObject, { [currentKeyName as string]: currentObject as JSObject });
    } else {
      let cyclicalKeyName = Object.keys(existingReferences).find((key) => currentKeyName.startsWith(key)) as string;
      if (cyclicalKeyName) {
        if (!get(result, cyclicalKeyName as string)) {
          let targetReference = filterListsForCyclicalReferences(existingReferences[cyclicalKeyName], seenMap);
          let reference =
            hasFirstLevelCyclicalReferenceToParent(targetReference, sourceObject) || !shouldFilterToObject
              ? targetReference
              : getCyclicalReferences(targetReference, false);

          return setDeeplyNestedObject(result, cyclicalKeyName, sourceObject, reference);
        }

        return result;
      }

      existingReferences[currentKeyName as string] = currentObject as JSObject;
    }
  }

  if (currentObject instanceof Map) {
    for (let [key, currentValue] of currentObject.entries()) {
      getCyclicalReferences(
        currentValue,
        shouldFilterToObject,
        seenMap,
        result,
        sourceObject,
        buildKeyName(currentKeyName, key)
      );
    }
  } else if (currentObject instanceof Set) {
    for (let [key, currentValue] of Array.from(currentObject).entries()) {
      getCyclicalReferences(
        currentValue,
        shouldFilterToObject,
        seenMap,
        result,
        sourceObject,
        buildKeyName(currentKeyName, String(key))
      );
    }
  } else {
    for (let key in currentObject) {
      getCyclicalReferences(
        currentObject[key],
        shouldFilterToObject,
        seenMap,
        result,
        sourceObject,
        buildKeyName(currentKeyName, key)
      );
    }
  }

  return currentObject === sourceObject && currentKeyName === "" && shouldFilterToObject
    ? cleanupEmptyValuesInResult(result)
    : result;
}

function filterListsForCyclicalReferences(
  reference: JSObject,
  seenMap: WeakMap<JSObject, ParentReferenceMap>
): JSObject {
  if (reference instanceof Array) {
    return reference.filter((item) => seenMap.get(item));
  } else if (reference instanceof Set) {
    return new Set(Array.from(reference).filter((item) => seenMap.get(item)));
  }

  return reference;
}

function hasFirstLevelCyclicalReferenceToParent(fullReference: JSObject, parentObject: JSObject) {
  if (fullReference instanceof Map || fullReference instanceof Set) {
    for (let [_, currentValue] of fullReference.entries()) {
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
  return currentKeyName === "" ? nextKeyName : `${currentKeyName}.${nextKeyName}`;
}

function setDeeplyNestedObject(
  targetObject: JSObject,
  keyName: string,
  sourceObject: JSObject | Map<any, any>,
  cyclicalValue: JSObject
): JSObject {
  let keyNames = keyName.split(".");
  let [lastObject] = keyNames.reduce(
    ([result, targetSourceObject], keyName: string, index: number) => {
      if (result[keyName]) {
        return [result[keyName], getValue(targetSourceObject, keyName)];
      } else if (index === keyNames.length - 1) {
        return [result, targetSourceObject];
      }

      let reference = getValue(targetSourceObject, keyName);
      let resultIsAList = Array.isArray(reference) || reference instanceof Set;
      let valueToSet = resultIsAList ? [] : {};

      if (Array.isArray(result)) {
        result.push(valueToSet);
      } else {
        result[keyName] = valueToSet;
      }

      return [valueToSet, reference];
    },
    [targetObject, sourceObject]
  );

  lastObject[keyNames.pop() as string] = cyclicalValue;

  return targetObject;
}

function getValue(object: JSObject, keyName: string): any {
  if (object instanceof Set) {
    return Array.from(object)[keyName];
  } else if (object instanceof Map) {
    return object.get(keyName);
  }

  return object[keyName];
}

function cleanupEmptyValuesInResult(result: JSObject, map = new WeakMap()) {
  if (!result || typeof result !== "object" || map.get(result)) {
    return result;
  }

  map.set(result, true);

  if (result instanceof Map || result instanceof Set) {
    for (let [_, currentValue] of result.entries()) {
      cleanupEmptyValuesInResult(currentValue, map);
    }
  } else if (Array.isArray(result)) {
    for (let [index, currentValue] of result.entries()) {
      if (currentValue) {
        cleanupEmptyValuesInResult(currentValue, map);
      } else {
        result.splice(index, 1);
      }
    }
    result = result.filter((x) => x !== undefined); // NOTE: this is an unfortunate need, couldnt find a more optimize way to do this
  } else {
    for (let key in result) {
      cleanupEmptyValuesInResult(result[key], map);
    }
  }

  return result;
}
