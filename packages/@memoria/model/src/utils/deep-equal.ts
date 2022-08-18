// NOTE: Code copied from QUnit's deepEqual(best one in JS): https://github.com/qunitjs/qunit/blob/main/src/equiv.js
import typeOf from "./type-of";

const CONTAINER_TYPES = new Set(["object", "array", "map", "set"]);

const callbacks = {
  string: useStrictEquality,
  boolean: useStrictEquality,
  number: useStrictEquality,
  null: useStrictEquality,
  undefined: useStrictEquality,
  symbol: useStrictEquality,
  date: useStrictEquality,

  nan() {
    return true;
  },

  regexp(a, b) {
    return a.source === b.source && getRegExpFlags(a) === getRegExpFlags(b);
  },

  // abort (identical references / instance methods were skipped earlier)
  function() {
    return false;
  },

  array(a, b, pairs) {
    if (a.length !== b.length) {
      return false;
    }

    return a.every((element, index) => breadthFirstCompareChild(element, b[index], pairs));
  },

  set(a, b) {
    if (a.size !== b.size) {
      return false;
    }

    const B_ARRAY = Array.from(b);

    return Array.from(a).every((aVal) => B_ARRAY.some((bVal) => deepEqual(bVal, aVal)));
  },

  map(a, b) {
    if (a.size !== b.size) {
      return false;
    }

    const B_ARRAY = Array.from(b);

    return Array.from(a).every(([aKey, aVal]) => B_ARRAY.some(([bKey, bVal]) => deepEqual([bKey, bVal], [aKey, aVal])));
  },

  instance(a, b, pairs) {
    return this.object(a, b, pairs);
  },

  class(a, b, pairs) {
    return this.object(a, b, pairs);
  },

  object(a, b, pairs) {
    if (compareConstructors(a, b) === false) {
      return false;
    }

    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);

    if (aKeys.length !== bKeys.length) {
      return false;
    }

    for (const key in a) {
      if (
        a.constructor !== Object &&
        typeof a.constructor !== "undefined" &&
        typeof a[key] === "function" &&
        typeof b[key] === "function" &&
        a[key].toString() === b[key].toString()
      ) {
        continue;
      } else if (!(key in b)) {
        return false;
      }

      if (!breadthFirstCompareChild(a[key], b[key], pairs)) {
        return false;
      }
    }

    return true;
  },
};

export default function deepEqual(a, b) {
  if (arguments.length !== 2) {
    return false;
  }

  // Value pairs queued for comparison. Used for breadth-first processing order, recursion
  // detection and avoiding repeated comparison.
  let pairs = [{ a, b }];
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];

    // Perform type-specific comparison on any pairs that are not strictly
    // equal. For container types, that comparison will postpone comparison
    // of any sub-container pair to the end of the pair queue. This gives
    // breadth-first search order. It also avoids the reprocessing of
    // reference-equal siblings, cousins etc, which can have a significant speed
    // impact when comparing a container of small objects each of which has a
    // reference to the same (singleton) large object.
    if (pair.a !== pair.b && !typeEquiv(pair.a, pair.b, pairs)) {
      return false;
    }
  }

  return true;
}

function typeEquiv(a, b, pairs) {
  const type = typeOf(a);

  return typeOf(b) === type && callbacks[type](a, b, pairs);
}

function valueOf(a) {
  return typeof a === "object" ? a.valueOf() : a;
}

function useStrictEquality(a, b) {
  return valueOf(a) === valueOf(b);
}

function getConstructor(obj) {
  const proto = Object.getPrototypeOf(obj);

  return !proto || proto.constructor === null ? Object : proto.constructor;
}

function compareConstructors(a, b) {
  return getConstructor(a) === getConstructor(b);
}

function getRegExpFlags(regexp) {
  return "flags" in regexp ? regexp.flags : regexp.toString().match(/[gimuy]*$/)[0];
}

function breadthFirstCompareChild(a, b, pairs) {
  if (a === b) {
    return true;
  } else if (!CONTAINER_TYPES.has(typeOf(a))) {
    return typeEquiv(a, b, pairs);
  } else if (pairs.every((pair) => pair.a !== a || pair.b !== b)) {
    pairs.push({ a, b }); // NOTE: Not yet started comparing this pair
  }

  return true;
}
