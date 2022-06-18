import { HasManyArray } from "@memoria/model";
import { module, test } from "qunitx";

module("@memoria/model | HasManyArray", function (hooks) {
  test('can instantiate a correct HasManyArray that behaves like an instance set', async function (assert) {
    let firstArray = new HasManyArray();
    let secondArray = new HasManyArray(['a']);

    assert.propEqual(firstArray, []);
    assert.propEqual(secondArray, ['a']);

    debugger;
    // firstArray.push('a');
    // firstArray.push('a');

    // assert.deepEqual(firstArray, secondArray);
  });

  // test('has correct methods')
});
