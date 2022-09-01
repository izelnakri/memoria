// TODO: Refactor tests with mock/spies calledOnceWith(RelationshipDB.cacheMethod, params)
import { HasManyArray } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";
import generateModels from "../helpers/relationship-test-models/index.js";

module("@memoria/model | HasManyArray DX mutation methods", function (hooks) {
  setupMemoria(hooks);

  module("add", function () {
    module("array.add(singleValue) tests", function () {
      test("array.add($invalidParam) throws", function (assert) {
        const { Photo } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let array = new HasManyArray([firstPhoto]);

        class SomeClass {}

        assert.deepEqual(array, [firstPhoto]);

        [true, 1, "a", 100, {}, SomeClass, new SomeClass()].forEach((value) => {
          try {
            array.add(value);
          } catch (error) {
            assert.ok(error instanceof Error);
            assert.equal(
              error.message,
              `HasManyArray accepts memoria Models or falsy values for assignment, not ${value}`
            );
          }
        });

        assert.deepEqual(array, [firstPhoto]);
      });

      test("array.add($falsyValue) does nothing", function (assert) {
        const { Photo } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let array = new HasManyArray([firstPhoto]);

        assert.deepEqual(array, [firstPhoto]);

        [undefined, false, 0].forEach((value) => {
          try {
            array.add(value);
          } catch (error) {
            assert.ok(error instanceof Error);
            assert.equal(
              error.message,
              `HasManyArray accepts memoria Models or falsy values for assignment, not ${value}`
            );
          }
        });

        assert.deepEqual(array, [firstPhoto]);
      });

      test("array.add($wrongModelInstance) throws", function (assert) {
        const { Photo, User } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let array = new HasManyArray([firstPhoto]);

        assert.deepEqual(array, [firstPhoto]);

        try {
          array.add(User.build({ first_name: "Izel" }));
        } catch (error) {
          assert.ok(error instanceof Error);
          assert.equal(error.message, "This HasManyArray accepts Photo instances, you tried to assign User instance!");
        }

        assert.deepEqual(array, [firstPhoto]);
      });

      test("emptyHasManyArray.add(x) works correctly", function (assert) {
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
          assert.equal(error.message, "This HasManyArray accepts Photo instances, you tried to assign User instance!");
        }

        assert.equal(array.length, 2);
      });

      test("array.add($model) works correctly for HasManyArray with existing items", function (assert) {
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

      test("array.add($model) pushing an existing item does nothing", function (assert) {
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

      test("array.add($model) pushing an existing instance group item replaces it", function (assert) {
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

    module("array.add(...[values])", function () {
      test("array.add($invalidParams) throws", function (assert) {
        const { Photo } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let array = new HasManyArray([firstPhoto]);

        class SomeClass {}

        assert.deepEqual(array, [firstPhoto]);

        let invalidParams = [true, 1, "a", 100, {}, SomeClass, new SomeClass()];
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

      test("array.add($falsyValues) does nothing", function (assert) {
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

      test("array.add($wrongModelInstances) throws", function (assert) {
        const { Photo, User, Group } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let array = new HasManyArray([firstPhoto]);

        assert.deepEqual(array, [firstPhoto]);

        try {
          array.add([Group.build({ name: "Some group" }), User.build({ first_name: "Izel" })]);
        } catch (error) {
          assert.ok(error instanceof Error);
          assert.equal(
            error.message,
            "HasManyArray cannot be instantiated or added with model types different than one another!"
          );
        }

        assert.deepEqual(array, [firstPhoto]);
      });

      test("emptyHasManyArray.add([modelX, modelY, modelZ]) works correctly", function (assert) {
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
          assert.equal(error.message, "This HasManyArray accepts Photo instances, you tried to assign User instance!");
        }

        assert.equal(array.length, 6);
      });

      test("array.add([modelX, modelY, modelZ]) works correctly", function (assert) {
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

      test("array.add([modelX, modelY, modelZ]) pushing an existing item on it works correctly", function (assert) {
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

      test("array.add($model) pushing an existing instance group item on it works & replaces it correctly", function (assert) {
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

  module('replace', function() {
    test('replace(emptyExistingReference, newModel) works correctly', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let newModel = Photo.build({ name: "Third photo" });

      let array = new HasManyArray([firstPhoto, secondPhoto]);

      assert.deepEqual(array.replace([], newModel), [firstPhoto, secondPhoto, newModel]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, newModel]);
      assert.equal(array.length, 3);
    });

    test('replace(emptyExistingReference, models) works correctly', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });

      let array = new HasManyArray([firstPhoto, secondPhoto]);

      assert.deepEqual(array.replace([], [fourthPhoto, fifthPhoto, thirdPhoto]), [
        firstPhoto, secondPhoto, fourthPhoto, fifthPhoto, thirdPhoto
      ]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, fourthPhoto, fifthPhoto, thirdPhoto]);
      assert.equal(array.length, 5);
    });

    test('replace(existingReference, model) works correctly', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);
      assert.deepEqual(array.replace(thirdPhoto, fifthPhoto), [firstPhoto, secondPhoto, fifthPhoto, fourthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, fifthPhoto, fourthPhoto]);
    });

    test('replace(existingReference, existingModel) works correctly', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);
      assert.deepEqual(array.replace(thirdPhoto, thirdPhoto), [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);
    });

    test('replace(existingReference, modelWithExistingInstanceGroup) works correctly', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let thirdPhotoCopy = Photo.build({ id: 3, name: "Third photo copy" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);
      assert.deepEqual(array.replace(thirdPhoto, thirdPhotoCopy), [firstPhoto, secondPhoto, thirdPhotoCopy, fourthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhotoCopy, fourthPhoto]);

    });

    test('replace(existingReference, models) works correctly', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let thirdPhotoCopy = Photo.build({ id: 3, name: "Third photo copy" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);
      assert.deepEqual(array.replace(thirdPhoto, [fifthPhoto, thirdPhotoCopy, sixthPhoto]), [
        firstPhoto, secondPhoto, fifthPhoto, fourthPhoto, thirdPhotoCopy, sixthPhoto
      ]);
    });

    test('replace(existingReference, invalidValues) throws', function (assert) {
      assert.expect(4);

      const { Photo, User } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let user = User.build({ id: 1, name: "John" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);

      try {
        array.replace(thirdPhoto, [fourthPhoto, fifthPhoto, user]);
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "HasManyArray cannot be instantiated or added with model types different than one another!");
      }

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
    });

    test('replace(existingReference, invalidValue) throws', function (assert) {
      const { Photo, User } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let user = User.build({ id: 1, name: "John" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);

      try {
        array.replace(thirdPhoto, user);
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "HasManyArray cannot be instantiated or added with model types different than one another!");
      }

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
    });

    test('replace(existingReferences, model) works correctly', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array.replace([firstPhoto, fourthPhoto, secondPhoto], sixthPhoto), [
        sixthPhoto, thirdPhoto, fifthPhoto
      ]);
      assert.deepEqual(array, [sixthPhoto, thirdPhoto, fifthPhoto]);
    });

    test('replace(existingReferences, existingModel) works correctly', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array.replace([firstPhoto, fourthPhoto, secondPhoto], fourthPhoto), [
        fourthPhoto, thirdPhoto, fifthPhoto
      ]);
      assert.deepEqual(array, [fourthPhoto, thirdPhoto, fifthPhoto]);
    });

    test('replace(existingReferences, modelWithExistingInstanceGroup) works correctly', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fourthPhotoCopy = Photo.build({ id: 4, name: "Fourth photo copy" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array.replace([firstPhoto, fourthPhoto, secondPhoto], fourthPhotoCopy), [
        fourthPhotoCopy, thirdPhoto, fifthPhoto
      ]);
      assert.deepEqual(array, [fourthPhotoCopy, thirdPhoto, fifthPhoto]);
    });

    test('replace(existingReferences, models) works correctly', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fourthPhotoCopy = Photo.build({ id: 4, name: "Fourth photo copy" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array.replace([firstPhoto, fourthPhoto, secondPhoto], [
        sixthPhoto, fourthPhotoCopy, thirdPhoto
      ]), [sixthPhoto, fourthPhotoCopy, thirdPhoto, fifthPhoto]);
      assert.deepEqual(array, [sixthPhoto, fourthPhotoCopy, thirdPhoto, fifthPhoto]);
    });

    test('replace(existingReferences, invalidValues) throws', function (assert) {
      const { Photo, User } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let user = User.build({ id: 1, name: "John" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);

      try {
        array.replace([firstPhoto, secondPhoto, thirdPhoto], [firstPhoto, user, thirdPhoto]);
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "HasManyArray cannot be instantiated or added with model types different than one another!");
      }

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
    });

    test('replace(existingReferences, invalidValue) throws', function (assert) {
      const { Photo, User } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let user = User.build({ id: 1, name: "John" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);

      try {
        array.replace([firstPhoto, secondPhoto, thirdPhoto], user);
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "HasManyArray cannot be instantiated or added with model types different than one another!");
      }

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
    });
  });

  module("delete", function () {
    test("array.delete($model) works correctly can can clear the items iteratively", function (assert) {
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

    test("emptyHasManyArray.delete($anyItem) works correctly", function (assert) {
      const { Photo, User } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let user = User.build({ first_name: "Izel" });
      let array = new HasManyArray();

      class SomeClass {}

      assert.deepEqual(array, []);

      [true, 1, "a", 100, {}, SomeClass, new SomeClass(), undefined, false, 0, null, firstPhoto, user].forEach((x) => {
        assert.strictEqual(array.delete(x), false);
        assert.deepEqual(array, []);
      });
    });

    test("array.delete($notExistingItem) works correctly", function (assert) {
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

      [
        true,
        1,
        "a",
        100,
        {},
        SomeClass,
        new SomeClass(),
        undefined,
        false,
        0,
        null,
        user,
        firstPhotoCopy,
        secondPhotoCopy,
      ].forEach((x) => {
        assert.strictEqual(array.delete(x), false);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      });
    });
  });

  module("clear", function () {
    test("array.clear() works correctly", function (assert) {
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

    test("emptyArray.clear() works correctly", function (assert) {
      let array = new HasManyArray();

      assert.deepEqual(array, []);
      assert.strictEqual(array.clear(), array);
      assert.deepEqual(array, []);
    });
  });

  // add to the end or some index(and beginning)
  // trying to add an already existing item
  // trying to add an item with an existing instance group
  // wrong item type throws
  module("insertAt", function () {
    test("array.insertAt(index, $model) works correctly on different positive index locations", function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo" });
      let seventhPhoto = Photo.build({ id: 7, name: "Seventh photo" });
      let eighthPhoto = Photo.build({ id: 8, name: "Eighth photo" });

      Photo.build({ id: 6, name: "Sixth photo copy" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);

      array.insertAt(2, fifthPhoto);

      assert.deepEqual(array, [firstPhoto, secondPhoto, fifthPhoto, thirdPhoto, fourthPhoto]);

      array.insertAt(0, [sixthPhoto, seventhPhoto]);

      assert.deepEqual(array, [sixthPhoto, seventhPhoto, firstPhoto, secondPhoto, fifthPhoto, thirdPhoto, fourthPhoto]);
      assert.equal(array.length, 7);

      array.insertAt(7, eighthPhoto);

      assert.deepEqual(array, [
        sixthPhoto,
        seventhPhoto,
        firstPhoto,
        secondPhoto,
        fifthPhoto,
        thirdPhoto,
        fourthPhoto,
        eighthPhoto,
      ]);
      assert.equal(array.length, 8);
    });

    test("array.insertAt(index, $model) works correctly on different negative index locations", function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo" });
      let seventhPhoto = Photo.build({ id: 7, name: "Seventh photo" });
      let eighthPhoto = Photo.build({ id: 8, name: "Eighth photo" });

      Photo.build({ id: 6, name: "Sixth photo copy" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);

      array.insertAt(-1, fifthPhoto);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      array.insertAt(-4, sixthPhoto);

      assert.deepEqual(array, [firstPhoto, secondPhoto, sixthPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.equal(array.length, 6);

      array.insertAt(-8, [seventhPhoto, eighthPhoto]);

      assert.deepEqual(array, [
        seventhPhoto,
        eighthPhoto,
        firstPhoto,
        secondPhoto,
        sixthPhoto,
        thirdPhoto,
        fourthPhoto,
        fifthPhoto,
      ]);
      assert.equal(array.length, 8);
    });

    test("array.insertAt(index, $model) throws when index is out of bounds", function (assert) {
      assert.expect(4);

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });

      Photo.build({ id: 6, name: "Sixth photo copy" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);

      try {
        array.insertAt(5, fifthPhoto);
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, `insertAt: index 5 is not a valid index when length of the array is 4`);
      }
      try {
        array.insertAt(-6, fifthPhoto);
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, `insertAt: index -6 is not a valid index when length of the array is 4`);
      }
    });

    test("array.insertAt(index, $model) replaces a model index when same instance group already exists", function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let secondPhotoCopy = Photo.build({ id: 2, name: "Second photo copy" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let thirdPhotoCopy = Photo.build({ id: 3, name: "Third photo copy" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fourthPhotoCopy = Photo.build({ id: 4, name: "Fourth photo copy" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo" });
      let seventhPhoto = Photo.build({ id: 7, name: "Seventh photo" });

      Photo.build({ id: 6, name: "Sixth photo copy" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);

      array.insertAt(4, [secondPhotoCopy, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhotoCopy, thirdPhoto, fourthPhoto, fifthPhoto]);

      array.insertAt(0, thirdPhotoCopy);

      assert.deepEqual(array, [thirdPhotoCopy, firstPhoto, secondPhotoCopy, fourthPhoto, fifthPhoto]);
      assert.equal(array.length, 5);

      array.insertAt(-8, [fourthPhotoCopy, sixthPhoto, seventhPhoto]);

      assert.deepEqual(array, [
        sixthPhoto,
        seventhPhoto,
        thirdPhotoCopy,
        firstPhoto,
        secondPhotoCopy,
        fourthPhotoCopy,
        fifthPhoto,
      ]);
      assert.equal(array.length, 7);
    });
  });

  module("deleteAt", function () {
    test("works correctly for positive indexes and different amounts", function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo" });
      let seventhPhoto = Photo.build({ id: 7, name: "Seventh photo" });

      let array = new HasManyArray([
        firstPhoto,
        secondPhoto,
        thirdPhoto,
        fourthPhoto,
        fifthPhoto,
        sixthPhoto,
        seventhPhoto,
      ]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto, seventhPhoto]);

      array.deleteAt(6);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);

      array.deleteAt(5, 55);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      array.deleteAt(0, 3);

      assert.deepEqual(array, [fourthPhoto, fifthPhoto]);

      array.deleteAt(1, 2);

      assert.deepEqual(array, [fourthPhoto]);
      assert.equal(array.length, 1);
    });

    test("works correctly for negative indexes and different amounts", function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo" });
      let seventhPhoto = Photo.build({ id: 7, name: "Seventh photo" });

      let array = new HasManyArray([
        firstPhoto,
        secondPhoto,
        thirdPhoto,
        fourthPhoto,
        fifthPhoto,
        sixthPhoto,
        seventhPhoto,
      ]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto, seventhPhoto]);

      array.deleteAt(-1);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);

      array.deleteAt(-6, 3);

      assert.deepEqual(array, [fourthPhoto, fifthPhoto, sixthPhoto]);
      assert.equal(array.length, 3);

      array.deleteAt(-1, 5);

      assert.deepEqual(array, [fourthPhoto, fifthPhoto]);
      assert.equal(array.length, 2);

      array.deleteAt(-1, 0);

      assert.deepEqual(array, [fourthPhoto, fifthPhoto]);
      assert.equal(array.length, 2);
    });

    test("delete($index) throws when index is out of bounds", function (assert) {
      assert.expect(5);

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo" });
      let seventhPhoto = Photo.build({ id: 7, name: "Seventh photo" });

      let array = new HasManyArray([
        firstPhoto,
        secondPhoto,
        thirdPhoto,
        fourthPhoto,
        fifthPhoto,
        sixthPhoto,
        seventhPhoto,
      ]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto, seventhPhoto]);

      try {
        array.deleteAt(7);
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "deleteAt: index 7 is not a valid index when length of the array is 7");
      }
      try {
        array.deleteAt(-8, 55);
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "deleteAt: index -8 is not a valid index when length of the array is 7");
      }
    });
  });

  module('uniqBy', function() {
    test('uniqBy works correctly', function(assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo", is_public: true, owner_id: 1 });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo", is_public: false, owner_id: 2 });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo", is_public: true });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo", is_public: false });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo", owner_id: 5 });
      let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo", owner_id: 3 });
      let seventhPhoto = Photo.build({ id: 7, name: "Seventh photo", owner_id: 5 });

      let array = new HasManyArray([
        firstPhoto,
        secondPhoto,
        thirdPhoto,
        fourthPhoto,
        fifthPhoto,
        sixthPhoto,
        seventhPhoto,
      ]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto, seventhPhoto]);
      assert.deepEqual(array.uniqBy('name'), [
        firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto, seventhPhoto
      ]);
      assert.deepEqual(array.uniqBy('owner_id'), [firstPhoto, secondPhoto, thirdPhoto, fifthPhoto, sixthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fifthPhoto, sixthPhoto]);
      assert.deepEqual(array.uniqBy('is_public'), [firstPhoto, secondPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, fifthPhoto]);
    });

    test("fails when called with an array that has the key missing", function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo", is_public: true, owner_id: 1 });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo", is_public: false, owner_id: 2 });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo", is_public: true });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

      try {
        array.uniqBy('some_id');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "uniqBy: Key some_id not found in a model inside the array!");
      }
    });
  });

  module('sortBy', function() {
    test('it works correctly for single sortBy parameters', function(assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo", is_public: true, owner_id: 1 });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo", is_public: false, owner_id: 2 });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo", is_public: true });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo", is_public: false });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo", owner_id: 5 });
      let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo", owner_id: 3 });
      let seventhPhoto = Photo.build({ id: 7, name: "Seventh photo", owner_id: 5 });

      let array = new HasManyArray([
        thirdPhoto,
        fifthPhoto,
        firstPhoto,
        secondPhoto,
        seventhPhoto,
        fourthPhoto,
        sixthPhoto,
      ]);

      assert.deepEqual(array, [thirdPhoto, fifthPhoto, firstPhoto, secondPhoto, seventhPhoto, fourthPhoto, sixthPhoto]);
      assert.deepEqual(array.sortBy('name'), [
        fifthPhoto, firstPhoto, fourthPhoto, secondPhoto, seventhPhoto, sixthPhoto, thirdPhoto
      ]);
      assert.deepEqual(array, [fifthPhoto, firstPhoto, fourthPhoto, secondPhoto, seventhPhoto, sixthPhoto, thirdPhoto]);
      assert.deepEqual(array.sortBy('name'), [
        fifthPhoto, firstPhoto, fourthPhoto, secondPhoto, seventhPhoto, sixthPhoto, thirdPhoto
      ]);
      assert.deepEqual(array.sortBy('id'), [
        firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto, seventhPhoto
      ]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto, seventhPhoto]);
    });

    test('it works correctly for multiple sortBy parameters', function(assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo", is_public: true, owner_id: 1 });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo", is_public: false, owner_id: 2 });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo", is_public: true });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo", is_public: false });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo", owner_id: 5 });
      let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo", owner_id: 3 });
      let seventhPhoto = Photo.build({ id: 7, name: "Seventh photo", owner_id: 5 });

      let array = new HasManyArray([
        thirdPhoto,
        fifthPhoto,
        firstPhoto,
        secondPhoto,
        seventhPhoto,
        fourthPhoto,
        sixthPhoto,
      ]);

      assert.deepEqual(array, [thirdPhoto, fifthPhoto, firstPhoto, secondPhoto, seventhPhoto, fourthPhoto, sixthPhoto]);
      assert.deepEqual(array.sortBy('owner_id', 'id'), [
        thirdPhoto, fourthPhoto, firstPhoto, secondPhoto, sixthPhoto, fifthPhoto, seventhPhoto
      ]);
      assert.deepEqual(array, [thirdPhoto, fourthPhoto, firstPhoto, secondPhoto, sixthPhoto, fifthPhoto, seventhPhoto]);
      assert.deepEqual(array.sortBy('owner_id', 'name'), [
        fourthPhoto, thirdPhoto, firstPhoto, secondPhoto, sixthPhoto, fifthPhoto, seventhPhoto
      ]);
      assert.deepEqual(array, [
        fourthPhoto, thirdPhoto, firstPhoto, secondPhoto, sixthPhoto, fifthPhoto, seventhPhoto
      ]);
    });

    test('it works correctly for array sortBy parameters', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo", is_public: true, owner_id: 1 });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo", is_public: false, owner_id: 2 });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo", is_public: true });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo", is_public: false });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo", owner_id: 5 });
      let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo", owner_id: 3 });
      let seventhPhoto = Photo.build({ id: 7, name: "Seventh photo", owner_id: 5 });

      let array = new HasManyArray([
        thirdPhoto,
        fifthPhoto,
        firstPhoto,
        secondPhoto,
        seventhPhoto,
        fourthPhoto,
        sixthPhoto,
      ]);

      assert.deepEqual(array, [thirdPhoto, fifthPhoto, firstPhoto, secondPhoto, seventhPhoto, fourthPhoto, sixthPhoto]);
      assert.deepEqual(array.sortBy(['owner_id', 'id']), [
        thirdPhoto, fourthPhoto, firstPhoto, secondPhoto, sixthPhoto, fifthPhoto, seventhPhoto
      ]);
      assert.deepEqual(array, [thirdPhoto, fourthPhoto, firstPhoto, secondPhoto, sixthPhoto, fifthPhoto, seventhPhoto]);
      assert.deepEqual(array.sortBy(['owner_id', 'name']), [
        fourthPhoto, thirdPhoto, firstPhoto, secondPhoto, sixthPhoto, fifthPhoto, seventhPhoto
      ]);
      assert.deepEqual(array, [
        fourthPhoto, thirdPhoto, firstPhoto, secondPhoto, sixthPhoto, fifthPhoto, seventhPhoto
      ]);
    });
  });

  module("filterBy", function() {
    test("it works and filters the array for various keys", function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo", is_public: true, owner_id: 1 });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo", is_public: false, owner_id: 2 });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo", is_public: true });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo", is_public: false });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo", owner_id: 5 });
      let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo", owner_id: 3 });
      let seventhPhoto = Photo.build({ id: 7, name: "Seventh photo", owner_id: 5 });

      let array = new HasManyArray([
        firstPhoto,
        secondPhoto,
        thirdPhoto,
        fourthPhoto,
        fifthPhoto,
        sixthPhoto,
        seventhPhoto
      ]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto, seventhPhoto]);
      assert.deepEqual(array.filterBy('name', String), [
        firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto, seventhPhoto
      ]);
      assert.deepEqual(array.filterBy('id', Number), [
        secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto, seventhPhoto
      ]);
      assert.deepEqual(array, [secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto, seventhPhoto]);
      assert.deepEqual(array.filterBy('is_public', false), [secondPhoto, fourthPhoto]);
      assert.deepEqual(array, [secondPhoto, fourthPhoto]);
      assert.deepEqual(array.filterBy('name', 'Fourth photo'), [fourthPhoto]);
      assert.deepEqual(array, [fourthPhoto]);
    });

    test("it clears the array when it cant find elements for matching value", function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo", is_public: true, owner_id: 1 });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo", is_public: false, owner_id: 2 });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo", is_public: true });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo", is_public: false });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo", owner_id: 5 });
      let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo", owner_id: 3 });
      let seventhPhoto = Photo.build({ id: 7, name: "Seventh photo", owner_id: 5 });

      let array = new HasManyArray([
        firstPhoto,
        secondPhoto,
        thirdPhoto,
        fourthPhoto,
        fifthPhoto,
        sixthPhoto,
        seventhPhoto
      ]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto, seventhPhoto]);
      assert.deepEqual(array.filterBy('something', true), []);
    });
  });
});
