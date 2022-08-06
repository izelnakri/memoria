export interface JSObject {
  [propName: string]: any;
}

interface ParentReferenceMap {
  [keyName: string]: JSObject
}

import { set } from './object.js';

// NOTE: This should receive a function to execute in the future it doesnt play well with .every due to return value, instead make something with this predicate function(?)
// earlyTerminationFunction() -> if returns explicitly false to early terminate, it would early terminate and the result would be from outside still(?)
// NOTE: return an object representation of the situation(?)
// { x: SOMETHING, y: SOMETHING2, z: [SOMETHING3, { a: { b: { c: [SOMETHING4] } } }] }
// OR:
// SET[keyNames]

// an object/map with keys and values only of the reference:
// { x: SOMETHING, y: SOMETHING2, z: [SOMETHING3, { a: { b: { c: [SOMETHING4] } } }] } <- this is what is needed, not a set
export default function getCyclicalReferences(
  currentObject: any,
  seenMap: WeakMap<JSObject, ParentReferenceMap> = new WeakMap(),
  result: JSObject = {},
  targetSourceObject?: JSObject | Map<any, any>,
  parentObject?: JSObject,
  currentKeyName: string = ''
) {
  if (!currentObject || typeof currentObject !== 'object') {
    return result;
  } else if (currentObject === parentObject) {
    set(result, currentKeyName, currentObject); // NOTE: maybe do it only if it isnt added:

    return result;
  } else if (parentObject) {
    let existingReferenceMap = seenMap.get(currentObject);
    if (!existingReferenceMap) {
      seenMap.set(currentObject, { [currentKeyName as string]: parentObject as JSObject }); // TODO: maybe turn the data structure to JS Map
    } else if (Object.keys(existingReferenceMap).some((key) => currentKeyName.startsWith(key))) {
      set(result, currentKeyName, currentObject); // NOTE: maybe do it only if it isnt added:

      return result;
    } else {
      existingReferenceMap[currentKeyName as string] = parentObject as JSObject;
    }
  }

  let sourceObject = targetSourceObject || currentObject;
  if (currentObject instanceof Map) { // NOTE: maybe turn Map keys to indexes to(?), but they are not ordered, OrderedMap(?)
    for (let [keyName, currentValue] of currentObject.entries()) {
      getCyclicalReferences(currentValue, seenMap, result, sourceObject, currentObject, buildKeyName(currentKeyName, keyName));
    }
  } else if (currentObject instanceof Set) {
    for (let [index, currentValue] of Array.from(currentObject).entries()) {
      getCyclicalReferences(currentValue, seenMap, result, sourceObject, currentObject, buildKeyName(currentKeyName, String(index)));
    }
  } else {
    for (let key in currentObject) {
      getCyclicalReferences(currentObject[key], seenMap, result, sourceObject, currentObject, buildKeyName(currentKeyName, key));
    }
  }

  return result;
}

function buildKeyName(currentKeyName: string, nextKeyName: string) {
  return currentKeyName === '' ? nextKeyName : `${currentKeyName}.${nextKeyName}`;
}



// const FOUND_CYCLICAL_OBJECTS = [];

// TODO: return cannot be [keyNames] because obj can be a Map
// TODO: make this function also receive another function arg for iteration on each argument
// export default function getCyclicalReferences(obj: JSObject): Set<string> {
//   return detect(obj);
// }

// // this wont work for arrays
// function detect(currentObject: any, seenObjectMap: WeakMap<JSObject, true> = new WeakMap(), cyclicalReferences: JSObject = {}, parentObject?: JSObject, currentKeyName: any = ''): Set<any> {
//   if (!currentObject || typeof currentObject !== 'object') {
//     return cyclicalReferences;
//   } else if (seenObjectMap.has(currentObject)) {
//     cyclicalReferences.add(currentKeyName);

//     return cyclicalReferences;
//   }

//   if (currentObject instanceof Map) {
//     seenObjectMap.set(currentObject, true);

//     for (let [keyReference, currentValue] of currentObject.entries()) {
//       detect(seenObjectMap, cyclicalReferences, currentValue, keyReference); // NOTE: this makes this iteration multiple levels deep, mkae it single level
//     }

//   // NOTE: add here Set case just like isCyclical
//   } else if (Array.isArray(currentObject)) {
//     for (let key in currentObject) {
//       let value = currentObject[key];
//       if (value === currentObject) {
//         cyclicalReferences.add(currentKeyName === '' ? key : `${currentKeyName}.${key}`);

//         return cyclicalReferences;
//       }

//       if (typeof value === 'object' && value) {

//       }

//       // detect(seenObjectMap, cyclicalReferences, currentObject[key], currentKeyName === '' ? key : `${currentKeyName}.${key}`); // NOTE: this m
//     }
//   } else {
//     // TODO: when currentObject is an object inside an array handle it differently!!
//     seenObjectMap.set(currentObject, true);

//     // this needs to copy seenObjectMap when it is an array to branch it out

//     for (let key in currentObject) {
//       detect(seenObjectMap, cyclicalReferences, currentObject[key], currentKeyName === '' ? key : `${currentKeyName}.${key}`); // NOTE: this m
//     }
//   }

//   return cyclicalReferences;
// }


// export default function isCyclical(
//   currentObject: any,
//   seenMap: WeakMap<JSObject, ParentReferenceMap> = new WeakMap(),
//   targetSourceObject?: JSObject | Map<any, any>,
//   parentObject?: JSObject,
//   currentKeyName: string = ''
// ): boolean {
//   if (!currentObject || typeof currentObject !== 'object') {
//     return false;
//   } else if (currentObject === parentObject) {
//     return true;
//   } else if (parentObject) {
//     let existingReferenceMap = seenMap.get(currentObject);
//     if (!existingReferenceMap) {
//       seenMap.set(currentObject, { [currentKeyName as string]: parentObject as JSObject }); // TODO: maybe turn the data structure to JS Map
//     } else if (Object.keys(existingReferenceMap).some((key) => currentKeyName.startsWith(key))) {
//       return true;
//     } else {
//       existingReferenceMap[currentKeyName as string] = parentObject as JSObject;
//     }
//   }

//   // TODO: this could shortcircuit in the future!
//   let sourceObject = targetSourceObject || currentObject;
//   if (currentObject instanceof Map) { // NOTE: maybe turn Map keys to indexes to(?), but they are not ordered, OrderedMap(?)
//     for (let [keyName, currentValue] of currentObject.entries()) {
//       if (isCyclical(currentValue, seenMap, sourceObject, currentObject, buildKeyName(currentKeyName, keyName))) {
//         return true;
//       }
//     }
//   } else if (currentObject instanceof Set) {
//     for (let [index, currentValue] of Array.from(currentObject).entries()) {
//       if (isCyclical(currentValue, seenMap, sourceObject, currentObject, buildKeyName(currentKeyName, String(index)))) {
//         return true;
//       }
//     }
//   } else {
//     for (let key in currentObject) {
//       if (isCyclical(currentObject[key], seenMap, sourceObject, currentObject, buildKeyName(currentKeyName, key))) {
//         return true;
//       }
//     }
//   }

//   return false;
// }

// function buildKeyName(currentKeyName: string, nextKeyName: string) {
//   return currentKeyName === '' ? nextKeyName : `${currentKeyName}.${nextKeyName}`;
// }
