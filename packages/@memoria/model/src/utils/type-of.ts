export type TypeName =
  | 'undefined'
  | 'null'
  | 'nan'
  | 'string'
  | 'symbol'
  | 'number'
  | 'boolean'
  | 'function'
  | 'array'
  | 'set'
  | 'regexp'
  | 'date'
  | 'filelist'
  | 'class'
  | 'instance'
  | 'error'
  | 'object'
  | 'map';

const TYPE_MAP: Record<string, TypeName> = {
  '[object Boolean]': 'boolean',
  '[object Number]': 'number',
  '[object String]': 'string',
  '[object Function]': 'function',
  '[object AsyncFunction]': 'function',
  '[object GeneratorFunction]': 'function',
  '[object Array]': 'array',
  '[object Date]': 'date',
  '[object RegExp]': 'regexp',
  '[object Object]': 'object',
  '[object Set]': 'set',
  '[object Symbol]': 'symbol',
  '[object Map]': 'map',
  '[object FileList]': 'filelist',
} as const;

export const OBJECT_TYPES = ['class', 'instance', 'object', 'error']; // NOTE: map(?) and set(?)

const { toString } = Object.prototype;

export default function typeOf(item: unknown): TypeName {
  if (item === null) {
    return 'null';
  } else if (item === undefined) {
    return 'undefined';
  }

  let ret = TYPE_MAP[toString.call(item)] || 'object';
  if (ret === 'function') {
    let itemsPropertyNames = Object.getOwnPropertyNames(item);
    if (!itemsPropertyNames.includes('arguments') && !itemsPropertyNames.includes('caller')) {
      return 'class';
    }

    return ret;
  } else if (ret === 'object') {
    if (item instanceof Error) {
      return 'error';
    } else if (item instanceof Date) {
      return 'date';
    } else if (item.constructor.name !== 'Object') {
      return 'instance';
    }
  } else if (ret === 'number') {
    return isNaN(item as number) ? 'nan' : ret;
  }

  return ret;
}
