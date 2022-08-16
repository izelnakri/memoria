// NOTE: we did adjustment/enhancement to objectType because our typeOf is better
import { module, test } from "qunitx";
import { deepEqual } from "@memoria/model";

module("@memoria/model | Utils | deepEqual", function (hooks) {
  test("Primitive types and constants", function (assert) {
    assert.equal(deepEqual(null, null), true, "null");
    assert.equal(deepEqual(null, {}), false, "null");
    assert.equal(deepEqual(null, undefined), false, "null");
    assert.equal(deepEqual(null, 0), false, "null");
    assert.equal(deepEqual(null, false), false, "null");
    assert.equal(deepEqual(null, ""), false, "null");
    assert.equal(deepEqual(null, []), false, "null");

    assert.equal(deepEqual(undefined, undefined), true, "undefined");
    assert.equal(deepEqual(undefined, null), false, "undefined");
    assert.equal(deepEqual(undefined, 0), false, "undefined");
    assert.equal(deepEqual(undefined, false), false, "undefined");
    assert.equal(deepEqual(undefined, {}), false, "undefined");
    assert.equal(deepEqual(undefined, []), false, "undefined");
    assert.equal(deepEqual(undefined, ""), false, "undefined");

    // Nan usually doest not equal to Nan using the '==' operator.
    // Only isNaN() is able to do it.
    assert.equal(deepEqual(0 / 0, 0 / 0), true, "NaN"); // NaN VS NaN
    assert.equal(deepEqual(1 / 0, 2 / 0), true, "Infinity"); // Infinity VS Infinity
    assert.equal(deepEqual(-1 / 0, 2 / 0), false, "-Infinity, Infinity"); // -Infinity VS Infinity
    assert.equal(deepEqual(-1 / 0, -2 / 0), true, "-Infinity, -Infinity"); // -Infinity VS -Infinity
    assert.equal(deepEqual(0 / 0, 1 / 0), false, "NaN, Infinity"); // Nan VS Infinity
    assert.equal(deepEqual(1 / 0, 0 / 0), false, "NaN, Infinity"); // Nan VS Infinity
    assert.equal(deepEqual(0 / 0, null), false, "NaN");
    assert.equal(deepEqual(0 / 0, undefined), false, "NaN");
    assert.equal(deepEqual(0 / 0, 0), false, "NaN");
    assert.equal(deepEqual(0 / 0, false), false, "NaN");
    assert.equal(
      deepEqual(0 / 0, function () {}),
      false,
      "NaN"
    );
    assert.equal(deepEqual(1 / 0, null), false, "NaN, Infinity");
    assert.equal(deepEqual(1 / 0, undefined), false, "NaN, Infinity");
    assert.equal(deepEqual(1 / 0, 0), false, "NaN, Infinity");
    assert.equal(deepEqual(1 / 0, 1), false, "NaN, Infinity");
    assert.equal(deepEqual(1 / 0, false), false, "NaN, Infinity");
    assert.equal(deepEqual(1 / 0, true), false, "NaN, Infinity");
    assert.equal(
      deepEqual(1 / 0, function () {}),
      false,
      "NaN, Infinity"
    );

    assert.equal(deepEqual(0, 0), true, "number");
    assert.equal(deepEqual(0, 1), false, "number");
    assert.equal(deepEqual(1, 0), false, "number");
    assert.equal(deepEqual(1, 1), true, "number");
    assert.equal(deepEqual(1.1, 1.1), true, "number");
    assert.equal(deepEqual(0.0000005, 0.0000005), true, "number");
    assert.equal(deepEqual(0, ""), false, "number");
    assert.equal(deepEqual(0, "0"), false, "number");
    assert.equal(deepEqual(1, "1"), false, "number");
    assert.equal(deepEqual(0, false), false, "number");
    assert.equal(deepEqual(1, true), false, "number");

    assert.equal(deepEqual(true, true), true, "boolean");
    assert.equal(deepEqual(true, false), false, "boolean");
    assert.equal(deepEqual(false, true), false, "boolean");
    assert.equal(deepEqual(false, 0), false, "boolean");
    assert.equal(deepEqual(false, null), false, "boolean");
    assert.equal(deepEqual(false, undefined), false, "boolean");
    assert.equal(deepEqual(true, 1), false, "boolean");
    assert.equal(deepEqual(true, null), false, "boolean");
    assert.equal(deepEqual(true, undefined), false, "boolean");

    assert.equal(deepEqual("", ""), true, "string");
    assert.equal(deepEqual("a", "a"), true, "string");
    assert.equal(deepEqual("foobar", "foobar"), true, "string");
    assert.equal(deepEqual("foobar", "foo"), false, "string");
    assert.equal(deepEqual("", 0), false, "string");
    assert.equal(deepEqual("", false), false, "string");
    assert.equal(deepEqual("", null), false, "string");
    assert.equal(deepEqual("", undefined), false, "string");

    // Rename for lint validation.
    // We know this is bad, we are asserting whether we can coop with bad code like this.
    var SafeNumber = Number;
    var SafeString = String;
    var SafeBoolean = Boolean;
    var SafeObject = Object;

    // primitives vs. objects

    assert.equal(deepEqual(0, new SafeNumber()), true, "number 0 primitive vs. object");
    assert.equal(deepEqual(new SafeNumber(), 0), true, "number 0 object vs. primitive");
    assert.equal(deepEqual(new SafeNumber(), new SafeNumber()), true, "empty number objects");
    assert.equal(deepEqual(1, new SafeNumber(1)), true, "number 1 primitive vs. object");
    assert.equal(deepEqual(new SafeNumber(1), 1), true, "number 1 object vs. primitive");
    assert.equal(deepEqual(new SafeNumber(1), new SafeNumber(1)), true, "number 1 objects");
    assert.equal(deepEqual(0, new SafeNumber(1)), false, "differing number primitive vs. object");
    assert.equal(deepEqual(new SafeNumber(0), 1), false, "differing number object vs. primitive");

    assert.equal(deepEqual("", new SafeString()), true, "empty string primitive vs. object");
    assert.equal(deepEqual(new SafeString(), ""), true, "empty string object vs. primitive");
    assert.equal(deepEqual(new SafeString(), new SafeString()), true, "empty string objects");
    assert.equal(deepEqual("My String", new SafeString("My String")), true, "nonempty string primitive vs. object");
    assert.equal(deepEqual(new SafeString("My String"), "My String"), true, "nonempty string object vs. primitive");
    assert.equal(deepEqual(new SafeString("My String"), new SafeString("My String")), true, "nonempty string objects");
    assert.equal(deepEqual("Bad String", new SafeString("My String")), false, "differing string primitive vs. object");
    assert.equal(deepEqual(new SafeString("Bad String"), "My String"), false, "differing string object vs. primitive");

    assert.equal(deepEqual(false, new SafeBoolean()), true, "boolean false primitive vs. object");
    assert.equal(deepEqual(new SafeBoolean(), false), true, "boolean empty object vs. primitive");
    assert.equal(deepEqual(new SafeBoolean(), new SafeBoolean()), true, "empty boolean objects");
    assert.equal(deepEqual(true, new SafeBoolean(true)), true, "boolean true primitive vs. object");
    assert.equal(deepEqual(new SafeBoolean(true), true), true, "boolean true object vs. primitive");
    assert.equal(deepEqual(new SafeBoolean(true), new SafeBoolean(true)), true, "boolean true objects");
    assert.equal(deepEqual(true, new SafeBoolean(1)), true, "boolean true primitive vs. truthy object");
    assert.equal(deepEqual(false, new SafeBoolean(false)), true, "boolean false primitive vs. false object");
    assert.equal(deepEqual(new SafeBoolean(false), false), true, "boolean false object vs. primitive");
    assert.equal(deepEqual(new SafeBoolean(false), new SafeBoolean(false)), true, "boolean false objects");
    assert.equal(deepEqual(false, new SafeBoolean(0)), true, "boolean false primitive vs. 0 object");
    assert.equal(deepEqual(true, new SafeBoolean(false)), false, "differing boolean primitive vs. object");
    assert.equal(deepEqual(new SafeBoolean(false), true), false, "differing boolean object vs. primitive");

    assert.equal(deepEqual(new SafeObject(), {}), true, "empty object instantiation vs. literal");
    assert.equal(deepEqual({}, new SafeObject()), true, "empty object literal vs. instantiation");
    assert.equal(deepEqual(new SafeObject(), { a: 1 }), false, "empty object instantiation vs. nonempty literal");
    assert.equal(deepEqual({ a: 1 }, new SafeObject()), false, "nonempty object literal vs. empty instantiation");
    assert.equal(
      deepEqual({ a: undefined }, new SafeObject()),
      false,
      "other nonempty object literal vs. empty instantiation"
    );
    assert.equal(
      deepEqual(new SafeObject(), { a: undefined }),
      false,
      "empty object instantiation vs. other nonempty literal"
    );
  });

  // NOTE: redundant test case/feature:
  test("Consecutive argument pairs", function (assert) {
    // degenerate cases with <2 inputs
    assert.equal(deepEqual(), true);
    assert.equal(deepEqual(1), true);

    // otherwise every "consecutive pair" must be equivalent
    assert.equal(deepEqual(1, 1, 1), true);
    assert.equal(deepEqual(1, 1, 2), false);
    assert.equal(deepEqual(1, 1, 1, 1), true);
    assert.equal(deepEqual(1, 1, 1, 2), false);
    assert.equal(deepEqual(1, 1, 1, 1, 1), true);
  });

  test("Objects basics", function (assert) {
    assert.equal(deepEqual({}, {}), true);
    assert.equal(deepEqual({}, null), false);
    assert.equal(deepEqual({}, undefined), false);
    assert.equal(deepEqual({}, 0), false);
    assert.equal(deepEqual({}, false), false);

    // This test is a hard one, it is very important
    // REASONS:
    // 1) They are of the same type "object"
    // 2) [] instanceof Object is true
    // 3) Their properties are the same (doesn't exists)
    assert.equal(deepEqual({}, []), false);

    assert.equal(deepEqual({ a: 1 }, { a: 1 }), true);
    assert.equal(deepEqual({ a: 1 }, { a: "1" }), false);
    assert.equal(deepEqual({ a: [] }, { a: [] }), true);
    assert.equal(deepEqual({ a: {} }, { a: null }), false);
    assert.equal(deepEqual({ a: 1 }, {}), false);
    assert.equal(deepEqual({}, { a: 1 }), false);

    // Hard ones
    assert.equal(deepEqual({ a: undefined }, {}), false);
    assert.equal(deepEqual({}, { a: undefined }), false);
    assert.equal(
      deepEqual(
        {
          a: [{ bar: undefined }],
        },
        {
          a: [{ bat: undefined }],
        }
      ),
      false
    );
  });

  test("Objects with null prototypes", function (assert) {
    var nonEmptyWithNoProto;

    // Objects with no prototype, created via Object.create(null), are used
    // e.g. as dictionaries.
    // Being able to test equivalence against object literals is quite useful.
    assert.equal(deepEqual(Object.create(null), {}), true, "empty object without prototype VS empty object");

    assert.equal(deepEqual({}, Object.create(null)), true, "empty object VS empty object without prototype");

    nonEmptyWithNoProto = Object.create(null);
    nonEmptyWithNoProto.foo = "bar";

    assert.equal(deepEqual(nonEmptyWithNoProto, { foo: "bar" }), true, "object without prototype VS object");

    assert.equal(deepEqual({ foo: "bar" }, nonEmptyWithNoProto), true, "object VS object without prototype");
  });

  test("Object prototype constructor is null", function (assert) {
    // Ref https://github.com/qunitjs/qunit/issues/851
    // Instances of this custom class have similar characteristics to null-objects.
    function NullObject() {}
    NullObject.prototype = Object.create(null, {
      constructor: {
        value: null,
      },
    });

    var a = new NullObject();
    a.foo = 1;
    var b = { foo: 1 };

    assert.true(deepEqual(a, b));
    assert.true(deepEqual(b, a));
  });

  test("Arrays basics", function (assert) {
    assert.equal(deepEqual([], []), true);

    // May be a hard one, can invoke a crash at execution.
    // because their types are both "object" but null isn't
    // like a true object, it doesn't have any property at all.
    assert.equal(deepEqual([], null), false);

    assert.equal(deepEqual([], undefined), false);
    assert.equal(deepEqual([], false), false);
    assert.equal(deepEqual([], 0), false);
    assert.equal(deepEqual([], ""), false);

    // May be a hard one, but less hard
    // than {} with [] (note the order)
    assert.equal(deepEqual([], {}), false);

    assert.equal(deepEqual([null], []), false);
    assert.equal(deepEqual([undefined], []), false);
    assert.equal(deepEqual([], [null]), false);
    assert.equal(deepEqual([], [undefined]), false);
    assert.equal(deepEqual([null], [undefined]), false);
    assert.equal(deepEqual([[]], [[]]), true);
    assert.equal(deepEqual([[], [], []], [[], [], []]), true);

    assert.equal(
      deepEqual(
        [[], [], [[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]],
        [[], [], [[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]
      ),
      true
    );

    assert.equal(
      deepEqual(
        [[], [], [[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]],
        [[], [], [[[[[[[[[[[[[[[[[[[[[[[[[[[[[[]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]
      ), // shorter
      false
    );

    assert.equal(
      deepEqual(
        [[], [], [[[[[[[[[[[[[[[[[[[[[[[[[[[[[[{}]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]],
        [[], [], [[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]
      ), // deepest element not an array
      false
    );

    // same multidimensional
    assert.equal(
      deepEqual(
        [
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          [
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            [
              1,
              2,
              3,
              4,
              5,
              [
                [
                  6,
                  7,
                  8,
                  9,
                  [
                    [
                      1,
                      2,
                      3,
                      4,
                      [
                        2,
                        3,
                        4,
                        [
                          1,
                          2,
                          [1, 2, 3, 4, [1, 2, 3, 4, 5, 6, 7, 8, 9, [0], 1, 2, 3, 4, 5, 6, 7, 8, 9], 5, 6, 7, 8, 9],
                          4,
                          5,
                          6,
                          7,
                          8,
                          9,
                        ],
                        5,
                        6,
                        7,
                        8,
                        9,
                      ],
                      5,
                      6,
                      7,
                    ],
                  ],
                ],
              ],
            ],
          ],
        ],
        [
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          [
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            [
              1,
              2,
              3,
              4,
              5,
              [
                [
                  6,
                  7,
                  8,
                  9,
                  [
                    [
                      1,
                      2,
                      3,
                      4,
                      [
                        2,
                        3,
                        4,
                        [
                          1,
                          2,
                          [1, 2, 3, 4, [1, 2, 3, 4, 5, 6, 7, 8, 9, [0], 1, 2, 3, 4, 5, 6, 7, 8, 9], 5, 6, 7, 8, 9],
                          4,
                          5,
                          6,
                          7,
                          8,
                          9,
                        ],
                        5,
                        6,
                        7,
                        8,
                        9,
                      ],
                      5,
                      6,
                      7,
                    ],
                  ],
                ],
              ],
            ],
          ],
        ]
      ),
      true,
      "Multidimensional"
    );

    // different multidimensional
    assert.equal(
      deepEqual(
        [
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          [
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            [
              1,
              2,
              3,
              4,
              5,
              [
                [
                  6,
                  7,
                  8,
                  9,
                  [
                    [
                      1,
                      2,
                      3,
                      4,
                      [
                        2,
                        3,
                        4,
                        [
                          1,
                          2,
                          [1, 2, 3, 4, [1, 2, 3, 4, 5, 6, 7, 8, 9, [0], 1, 2, 3, 4, 5, 6, 7, 8, 9], 5, 6, 7, 8, 9],
                          4,
                          5,
                          6,
                          7,
                          8,
                          9,
                        ],
                        5,
                        6,
                        7,
                        8,
                        9,
                      ],
                      5,
                      6,
                      7,
                    ],
                  ],
                ],
              ],
            ],
          ],
        ],
        [
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          [
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            [
              1,
              2,
              3,
              4,
              5,
              [
                [
                  6,
                  7,
                  8,
                  9,
                  [
                    [
                      1,
                      2,
                      3,
                      4,
                      [
                        2,
                        3,
                        4,
                        [
                          1,
                          2,
                          [
                            "1",
                            2,
                            3,
                            4,
                            [
                              // string instead of number
                              1,
                              2,
                              3,
                              4,
                              5,
                              6,
                              7,
                              8,
                              9,
                              [0],
                              1,
                              2,
                              3,
                              4,
                              5,
                              6,
                              7,
                              8,
                              9,
                            ],
                            5,
                            6,
                            7,
                            8,
                            9,
                          ],
                          4,
                          5,
                          6,
                          7,
                          8,
                          9,
                        ],
                        5,
                        6,
                        7,
                        8,
                        9,
                      ],
                      5,
                      6,
                      7,
                    ],
                  ],
                ],
              ],
            ],
          ],
        ]
      ),
      false,
      "Multidimensional"
    );

    // different multidimensional
    assert.equal(
      deepEqual(
        [
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          [
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            [
              1,
              2,
              3,
              4,
              5,
              [
                [
                  6,
                  7,
                  8,
                  9,
                  [
                    [
                      1,
                      2,
                      3,
                      4,
                      [
                        2,
                        3,
                        4,
                        [
                          1,
                          2,
                          [1, 2, 3, 4, [1, 2, 3, 4, 5, 6, 7, 8, 9, [0], 1, 2, 3, 4, 5, 6, 7, 8, 9], 5, 6, 7, 8, 9],
                          4,
                          5,
                          6,
                          7,
                          8,
                          9,
                        ],
                        5,
                        6,
                        7,
                        8,
                        9,
                      ],
                      5,
                      6,
                      7,
                    ],
                  ],
                ],
              ],
            ],
          ],
        ],
        [
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          [
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            [
              1,
              2,
              3,
              4,
              5,
              [
                [
                  6,
                  7,
                  8,
                  9,
                  [
                    [
                      1,
                      2,
                      3,
                      4,
                      [
                        2,
                        3,
                        [
                          // missing an element (4)
                          1,
                          2,
                          [1, 2, 3, 4, [1, 2, 3, 4, 5, 6, 7, 8, 9, [0], 1, 2, 3, 4, 5, 6, 7, 8, 9], 5, 6, 7, 8, 9],
                          4,
                          5,
                          6,
                          7,
                          8,
                          9,
                        ],
                        5,
                        6,
                        7,
                        8,
                        9,
                      ],
                      5,
                      6,
                      7,
                    ],
                  ],
                ],
              ],
            ],
          ],
        ]
      ),
      false,
      "Multidimensional"
    );
  });

  test("Functions", function (assert) {
    var f0 = function () {};
    var f1 = function () {};

    // f2 and f3 have the same code, formatted differently
    var f2 = function () {
      return 0;
    };
    var f3 = function () {
      // eslint-disable-next-line semi
      return 0; // this comment and no semicoma as difference
    };

    assert.equal(
      deepEqual(
        function () {},
        function () {}
      ),
      false,
      "Anonymous functions"
    ); // exact source code
    assert.equal(
      deepEqual(
        function () {},
        function () {
          return true;
        }
      ),
      false,
      "Anonymous functions"
    );

    assert.equal(deepEqual(f0, f0), true, "Function references"); // same references
    assert.equal(deepEqual(f0, f1), false, "Function references"); // exact source code, different references
    assert.equal(deepEqual(f2, f3), false, "Function references"); // equivalent source code, different references
    assert.equal(deepEqual(f1, f2), false, "Function references"); // different source code, different references
    assert.equal(
      deepEqual(function () {}, true),
      false
    );
    assert.equal(
      deepEqual(function () {}, undefined),
      false
    );
    assert.equal(
      deepEqual(function () {}, null),
      false
    );
    assert.equal(
      deepEqual(function () {}, {}),
      false
    );
  });

  test("Date instances", function (assert) {
    // Date, we don't need to test Date.parse() because it returns a number.
    // Only test the Date instances by setting them a fix date.
    // The date use is midnight January 1, 1970
    var d1, d2, d3;

    d1 = new Date();
    d1.setTime(0); // fix the date

    d2 = new Date();
    d2.setTime(0); // fix the date

    d3 = new Date(); // The very now

    // Anyway their types differs, just in case the code fails in the order in which it deals with date
    assert.equal(deepEqual(d1, 0), false); // d1.valueOf() returns 0, but d1 and 0 are different

    // test same values date and different instances equality
    assert.equal(deepEqual(d1, d2), true);

    // test different date and different instances difference
    assert.equal(deepEqual(d1, d3), false);
  });

  test("RegExp", function (assert) {
    // Must test cases that imply those traps:
    // var a = /./;
    // a instanceof Object; // Oops
    // a instanceof RegExp; // Oops
    // typeof a === "function"; // Oops, false in IE and Opera, true in FF and Safari ("object")

    // Tests same regex with same modifiers in different order
    var regex1;
    var regex2;
    var regex3;
    var r3a;
    var r3b;
    var ru1;
    var ru2;
    var r1 = /foo/;
    var r2 = /foo/gim;
    var r3 = /foo/gim;
    var r4 = /foo/gim;
    var r5 = /foo/gim;
    var r6 = /foo/gim;
    var r7 = /foo/gim;
    var ri1 = /foo/i;
    var ri2 = /foo/i;
    var rm1 = /foo/m;
    var rm2 = /foo/m;
    var rg1 = /foo/g;
    var rg2 = /foo/g;

    assert.equal(deepEqual(r2, r3), true, "Modifier order");
    assert.equal(deepEqual(r2, r4), true, "Modifier order");
    assert.equal(deepEqual(r2, r5), true, "Modifier order");
    assert.equal(deepEqual(r2, r6), true, "Modifier order");
    assert.equal(deepEqual(r2, r7), true, "Modifier order");
    assert.equal(deepEqual(r1, r2), false, "Modifier");

    assert.equal(deepEqual(ri1, ri2), true, "Modifier");
    assert.equal(deepEqual(r1, ri1), false, "Modifier");
    assert.equal(deepEqual(ri1, rm1), false, "Modifier");
    assert.equal(deepEqual(r1, rm1), false, "Modifier");
    assert.equal(deepEqual(rm1, ri1), false, "Modifier");
    assert.equal(deepEqual(rm1, rm2), true, "Modifier");
    assert.equal(deepEqual(rg1, rm1), false, "Modifier");
    assert.equal(deepEqual(rm1, rg1), false, "Modifier");
    assert.equal(deepEqual(rg1, rg2), true, "Modifier");

    // Compare unicode modifier
    // Support IE 11: Use RegExp constructor to avoid syntax error
    try {
      r2 = new RegExp("foo", "umig");
      r3 = new RegExp("foo", "mgiu");
      assert.equal(deepEqual(r2, r3), true, "Modifier order");
      assert.equal(deepEqual(r1, r2), false, "Modifier");

      ru1 = new RegExp("\\u{1D306}", "u");
      ru2 = new RegExp("\\u{1D306}", "u");
      assert.equal(deepEqual(ru1, rg1), false, "Modifier");
      assert.equal(deepEqual(rg1, ru1), false, "Modifier");
      assert.equal(deepEqual(ru1, ru2), true, "Modifier");
    } catch (e) {}

    // Different regex, same modifiers
    r1 = /[a-z]/gi;
    r2 = /[0-9]/gi; // oops! different
    assert.equal(deepEqual(r1, r2), false, "Regex pattern");

    r1 = /0/gi;
    r2 = /"0"/gi; // oops! different
    assert.equal(deepEqual(r1, r2), false, "Regex pattern");

    r1 = /[\n\r\u2028\u2029]/g;
    r2 = /[\n\r\u2028\u2029]/g;
    r3 = /[\n\r\u2028\u2028]/g; // differs from r1
    r4 = /[\n\r\u2028\u2029]/; // differs from r1

    assert.equal(deepEqual(r1, r2), true, "Regex pattern");
    assert.equal(deepEqual(r1, r3), false, "Regex pattern");
    assert.equal(deepEqual(r1, r4), false, "Regex pattern");

    // More complex regex
    regex1 =
      "^[-_.a-z0-9]+@([-_a-z0-9]+\\.)+([A-Za-z][A-Za-z]|[A-Za-z][A-Za-z][A-Za-z])|(([0-9][0-9]?|[0-1][0-9][0-9]|[2][0-4][0-9]|[2][5][0-5]))$";
    regex2 =
      "^[-_.a-z0-9]+@([-_a-z0-9]+\\.)+([A-Za-z][A-Za-z]|[A-Za-z][A-Za-z][A-Za-z])|(([0-9][0-9]?|[0-1][0-9][0-9]|[2][0-4][0-9]|[2][5][0-5]))$";

    // regex 3 is different: '.' not escaped
    regex3 =
      "^[-_.a-z0-9]+@([-_a-z0-9]+.)+([A-Za-z][A-Za-z]|[A-Za-z][A-Za-z][A-Za-z])|(([0-9][0-9]?|[0-1][0-9][0-9]|[2][0-4][0-9]|[2][5][0-5]))$";

    r1 = new RegExp(regex1);
    r2 = new RegExp(regex2);
    r3 = new RegExp(regex3); // diff from r21, not same pattern
    r3a = new RegExp(regex3, "gi"); // diff from r23, not same modifier
    r3b = new RegExp(regex3, "ig"); // same as r23a

    assert.equal(deepEqual(r1, r2), true, "Complex Regex");
    assert.equal(deepEqual(r1, r3), false, "Complex Regex");
    assert.equal(deepEqual(r3, r3a), false, "Complex Regex");
    assert.equal(deepEqual(r3a, r3b), true, "Complex Regex");

    // typeof r1 is "function" in some browsers and "object" in others so we must cover this test
    r1 = / /;
    assert.equal(
      deepEqual(r1, function () {}),
      false,
      "Regex internal"
    );
    assert.equal(deepEqual(r1, {}), false, "Regex internal");
  });

  test("Complex objects", function (assert) {
    function fn1() {
      return "fn1";
    }
    function fn2() {
      return "fn2";
    }

    // Try to invert the order of some properties to make sure it is covered.
    // It can failed when properties are compared between unsorted arrays.
    assert.equal(
      deepEqual(
        {
          a: 1,
          b: null,
          c: [{}],
          d: {
            a: 3.14159,
            b: false,
            c: {
              e: fn1,
              f: [[[]]],
              g: {
                j: {
                  k: {
                    n: {
                      r: "r",
                      s: [1, 2, 3],
                      t: undefined,
                      u: 0,
                      v: {
                        w: {
                          x: {
                            y: "Yahoo!",
                            z: null,
                          },
                        },
                      },
                    },
                    q: [],
                    p: 1 / 0,
                    o: 99,
                  },
                  l: undefined,
                  m: null,
                },
              },
              d: 0,
              i: true,
              h: "false",
            },
          },
          e: undefined,
          g: "",
          h: "h",
          f: {},
          i: [],
        },
        {
          a: 1,
          b: null,
          c: [{}],
          d: {
            b: false,
            a: 3.14159,
            c: {
              d: 0,
              e: fn1,
              f: [[[]]],
              g: {
                j: {
                  k: {
                    n: {
                      r: "r",
                      t: undefined,
                      u: 0,
                      s: [1, 2, 3],
                      v: {
                        w: {
                          x: {
                            z: null,
                            y: "Yahoo!",
                          },
                        },
                      },
                    },
                    o: 99,
                    p: 1 / 0,
                    q: [],
                  },
                  l: undefined,
                  m: null,
                },
              },
              i: true,
              h: "false",
            },
          },
          e: undefined,
          g: "",
          f: {},
          h: "h",
          i: [],
        }
      ),
      true
    );

    assert.equal(
      deepEqual(
        {
          a: 1,
          b: null,
          c: [{}],
          d: {
            a: 3.14159,
            b: false,
            c: {
              d: 0,
              e: fn1,
              f: [[[]]],
              g: {
                j: {
                  k: {
                    n: {
                      // r: "r", // different: missing a property
                      s: [1, 2, 3],
                      t: undefined,
                      u: 0,
                      v: {
                        w: {
                          x: {
                            y: "Yahoo!",
                            z: null,
                          },
                        },
                      },
                    },
                    o: 99,
                    p: 1 / 0,
                    q: [],
                  },
                  l: undefined,
                  m: null,
                },
              },
              h: "false",
              i: true,
            },
          },
          e: undefined,
          f: {},
          g: "",
          h: "h",
          i: [],
        },
        {
          a: 1,
          b: null,
          c: [{}],
          d: {
            a: 3.14159,
            b: false,
            c: {
              d: 0,
              e: fn1,
              f: [[[]]],
              g: {
                j: {
                  k: {
                    n: {
                      r: "r",
                      s: [1, 2, 3],
                      t: undefined,
                      u: 0,
                      v: {
                        w: {
                          x: {
                            y: "Yahoo!",
                            z: null,
                          },
                        },
                      },
                    },
                    o: 99,
                    p: 1 / 0,
                    q: [],
                  },
                  l: undefined,
                  m: null,
                },
              },
              h: "false",
              i: true,
            },
          },
          e: undefined,
          f: {},
          g: "",
          h: "h",
          i: [],
        }
      ),
      false
    );

    assert.equal(
      deepEqual(
        {
          a: 1,
          b: null,
          c: [{}],
          d: {
            a: 3.14159,
            b: false,
            c: {
              d: 0,
              e: fn1,
              f: [[[]]],
              g: {
                j: {
                  k: {
                    n: {
                      r: "r",
                      s: [1, 2, 3],
                      t: undefined,
                      u: 0,
                      v: {
                        w: {
                          x: {
                            y: "Yahoo!",
                            z: null,
                          },
                        },
                      },
                    },
                    o: 99,
                    p: 1 / 0,
                    q: [],
                  },
                  l: undefined,
                  m: null,
                },
              },
              h: "false",
              i: true,
            },
          },
          e: undefined,
          f: {},
          g: "",
          h: "h",
          i: [],
        },
        {
          a: 1,
          b: null,
          c: [{}],
          d: {
            a: 3.14159,
            b: false,
            c: {
              d: 0,
              e: fn1,
              f: [[[]]],
              g: {
                j: {
                  k: {
                    n: {
                      r: "r",
                      s: [1, 2, 3],
                      // t: undefined, // different: missing a property with an undefined value
                      u: 0,
                      v: {
                        w: {
                          x: {
                            y: "Yahoo!",
                            z: null,
                          },
                        },
                      },
                    },
                    o: 99,
                    p: 1 / 0,
                    q: [],
                  },
                  l: undefined,
                  m: null,
                },
              },
              h: "false",
              i: true,
            },
          },
          e: undefined,
          f: {},
          g: "",
          h: "h",
          i: [],
        }
      ),
      false
    );

    assert.equal(
      deepEqual(
        {
          a: 1,
          b: null,
          c: [{}],
          d: {
            a: 3.14159,
            b: false,
            c: {
              d: 0,
              e: fn1,
              f: [[[]]],
              g: {
                j: {
                  k: {
                    n: {
                      r: "r",
                      s: [1, 2, 3],
                      t: undefined,
                      u: 0,
                      v: {
                        w: {
                          x: {
                            y: "Yahoo!",
                            z: null,
                          },
                        },
                      },
                    },
                    o: 99,
                    p: 1 / 0,
                    q: [],
                  },
                  l: undefined,
                  m: null,
                },
              },
              h: "false",
              i: true,
            },
          },
          e: undefined,
          f: {},
          g: "",
          h: "h",
          i: [],
        },
        {
          a: 1,
          b: null,
          c: [{}],
          d: {
            a: 3.14159,
            b: false,
            c: {
              d: 0,
              e: fn1,
              f: [[[]]],
              g: {
                j: {
                  k: {
                    n: {
                      r: "r",
                      s: [1, 2, 3],
                      t: undefined,
                      u: 0,
                      v: {
                        w: {
                          x: {
                            y: "Yahoo!",
                            z: null,
                          },
                        },
                      },
                    },
                    o: 99,
                    p: 1 / 0,
                    q: {}, // different was []
                  },
                  l: undefined,
                  m: null,
                },
              },
              h: "false",
              i: true,
            },
          },
          e: undefined,
          f: {},
          g: "",
          h: "h",
          i: [],
        }
      ),
      false
    );

    var same1 = {
      a: [
        "string",
        null,
        0,
        "1",
        1,
        {
          prop: null,
          foo: [1, 2, null, {}, [], [1, 2, 3]],
          bar: undefined,
        },
        3,
        "Hey!",
        "ÎšÎ¬Î½Îµ Ï€Î¬Î½Ï„Î± Î³Î½Ï‰ÏÎ¯Î¶Î¿Ï…Î¼Îµ Î±Ï‚ Ï„Ï‰Î½, Î¼Î·Ï‡Î±Î½Î®Ï‚ ÎµÏ€Î¹Î´Î¹ÏŒÏÎ¸Ï‰ÏƒÎ·Ï‚ ÎµÏ€Î¹Î´Î¹Î¿ÏÎ¸ÏŽÏƒÎµÎ¹Ï‚ ÏŽÏ‚ Î¼Î¹Î±. ÎšÎ»Ï€ Î±Ï‚",
      ],
      unicode: "è€ æ±‰è¯ä¸å˜åœ¨ æ¸¯æ¾³å’Œæµ·å¤–çš„åŽäººåœˆä¸ è´µå·ž æˆ‘åŽ»äº†ä¹¦åº— çŽ°åœ¨å°šæœ‰äº‰",
      b: "b",
      c: fn1,
    };

    var same2 = {
      a: [
        "string",
        null,
        0,
        "1",
        1,
        {
          prop: null,
          foo: [1, 2, null, {}, [], [1, 2, 3]],
          bar: undefined,
        },
        3,
        "Hey!",
        "ÎšÎ¬Î½Îµ Ï€Î¬Î½Ï„Î± Î³Î½Ï‰ÏÎ¯Î¶Î¿Ï…Î¼Îµ Î±Ï‚ Ï„Ï‰Î½, Î¼Î·Ï‡Î±Î½Î®Ï‚ ÎµÏ€Î¹Î´Î¹ÏŒÏÎ¸Ï‰ÏƒÎ·Ï‚ ÎµÏ€Î¹Î´Î¹Î¿ÏÎ¸ÏŽÏƒÎµÎ¹Ï‚ ÏŽÏ‚ Î¼Î¹Î±. ÎšÎ»Ï€ Î±Ï‚",
      ],
      unicode: "è€ æ±‰è¯ä¸å˜åœ¨ æ¸¯æ¾³å’Œæµ·å¤–çš„åŽäººåœˆä¸ è´µå·ž æˆ‘åŽ»äº†ä¹¦åº— çŽ°åœ¨å°šæœ‰äº‰",
      b: "b",
      c: fn1,
    };

    var diff1 = {
      a: [
        "string",
        null,
        0,
        "1",
        1,
        {
          prop: null,
          foo: [1, 2, null, {}, [], [1, 2, 3, 4]], // different: 4 was add to the array
          bar: undefined,
        },
        3,
        "Hey!",
        "ÎšÎ¬Î½Îµ Ï€Î¬Î½Ï„Î± Î³Î½Ï‰ÏÎ¯Î¶Î¿Ï…Î¼Îµ Î±Ï‚ Ï„Ï‰Î½, Î¼Î·Ï‡Î±Î½Î®Ï‚ ÎµÏ€Î¹Î´Î¹ÏŒÏÎ¸Ï‰ÏƒÎ·Ï‚ ÎµÏ€Î¹Î´Î¹Î¿ÏÎ¸ÏŽÏƒÎµÎ¹Ï‚ ÏŽÏ‚ Î¼Î¹Î±. ÎšÎ»Ï€ Î±Ï‚",
      ],
      unicode: "è€ æ±‰è¯ä¸å˜åœ¨ æ¸¯æ¾³å’Œæµ·å¤–çš„åŽäººåœˆä¸ è´µå·ž æˆ‘åŽ»äº†ä¹¦åº— çŽ°åœ¨å°šæœ‰äº‰",
      b: "b",
      c: fn1,
    };

    var diff2 = {
      a: [
        "string",
        null,
        0,
        "1",
        1,
        {
          prop: null,
          foo: [1, 2, null, {}, [], [1, 2, 3]],
          newprop: undefined, // different: newprop was added
          bar: undefined,
        },
        3,
        "Hey!",
        "ÎšÎ¬Î½Îµ Ï€Î¬Î½Ï„Î± Î³Î½Ï‰ÏÎ¯Î¶Î¿Ï…Î¼Îµ Î±Ï‚ Ï„Ï‰Î½, Î¼Î·Ï‡Î±Î½Î®Ï‚ ÎµÏ€Î¹Î´Î¹ÏŒÏÎ¸Ï‰ÏƒÎ·Ï‚ ÎµÏ€Î¹Î´Î¹Î¿ÏÎ¸ÏŽÏƒÎµÎ¹Ï‚ ÏŽÏ‚ Î¼Î¹Î±. ÎšÎ»Ï€ Î±Ï‚",
      ],
      unicode: "è€ æ±‰è¯ä¸å˜åœ¨ æ¸¯æ¾³å’Œæµ·å¤–çš„åŽäººåœˆä¸ è´µå·ž æˆ‘åŽ»äº†ä¹¦åº— çŽ°åœ¨å°šæœ‰äº‰",
      b: "b",
      c: fn1,
    };

    var diff3 = {
      a: [
        "string",
        null,
        0,
        "1",
        1,
        {
          prop: null,
          foo: [1, 2, null, {}, [], [1, 2, 3]],
          bar: undefined,
        },
        3,
        "Hey!",
        "ÎšÎ¬Î½Îµ Ï€Î¬Î½Ï„Î± Î³Î½Ï‰ÏÎ¯Î¶Î¿Ï…Î¼Îµ Î±Ï‚ Ï„Ï‰Î½, Î¼Î·Ï‡Î±Î½Î®Ï‚ ÎµÏ€Î¹Î´Î¹ÏŒÏÎ¸Ï‰ÏƒÎ·Ï‚ ÎµÏ€Î¹Î´Î¹Î¿ÏÎ¸ÏŽÏƒÎµÎ¹Ï‚ ÏŽÏ‚ Î¼Î¹Î±. ÎšÎ»Ï€ Î±", // different: missing last char
      ],
      unicode: "è€ æ±‰è¯ä¸å˜åœ¨ æ¸¯æ¾³å’Œæµ·å¤–çš„åŽäººåœˆä¸ è´µå·ž æˆ‘åŽ»äº†ä¹¦åº— çŽ°åœ¨å°šæœ‰äº‰",
      b: "b",
      c: fn1,
    };

    var diff4 = {
      a: [
        "string",
        null,
        0,
        "1",
        1,
        {
          prop: null,
          foo: [1, 2, undefined, {}, [], [1, 2, 3]], // different: undefined instead of null
          bar: undefined,
        },
        3,
        "Hey!",
        "ÎšÎ¬Î½Îµ Ï€Î¬Î½Ï„Î± Î³Î½Ï‰ÏÎ¯Î¶Î¿Ï…Î¼Îµ Î±Ï‚ Ï„Ï‰Î½, Î¼Î·Ï‡Î±Î½Î®Ï‚ ÎµÏ€Î¹Î´Î¹ÏŒÏÎ¸Ï‰ÏƒÎ·Ï‚ ÎµÏ€Î¹Î´Î¹Î¿ÏÎ¸ÏŽÏƒÎµÎ¹Ï‚ ÏŽÏ‚ Î¼Î¹Î±. ÎšÎ»Ï€ Î±Ï‚",
      ],
      unicode: "è€ æ±‰è¯ä¸å˜åœ¨ æ¸¯æ¾³å’Œæµ·å¤–çš„åŽäººåœˆä¸ è´µå·ž æˆ‘åŽ»äº†ä¹¦åº— çŽ°åœ¨å°šæœ‰äº‰",
      b: "b",
      c: fn1,
    };

    var diff5 = {
      a: [
        "string",
        null,
        0,
        "1",
        1,
        {
          prop: null,
          foo: [1, 2, null, {}, [], [1, 2, 3]],
          bat: undefined, // different: property name not "bar"
        },
        3,
        "Hey!",
        "ÎšÎ¬Î½Îµ Ï€Î¬Î½Ï„Î± Î³Î½Ï‰ÏÎ¯Î¶Î¿Ï…Î¼Îµ Î±Ï‚ Ï„Ï‰Î½, Î¼Î·Ï‡Î±Î½Î®Ï‚ ÎµÏ€Î¹Î´Î¹ÏŒÏÎ¸Ï‰ÏƒÎ·Ï‚ ÎµÏ€Î¹Î´Î¹Î¿ÏÎ¸ÏŽÏƒÎµÎ¹Ï‚ ÏŽÏ‚ Î¼Î¹Î±. ÎšÎ»Ï€ Î±Ï‚",
      ],
      unicode: "è€ æ±‰è¯ä¸å˜åœ¨ æ¸¯æ¾³å’Œæµ·å¤–çš„åŽäººåœˆä¸ è´µå·ž æˆ‘åŽ»äº†ä¹¦åº— çŽ°åœ¨å°šæœ‰äº‰",
      b: "b",
      c: fn1,
    };

    var diff6 = {
      a: [
        "string",
        null,
        0,
        "1",
        1,
        {
          prop: null,
          foo: [1, 2, null, {}, [], [1, 2, 3]],
          bar: undefined,
        },
        3,
        "Hey!",
        "ÎšÎ¬Î½Îµ Ï€Î¬Î½Ï„Î± Î³Î½Ï‰ÏÎ¯Î¶Î¿Ï…Î¼Îµ Î±Ï‚ Ï„Ï‰Î½, Î¼Î·Ï‡Î±Î½Î®Ï‚ ÎµÏ€Î¹Î´Î¹ÏŒÏÎ¸Ï‰ÏƒÎ·Ï‚ ÎµÏ€Î¹Î´Î¹Î¿ÏÎ¸ÏŽÏƒÎµÎ¹Ï‚ ÏŽÏ‚ Î¼Î¹Î±. ÎšÎ»Ï€ Î±Ï‚",
      ],
      unicode: "è€ æ±‰è¯ä¸å˜åœ¨ æ¸¯æ¾³å’Œæµ·å¤–çš„åŽäººåœˆä¸ è´µå·ž æˆ‘åŽ»äº†ä¹¦åº— çŽ°åœ¨å°šæœ‰äº‰",
      b: "b",
      c: fn2, // different: fn2 instead of fn1
    };

    assert.equal(deepEqual(same1, same2), true);
    assert.equal(deepEqual(same2, same1), true);
    assert.equal(deepEqual(same2, diff1), false);
    assert.equal(deepEqual(diff1, same2), false);

    assert.equal(deepEqual(same1, diff1), false);
    assert.equal(deepEqual(same1, diff2), false);
    assert.equal(deepEqual(same1, diff3), false);
    assert.equal(deepEqual(same1, diff3), false);
    assert.equal(deepEqual(same1, diff4), false);
    assert.equal(deepEqual(same1, diff5), false);
    assert.equal(deepEqual(same1, diff6), false);
    assert.equal(deepEqual(diff5, diff1), false);
  });

  test("Complex Arrays", function (assert) {
    function fn() {}

    assert.equal(
      deepEqual(
        [
          1,
          2,
          3,
          true,
          {},
          null,
          [
            {
              a: ["", "1", 0],
            },
            5,
            6,
            7,
          ],
          "foo",
        ],
        [
          1,
          2,
          3,
          true,
          {},
          null,
          [
            {
              a: ["", "1", 0],
            },
            5,
            6,
            7,
          ],
          "foo",
        ]
      ),
      true
    );

    assert.equal(
      deepEqual(
        [
          1,
          2,
          3,
          true,
          {},
          null,
          [
            {
              a: ["", "1", 0],
            },
            5,
            6,
            7,
          ],
          "foo",
        ],
        [
          1,
          2,
          3,
          true,
          {},
          null,
          [
            {
              b: ["", "1", 0], // not same property name
            },
            5,
            6,
            7,
          ],
          "foo",
        ]
      ),
      false
    );

    var a = [
      {
        b: fn,
        c: false,
        do: "reserved word",
        for: {
          ar: [
            3,
            5,
            9,
            "hey!",
            [],
            {
              ar: [1, [3, 4, 6, 9, null, [], []]],
              e: fn,
              f: undefined,
            },
          ],
        },
        e: 0.43445,
      },
      5,
      "string",
      0,
      fn,
      false,
      null,
      undefined,
      0,
      [4, 5, 6, 7, 8, 9, 11, 22, 33, 44, 55, "66", null, [], [[[[[3]]]], "3"], {}, 1 / 0],
      [],
      [
        [
          [],
          "foo",
          null,
          {
            n: 1 / 0,
            z: {
              a: [3, 4, 5, 6, "yep!", undefined, undefined],
              b: {},
            },
          },
          {},
        ],
      ],
    ];

    assert.equal(
      deepEqual(a, [
        {
          b: fn,
          c: false,
          do: "reserved word",
          for: {
            ar: [
              3,
              5,
              9,
              "hey!",
              [],
              {
                ar: [1, [3, 4, 6, 9, null, [], []]],
                e: fn,
                f: undefined,
              },
            ],
          },
          e: 0.43445,
        },
        5,
        "string",
        0,
        fn,
        false,
        null,
        undefined,
        0,
        [4, 5, 6, 7, 8, 9, 11, 22, 33, 44, 55, "66", null, [], [[[[[3]]]], "3"], {}, 1 / 0],
        [],
        [
          [
            [],
            "foo",
            null,
            {
              n: 1 / 0,
              z: {
                a: [3, 4, 5, 6, "yep!", undefined, undefined],
                b: {},
              },
            },
            {},
          ],
        ],
      ]),
      true
    );

    assert.equal(
      deepEqual(a, [
        {
          b: fn,
          c: false,
          do: "reserved word",
          for: {
            ar: [
              3,
              5,
              9,
              "hey!",
              [],
              {
                ar: [1, [3, 4, 6, 9, null, [], []]],
                e: fn,
                f: undefined,
              },
            ],
          },
          e: 0.43445,
        },
        5,
        "string",
        0,
        fn,
        false,
        null,
        undefined,
        0,
        [
          4,
          5,
          6,
          7,
          8,
          9,
          11,
          22,
          33,
          44,
          55,
          "66",
          null,
          [],
          [[[[[2]]]], "3"],
          {},
          1 / 0,
          // different: [[[[[2]]]]] instead of [[[[[3]]]]]
        ],
        [],
        [
          [
            [],
            "foo",
            null,
            {
              n: 1 / 0,
              z: {
                a: [3, 4, 5, 6, "yep!", undefined, undefined],
                b: {},
              },
            },
            {},
          ],
        ],
      ]),
      false
    );

    assert.equal(
      deepEqual(a, [
        {
          b: fn,
          c: false,
          do: "reserved word",
          for: {
            ar: [
              3,
              5,
              9,
              "hey!",
              [],
              {
                ar: [1, [3, 4, 6, 9, null, [], []]],
                e: fn,
                f: undefined,
              },
            ],
          },
          e: 0.43445,
        },
        5,
        "string",
        0,
        fn,
        false,
        null,
        undefined,
        0,
        [4, 5, 6, 7, 8, 9, 11, 22, 33, 44, 55, "66", null, [], [[[[[3]]]], "3"], {}, 1 / 0],
        [],
        [
          [
            [],
            "foo",
            null,
            {
              n: -1 / 0, // different, -Infinity instead of Infinity
              z: {
                a: [3, 4, 5, 6, "yep!", undefined, undefined],
                b: {},
              },
            },
            {},
          ],
        ],
      ]),
      false
    );

    assert.equal(
      deepEqual(a, [
        {
          b: fn,
          c: false,
          do: "reserved word",
          for: {
            ar: [
              3,
              5,
              9,
              "hey!",
              [],
              {
                ar: [1, [3, 4, 6, 9, null, [], []]],
                e: fn,
                f: undefined,
              },
            ],
          },
          e: 0.43445,
        },
        5,
        "string",
        0,
        fn,
        false,
        null,
        undefined,
        0,
        [4, 5, 6, 7, 8, 9, 11, 22, 33, 44, 55, "66", null, [], [[[[[3]]]], "3"], {}, 1 / 0],
        [],
        [
          [
            [],
            "foo",
            {
              // different: null is missing
              n: 1 / 0,
              z: {
                a: [3, 4, 5, 6, "yep!", undefined, undefined],
                b: {},
              },
            },
            {},
          ],
        ],
      ]),
      false
    );

    assert.equal(
      deepEqual(a, [
        {
          b: fn,
          c: false,
          do: "reserved word",
          for: {
            ar: [
              3,
              5,
              9,
              "hey!",
              [],
              {
                ar: [1, [3, 4, 6, 9, null, [], []]],
                e: fn,
                // different: missing property f: undefined
              },
            ],
          },
          e: 0.43445,
        },
        5,
        "string",
        0,
        fn,
        false,
        null,
        undefined,
        0,
        [4, 5, 6, 7, 8, 9, 11, 22, 33, 44, 55, "66", null, [], [[[[[3]]]], "3"], {}, 1 / 0],
        [],
        [
          [
            [],
            "foo",
            null,
            {
              n: 1 / 0,
              z: {
                a: [3, 4, 5, 6, "yep!", undefined, undefined],
                b: {},
              },
            },
            {},
          ],
        ],
      ]),
      false
    );
  });

  test("Prototypal inheritance", function (assert) {
    function Gizmo(id) {
      this.id = id;
    }

    function Hoozit(id) {
      this.id = id;
    }
    Hoozit.prototype = new Gizmo();

    var gizmo = new Gizmo("ok");
    var hoozit = new Hoozit("ok");

    // Try this test many times after test on instances that hold function
    // to make sure that our code does not mess with last object constructor memoization.
    assert.equal(
      deepEqual(
        function () {},
        function () {}
      ),
      false
    );

    // Hoozit inherit from Gizmo
    // hoozit instanceof Hoozit; // true
    // hoozit instanceof Gizmo; // true
    assert.equal(deepEqual(hoozit, gizmo), true);

    // Gizmo.prototype.bar = true; // not a function just in case we skip them

    // Hoozit inherit from Gizmo
    // They are equivalent
    assert.equal(deepEqual(hoozit, gizmo), true);

    // Make sure this is still true !important
    // The reason for this is that I forgot to reset the last
    // caller to where it were called from.
    assert.equal(
      deepEqual(
        function () {},
        function () {}
      ),
      false
    );

    // Make sure this is still true !important
    assert.equal(deepEqual(hoozit, gizmo), true);

    Hoozit.prototype.foo = true; // not a function just in case we skip them

    // Gizmo does not inherit from Hoozit
    // gizmo instanceof Gizmo; // true
    // gizmo instanceof Hoozit; // false
    // They are not equivalent
    assert.equal(deepEqual(hoozit, gizmo), false);

    // Make sure this is still true !important
    assert.equal(
      deepEqual(
        function () {},
        function () {}
      ),
      false
    );
  });

  test("Instances", function (assert) {
    var a1, a2, b1, b2, c1, c2, c3, car, carSame, carDiff, human;

    function A() {}
    a1 = new A();
    a2 = new A();

    function B() {
      this.fn = function () {};
    }
    b1 = new B();
    b2 = new B();

    function C(fn) {
      this.fn = fn;
    }

    c1 = new C(function () {
      return true;
    });
    c2 = new C(function () {
      return false;
    });
    c3 = new C(function () {
      return true;
    });

    assert.equal(deepEqual(a1, a2), true, "Same property, same constructor");

    // b1.fn and b2.fn are functions but they are different references
    // But we decided to skip function for instances.
    assert.equal(deepEqual(b1, b2), true, "Same property, same constructor");

    assert.equal(deepEqual(c1, c2), false, "Same property with different reference and different function");
    assert.equal(deepEqual(c1, c3), true, "Same property with different reference but same function");

    // failed
    assert.equal(deepEqual(a1, b1), false, "Same properties but different constructor");

    function Car(year) {
      var privateVar = 0;
      this.year = year;
      this.isOld = function () {
        return privateVar > 10;
      };
    }

    function Human(year) {
      var privateVar = 1;
      this.year = year;
      this.isOld = function () {
        return privateVar > 80;
      };
    }

    car = new Car(30);
    carSame = new Car(30);
    carDiff = new Car(10);
    human = new Human(30);

    assert.equal(deepEqual(car, car), true);
    assert.equal(deepEqual(car, carDiff), false);
    assert.equal(deepEqual(car, carSame), true);
    assert.equal(deepEqual(car, human), false);
  });

  test("Complex instance nesting (with function values in literals and/or in nested instances)", function (assert) {
    var a1, a2, b1, b2, c1, c2, d1, d2, e1, e2;

    function A(fn) {
      this.a = {};
      this.fn = fn;
      this.b = { a: [] };
      this.o = {};
      this.fn1 = fn;
    }
    function B(fn) {
      this.fn = fn;
      this.fn1 = function () {};
      this.a = new A(function () {});
    }

    function fnOutside() {}

    function C(fn) {
      function fnInside() {}
      this.x = 10;
      this.fn = fn;
      this.fn1 = function () {};
      this.fn2 = fnInside;
      this.fn3 = {
        a: true,
        b: fnOutside, // ok make reference to a function in all instances scope
      };
      this.o1 = {};

      // This function will be ignored.
      // Even if it is not visible for all instances (e.g. locked in a closures),
      // it is from a  property that makes part of an instance (e.g. from the C constructor)
      this.b1 = new B(function () {});
      this.b2 = new B({
        x: {
          b2: new B(function () {}),
        },
      });
    }

    function D(fn) {
      function fnInside() {}
      this.x = 10;
      this.fn = fn;
      this.fn1 = function () {};
      this.fn2 = fnInside;
      this.fn3 = {
        a: true,
        b: fnOutside, // ok make reference to a function in all instances scope

        // This function won't be ignored.
        // It isn't visible for all C instances
        // and it is not in a property of an instance.
        // (in an Object instances e.g. the object literal)
        c: fnInside,
      };
      this.o1 = {};

      // This function will be ignored.
      // Even if it is not visible for all instances (e.g. locked in a closures),
      // it is from a  property that makes part of an instance (e.g. from the C constructor)
      this.b1 = new B(function () {});
      this.b2 = new B({
        x: {
          b2: new B(function () {}),
        },
      });
    }

    function E(fn) {
      function fnInside() {}
      this.x = 10;
      this.fn = fn;
      this.fn1 = function () {};
      this.fn2 = fnInside;
      this.fn3 = {
        a: true,
        b: fnOutside, // ok make reference to a function in all instances scope
      };
      this.o1 = {};

      // This function will be ignored.
      // Even if it is not visible for all instances (e.g. locked in a closures),
      // it is from a  property that makes part of an instance (e.g. from the C constructor)
      this.b1 = new B(function () {});
      this.b2 = new B({
        x: {
          b1: new B({ a: function () {} }),
          b2: new B(function () {}),
        },
      });
    }

    a1 = new A(function () {});
    a2 = new A(function () {});
    assert.equal(deepEqual(a1, a2), true);
    assert.equal(deepEqual(a2, a1), true); // different instances

    b1 = new B(function () {});
    b2 = new B(function () {});
    assert.equal(deepEqual(b1, b2), true);

    c1 = new C(function () {});
    c2 = new C(function () {});
    assert.equal(deepEqual(c1, c2), true);

    d1 = new D(function () {});
    d2 = new D(function () {});
    assert.equal(deepEqual(d1, d2), false);

    e1 = new E(function () {});
    e2 = new E(function () {});
    assert.equal(deepEqual(e1, e2), false);
  });

  test("Object with circular references", function (assert) {
    var circularA = {
      abc: null,
    };
    var circularB = {
      abc: null,
    };
    circularA.abc = circularA;
    circularB.abc = circularB;
    assert.equal(deepEqual(circularA, circularB), true, "Should not repeat test on object (ambiguous test)");

    circularA.def = 1;
    circularB.def = 1;
    assert.equal(deepEqual(circularA, circularB), true, "Should not repeat test on object (ambiguous test)");

    circularA.def = 1;
    circularB.def = 0;
    assert.equal(deepEqual(circularA, circularB), false, "Should not repeat test on object (unambiguous test)");
  });

  test("Array with circular references", function (assert) {
    var circularA = [];
    var circularB = [];
    circularA.push(circularA);
    circularB.push(circularB);
    assert.equal(deepEqual(circularA, circularB), true, "Should not repeat test on array (ambiguous test)");

    circularA.push("abc");
    circularB.push("abc");
    assert.equal(deepEqual(circularA, circularB), true, "Should not repeat test on array (ambiguous test)");

    circularA.push("hello");
    circularB.push("goodbye");
    assert.equal(deepEqual(circularA, circularB), false, "Should not repeat test on array (unambiguous test)");
  });

  test("Mixed object/array with references to self wont loop", function (assert) {
    var circularA = [
      {
        abc: null,
      },
    ];
    var circularB = [
      {
        abc: null,
      },
    ];
    circularA[0].abc = circularA;
    circularB[0].abc = circularB;

    circularA.push(circularA);
    circularB.push(circularB);
    assert.equal(deepEqual(circularA, circularB), true, "Should not repeat test on object/array (ambiguous test)");

    circularA[0].def = 1;
    circularB[0].def = 1;
    assert.equal(deepEqual(circularA, circularB), true, "Should not repeat test on object/array (ambiguous test)");

    circularA[0].def = 1;
    circularB[0].def = 0;
    assert.equal(deepEqual(circularA, circularB), false, "Should not repeat test on object/array (unambiguous test)");
  });

  test("Compare self-referent to tree", function (assert) {
    var temp;
    var circularA = [0];
    var treeA = [0, null];
    var circularO = {};
    var treeO = {
      o: null,
    };

    circularA[1] = circularA;
    circularO.o = circularO;

    assert.equal(deepEqual(circularA, treeA), false, "Array: Should not consider circular equal to tree");
    assert.equal(deepEqual(circularO, treeO), false, "Object: Should not consider circular equal to tree");

    temp = [0, circularA];
    assert.equal(deepEqual(circularA, temp), true, "Array: Reference is circular for one, but equal on other");
    assert.equal(deepEqual(temp, circularA), true, "Array: Reference is circular for one, but equal on other");

    temp = {
      o: circularO,
    };
    assert.equal(deepEqual(circularO, temp), true, "Object: Reference is circular for one, but equal on other");
    assert.equal(deepEqual(temp, circularO), true, "Object: Reference is circular for one, but equal on other");
  });

  test("Compare differently self-referential structures", function (assert) {
    var x = [];
    var y = [];

    x[0] = x;
    y[0] = [y];

    // x is [ x ], y is [ [ y ] ]
    // So both x and y look like [ [ [ [ ... ] ] ] ]
    assert.equal(deepEqual(x, y), true, "Equivalent arrays");
    y = [];
    y[0] = [y, 1];

    // x looks like [ [ [ [ ...  ] ] ] ]
    // y looks like [ [ [ [ ... , 1 ] ], 1 ] ]
    assert.equal(deepEqual(x, y), false, "Nonequivalent arrays");
    x = {};
    y = {};
    x.val = x;
    y.val = { val: y };

    // Both x and y look like { val: { val: { ... } } }
    assert.equal(deepEqual(x, y), true, "Equivalent objects");

    // x looks like { val: { val: { val: { val: { ... } } } } }
    // y looks like { val: { val: { val: { val: { ... }, foo: 1 } }, foo: 1 } }
    y.val = { val: y, foo: 1 };
    assert.equal(deepEqual(x, y), false, "Nonequivalent objects");
  });

  test("compare structures with multiple references to the same containers", function (assert) {
    var i;
    var x = {};
    var y = {};
    for (i = 0; i < 20; i++) {
      x = { foo: x, bar: x, baz: x };
      y = { foo: y, bar: y, baz: y };
    }
    assert.equal(deepEqual({ big: x, z: [true] }, { big: y, z: [true] }), true, "Equivalent structures");
    assert.equal(deepEqual({ big: x, z: [true] }, { big: y, z: [false] }), false, "Nonequivalent structures");
  });

  test("Test that must be done at the end because they extend some primitive's prototype", function (assert) {
    // Try that a function looks like our regular expression.
    // This tests if we check that a and b are really both instance of RegExp
    /* eslint-disable no-extend-native */
    Function.prototype.global = true;
    Function.prototype.multiline = true;
    Function.prototype.ignoreCase = false;
    Function.prototype.source = "my regex";
    var re = /my regex/gm;
    assert.equal(
      deepEqual(re, function () {}),
      false,
      "A function that looks that a regex isn't a regex"
    );

    // This test will ensures it works in both ways,
    // and ALSO especially that we can make differences
    // between RegExp and Function constructor because
    // typeof on a RegExpt instance is "function"
    assert.equal(
      deepEqual(function () {}, re),
      false,
      "Same conversely, but ensures that function and regexp are distinct because their constructor are different"
    );
  });

  test("Number objects", function (assert) {
    var SafeNumber = Number;

    assert.true(deepEqual(new SafeNumber(1), new SafeNumber(1)), "Number objects with same values are equivalent.");
    assert.true(deepEqual(new SafeNumber(0 / 0), new SafeNumber(0 / 0)), "NaN Number objects are equivalent.");
    assert.true(deepEqual(new SafeNumber(1 / 0), new SafeNumber(2 / 0)), "Infinite Number objects are equivalent.");

    assert.false(
      deepEqual(new SafeNumber(1), new SafeNumber(2)),
      "Number objects with different values are not equivalent."
    );
    assert.false(
      deepEqual(new SafeNumber(0 / 0), new SafeNumber(1 / 0)),
      "NaN Number objects and infinite Number objects are not equivalent."
    );
    assert.false(
      deepEqual(new SafeNumber(1 / 0), new SafeNumber(-1 / 0)),
      "Positive and negative infinite Number objects are not equivalent."
    );
  });

  test("String objects", function (assert) {
    var SafeString = String;

    assert.true(
      deepEqual(new SafeString("foo"), new SafeString("foo")),
      "String objects with same values are equivalent."
    );
    assert.true(deepEqual(new SafeString(""), new SafeString("")), "Empty String objects are equivalent.");

    assert.false(
      deepEqual(new SafeString("foo"), new SafeString("bar")),
      "String objects with different values are not equivalent."
    );
    assert.false(
      deepEqual(new SafeString(""), new SafeString("foo")),
      "Empty and nonempty String objects are not equivalent."
    );
  });

  test("Boolean objects", function (assert) {
    var SafeBoolean = Boolean;

    assert.true(deepEqual(new SafeBoolean(true), new SafeBoolean(true)), "True Boolean objects are equivalent.");
    assert.true(deepEqual(new SafeBoolean(false), new SafeBoolean(false)), "False Boolean objects are equivalent.");

    assert.false(
      deepEqual(new SafeBoolean(true), new SafeBoolean(false)),
      "Boolean objects with different values are not equivalent."
    );
  });

  test("Getter", function (assert) {
    var a = {
      get x() {
        return 2;
      },
    };
    var a2 = {
      get x() {
        return 2;
      },
    };
    var b = {
      get x() {
        return 4;
      },
    };
    assert.false(deepEqual(a, b), "Getters with different values are not equivalent");
    assert.true(deepEqual(a, a2), "Same value from different getters are equivalent");

    // Neither the presence of a descriptor nor the descriptor itself is compared
    assert.true(deepEqual(b, { x: 4 }), "Getter and literal value are equivalent");
  });

  /* global Set, Map */
  /* eslint-disable compat/compat */

  test("Sets", function (assert) {
    var s1, s2, s3, s4, o1, o2, o3, o4, m1, m2, m3;

    // Empty sets
    s1 = new Set();
    s2 = new Set([]);
    assert.equal(deepEqual(s1, s2), true, "Empty sets");

    // Simple cases
    s1 = new Set([1]);
    s2 = new Set([1]);
    s3 = new Set([3]);
    assert.equal(deepEqual(s1, s2), true, "Single element sets [1] vs [1]");
    assert.equal(deepEqual(s1, s3), false, "Single element sets [1] vs [3]");

    // Tricky values
    s1 = new Set([false, undefined, null, 0, Infinity, NaN, -Infinity]);
    s2 = new Set([undefined, null, false, 0, NaN, Infinity, -Infinity]);
    assert.equal(deepEqual(s1, s2), true, "Multiple-element sets of tricky values");

    s1 = new Set([1, 3]);
    s2 = new Set([2, 3]);
    assert.equal(deepEqual(s1, s2), false, "Sets can 'short-circuit' for early failure");

    // Sets Containing objects
    o1 = { foo: 0, bar: true };
    o2 = { foo: 0, bar: true };
    o3 = { foo: 1, bar: true };
    o4 = { foo: 1, bar: true };
    s1 = new Set([o1, o3]);
    s2 = new Set([o1, o3]);
    assert.equal(deepEqual(s1, s2), true, "Sets containing same objects");
    s1 = new Set([o1]);
    s2 = new Set([o2]);
    assert.equal(deepEqual(s1, s2), true, "Sets containing deeply-equal objects");
    s1 = new Set([o1, o3]);
    s2 = new Set([o4, o2]);
    assert.equal(deepEqual(s1, s2), true, "Sets containing deeply-equal objects in different insertion order");
    s1 = new Set([o1]);
    s2 = new Set([o3]);
    assert.equal(deepEqual(s1, s2), false, "Sets containing different objects");

    // Sets containing sets
    s1 = new Set([1, 2, 3]);
    s2 = new Set([1, 2, 3]);
    s3 = new Set([s1]);
    s4 = new Set([s2]);
    assert.equal(deepEqual(s3, s4), true, "Sets containing deeply-equal sets");

    // Sets containing different sets
    s1 = new Set([1, 2, 3]);
    s2 = new Set([1, 2, 3, 4]);
    s3 = new Set([s1]);
    s4 = new Set([s2]);
    assert.equal(deepEqual(s3, s4), false, "Sets containing different sets");

    // Sets containing maps
    m1 = new Map([[1, 1]]);
    m2 = new Map([[1, 1]]);
    m3 = new Map([[1, 3]]);
    s3 = new Set([m1]);
    s4 = new Set([m2]);
    assert.equal(deepEqual(s3, s4), true, "Sets containing different but deeply-equal maps");
    s3 = new Set([m1]);
    s4 = new Set([m3]);
    assert.equal(deepEqual(s3, s4), false, "Sets containing different maps");

    // Sets with different insertion order
    s1 = new Set([1, 2, 3]);
    s2 = new Set([3, 2, 1]);
    assert.equal(deepEqual(s1, s2), true, "Sets with different insertion orders");
  });

  test("Maps", function (assert) {
    var m1, m2, m3, m4, o1, o2, o3, o4, s1, s2, s3;

    // Empty maps
    m1 = new Map();
    m2 = new Map([]);
    assert.equal(deepEqual(m1, m2), true, "Empty maps");

    // Simple cases
    m1 = new Map([[1, 1]]);
    m2 = new Map([[1, 1]]);
    m3 = new Map([[1, 3]]);
    assert.equal(deepEqual(m1, m2), true, "Single element maps [1,1] vs [1,1]");
    assert.equal(deepEqual(m1, m3), false, "Single element maps [1,1] vs [1,3]");

    // Mismatched sizes
    m1 = new Map([[1, 2]]);
    m2 = new Map([
      [3, 4],
      [5, 6],
    ]);
    assert.equal(deepEqual(m1, m2), false, "Compare maps with mismatch sizes");

    // Tricky values
    m1 = new Map([
      [false, false],
      [null, null],
      [0, 0],
      [undefined, undefined],
      [Infinity, Infinity],
      [NaN, NaN],
      [-Infinity, -Infinity],
    ]);
    m2 = new Map([
      [undefined, undefined],
      [null, null],
      [false, false],
      [0, 0],
      [NaN, NaN],
      [Infinity, Infinity],
      [-Infinity, -Infinity],
    ]);
    assert.equal(deepEqual(m1, m2), true, "Multiple-element maps of tricky values");

    // Same keys, different values
    m1 = new Map([
      [1, "one"],
      [2, "two"],
    ]);
    m2 = new Map([
      [1, 1],
      [2, 2],
    ]);
    assert.equal(deepEqual(m1, m2), false, "Maps with same keys, different values");

    // Maps Containing objects
    o1 = { foo: 0, bar: true };
    o2 = { foo: 0, bar: true };
    o3 = { foo: 1, bar: true };
    o4 = { foo: 1, bar: true };
    m1 = new Map([
      [1, o1],
      [2, o3],
    ]);
    m2 = new Map([
      [1, o1],
      [2, o3],
    ]);
    assert.equal(deepEqual(m1, m2), true, "Maps containing same objects");
    m1 = new Map([[1, o1]]);
    m2 = new Map([[1, o2]]);
    assert.equal(deepEqual(m1, m2), true, "Maps containing different but deeply-equal objects");
    m1 = new Map([
      [1, o1],
      [2, o3],
    ]);
    m2 = new Map([
      [2, o4],
      [1, o2],
    ]);
    assert.equal(
      deepEqual(m1, m2),
      true,
      "Maps containing different but deeply-equal objects in different insertion order"
    );
    m1 = new Map([[o1, 1]]);
    m2 = new Map([[o2, 1]]);
    assert.equal(deepEqual(m1, m2), true, "Maps containing different but deeply-equal objects as keys");
    m1 = new Map([
      [o1, 1],
      [o3, 2],
    ]);
    m2 = new Map([
      [o4, 2],
      [o2, 1],
    ]);
    assert.equal(
      deepEqual(m1, m2),
      true,
      "Maps containing different but deeply-equal objects as keys in different insertion order"
    );

    // Maps containing different objects
    m1 = new Map([[1, o1]]);
    m2 = new Map([[1, o3]]);
    assert.equal(deepEqual(m1, m2), false, "Maps containing different objects");

    // Maps containing maps
    m1 = new Map([[1, 1]]);
    m2 = new Map([[1, 1]]);
    m3 = new Map([["myMap", m1]]);
    m4 = new Map([["myMap", m2]]);
    assert.equal(deepEqual(m3, m4), true, "Maps containing deeply-equal maps");

    // Maps containing different maps
    m1 = new Map([[1, 1]]);
    m2 = new Map([[1, 2]]);
    m3 = new Map([["myMap", m1]]);
    m4 = new Map([["myMap", m2]]);
    assert.equal(deepEqual(m3, m4), false, "Maps containing different maps");

    // Maps containing sets
    s1 = new Set([1, 2, 3]);
    s2 = new Set([1, 2, 3]);
    s3 = new Set([1, 2, 3, 4]);
    m1 = new Map([[1, s1]]);
    m2 = new Map([[1, s2]]);
    assert.equal(deepEqual(m1, m2), true, "Maps containing different but deeply-equal sets");

    // Maps containing different sets
    m1 = new Map([[1, s1]]);
    m2 = new Map([[1, s3]]);
    assert.equal(deepEqual(m1, m2), false, "Maps containing different sets");
  });

  /* global Symbol */

  test("Symbols", function (assert) {
    var a = Symbol(1);
    var b = Symbol(1);

    assert.equal(deepEqual(a, a), true, "Same symbol is equivalent");
    assert.equal(deepEqual(a, b), false, "Not equivalent to another similar symbol built on the same token");
  });
});
