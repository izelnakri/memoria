export type TypeName =
  | "undefined"
  | "null"
  | "nan"
  | "string"
  | "symbol"
  | "number"
  | "boolean"
  | "function"
  | "array"
  | "set"
  | "regexp"
  | "date"
  | "filelist"
  | "class"
  | "instance"
  | "error"
  | "object"
  | "map";
// NOTE: add weakmap, weakset, weakreference

const DEFAULT_OBJECT_CONSTRUCTOR_NAMES = new Set([
  "Object",
  "Boolean",
  "String",
  "Number",
  "BigInt",
  "NaN",
  "Promise",
  "Array",
  "Date",
  "RegExp",
  "Function",
  "Error",
  "Symbol",
  "Map",
  "WeakMap",
  "Set",
  "WeakSet",
]);
export const NULL_TYPES = new Set(["undefined", "null", "nan"]);
export const PRIMITIVE_TYPES = new Set(["string", "number", "boolean", "symbol"]);
export const SPECIAL_PRIMITIVE_TYPES = new Set(["date", "regexp"]);

export const STRICT_COMPARABLE_TYPES = new Set([...NULL_TYPES, ...PRIMITIVE_TYPES, "function"]);
export const COMPARABLE_TYPES = new Set([...STRICT_COMPARABLE_TYPES, ...SPECIAL_PRIMITIVE_TYPES]);

export const LIST_TYPES = new Set(["array", "set", "filelist"]); // NOTE: check filelist
export const OBJECT_TYPES = new Set(["class", "instance", "object", "error"]); // NOTE: map(?) is really different(!) on key iteration, there is also weakmap, weakset, weakreference(?)

// these are in dev part:
export const SPECIAL_PROTOTYPE_COMPLEX_TYPES_TO_CHECK = new Set(["function", "set", "map", "filelist"]); // NOTE: check filelist
export const COMPLEX_TYPES_TO_CHECK = new Set(["array", ...SPECIAL_PROTOTYPE_COMPLEX_TYPES_TO_CHECK, ...OBJECT_TYPES]);

const TYPE_MAP: Record<string, TypeName> = {
  "[object Boolean]": "boolean",
  "[object Number]": "number",
  "[object String]": "string",
  "[object Function]": "function",
  "[object AsyncFunction]": "function",
  "[object GeneratorFunction]": "function",
  "[object Array]": "array",
  "[object Date]": "date",
  "[object RegExp]": "regexp",
  "[object Object]": "object",
  "[object Set]": "set",
  "[object Symbol]": "symbol",
  "[object Map]": "map",
  "[object FileList]": "filelist",
} as const;

const { toString } = Object.prototype;

export default function typeOf(item: any): TypeName {
  if (item === null) {
    return "null";
  } else if (item === undefined) {
    return "undefined";
  }

  let foundType = TYPE_MAP[toString.call(item)] || "object";
  if (foundType === "function") {
    if (DEFAULT_OBJECT_CONSTRUCTOR_NAMES.has(item.name) || /^class\s/.test(Function.prototype.toString.call(item))) {
      return "class";
    }

    return foundType;
  } else if (foundType === "object") {
    if (!item.constructor) {
      return "object";
    } else if (item instanceof Error) {
      return "error";
    } else if (item instanceof Date) {
      return "date";
    } else if (item.constructor.name !== "Object") {
      return "instance";
    }
  } else if (foundType === "number") {
    return isNaN(item as number) ? "nan" : foundType;
  }

  return foundType;
}
