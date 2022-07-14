export interface JSObject {
  [propName: string]: any;
}

export default function isCyclical(obj: JSObject): boolean {
  let seenMap = new WeakMap();

  return detect(seenMap, obj, obj);
}

function detect(seenMap: WeakMap<JSObject, true>, source: JSObject | Map<any, any>, currentObject: any): boolean {
  if (!currentObject || typeof currentObject !== 'object') {
    return false;
  } else if (seenMap.has(currentObject)) {
    return true;
  }

  seenMap.set(currentObject, true);

  if (currentObject instanceof Map) {
    for (let currentValue of currentObject.values()) {
      if (detect(seenMap, source, currentValue)) {
        return true;
      }
    }
  } else {
    for (let key in currentObject) {
      if (detect(seenMap, source, currentObject[key])) {
        return true;
      }
    }
  }

  return false;
}
