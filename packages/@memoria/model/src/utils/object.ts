import { assert } from "./index.js";
import Cache from "../cache.js";
import { RuntimeError } from "../index.js";

export interface JSObject {
  [key: string]: any;
}

export function get(obj: JSObject, keyName: string) {
  assert(
    `.get() must be called with two arguments; an object and a property key`,
    arguments.length === 2
  );
  assert(
    `.get() cannot call get with '${keyName}' on an undefined object.`,
    obj !== undefined && obj !== null
  );
  assert(
    `.get() the key provided to get must be a string or number, you passed ${keyName}`,
    typeof keyName === "string" || (typeof keyName === "number" && !isNaN(keyName))
  );
  assert(
    `'this' in paths is not supported`,
    typeof keyName !== "string" || keyName.lastIndexOf("this.", 0) !== 0
  );

  // NOTE: removed isDestroyed check
  // NOTE: this used to always call _getProp and refresh glimmer tracking consumeTag(tagFor(obj, keyName)):
  // packages/@ember/-internals/metal/lib/property_get.ts

  return isPath(keyName) ? getPath(obj, keyName) : obj[keyName];
}

function getPath(obj: JSObject, keyName: string | string[]) {
  let parts = typeof keyName === "string" ? keyName.split(".") : keyName; // NOTE: create here RuntimeError
  for (let i = 0; i < parts.length; i++) {
    if (obj === undefined || obj === null) {
      return undefined;
    }

    obj = obj[parts[i]]; // NOTE: this was _getProp() call before
  }

  return obj;
}

export function set<T = unknown>(obj: object, keyName: string, value: T, tolerant?: boolean): T {
  assert(
    `.set() must be called with three or four arguments; an object, a property key, a value and tolerant true/false`,
    arguments.length === 3 || arguments.length === 4
  );
  assert(
    `.set() cannot call with '${keyName}' on an undefined object.`,
    (obj && typeof obj === "object") || typeof obj === "function"
  );
  assert(
    `.set() the key provided to set must be a string or number, you passed ${keyName}`,
    typeof keyName === "string" || (typeof keyName === "number" && !isNaN(keyName))
  );
  assert(
    `.set() 'this' in paths is not supported`,
    typeof keyName !== "string" || keyName.lastIndexOf("this.", 0) !== 0
  );

  // NOTE: removed isDestroyed check
  // NOTE: removed all other logic

  if (isPath(keyName)) {
    let parts = keyName.split(".");
    let targetKeyName = parts.pop()!;

    assert("Property set failed: You passed an empty path", targetKeyName.trim().length > 0);

    let root = getPath(obj, parts);
    if (root !== null && root !== undefined) {
      return set(root, targetKeyName, value);
    } else if (!tolerant) {
      throw new RuntimeError(
        `.set() property set failed: object in path "${parts.join(".")}" could not be found.`
      );
    }
  }

  obj[keyName] = value;
  return value;
}

// NOTE: Remove if not needed in future for tracking purposes
export function getProperties(obj: object, keys?: string[]): object {
  if (keys && Array.isArray(keys)) {
    return keys.reduce((result, propertyName) => {
      result[propertyName] = get(obj, propertyName);

      return result;
    }, {});
  }

  return {};
}

export function setProperties<TProperties extends { [key: string]: any }>(
  obj: object,
  properties: TProperties
): TProperties {
  if (properties === null || typeof properties !== "object") {
    return properties;
  }

  let props = Object.keys(properties);
  for (let i = 0; i < props.length; i++) {
    set(obj, props[i], properties[props[i]]);
  }

  return properties;
}

const firstDotIndexCache = new Cache<string, number>(1000, (key) => key.indexOf("."));

function isPath(path: any): boolean {
  return typeof path === "string" && firstDotIndexCache.get(path) !== -1;
}

