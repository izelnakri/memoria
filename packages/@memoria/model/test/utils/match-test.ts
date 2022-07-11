import { module, test } from "qunitx";
import { match } from "@memoria/model";
import copy from 'rfdc/default';
import MATCH_TEST_EXAMPLES from "../helpers/match-test-examples.js";

module("@memoria/model | Utils | match", function (hooks) {
  class Human {
    constructor(options = {}) {
      Object.keys(options).forEach((key) => {
        this[key] = options[key];
      });
    }
  }
  class SuperHuman extends Human {};

  module('basic tests', function() {
    test('match() returns true for exact primitive values', function (assert) {
      assert.ok(match(null, null));
      assert.ok(match(undefined, undefined));
      assert.ok(match(NaN, NaN));
      assert.ok(match('', ''));
      assert.ok(match('abc', 'abc'));

      let sym1 = Symbol('abc');
      let sym2 = Symbol('abc');

      assert.ok(match(sym1, sym1));
      assert.ok(match(sym1, sym2));
      assert.ok(match(0, 0));
      assert.ok(match(1200, 1200));
      assert.ok(match(true, true));
      assert.ok(match(false, false));

      assert.ok(match(() => {}, () => {}));
      assert.ok(match([], []));
      assert.ok(match(['a', 'b', 'c'], ['a', 'b']));
      assert.ok(match(['a', 11, 'c'], ['a', 11, 'c']));
      assert.ok(match(new Set([]), new Set([])));
      assert.ok(match(new Set(['a', 'b', 'c']), new Set(['a', 'b'])));
      assert.ok(match(new Set(['a', 11, 'c']), new Set(['a', 11, 'c'])));
      assert.ok(match(/izel/g, /izel/g));
      assert.ok(match('izel nakri', /izel/g));
      assert.ok(match(new Date('1990-11-11'), new Date('1990-11-11')));
      assert.ok(match(new Human(), Human));
      assert.ok(match(new Human(), new Human()));
      assert.ok(match(
        new Human({ firstName: 'Izel', lastName: 'Nakri' }),
        new Human({ firstName: 'Izel', lastName: 'Nakri' })
      ));
    });

    test('match() matches classes versus classes correctly', function (assert) {
      assert.ok(match(Boolean, Boolean));
      assert.ok(match(Number, Number));
      assert.ok(match(Object, Object));
      assert.ok(match(Map, Map));
      assert.ok(match(Array, Array));
      assert.ok(match(Set, Set));
      assert.ok(match(Date, Date));
      assert.ok(match(Symbol, Symbol));
      assert.ok(match(Function, Function));
      assert.ok(match(BigInt, BigInt));
      assert.ok(match(NaN, NaN));
      assert.ok(match(Promise, Promise));
      assert.ok(match(RegExp, RegExp));
      assert.ok(match(Error, Error));
      assert.ok(match(WeakMap, WeakMap));
      assert.ok(match(WeakSet, WeakSet));
      assert.ok(match(Human, Human));
      assert.ok(match(SuperHuman, Human));
    });

    test('match() returns true primitive values and their classes as pattern', function (assert) {
      let sym1 = Symbol('abc');
      let sym2 = Symbol('abc');

      assert.ok(match('', String));
      assert.ok(match('abc', String));
      assert.ok(match(sym1, Symbol));
      assert.ok(match(sym2, Symbol));

      assert.ok(match(0, Number));
      assert.ok(match(1200, Number));

      assert.ok(match(true, Boolean));
      assert.ok(match(false, Boolean));
      assert.ok(match(() => {}, Function));
      assert.ok(match({}, Object));
      assert.ok(match([], Object));
      assert.ok(match([], Array));

      assert.ok(match(new Human(), Human));
      assert.ok(match(new SuperHuman(), Human));
      assert.ok(match(new Set(), Set));
      assert.ok(match(/izel/g, RegExp));
      assert.ok(match(new Date(), Date));
      assert.ok(match(new Human(), Human));
      assert.ok(match(new SuperHuman(), Human));
      assert.ok(match(new SuperHuman(), SuperHuman));
    });

    test('match() returns false for primitive values that are not same', function (assert) {
      let sym1 = Symbol('abc');

      assert.notOk(match(null, undefined));
      assert.notOk(match(undefined, null));
      assert.notOk(match(NaN, null));
      assert.notOk(match('', 'abc'));
      assert.notOk(match('abc', ''));

      assert.notOk(match(sym1, Symbol()));

      assert.notOk(match(0, false));
      assert.notOk(match(1200, 1000));
      assert.notOk(match(true, false));
      assert.notOk(match(false, true));
      assert.notOk(match(() => {}, Array));
      assert.notOk(match({}, { name: 'Izel' }));
      assert.notOk(match([], ['a', 'b']));

      assert.notOk(match(new Human(), new Human({ name: 'Izel' })));
      assert.notOk(match(new SuperHuman(), new SuperHuman({ shape: 'hulk' })));
      assert.notOk(match(new Set(), new Set(['a', 'b'])));
      assert.notOk(match(/izel/g, 'izel'));
      assert.notOk(match(new Date(), new Date('1980-04-04')));
    });

    test('match() returns false or when primitive values their classes are not same', function (assert) {
      let sym2 = Symbol('abc');

      assert.notOk(match('', Symbol));
      assert.notOk(match('abc', Symbol));

      assert.notOk(match(sym2, String));

      assert.notOk(match(0, Boolean));
      assert.notOk(match(true, Number));
      assert.notOk(match(false, Number));
      assert.notOk(match(() => {}, Array));
      assert.notOk(match({}, Array));
      assert.notOk(match([], String));

      assert.notOk(match(new Human(), Set));
      assert.notOk(match(new SuperHuman(), Set));
      assert.notOk(match(new Set(), Array));
      assert.notOk(match(/izel/g, String));
      assert.notOk(match(new Date(), String));
    });

    test('Map values are correctly matched in match() function', function (assert) {
      let map1 = new Map();
      let map2 = new Map();

      assert.ok(match(map1, map1));
      assert.ok(match(map1, Map));
      assert.ok(match(map1, Object));
      assert.ok(match(map1, {}));
      assert.ok(match(map1, map2));

      map2.set('a', 'b');
      map2.set('b', 22);

      assert.notOk(match(map1, map2));
      assert.ok(match(map2, Map));
      assert.ok(match(map2, { 'a': 'b', 'b': 22 }));

      let newMap = new Map();

      assert.notOk(match(map2, newMap));

      newMap.set('a', 'b');
      newMap.set('b', 22);

      assert.ok(match(map2, newMap));
      assert.ok(match({ id: 1, map: map2 }, { map: newMap }));
      assert.ok(match([{ id: 1, map: map2 }], [{ map: newMap }]));
      assert.ok(match([{ id: 1, map: map1 }], [{ map: Map }]));

      newMap.set(null, 'something');

      assert.notOk(match(map2, newMap));
      assert.notOk(match({ a: 'b', b: 22 }, newMap));
      assert.ok(match(newMap, { a: 'b', b: 22 }));

      newMap.set(new Date(), 'something');

      assert.ok(match(newMap, { a: 'b', b: 22 }));
    });

    test('Error values are correctly matched in match() function', function (assert) {
      class CustomError extends Error {
      }

      let error = new Error('Something went wrong');
      let anotherError = new Error('Some another error went wrong');
      let customError = new CustomError('Some another error went wrong');

      assert.ok(match(error, error));
      assert.ok(match(error, Error));
      assert.notOk(match(error, anotherError));
      assert.notOk(match(anotherError, new Error('Some another error went wrong')));
      assert.notOk(match(anotherError, new CustomError('Some another error went wrong')));
      assert.notOk(match(customError, anotherError));
      assert.ok(match(customError, Error));
      assert.ok(match(customError, { message: 'Some another error went wrong' }));
      assert.notOk(match(anotherError, customError));
      assert.ok(match(customError, CustomError));
      assert.notOk(match(anotherError, CustomError));
      assert.ok({ error }, { error: Error });
      assert.ok([{ id: 1, error }], [{ id: 1, error: Error }]);
      assert.ok([{ id: 1, error }], [{ error }]);
    });
  });

  module('object-like input tests', function() {
    test('match() returns true for various partial object checks', function (assert) {
      assert.ok(match(MATCH_TEST_EXAMPLES, MATCH_TEST_EXAMPLES));
      assert.ok(match(MATCH_TEST_EXAMPLES, copy(MATCH_TEST_EXAMPLES)));
      assert.ok(match(MATCH_TEST_EXAMPLES, { id: 1, name: 'Some' }));
      assert.ok(match(MATCH_TEST_EXAMPLES, { id: Number }));
      assert.ok(match(MATCH_TEST_EXAMPLES, { name: String }));
      assert.ok(match(MATCH_TEST_EXAMPLES, { relatedModels: Array }));
      assert.ok(match(MATCH_TEST_EXAMPLES, { id: 1, name: 'Some', relatedModel: Object }));
      assert.ok(match(MATCH_TEST_EXAMPLES, { id: 1, name: 'Some', relatedModel: Object, relatedModels: Array }));

      assert.ok(match(MATCH_TEST_EXAMPLES, {
        id: 1,
        name: 'Some',
        relatedModel: {
          id: 7,
          name: 'Seventh',
          active: true,
          createdAt: new Date('2055-11-10'),
        }
      }));
      assert.ok(match(MATCH_TEST_EXAMPLES, {
        id: 1,
        name: 'Some',
        relatedModel: {
          id: 7,
          name: 'Seventh',
          active: true,
        },
        relatedModels: [
          {
            id: 5, name: 'Some', active: false, createdAt: new Date('2055-11-10'), tags: [], meta: undefined
          }
        ]
      }));
      assert.ok(match(MATCH_TEST_EXAMPLES, {
        id: 1,
        name: 'Some',
        relatedModel: {
          id: 7,
          name: 'Seventh',
          active: true,
        },
        relatedModels: [
          {
            id: 2,
            name: 'Second',
            active: null,
            createdAt: new Date('1985-12-10'),
            tags: ['old', 'happy'],
            meta: { new: true }
          },
          {
            id: 5, name: 'Some', active: false, createdAt: new Date('2055-11-10'), tags: [], meta: undefined
          }
        ]
      }));
      assert.ok(match(MATCH_TEST_EXAMPLES, {
        id: 1,
        name: 'Some',
        relatedModel: {
          id: 7,
          name: 'Seventh',
          active: true,
        },
        relatedModels: [
          {
            id: 2,
            name: 'Second',
            active: null,
            createdAt: Date,
            tags: ['old'],
            meta: { new: true }
          },
          {
            id: 5, name: 'Some', active: false, createdAt: new Date('2055-11-10'), tags: [], meta: undefined
          }
        ]
      }));
    });

    test('match() returns false various partial objects when property is missing', function (assert) {
      assert.notOk(match(MATCH_TEST_EXAMPLES, Object.assign({}, MATCH_TEST_EXAMPLES, { id: 99 })));
      assert.notOk(match(MATCH_TEST_EXAMPLES, Object.assign(copy(MATCH_TEST_EXAMPLES), {
        tags: ['sssss'],
      })));
      assert.notOk(match(MATCH_TEST_EXAMPLES, { id: 1, name: 'Wrong name' }));
      assert.notOk(match(MATCH_TEST_EXAMPLES, { id: Object }));
      assert.notOk(match(MATCH_TEST_EXAMPLES, { id: 1, name: Object }));
      assert.notOk(match(MATCH_TEST_EXAMPLES, { relatedModels: [] }));
      assert.notOk(match(MATCH_TEST_EXAMPLES, { id: 1, name: 'Some', relatedModel: Array }));
      assert.notOk(match(MATCH_TEST_EXAMPLES, { id: 1, name: 'Some', relatedModel: Object, relatedModels: [] }));

      assert.notOk(match(MATCH_TEST_EXAMPLES, {
        id: 1,
        name: 'Some',
        relatedModel: {
          id: 7,
          name: 'Seventh',
          active: true,
          createdAt: new Date('1999-11-10'),
        }
      }));
      assert.notOk(match(MATCH_TEST_EXAMPLES, {
        id: 1,
        name: 'Some',
        relatedModel: {
          id: 7,
          name: 'Seventh',
          active: true,
        },
        relatedModels: [
          {
            id: 5, name: 'Some', active: false, createdAt: new Date('2055-11-10'), tags: [], meta: null
          }
        ]
      }));
      assert.notOk(match(MATCH_TEST_EXAMPLES, {
        id: 1,
        name: 'Some',
        relatedModel: {
          id: 7,
          name: 'Seventh',
          active: true,
        },
        relatedModels: [
          {
            id: 2,
            name: 'Second',
            active: null,
            createdAt: new Date('1985-12-10'),
            tags: ['old', 'happy'],
            meta: { new: false }
          },
          {
            id: 5, name: 'Some', active: false, createdAt: new Date('2055-11-10'), tags: [], meta: undefined
          }
        ]
      }));
      assert.notOk(match(MATCH_TEST_EXAMPLES, {
        id: 1,
        name: 'Some',
        relatedModel: {
          id: 7,
          name: 'Seventh',
          active: true,
        },
        relatedModels: [
          {
            id: 2,
            name: 'Second',
            active: null,
            createdAt: Date,
            tags: ['old'],
            meta: { new: true }
          },
          {
            id: 5, name: 'Some', active: true, createdAt: new Date('2055-11-10'), tags: [], meta: undefined
          }
        ]
      }));
    });
  });

  module('array-like input tests', function() {
    const INPUT_ARRAY_EXAMPLE = Object.freeze([MATCH_TEST_EXAMPLES, MATCH_TEST_EXAMPLES]);

    test('match() returns true for various partial object checks', function (assert) {
      assert.ok(match(INPUT_ARRAY_EXAMPLE, [MATCH_TEST_EXAMPLES, MATCH_TEST_EXAMPLES]));
      assert.ok(match(INPUT_ARRAY_EXAMPLE, [MATCH_TEST_EXAMPLES, copy(MATCH_TEST_EXAMPLES)]));
      assert.ok(match(INPUT_ARRAY_EXAMPLE, [{ id: 1, name: 'Some' }]));
      assert.ok(match(INPUT_ARRAY_EXAMPLE, [{ id: Number }, { id: Number }]));
      assert.ok(match(INPUT_ARRAY_EXAMPLE, [{ name: String }, { name: String }]));
      assert.ok(match(INPUT_ARRAY_EXAMPLE, [{ relatedModels: Array }]));
      assert.ok(match(INPUT_ARRAY_EXAMPLE, [
        { id: 1, name: 'Some', relatedModel: Object },
        { id: 1, relatedModel: Object }
      ]));
      assert.ok(match(INPUT_ARRAY_EXAMPLE, [
        { id: 1, name: 'Some', relatedModel: Object, relatedModels: Array },
        { id: 1, name: 'Some', relatedModel: Object, relatedModels: Array }
      ]));

      assert.ok(match(INPUT_ARRAY_EXAMPLE, [
        {
        id: 1,
        name: 'Some',
        relatedModel: {
          id: 7,
          name: 'Seventh',
          active: true,
          createdAt: new Date('2055-11-10'),
        }
      }, {
        relatedModel: {
          id: Number,
          name: 'Seventh',
          active: Boolean,
          createdAt: Date
        }
      }]));
      assert.ok(match(INPUT_ARRAY_EXAMPLE, [
        {
          id: 1,
          name: 'Some',
          relatedModel: {
            id: 7,
            name: 'Seventh',
            active: true,
          },
          relatedModels: [
            {
              id: 5, name: 'Some', active: false, createdAt: new Date('2055-11-10'), tags: [], meta: undefined
            }
          ]
        },
        {
          relatedModel: {
            id: 7,
            name: String,
            active: true,
          },
          relatedModels: [
            {
              id: 2,
              name: 'Second',
              active: null,
              createdAt: new Date('1985-12-10'),
              tags: ['happy'],
              meta: Object
            }
          ]
        }
      ]));
      assert.ok(match(INPUT_ARRAY_EXAMPLE, [
        {
          id: 1,
          name: 'Some',
          relatedModel: {
            id: 7,
            name: 'Seventh',
            active: true,
          },
          relatedModels: [
            {
              id: 2,
              name: 'Second',
              active: null,
              createdAt: new Date('1985-12-10'),
              tags: ['old', 'happy'],
              meta: { new: true }
            },
            {
              id: 5, name: 'Some', active: false, createdAt: new Date('2055-11-10'), tags: [], meta: undefined
            }
          ]
        },
        {
          relatedModels: [
            {
              id: 5, name: 'Some', active: false, createdAt: new Date('2055-11-10'), tags: [], meta: undefined
            }
          ]
        }
      ]));
      assert.ok(match(INPUT_ARRAY_EXAMPLE, [{
        id: 1,
        name: 'Some',
        relatedModel: {
          id: 7,
          name: 'Seventh',
          active: true,
        },
        relatedModels: [
          {
            id: 2,
            name: 'Second',
            active: null,
            createdAt: Date,
            tags: ['old'],
            meta: { new: true }
          },
          {
            id: 5, name: 'Some', active: false, createdAt: new Date('2055-11-10'), tags: [], meta: undefined
          }
        ]
      }]));
    });

    test('match() returns false various partial objects when property is missing', function (assert) {
      assert.notOk(match(INPUT_ARRAY_EXAMPLE, [MATCH_TEST_EXAMPLES, Object.assign({}, MATCH_TEST_EXAMPLES, { id: 99 })]));
      assert.notOk(match(INPUT_ARRAY_EXAMPLE, [Object.assign(copy(MATCH_TEST_EXAMPLES), {
        tags: ['sssss'],
      })]));
      assert.notOk(match(INPUT_ARRAY_EXAMPLE, [MATCH_TEST_EXAMPLES, { id: 1, name: 'Wrong name' }]));
      assert.notOk(match(INPUT_ARRAY_EXAMPLE, [{ id: Object }, MATCH_TEST_EXAMPLES]));
      assert.notOk(match(INPUT_ARRAY_EXAMPLE, [MATCH_TEST_EXAMPLES, { id: 1, name: Object }]));
      assert.notOk(match(INPUT_ARRAY_EXAMPLE, [{ relatedModels: [] }, MATCH_TEST_EXAMPLES]));
      assert.notOk(match(INPUT_ARRAY_EXAMPLE, [{ id: 1, name: 'Some', relatedModel: Array }, MATCH_TEST_EXAMPLES]));
      assert.notOk(match(INPUT_ARRAY_EXAMPLE, [
        MATCH_TEST_EXAMPLES, { id: 1, name: 'Some', relatedModel: Object, relatedModels: [] }
      ]));

      assert.notOk(match(INPUT_ARRAY_EXAMPLE, [{
        id: 1,
        name: 'Some',
        relatedModel: {
          id: 7,
          name: 'Seventh',
          active: true,
          createdAt: new Date('1999-11-10'),
        }
      }, MATCH_TEST_EXAMPLES]));
      assert.notOk(match(INPUT_ARRAY_EXAMPLE, [
        MATCH_TEST_EXAMPLES,
        {
          id: 1,
          name: 'Some',
          relatedModel: {
            id: 7,
            name: 'Seventh',
            active: true,
          },
          relatedModels: [
            {
              id: 5, name: 'Some', active: false, createdAt: new Date('2055-11-10'), tags: [], meta: null
            }
          ]
        }
      ]));
      assert.notOk(match(INPUT_ARRAY_EXAMPLE, [{
        id: 1,
        name: 'Some',
        relatedModel: {
          id: 7,
          name: 'Seventh',
          active: true,
        },
        relatedModels: [
          {
            id: 2,
            name: 'Second',
            active: null,
            createdAt: new Date('1985-12-10'),
            tags: ['old', 'happy'],
            meta: { new: false }
          },
          {
            id: 5, name: 'Some', active: false, createdAt: new Date('2055-11-10'), tags: [], meta: undefined
          }
        ]
      }]));
      assert.notOk(match(INPUT_ARRAY_EXAMPLE, [{
        id: 1,
        name: 'Some',
        relatedModel: {
          id: 7,
          name: 'Seventh',
          active: true,
        },
        relatedModels: [
          {
            id: 2,
            name: 'Second',
            active: null,
            createdAt: Date,
            tags: ['old'],
            meta: { new: true }
          },
          {
            id: 5, name: 'Some', active: true, createdAt: new Date('2055-11-10'), tags: [], meta: undefined
          }
        ]
      }, MATCH_TEST_EXAMPLES]));
    });
  });
});
