// TODO: Refactor tests with mock/spies calledOnceWith(RelationshipDB.cacheMethod, params)
import { HasManyArray } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";
import generateModels from "../helpers/relationship-test-models/index.js";

module("@memoria/model | HasManyArray DX mutation methods", function (hooks) {
  setupMemoria(hooks);

  module('add', function() {
    module('array.add(singleValue) tests', function() {
      test('array.add($invalidParam) throws', function (assert) {
        const { Photo } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let array = new HasManyArray([firstPhoto]);

        class SomeClass {};

        assert.deepEqual(array, [firstPhoto]);

        [true, 1, 'a', 100, {}, SomeClass, new SomeClass()].forEach((value) => {
          try {
            array.add(value);
          } catch (error) {
            assert.ok(error instanceof Error);
            assert.equal(error.message, `HasManyArray accepts memoria Models or falsy values for assignment, not ${value}`);
          }
        });

        assert.deepEqual(array, [firstPhoto]);
      });

      test('array.add($falsyValue) does nothing', function (assert) {
        const { Photo } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let array = new HasManyArray([firstPhoto]);

        assert.deepEqual(array, [firstPhoto]);

        [undefined, false, 0].forEach((value) => {
          try {
            array.add(value);
          } catch (error) {
            assert.ok(error instanceof Error);
            assert.equal(error.message, `HasManyArray accepts memoria Models or falsy values for assignment, not ${value}`);
          }
        });

        assert.deepEqual(array, [firstPhoto]);
      });

      test('array.add($wrongModelInstance) throws', function (assert) {
        const { Photo, User } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let array = new HasManyArray([firstPhoto]);

        assert.deepEqual(array, [firstPhoto]);

        try {
          array.add(User.build({ first_name: "Izel" }));
        } catch (error) {
          assert.ok(error instanceof Error);
          assert.equal(error.message, 'This HasManyArray accepts Photo instances, you tried to assign User instance!');
        }

        assert.deepEqual(array, [firstPhoto]);
      });

      test('emptyHasManyArray.add(x) works correctly', function (assert) {
        const { Photo, User } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
        let array = new HasManyArray();

        assert.deepEqual(array, []);
        assert.equal(array.length, 0);

        assert.strictEqual(array.add(firstPhoto), array);
        assert.equal(array.length, 1);
        assert.deepEqual(array, [firstPhoto]);

        assert.strictEqual(array.add(secondPhoto), array);
        assert.equal(array.length, 2);
        assert.deepEqual(array, [firstPhoto, secondPhoto]);

        try {
          array.add(User.build({ first_name: "Izel" }));
        } catch (error) {
          assert.ok(error instanceof Error);
          assert.equal(error.message, 'This HasManyArray accepts Photo instances, you tried to assign User instance!');
        }

        assert.equal(array.length, 2);
      });

      test('array.add($model) works correctly', function (assert) {
        const { Photo } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
        let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
        let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
        let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
        assert.equal(array.length, 3);

        assert.strictEqual(array.add(fourthPhoto), array);
        assert.equal(array.length, 4);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);

        assert.strictEqual(array.add(fifthPhoto), array);
        assert.equal(array.length, 5);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      });

      test('array.add($model) pushing an existing item does nothing', function (assert) {
        const { Photo } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
        let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
        assert.equal(array.length, 3);

        assert.strictEqual(array.add(secondPhoto), array);
        assert.equal(array.length, 3);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);

        assert.strictEqual(array.add(firstPhoto), array);
        assert.equal(array.length, 3);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      });

      test('array.add($model) pushing an existing instance group item replaces it', function (assert) {
        const { Photo } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let firstPhotoCopy = Photo.build(firstPhoto);
        let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
        let secondPhotoCopy = Photo.build({ id: 2, name: "Second photo copy" });
        let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
        let array = new HasManyArray([firstPhotoCopy, secondPhotoCopy, thirdPhoto]);

        assert.deepEqual(array, [firstPhotoCopy, secondPhotoCopy, thirdPhoto]);
        assert.equal(array.length, 3);

        assert.strictEqual(array.add(secondPhoto), array);
        assert.equal(array.length, 3);
        assert.deepEqual(array, [firstPhotoCopy, secondPhoto, thirdPhoto]);
        assert.notDeepEqual(array, [firstPhotoCopy, secondPhotoCopy, thirdPhoto]);

        assert.strictEqual(array.add(firstPhoto), array);
        assert.equal(array.length, 3);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      });
    });

    module('array.add(...[values])', function () {
      test('array.add($invalidParams) throws', function (assert) {
        const { Photo } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let array = new HasManyArray([firstPhoto]);

        class SomeClass {};

        assert.deepEqual(array, [firstPhoto]);

        let invalidParams = [true, 1, 'a', 100, {}, SomeClass, new SomeClass()];
        invalidParams.forEach((value, index) => {
          try {
            array.add([invalidParams[index], invalidParams[invalidParams.length - 1]]);
          } catch (error) {
            assert.ok(error instanceof Error);
            assert.equal(error.message, "HasManyArray cannot have non memoria Model instance inside!");
          }
        });

        assert.deepEqual(array, [firstPhoto]);
      });

      test('array.add($falsyValues) does nothing', function (assert) {
        const { Photo } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let array = new HasManyArray([firstPhoto]);

        assert.deepEqual(array, [firstPhoto]);

        let falsyValues = [undefined, false, 0];
        falsyValues.forEach((value, index) => {
          try {
            array.add([falsyValues[index], falsyValues[falsyValues.length - 1]]);
          } catch (error) {
            assert.ok(error instanceof Error);
            assert.equal(error.message, "HasManyArray cannot have non memoria Model instance inside!");
          }
        });

        assert.deepEqual(array, [firstPhoto]);
      });

      test('array.add($wrongModelInstances) throws', function (assert) {
        const { Photo, User, Group } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let array = new HasManyArray([firstPhoto]);

        assert.deepEqual(array, [firstPhoto]);

        try {
          array.add([Group.build({ name: "Some group" }), User.build({ first_name: "Izel" })]);
        } catch (error) {
          assert.ok(error instanceof Error);
          assert.equal(error.message, 'HasManyArray cannot be instantiated or added with model types different than one another!');
        }

        assert.deepEqual(array, [firstPhoto]);
      });

      test('emptyHasManyArray.add([modelX, modelY, modelZ]) works correctly', function (assert) {
        const { Photo, User } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
        let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
        let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
        let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
        let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo" });
        let array = new HasManyArray();

        assert.deepEqual(array, []);
        assert.equal(array.length, 0);

        assert.strictEqual(array.add([firstPhoto, secondPhoto, thirdPhoto]), array);
        assert.equal(array.length, 3);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);

        assert.strictEqual(array.add([fifthPhoto, sixthPhoto, fourthPhoto]), array);
        assert.equal(array.length, 6);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fifthPhoto, sixthPhoto, fourthPhoto]);

        try {
          array.add(User.build({ first_name: "Izel" }));
        } catch (error) {
          assert.ok(error instanceof Error);
          assert.equal(error.message, 'This HasManyArray accepts Photo instances, you tried to assign User instance!');
        }

        assert.equal(array.length, 6);
      });

      test('array.add([modelX, modelY, modelZ]) works correctly', function (assert) {
        const { Photo } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
        let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
        let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
        let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
        let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo" });
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
        assert.equal(array.length, 3);

        assert.strictEqual(array.add([fourthPhoto, fifthPhoto]), array);
        assert.equal(array.length, 5);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

        assert.strictEqual(array.add([sixthPhoto]), array);
        assert.equal(array.length, 6);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
      });

      test('array.add([modelX, modelY, modelZ]) pushing an existing item on it works correctly', function (assert) {
        const { Photo } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
        let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
        let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
        let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
        let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo" });
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
        assert.equal(array.length, 3);

        assert.strictEqual(array.add([fourthPhoto, secondPhoto, fifthPhoto]), array);
        assert.equal(array.length, 5);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

        assert.strictEqual(array.add([firstPhoto, sixthPhoto, firstPhoto, thirdPhoto]), array);
        assert.equal(array.length, 6);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
      });

      test('array.add($model) pushing an existing instance group item on it works & replaces it correctly', function (assert) {
        const { Photo } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let firstPhotoCopy = Photo.build(firstPhoto);
        let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
        let secondPhotoCopy = Photo.build({ id: 2, name: "Second photo copy" });
        let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
        let thirdPhotoCopy = Photo.build({ id: 3, name: "Third photo copy" });
        let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
        let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
        let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo" });
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
        assert.equal(array.length, 3);

        assert.strictEqual(array.add([fourthPhoto, secondPhotoCopy, fifthPhoto]), array);
        assert.equal(array.length, 5);
        assert.deepEqual(array, [firstPhoto, secondPhotoCopy, thirdPhoto, fourthPhoto, fifthPhoto]);

        assert.strictEqual(array.add([firstPhotoCopy, sixthPhoto, firstPhotoCopy, thirdPhotoCopy]), array);
        assert.equal(array.length, 6);
        assert.deepEqual(array, [firstPhotoCopy, secondPhotoCopy, thirdPhotoCopy, fourthPhoto, fifthPhoto, sixthPhoto]);
      });
    });
  });

  module('delete', function() {
    test('array.delete($model) works correctly can can clear the items iteratively', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.strictEqual(array.delete(thirdPhoto), true);
      assert.deepEqual(array, [firstPhoto, secondPhoto]);
      assert.strictEqual(array.delete(firstPhoto), true);
      assert.deepEqual(array, [secondPhoto]);
      assert.strictEqual(array.delete(secondPhoto), true);
      assert.deepEqual(array, []);
    });

    test('emptyHasManyArray.delete($anyItem) works correctly', function (assert) {
      const { Photo, User } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let user = User.build({ first_name: "Izel" });
      let array = new HasManyArray();

      class SomeClass {}

      assert.deepEqual(array, []);

      [true, 1, 'a', 100, {}, SomeClass, new SomeClass(), undefined, false, 0, null, firstPhoto, user].forEach((x) => {
        assert.strictEqual(array.delete(x), false);
        assert.deepEqual(array, []);
      });
    });

    test('array.delete($notExistingItem) works correctly', function (assert) {
      const { Photo, User } = generateModels();

      let user = User.build({ first_name: "Izel" });
      let firstPhoto = Photo.build({ name: "First photo" });
      let firstPhotoCopy = Photo.build(firstPhoto);
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let secondPhotoCopy = Photo.build({ id: 2, name: "Second photo copy" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

      class SomeClass {}

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);

      [true, 1, 'a', 100, {}, SomeClass, new SomeClass(), undefined, false, 0, null, user, firstPhotoCopy, secondPhotoCopy].forEach((x) => {
        assert.strictEqual(array.delete(x), false);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      });
    });
  });

  module('clear', function() {
    test('array.clear() works correctly', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);
      assert.strictEqual(array.clear(), array);
      assert.deepEqual(array, []);
    });

    test('emptyArray.clear() works correctly', function (assert) {
      let array = new HasManyArray();

      assert.deepEqual(array, []);
      assert.strictEqual(array.clear(), array);
      assert.deepEqual(array, []);
    });
  });

  // TODO:
  // module('replace', function() {

  // });
});
