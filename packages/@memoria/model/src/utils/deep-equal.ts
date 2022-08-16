import objectType from "./type-of.js";

const CONTAINER_TYPES = new Set(["object", "array", "map", "set", "class", "instance"]);

function useStrictEquality(a, b) {
  if (typeof a === "object") {
    a = a.valueOf();
  }
  if (typeof b === "object") {
    b = b.valueOf();
  }

  return a === b;
}

function compareConstructors(a, b) {
  if (a.constructor === b.constructor) {
    return true;
  }

  let protoA = Object.getPrototypeOf(a);
  let protoB = Object.getPrototypeOf(b);

  // Ref #851
  // If the obj prototype descends from a null constructor, treat it
  // as a null prototype.
  if (protoA && protoA.constructor === null) {
    protoA = null;
  }
  if (protoB && protoB.constructor === null) {
    protoB = null;
  }

  // Allow objects with no prototype to be equivalent to
  // objects with Object as their constructor.
  if ((protoA === null && protoB === Object.prototype) || (protoB === null && protoA === Object.prototype)) {
    return true;
  }

  return false;
}

function getRegExpFlags(regexp) {
  return "flags" in regexp ? regexp.flags : regexp.toString().match(/[gimuy]*$/)[0];
}

// TODO: Investigate typeEquiv & pairs mutation on every here
function breadthFirstCompareChild(a, b, pairs) {
  // If a is a container not reference-equal to b, postpone the comparison to the
  // end of the pairs queue -- unless (a, b) has been seen before, in which case skip
  // over the pair.
  if (a === b) {
    return true;
  } else if (!CONTAINER_TYPES.has(objectType(a))) {
    return typeEquiv(a, b, pairs);
  } else if (pairs.every((pair) => pair.a !== a || pair.b !== b)) {
    // Not yet started comparing this pair
    pairs.push({ a, b });
  }

  return true;
}

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
    return (
      a.source === b.source &&
      // Include flags in the comparison
      getRegExpFlags(a) === getRegExpFlags(b)
    );
  },
  // abort (identical references / instance methods were skipped earlier)
  function() {
    return false;
  },
  array(a, b, pairs) {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      // Compare non-containers; queue non-reference-equal containers
      if (!breadthFirstCompareChild(a[i], b[i], pairs)) {
        return false;
      }
    }

    return true;
  },
  // Define sets a and b to be equivalent if for each element aVal in a, there
  // is some element bVal in b such that aVal and bVal are equivalent. Element
  // repetitions are not counted, so these are equivalent:
  // a = new Set( [ {}, [], [] ] );
  // b = new Set( [ {}, {}, [] ] );
  set(a, b, pairs) {
    if (a.size !== b.size) {
      // This optimization has certain quirks because of the lack of
      // repetition counting. For instance, adding the same
      // (reference-identical) element to two equivalent sets can
      // make them non-equivalent.
      return false;
    }

    let outerEq = true;
    a.forEach((aVal) => {
      // Short-circuit if the result is already known. (Using for...of
      // with a break clause would be cleaner here, but it would cause
      // a syntax error on older JavaScript implementations even if
      // Set is unused)
      if (!outerEq) {
        return;
      }

      let innerEq = false;
      b.forEach((bVal) => {
        // Likewise, short-circuit if the result is already known
        if (innerEq) {
          return;
        }

        // Swap out the global pairs list, as the nested call to
        // innerEquiv will clobber its contents
        const parentPairs = pairs;
        if (innerEquiv(bVal, aVal, pairs)) {
          innerEq = true;
        }

        // Replace the global pairs list
        pairs = parentPairs;
      });

      if (!innerEq) {
        outerEq = false;
      }
    });

    return outerEq;
  },
  // Define maps a and b to be equivalent if for each key-value pair (aKey, aVal)
  // in a, there is some key-value pair (bKey, bVal) in b such that
  // [ aKey, aVal ] and [ bKey, bVal ] are equivalent. Key repetitions are not
  // counted, so these are equivalent:
  // a = new Map( [ [ {}, 1 ], [ {}, 1 ], [ [], 1 ] ] );
  // b = new Map( [ [ {}, 1 ], [ [], 1 ], [ [], 1 ] ] );
  map(a, b, pairs) {
    if (a.size !== b.size) {
      // This optimization has certain quirks because of the lack of
      // repetition counting. For instance, adding the same
      // (reference-identical) key-value pair to two equivalent maps
      // can make them non-equivalent.
      return false;
    }

    let outerEq = true;
    a.forEach((aVal, aKey) => {
      // Short-circuit if the result is already known. (Using for...of
      // with a break clause would be cleaner here, but it would cause
      // a syntax error on older JavaScript implementations even if
      // Map is unused)
      if (!outerEq) {
        return;
      }

      let innerEq = false;
      b.forEach((bVal, bKey) => {
        // Likewise, short-circuit if the result is already known
        if (innerEq) {
          return;
        }

        // Swap out the global pairs list, as the nested call to
        // innerEquiv will clobber its contents
        const parentPairs = pairs;
        if (innerEquiv([bVal, bKey], [aVal, aKey], pairs)) {
          innerEq = true;
        }

        // Replace the global pairs list
        pairs = parentPairs;
      });

      if (!innerEq) {
        outerEq = false;
      }
    });

    return outerEq;
  },
  class(a, b, pairs) {
    return this.object(a, b, pairs);
  },
  instance(a, b, pairs) {
    return this.object(a, b, pairs);
  },
  object(a, b, pairs) {
    if (compareConstructors(a, b) === false) {
      return false;
    }

    const aProperties = [];
    const bProperties = [];

    // Be strict: don't ensure hasOwnProperty and go deep
    for (const i in a) {
      // Collect a's properties
      aProperties.push(i);

      // Skip OOP methods that look the same
      if (
        a.constructor !== Object &&
        typeof a.constructor !== "undefined" &&
        typeof a[i] === "function" &&
        typeof b[i] === "function" &&
        a[i].toString() === b[i].toString()
      ) {
        continue;
      }

      // Compare non-containers; queue non-reference-equal containers
      if (!breadthFirstCompareChild(a[i], b[i], pairs)) {
        return false;
      }
    }

    for (const i in b) {
      // Collect b's properties
      bProperties.push(i);
    }

    // Ensures identical properties name
    return typeEquiv(aProperties.sort(), bProperties.sort(), pairs);
  },
};

function typeEquiv(a, b, pairs) {
  const type = objectType(a);

  return type === objectType(b) && callbacks[type](a, b, pairs);
}

function innerEquiv(a, b, pairs) {
  if (arguments.length < 2) {
    return true;
  }

  pairs = [{ a, b }];
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];

    if (pair.a !== pair.b && !typeEquiv(pair.a, pair.b, pairs)) {
      return false;
    }
  }

  return true;
}

export default function deepEqual(a, b) {
  return innerEquiv(a, b);
}
