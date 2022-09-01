export interface JSObject {
  [propName: string]: any;
}

interface ParentReferenceMap {
  [keyName: string]: JSObject
}

export default function isCyclical(
  currentObject: any,
  seenMap: WeakMap<JSObject, ParentReferenceMap> = new WeakMap(),
  parentObject?: JSObject,
  currentKeyName: string = ''
): boolean {
  if (!currentObject || typeof currentObject !== 'object') {
    return false;
  } else if (currentObject === parentObject) {
    return true;
  } else if (parentObject) {
    let existingReferenceMap = seenMap.get(currentObject);
    if (!existingReferenceMap) {
      seenMap.set(currentObject, { [currentKeyName as string]: parentObject as JSObject }); // TODO: maybe turn the data structure to JS Map
    } else if (Object.keys(existingReferenceMap).some((key) => currentKeyName.startsWith(key))) {
      return true;
    } else {
      existingReferenceMap[currentKeyName as string] = parentObject as JSObject;
    }
  }

  if (currentObject instanceof Map) {
    for (let [keyName, currentValue] of currentObject.entries()) {
      if (isCyclical(currentValue, seenMap, currentObject, buildKeyName(currentKeyName, keyName))) {
        return true;
      }
    }
  } else if (currentObject instanceof Set) {
    for (let [index, currentValue] of Array.from(currentObject).entries()) {
      if (isCyclical(currentValue, seenMap, currentObject, buildKeyName(currentKeyName, String(index)))) {
        return true;
      }
    }
  } else {
    for (let key in currentObject) {
      if (isCyclical(currentObject[key], seenMap, currentObject, buildKeyName(currentKeyName, key))) {
        return true;
      }
    }
  }

  return false;
}

function buildKeyName(currentKeyName: string, nextKeyName: string) {
  return currentKeyName === '' ? nextKeyName : `${currentKeyName}.${nextKeyName}`;
}
