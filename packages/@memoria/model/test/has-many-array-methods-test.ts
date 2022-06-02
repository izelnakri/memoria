// TODO: Refactor tests with mock/spies calledOnceWith(RelationshipDB.cacheMethod, params)
import { HasManyArray, printSchema } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "./helpers/setup-memoria.js";
import generateModels from "./helpers/relationship-test-models/index.js";

module("@memoria/model | HasManyArray methods", function (hooks) {
  setupMemoria(hooks);

  module('concat', function() {
    test('array.concat(array) works, creates an array for array of models', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let firstPhotoCopy = Photo.build(firstPhoto);
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto]);
      let inputArray = [firstPhotoCopy, thirdPhoto];
      let result = array.concat(inputArray);

      assert.deepEqual(array, [firstPhoto, secondPhoto]);
      assert.deepEqual(inputArray, [firstPhotoCopy, thirdPhoto]);
      assert.notOk(inputArray instanceof HasManyArray);
      assert.deepEqual(result, [firstPhotoCopy, secondPhoto, thirdPhoto]);
      assert.notOk(result instanceof HasManyArray);
    });

    test('array.concat(array) works, creates an array for hasManyArray of models', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let firstPhotoCopy = Photo.build(firstPhoto);
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let thirdPhotoCopy = Photo.build(thirdPhoto);
      let array = new HasManyArray([firstPhoto, thirdPhotoCopy]);
      let inputArray = new HasManyArray([secondPhoto, thirdPhoto]);
      let result = array.concat(inputArray);

      assert.deepEqual(array, [firstPhoto, thirdPhotoCopy]);
      assert.deepEqual(inputArray, [secondPhoto, thirdPhoto]);
      assert.ok(inputArray instanceof HasManyArray);
      assert.deepEqual(result, [firstPhotoCopy, thirdPhoto, secondPhoto]);
      assert.notOk(result instanceof HasManyArray);
    });

    test('array.concat(invalidParams) throws when array has invalid parameteres', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto]);

      class SomeClass {};

      try {
        let result = array.concat([thirdPhoto, new SomeClass()]);
      } catch (error) {
        assert.deepEqual(array, [firstPhoto, secondPhoto]);
        assert.ok(error instanceof Error);
        assert.equal(error.message, "HasManyArray cannot have non memoria Model instance inside!");
      }
    });
  });

  module('fill', function() {
    test('array.fill(null) resets the array', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      let result = array.fill(null);

      assert.deepEqual(array, []);
      assert.strictEqual(result, array);
    });

    test('array.fill(Model) resets the array and sets the array with one element', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let thirdPhotoCopy = Photo.build(thirdPhoto);
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);

      let result = array.fill(fifthPhoto);

      assert.deepEqual(array, [fifthPhoto]);
      assert.strictEqual(result, array);

      let newArray = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

      assert.deepEqual(newArray, [firstPhoto, secondPhoto, thirdPhoto]);

      let newResult = newArray.fill(secondPhoto);

      assert.deepEqual(newArray, [secondPhoto]);
      assert.strictEqual(newResult, newArray);

      let lastArray = new HasManyArray([firstPhoto, secondPhoto, thirdPhotoCopy]);

      assert.deepEqual(lastArray, [firstPhoto, secondPhoto, thirdPhotoCopy]);

      let lastResult = lastArray.fill(thirdPhoto);

      assert.deepEqual(lastArray, [thirdPhoto]);
      assert.strictEqual(lastResult, lastArray);
    });

    test('array.fill(null, index) resets the array from set index', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let thirdPhotoCopy = Photo.build(thirdPhoto);
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      let result = array.fill(null, 2)

      assert.deepEqual(array, [firstPhoto, secondPhoto]);
      assert.strictEqual(array, result);
    });

    test('array.fill(Model, index) resets the array at set index and adds Model do set index if it isnt exist', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let thirdPhotoCopy = Photo.build(thirdPhoto);
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, fourthPhoto, fifthPhoto]);

      let result = array.fill(thirdPhoto, 2)

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.strictEqual(array, result);
    });

    test('array.fill(Model, index) resets the array at set index and replaces the Model from its instance group in another index', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let thirdPhotoCopy = Photo.build(thirdPhoto);
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      let result = array.fill(thirdPhotoCopy, 3)

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhotoCopy]);
      assert.strictEqual(array, result);

      let anotherArray = new HasManyArray([firstPhoto, secondPhoto, thirdPhotoCopy, fourthPhoto, fifthPhoto]);

      assert.deepEqual(anotherArray, [firstPhoto, secondPhoto, thirdPhotoCopy, fourthPhoto, fifthPhoto]);

      let lastResult = anotherArray.fill(thirdPhoto, 3)

      assert.deepEqual(anotherArray, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.strictEqual(anotherArray, lastResult);
    });

    test('array.fill(null, index, end) resets the array from set index until the end index', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let thirdPhotoCopy = Photo.build(thirdPhoto);
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      let result = array.fill(null, 2, 3)

      assert.deepEqual(array, [firstPhoto, secondPhoto, fifthPhoto]);
      assert.strictEqual(array, result);
    });

    test('array.fill(Model, index, end) resets the array at set index and the end index adds Model do set index if it isnt exist', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let thirdPhotoCopy = Photo.build(thirdPhoto);
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);

      let result = array.fill(fifthPhoto, 1, 2) // it should add it to the startIndex!! not the end!

      assert.deepEqual(array, [firstPhoto, fifthPhoto, fourthPhoto]);
      assert.strictEqual(array, result);
    });

    test('array.fill(Model, index, end) resets the array at set index and end index and replaces the Model from its instance group in another index', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let thirdPhotoCopy = Photo.build(thirdPhoto);
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let fifthPhotoCopy = Photo.build({ id: 5, name: "Fifth photo copy" });
      let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhotoCopy, sixthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhotoCopy, sixthPhoto]);

      let result = array.fill(fifthPhoto, 1, 2) // it should add it to the startIndex!! not the end!

      assert.deepEqual(array, [firstPhoto, fifthPhoto, fourthPhoto, sixthPhoto]);
      assert.strictEqual(array, result);
    });
  });

  module('slice', function() {
    test('array.slice(-3, -1) creates a new array from array with last 2nd and last 3rd item, array.slice(-3, -2) creates a new array with only third last item',  function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);

      assert.strictEqual(array.slice, Array.prototype.slice);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);

      let result = array.slice(-3, -1);

      assert.notOk(result instanceof HasManyArray);
      assert.ok(result instanceof Array);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
      assert.deepEqual(result, [fourthPhoto, fifthPhoto]);
      assert.notStrictEqual(array, result);

      let secondResult = array.slice(-3, -2);

      assert.notOk(result instanceof HasManyArray);
      assert.ok(result instanceof Array);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
      assert.deepEqual(secondResult, [fourthPhoto]);
      assert.notStrictEqual(array, result);
    })
  });

  module('pop', function() {
    test('array.pop() works correctly can can clear the item iteratively', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.strictEqual(array.pop(), thirdPhoto);
      assert.deepEqual(array, [firstPhoto, secondPhoto]);
      assert.strictEqual(array.pop(), secondPhoto);
      assert.deepEqual(array, [firstPhoto]);
      assert.strictEqual(array.pop(), firstPhoto);
      assert.deepEqual(array, []);
      assert.strictEqual(array.pop(), undefined);
      assert.deepEqual(array, []);
      assert.strictEqual(array.pop(), undefined);
      assert.deepEqual(array, []);
    });

    test('emptyHasManyArray.pop() should return undefined', function (assert) {
      const { Photo } = generateModels();

      let array = new HasManyArray();

      assert.deepEqual(array, []);
      assert.strictEqual(array.pop(), undefined);
      assert.deepEqual(array, []);
      assert.strictEqual(array.pop(), undefined);
      assert.deepEqual(array, []);
    });
  });

  module('push', function() {
    test('array.push($invalidParam) throws', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let array = new HasManyArray([firstPhoto]);

      class SomeClass {};

      assert.deepEqual(array, [firstPhoto]);

      [true, 1, 'a', 100, {}, SomeClass, new SomeClass()].forEach((value) => {
        try {
          array.push(value);
        } catch (error) {
          assert.ok(error instanceof Error);
          assert.equal(error.message, `HasManyArray accepts memoria Models or falsy values for assignment, not ${value}`);
        }
      });

      assert.deepEqual(array, [firstPhoto]);
    });

    test('array.push($falsyValue) does nothing', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let array = new HasManyArray([firstPhoto]);

      class SomeClass {};

      assert.deepEqual(array, [firstPhoto]);

      [undefined, false, 0].forEach((value) => {
        try {
          array.push(value);
        } catch (error) {
          assert.ok(error instanceof Error);
          assert.equal(error.message, `HasManyArray accepts memoria Models or falsy values for assignment, not ${value}`);
        }
      });

      assert.deepEqual(array, [firstPhoto]);
    });

    test('array.push($wrongModelInstance) throws', function (assert) {
      const { Photo, User } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let array = new HasManyArray([firstPhoto]);

      class SomeClass {};

      assert.deepEqual(array, [firstPhoto]);

      try {
        array.push(User.build({ first_name: "Izel" }));
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, 'This HasManyArray accepts Photo instances, you tried to assign User instance!');
      }

      assert.deepEqual(array, [firstPhoto]);
    });

    test('emptyHasManyArray.push(x) works correctly', function (assert) {
      const { Photo, User } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let array = new HasManyArray();

      assert.deepEqual(array, []);
      assert.equal(array.length, 0);

      let result = array.push(firstPhoto);

      assert.equal(result, 1);
      assert.equal(array.length, 1);
      assert.deepEqual(array, [firstPhoto]);

      let resultTwo = array.push(secondPhoto);

      assert.equal(resultTwo, 2);
      assert.equal(array.length, 2);
      assert.deepEqual(array, [firstPhoto, secondPhoto]);

      try {
        array.push(User.build({ first_name: "Izel" }));
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, 'This HasManyArray accepts Photo instances, you tried to assign User instance!');
      }

      assert.equal(array.length, 2);
    });

    test('array.push($model) works correctly', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.equal(array.length, 3);

      let result = array.push(fourthPhoto);

      assert.equal(result, 4);
      assert.equal(array.length, 4);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);

      let resultTwo = array.push(fifthPhoto);

      assert.equal(resultTwo, 5);
      assert.equal(array.length, 5);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
    });

    test('array.push($model) pushing an existing item does nothing', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.equal(array.length, 3);

      let result = array.push(secondPhoto);

      assert.equal(result, 3);
      assert.equal(array.length, 3);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);

      let resultTwo = array.push(firstPhoto);

      assert.equal(resultTwo, 3);
      assert.equal(array.length, 3);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
    });

    test('array.push($model) pushing an existing instance group item replaces it', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let firstPhotoCopy = Photo.build(firstPhoto);
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let secondPhotoCopy = Photo.build({ id: 2, name: "Second photo copy" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let array = new HasManyArray([firstPhotoCopy, secondPhotoCopy, thirdPhoto]);

      assert.deepEqual(array, [firstPhotoCopy, secondPhotoCopy, thirdPhoto]);
      assert.equal(array.length, 3);

      let result = array.push(secondPhoto);

      assert.equal(result, 3);
      assert.equal(array.length, 3);
      assert.deepEqual(array, [firstPhotoCopy, secondPhoto, thirdPhoto]);
      assert.notDeepEqual(array, [firstPhotoCopy, secondPhotoCopy, thirdPhoto]);

      let resultTwo = array.push(firstPhoto);

      assert.equal(resultTwo, 3);
      assert.equal(array.length, 3);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
    });
  });

  // module('shift', function() {

  // });

  // module('splice', function() {

  // });

  // module('unshift', function() {

  // });

  // module('any', function() {

  // });

  // TODO: DX Utils/optimized RelationshipDB mutation tests:
  // module('add', function() {

  // });

  // module('delete', function() {

  // });

  // module('replace', function() {

  // });

  // module('clear', function() {

  // });

  // TODO: array mixin methods
});
