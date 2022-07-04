// TODO: implement and test these if needed from  packages/@ember/-internals/runtime/lib/type-of.ts
export type TypeName =
  | 'undefined'
  | 'null'
  | 'string'
  | 'number'
  | 'boolean'
  | 'function'
  | 'array'
  | 'regexp'
  | 'date'
  | 'filelist'
  | 'class'
  | 'instance'
  | 'error'
  | 'object';

// ........................................
// TYPING & ARRAY MESSAGING
//
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
  '[object FileList]': 'filelist',
} as const;

const { toString } = Object.prototype;

//   Returns a consistent type for the passed object.

//   Use this instead of the built-in `typeof` to get the type of an item.
//   It will return the same result across all browsers and includes a bit
//   more detail. Here is what will be returned:

//       | Return Value  | Meaning                                              |
//       |---------------|------------------------------------------------------|
//       | 'string'      | String primitive or String object.                   |
//       | 'number'      | Number primitive or Number object.                   |
//       | 'boolean'     | Boolean primitive or Boolean object.                 |
//       | 'null'        | Null value                                           |
//       | 'undefined'   | Undefined value                                      |
//       | 'function'    | A function                                           |
//       | 'array'       | An instance of Array                                 |
//       | 'regexp'      | An instance of RegExp                                |
//       | 'date'        | An instance of Date                                  |
//       | 'filelist'    | An instance of FileList                              |
//       | 'class'       | A JavaScript class                                   |
//       | 'instance'    | A JavaScript class instance                          |
//       | 'error'       | An instance of the Error object                      |
//       | 'object'      | A JavaScript object                                  |

//   Examples:

//   ```javascript
//   import { typeOf } from '@memoria/model';

//   class Human {};
//   typeOf();                       // 'undefined'
//   typeOf(null);                   // 'null'
//   typeOf(undefined);              // 'undefined'
//   typeOf('michael');              // 'string'
//   typeOf(new String('michael'));  // 'string'
//   typeOf(101);                    // 'number'
//   typeOf(new Number(101));        // 'number'
//   typeOf(true);                   // 'boolean'
//   typeOf(new Boolean(true));      // 'boolean'
//   typeOf(A);                      // 'function'
//   typeOf(A());                    // 'array'
//   typeOf([1, 2, 90]);             // 'array'
//   typeOf(/abc/);                  // 'regexp'
//   typeOf(new Date());             // 'date'
//   typeOf(event.target.files);     // 'filelist'
//   typeOf(Human);                  // 'class'
//   typeOf(new Human());            // 'instance'
//   typeOf(new Error('teamocil'));  // 'error'

//   // 'normal' JavaScript object
//   typeOf({ a: 'b' });             // 'object'
//   ```
// */
export default function typeOf(item: unknown): TypeName {
  if (item === null) {
    return 'null';
  } else if (item === undefined) {
    return 'undefined';
  }

  let ret = TYPE_MAP[toString.call(item)] || 'object';
  debugger;
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
  }

  return ret;
}
