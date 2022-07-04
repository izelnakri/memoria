// TODO: implement if needed from packages/@ember/-internals/runtime/lib/compare.ts
import type { TypeName } from './type-of.js';
import typeOf from './type-of.js';
import { OBJECT_TYPES } from './type-of.js';
import { assert } from './index.js';

const TYPE_ORDER: Record<TypeName, number> = {
  undefined: 0,
  null: 1,
  boolean: 2,
  number: 3,
  string: 4,
  array: 5,
  object: 6,
  instance: 7,
  function: 8,
  class: 9,
  date: 10,
  regexp: 11,
  filelist: 12,
  error: 13,
};

function spaceship(a: number, b: number): -1 | 0 | 1 {
  // SAFETY: `Math.sign` always returns `-1` for negative, `0` for zero, and `1`
  // for positive numbers. (The extra precision is useful for the way we use
  // this in the context of `compare`.)
  return Math.sign(a - b) as -1 | 0 | 1;
}

/**
 Compares two javascript values and returns:

  - -1 if the first is smaller than the second,
  - 0 if both are equal,
  - 1 if the first is greater than the second.

  ```javascript
  import { compare } from '@ember/utils';

  compare('hello', 'hello');  // 0
  compare('abc', 'dfg');      // -1
  compare(2, 1);              // 1
  ```
*/
export default function compare(v: any, w: any): -1 | 0 | 1 {
  if (v === w) {
    return 0;
  }

  let type1 = typeOf(v);
  let type2 = typeOf(w);

  // NOTE: Previously there was a comparable instance/lookup

  let res = spaceship(TYPE_ORDER[type1], TYPE_ORDER[type2]);
  if (res !== 0) {
    return res;
  }

  // types are equal - so we have to check values now
  switch (type1) {
    case 'boolean':
      assert('both are boolean', typeof v === 'boolean' && typeof w === 'boolean');

      return spaceship(Number(v), Number(w));
    case 'number':
      assert('both are numbers', typeof v === 'number' && typeof w === 'number');

      return spaceship(v as number, w as number);
    case 'string':
      assert('both are strings', typeof v === 'string' && typeof w === 'string');

      return spaceship((v as string).localeCompare(w as string), 0);
    case 'array': {
      assert('both are arrays', Array.isArray(v) && Array.isArray(w));

      let vLength = v.length;
      let wLength = w.length;
      if (vLength !== wLength) {
        return spaceship(vLength, wLength);
      }

      for (let i = 0; i < vLength; i++) {
        let result = compare(v[i], w[i]);
        if (result !== 0) {
          return result;
        }
      }

      return 0;
    }
    case 'date':
      assert('both are dates', v instanceof Date && w instanceof Date);

      return spaceship(v.getTime(), w.getTime());
    default:
      if (OBJECT_TYPES.includes(type1)) {
        assert('both are same object types', type1 === type2);

        let wKeyAmount = Object.keys(w).length;
        let vKeyAmount = Object.keys(v).length;
        if (vKeyAmount !== wKeyAmount) {
          return spaceship(vKeyAmount, wKeyAmount);
        }
      }

      return 0;
  }
}
