// TODO: Refactor tests with mock/spies calledOnceWith(RelationshipDB.cacheMethod, params)
import { HasManyArray } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "./helpers/setup-memoria.js";
import generateModels from "./helpers/relationship-test-models/index.js";

module("@memoria/model | HasManyArray Array.prototype methods", function (hooks) {
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
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);

      let result = array.fill(fifthPhoto, 1, 2);

      assert.deepEqual(array, [firstPhoto, fifthPhoto, fourthPhoto]);
      assert.strictEqual(array, result);
    });

    test('array.fill(Model, index, end) resets the array at set index and end index and replaces the Model from its instance group in another index', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let fifthPhotoCopy = Photo.build({ id: 5, name: "Fifth photo copy" });
      let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhotoCopy, sixthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhotoCopy, sixthPhoto]);

      let result = array.fill(fifthPhoto, 1, 2);

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

  module('shift', function() {
    test('array.shift() works correctly can can clear the item iteratively', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.strictEqual(array.shift(), firstPhoto);
      assert.deepEqual(array, [secondPhoto, thirdPhoto]);
      assert.strictEqual(array.shift(), secondPhoto);
      assert.deepEqual(array, [thirdPhoto]);
      assert.strictEqual(array.shift(), thirdPhoto);
      assert.deepEqual(array, []);
      assert.strictEqual(array.shift(), undefined);
      assert.deepEqual(array, []);
      assert.strictEqual(array.shift(), undefined);
      assert.deepEqual(array, []);
    });

    test('emptyHasManyArray.shift() should return undefined', function (assert) {
      const { Photo } = generateModels();

      let array = new HasManyArray();

      assert.deepEqual(array, []);
      assert.strictEqual(array.shift(), undefined);
      assert.deepEqual(array, []);
      assert.strictEqual(array.shift(), undefined);
      assert.deepEqual(array, []);
    });
  });

  module('splice', function() {
    test('emptyHasManyArray.splice(x) works correctly for possible x integer values', function (assert) {
      let array = new HasManyArray();

      assert.deepEqual(array, []);
      assert.deepEqual(array.splice(), []);
      assert.deepEqual(array, []);
      [-2, 0, 2].forEach((value) => {
        assert.deepEqual(array.splice(value), []);
        assert.deepEqual(array, []);
      });
    });

    test('emptyHasManyArray.splice(x, y) works correctly for possible x and y integer values', function (assert) {
      let array = new HasManyArray();

      [-2, 0, 2].forEach((value) => {
        assert.deepEqual(array.splice(-2, value), []);
        assert.deepEqual(array.splice(0, value), []);
        assert.deepEqual(array.splice(2, value), []);
        assert.deepEqual(array, []);
      });
    });

    test('emptyHasManyArray.splice(x, y, z) works correctly for possible x and y and z integer values', function (assert) {
      const { Photo } = generateModels();
      let firstPhoto = Photo.build({ name: "First photo" });

      [-2, 0, 2].forEach((value) => {
        [-2, 0, 2].forEach((secondParam) => {
          let array = new HasManyArray();
          let result = array.splice(value, value, firstPhoto);
          assert.deepEqual(result, []);
          assert.notOk(result instanceof HasManyArray);
          assert.deepEqual(array, [firstPhoto]);
        });
      });
    });

    test('emptyHasManyArray.splice(x, y, z, a, b) works correctly for possible x and y and z integer values and adds z, a & b', function (assert) {
      const { Photo } = generateModels();
      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let secondPhotoCopy = Photo.build({ id: 2, name: "Second photo copy" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });

      [-2, 0, 2].forEach((value) => {
        [-2, 0, 2].forEach((secondParam) => {
          let array = new HasManyArray();
          let result = array.splice(value, value, firstPhoto, null, secondPhoto, thirdPhoto);
          assert.deepEqual(result, []);
          assert.notOk(result instanceof HasManyArray);
          assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
        });
      });
    });

    test('array.splice(x) works correctly for possible x integer values', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array.splice(), []);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array.splice(0), [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, []);

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array.splice(-2), [fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array.splice(2), [thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto]);
    });

    test('array.splice(x, y) works correctly for possible x and y integer values', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo" });

      [-2, 0, 2].forEach((param) => {
        [-2, 0].forEach((secondParam) => {
          let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
          assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
          assert.deepEqual(array.splice(param, secondParam), []);
          assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
        });
      });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
      assert.deepEqual(array.splice(-2, 2), [fifthPhoto, sixthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
      assert.deepEqual(array.splice(0, 2), [firstPhoto, secondPhoto]);
      assert.deepEqual(array, [thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
      assert.deepEqual(array.splice(2, 2), [thirdPhoto, fourthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, fifthPhoto, sixthPhoto]);
    });

    test('array.splice(x, y, newModel) works correctly for possible x and y and z integer values', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo" });

      [-2, 0].forEach((param) => {
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.deepEqual(array.splice(-2, param, sixthPhoto), []);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, sixthPhoto, fourthPhoto, fifthPhoto]);
      });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array.splice(-2, 2, sixthPhoto), [fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, sixthPhoto]);

      [-2, 0].forEach((param) => {
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.deepEqual(array.splice(0, param, sixthPhoto), []);
        assert.deepEqual(array, [sixthPhoto, firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      });

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array.splice(0, 2, sixthPhoto), [firstPhoto, secondPhoto]);
      assert.deepEqual(array, [sixthPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      [-2, 0].forEach((param) => {
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.deepEqual(array.splice(2, param, sixthPhoto), []);
        assert.deepEqual(array, [firstPhoto, secondPhoto, sixthPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      });

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array.splice(2, 2, sixthPhoto), [thirdPhoto, fourthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, sixthPhoto, fifthPhoto]);
    });

    test('array.splice(x, y, existingModel) works correctly for possible x and y and z integer values', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });

      [-2, 0].forEach((param) => {
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.deepEqual(array.splice(-2, param, thirdPhoto), []);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array.splice(-2, 2, thirdPhoto), [fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);

      [-2, 0].forEach((param) => {
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.deepEqual(array.splice(0, param, thirdPhoto), []);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      });

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array.splice(0, 2, thirdPhoto), [firstPhoto, secondPhoto]);
      assert.deepEqual(array, [thirdPhoto, fourthPhoto, fifthPhoto]);

      [-2, 0].forEach((param) => {
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.deepEqual(array.splice(2, param, thirdPhoto), []);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      });

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array.splice(2, 2, thirdPhoto), [thirdPhoto, fourthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fifthPhoto]);
    });

    test('array.splice(x, y, existingInstanceGroupAnotherModel) works correctly for possible x and y and z integer values', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let thirdPhotoCopy = Photo.build({ id: 3, name: "Third photo copy" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });

      [-2, 0].forEach((param) => {
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.deepEqual(array.splice(-2, param, thirdPhotoCopy), []);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhotoCopy, fourthPhoto, fifthPhoto]);
      });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array.splice(-2, 2, thirdPhotoCopy), [fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhotoCopy]);

      [-2, 0].forEach((param) => {
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.deepEqual(array.splice(0, param, thirdPhotoCopy), []);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhotoCopy, fourthPhoto, fifthPhoto]);
      });

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array.splice(0, 2, thirdPhotoCopy), [firstPhoto, secondPhoto]);
      assert.deepEqual(array, [thirdPhotoCopy, fourthPhoto, fifthPhoto]);

      [-2, 0].forEach((param) => {
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.deepEqual(array.splice(2, param, thirdPhotoCopy), []);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhotoCopy, fourthPhoto, fifthPhoto]);
      });

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array.splice(2, 2, thirdPhotoCopy), [thirdPhoto, fourthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhotoCopy, fifthPhoto]);
    });

    test('array.splice(x, y, z, a, b) works correctly for possible x and y and z integer values and adds z, a & b', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let secondPhotoCopy = Photo.build({ id: 2, name: "Second photo copy" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let thirdPhotoCopy = Photo.build({ id: 3, name: "Third photo copy" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo" });
      let anotherPhoto = Photo.build({ id: 7, name: "Another photo" });

      [-2, 0].forEach((param) => {
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.deepEqual(array.splice(-2, param, null, sixthPhoto, anotherPhoto, thirdPhotoCopy, null, secondPhotoCopy), []);
        assert.deepEqual(array, [firstPhoto, secondPhotoCopy, thirdPhotoCopy, sixthPhoto, anotherPhoto, fourthPhoto, fifthPhoto]);
      });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array.splice(-2, 2, null, sixthPhoto, anotherPhoto, thirdPhotoCopy, null, secondPhotoCopy), [fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhotoCopy, thirdPhotoCopy, sixthPhoto, anotherPhoto]);

      [-2, 0].forEach((param) => {
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.deepEqual(array.splice(0, param, null, sixthPhoto, anotherPhoto, thirdPhotoCopy, null, secondPhotoCopy), []);
        assert.deepEqual(array, [sixthPhoto, anotherPhoto, firstPhoto, secondPhotoCopy, thirdPhotoCopy, fourthPhoto, fifthPhoto]);
      });

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array.splice(0, 2, null, sixthPhoto, anotherPhoto, thirdPhotoCopy, null, secondPhotoCopy), [firstPhoto, secondPhoto]);
      assert.deepEqual(array, [sixthPhoto, anotherPhoto, secondPhotoCopy, thirdPhotoCopy, fourthPhoto, fifthPhoto]);

      [-2, 0].forEach((param) => {
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.deepEqual(array.splice(2, param, null, sixthPhoto, anotherPhoto, thirdPhotoCopy, null, secondPhotoCopy), []);
        assert.deepEqual(array, [firstPhoto, secondPhotoCopy, sixthPhoto, anotherPhoto, thirdPhotoCopy, fourthPhoto, fifthPhoto]);
      });

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array.splice(2, 2, null, sixthPhoto, anotherPhoto, thirdPhotoCopy, null, secondPhotoCopy), [thirdPhoto, fourthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhotoCopy, sixthPhoto, anotherPhoto, thirdPhotoCopy, fifthPhoto]);
    });

    test('array.splice(x, y, z, a, b) works correctly for possible out of bound x and y ->(99, -99) and z integer values and adds z, a & b', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let secondPhotoCopy = Photo.build({ id: 2, name: "Second photo copy" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let thirdPhotoCopy = Photo.build({ id: 3, name: "Third photo copy" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo" });
      let anotherPhoto = Photo.build({ id: 7, name: "Another photo" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array.splice(-99, 2, null, sixthPhoto, anotherPhoto, thirdPhotoCopy, null, secondPhotoCopy), [firstPhoto, secondPhoto]);
      assert.deepEqual(array, [sixthPhoto, anotherPhoto, secondPhotoCopy, thirdPhotoCopy, fourthPhoto, fifthPhoto]);

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array.splice(2, -99, null, sixthPhoto, anotherPhoto, thirdPhotoCopy, null, secondPhotoCopy), []);
      assert.deepEqual(array, [firstPhoto, secondPhotoCopy, sixthPhoto, anotherPhoto, thirdPhotoCopy, fourthPhoto, fifthPhoto]);

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array.splice(-2, 99, null, sixthPhoto, anotherPhoto, thirdPhotoCopy, null, secondPhotoCopy), [fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhotoCopy, thirdPhotoCopy, sixthPhoto, anotherPhoto]);

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array.splice(99, -2, null, sixthPhoto, anotherPhoto, thirdPhotoCopy, null, secondPhotoCopy), []);
      assert.deepEqual(array, [firstPhoto, secondPhotoCopy, thirdPhotoCopy, fourthPhoto, fifthPhoto, sixthPhoto, anotherPhoto]);
    });
  });

  module('unshift', function() {
    test('array.unshift($invalidParam) throws', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let array = new HasManyArray([firstPhoto]);

      class SomeClass {};

      assert.deepEqual(array, [firstPhoto]);

      [true, 1, 'a', 100, {}, SomeClass, new SomeClass()].forEach((value) => {
        try {
          array.unshift(value);
        } catch (error) {
          assert.ok(error instanceof Error);
          assert.equal(error.message, `HasManyArray accepts memoria Models or falsy values for assignment, not ${value}`);
        }
      });

      assert.deepEqual(array, [firstPhoto]);
    });

    test('array.unshift($falsyValue) does nothing', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let array = new HasManyArray([firstPhoto]);

      assert.deepEqual(array, [firstPhoto]);

      [undefined, false, 0].forEach((value) => {
        try {
          array.unshift(value);
        } catch (error) {
          assert.ok(error instanceof Error);
          assert.equal(error.message, `HasManyArray accepts memoria Models or falsy values for assignment, not ${value}`);
        }
      });

      assert.deepEqual(array, [firstPhoto]);
    });

    test('array.unshift($wrongModelInstance) throws', function (assert) {
      const { Photo, User } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let array = new HasManyArray([firstPhoto]);

      assert.deepEqual(array, [firstPhoto]);

      try {
        array.unshift(User.build({ first_name: "Izel" }));
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, 'This HasManyArray accepts Photo instances, you tried to assign User instance!');
      }

      assert.deepEqual(array, [firstPhoto]);
    });

    test('emptyHasManyArray.unshift(x) works correctly', function (assert) {
      const { Photo, User } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let array = new HasManyArray();

      assert.deepEqual(array, []);
      assert.equal(array.length, 0);

      let result = array.unshift(firstPhoto);

      assert.equal(result, 1);
      assert.equal(array.length, 1);
      assert.deepEqual(array, [firstPhoto]);

      let resultTwo = array.unshift(secondPhoto);

      assert.equal(resultTwo, 2);
      assert.equal(array.length, 2);
      assert.deepEqual(array, [secondPhoto, firstPhoto]);

      try {
        array.unshift(User.build({ first_name: "Izel" }));
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, 'This HasManyArray accepts Photo instances, you tried to assign User instance!');
      }

      assert.equal(array.length, 2);
    });

    test('array.unshift($model) works correctly', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.equal(array.length, 3);

      let result = array.unshift(fourthPhoto);

      assert.equal(result, 4);
      assert.equal(array.length, 4);
      assert.deepEqual(array, [fourthPhoto, firstPhoto, secondPhoto, thirdPhoto]);

      let resultTwo = array.unshift(fifthPhoto);

      assert.equal(resultTwo, 5);
      assert.equal(array.length, 5);
      assert.deepEqual(array, [fifthPhoto, fourthPhoto, firstPhoto, secondPhoto, thirdPhoto]);
    });

    test('array.unshift($model) pushing an existing item just moves it to first position', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.equal(array.length, 3);

      let result = array.unshift(secondPhoto);

      assert.equal(result, 3);
      assert.equal(array.length, 3);
      assert.deepEqual(array, [secondPhoto, firstPhoto, thirdPhoto]);

      let resultTwo = array.unshift(thirdPhoto);

      assert.equal(resultTwo, 3);
      assert.equal(array.length, 3);
      assert.deepEqual(array, [thirdPhoto, secondPhoto, firstPhoto]);
    });

    test('array.unshift($model) pushing an existing instance group item replaces it and moves it to first position', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let firstPhotoCopy = Photo.build(firstPhoto);
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let secondPhotoCopy = Photo.build({ id: 2, name: "Second photo copy" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let array = new HasManyArray([firstPhotoCopy, secondPhotoCopy, thirdPhoto]);

      assert.deepEqual(array, [firstPhotoCopy, secondPhotoCopy, thirdPhoto]);
      assert.equal(array.length, 3);

      let result = array.unshift(secondPhoto);

      assert.equal(result, 3);
      assert.equal(array.length, 3);
      assert.deepEqual(array, [secondPhoto, firstPhotoCopy, thirdPhoto]);
      assert.notDeepEqual(array, [secondPhotoCopy, firstPhotoCopy, thirdPhoto]);

      let resultTwo = array.unshift(firstPhoto);

      assert.equal(resultTwo, 3);
      assert.equal(array.length, 3);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
    });
  });
});
