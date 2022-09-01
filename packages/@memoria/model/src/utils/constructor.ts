export interface JSObject {
  [key: string]: any;
}

export function getConstructor(obj: any) {
  if (obj === null || obj === undefined) {
    return null;
  }

  const proto = Object.getPrototypeOf(obj);

  return !proto || proto.constructor === null ? Object : proto.constructor;
}

// NOTE: This is built for Object.create(null) AND primitive values: null, undefined, boolean, number, string, symbol
export function instanceOf(item: JSObject, constructor: JSObject) {
  if (constructor === null || constructor === undefined) {
    throw new TypeError("Right-hand side of 'instanceOf' is not an object");
  } else if (item === null || item === undefined) {
    throw new TypeError("Left-hand side of 'classIsInheritedFrom' is not an object");
  }

  return (
    item.prototype instanceof (constructor as Function) ||
    getConstructor(item).prototype instanceof (constructor as Function) ||
    getConstructor(item) === constructor
  );
}
