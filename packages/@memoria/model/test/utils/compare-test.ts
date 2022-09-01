import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";
import { compare, typeOf } from "@memoria/model";

module("@memoria/model | Utils | compare", function (hooks) {
  setupMemoria(hooks);

  test('ember.js compare function test', function (assert) {
    assert.equal(compare('abc', 'dfg'), -1);
    assert.equal(compare('abc', 'abc'), 0);
    assert.equal(compare(2, 1), 1);
    assert.equal(compare(2, 2), 0);
    assert.equal(compare('hello', 50), 1);
    assert.equal(compare(50, 50), 0);
    assert.equal(compare(50, 'hello'), -1);
  });

  test('compare value ordering logic works correctly on compare', function (assert) {
    class Human {}

    let data = [
      null,
      false,
      true,
      -12,
      3.5,
      'a string',
      'another string',
      'last string',
      [1, 2],
      [1, 3],
      [1, 2, 3],
      { a: 'hash' },
      new Human(),
      function (a) {
        return a;
      },
      new Date('2012/01/01'),
      new Date('2012/06/06')
    ];
    for (let suspectIndex = 0; suspectIndex < data.length; suspectIndex++) {
      let suspect = data[suspectIndex];

      assert.equal(compare(suspect, suspect), 0, suspectIndex + ' should equal itself');

      for (let comparableIndex = suspectIndex + 1; comparableIndex < data.length; comparableIndex++) {
        let comparable = data[comparableIndex];
        let failureMessage =
          'data[' +
          suspectIndex +
          '] (' +
          typeOf(suspect) +
          ') should be smaller than data[' +
          comparableIndex +
          '] (' +
          typeOf(comparable) +
          ')';

        assert.equal(compare(suspect, comparable), -1, failureMessage);
      }
    }
  });

  test('comparing objects work correctly', function (assert) {
    testCompareWorksCorrectly(assert, { a: 1, b: '2', c: 3 }, { a: 99, b: '99' });

    assert.equal(compare({ a: 1, b: 1, c: 1 }, { d: 5, e: 1, f: 0 }), 0);
  });

  test('comparing arrays with different length work correctly', function (assert) {
    testCompareWorksCorrectly(assert, [0, 0, 1, 2], [5, 4], 'comparison on number array with different length works correctly');
    testCompareWorksCorrectly(assert, ['c', 'something', 'b', 'd'], ['e', 'zzzzzzz'], 'comparison on string array with different length works correctly');
    testCompareWorksCorrectly(assert, [false, false, true, true], [true, true, true], 'comparison on boolean array with different length works correctly');
    testCompareWorksCorrectly(assert, [
      new Date('2002-01-01'),
      new Date('2003-02-02'),
      new Date('2004-03-04'),
      new Date('2005-03-04'),
    ], [
      new Date('2022-01-01'),
      new Date('2022-02-02'),
      new Date('2022-03-04'),
    ], 'comparison on date array with different length works correctly');
  });

  test('comparing arrays with same length, different values work correctly', function (assert) {
    assert.equal(compare([], []), 0);

    testCompareWorksCorrectly(assert, [0, 5, 1, 2], [0, 4, 99, 99], 'comparison on number array with same length. different values work correctly');
    assert.equal(compare([0, 5, 1, 2], [0, 5, 1, 2]), 0);
    assert.equal(compare([0, 4, 99, 99], [0, 4, 99, 99]), 0);

    testCompareWorksCorrectly(assert, ['c', 'zzzzzz', 'a'], ['c', 'something', 'b'], 'comparison on string array with different length works correctly');
    assert.equal(compare(['c', 'zzzzzz', 'a'], ['c', 'zzzzzz', 'a']), 0);
    assert.equal(compare(['c', 'something', 'b'], ['c', 'something', 'b']), 0);

    testCompareWorksCorrectly(assert, [true, true, false], [true, false, false], 'comparison on boolean array with different length works correctly');
    assert.equal(compare([true, true, false], [true, true, false]), 0);
    assert.equal(compare([true, false, false], [true, false, false]), 0);

    testCompareWorksCorrectly(assert, [
      new Date('2002-01-01'),
      new Date('2022-02-02'),
      new Date('2004-03-04'),
    ], [
      new Date('2002-01-01'),
      new Date('2003-02-02'),
      new Date('2055-03-04'),
    ], 'comparison on boolean array with different length works correctly');
    assert.equal(compare([
      new Date('2002-01-01'),
      new Date('2022-02-02'),
      new Date('2004-03-04'),
    ], [
      new Date('2002-01-01'),
      new Date('2022-02-02'),
      new Date('2004-03-04'),
    ]), 0);
    assert.equal(compare([
      new Date('2002-01-01'),
      new Date('2003-02-02'),
      new Date('2055-03-04'),
    ], [
      new Date('2002-01-01'),
      new Date('2003-02-02'),
      new Date('2055-03-04'),
    ]), 0);
  });
});

function testCompareWorksCorrectly(assert, suspect, target, description?: string) {
  assert.equal(compare(suspect, target), 1, description);
  assert.equal(compare(suspect, copy(suspect)), 0, description);
  assert.equal(compare(target, copy(target)), 0, description);
  assert.equal(compare(target, suspect), -1, description);
}

function copy(value) {
  if (Array.isArray(value)) {
    return Array.from(value);
  }

  return JSON.parse(JSON.stringify(value));
}

