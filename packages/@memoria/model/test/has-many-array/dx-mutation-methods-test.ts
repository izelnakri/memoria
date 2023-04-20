import { HasManyArray, RelationshipMutation } from "@memoria/model";
import sinon from "sinon";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";
import setupSinon from "../helpers/setup-sinon.js";
import generateModels from "../helpers/relationship-test-models/index.js";

module("@memoria/model | HasManyArray DX mutation methods", function (hooks) {
  setupMemoria(hooks);
  setupSinon(hooks);

  module("add", function () {
    module("array.add(singleValue) tests", function () {
      test("array.add($invalidParam) throws", function (assert) {
        sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
        sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

        const { Photo } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let array = new HasManyArray([firstPhoto]);

        class SomeClass {}

        assert.deepEqual(array, [firstPhoto]);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 1);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, firstPhoto]);

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
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 1);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, firstPhoto]);
      });

      test("array.add($falsyValue) does nothing", function (assert) {
        sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
        sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

        const { Photo } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let array = new HasManyArray([firstPhoto]);

        assert.deepEqual(array, [firstPhoto]);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 1);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, firstPhoto]);

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
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 1);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, firstPhoto]);
      });

      test("array.add($wrongModelInstance) throws", function (assert) {
        sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
        sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

        const { Photo, User } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let array = new HasManyArray([firstPhoto]);

        assert.deepEqual(array, [firstPhoto]);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 1);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, firstPhoto]);

        try {
          array.add(User.build({ first_name: "Izel" }));
        } catch (error) {
          assert.ok(error instanceof Error);
          assert.equal(error.message, "This HasManyArray accepts Photo instances, you tried to assign User instance!");
        }

        assert.deepEqual(array, [firstPhoto]);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 1);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, firstPhoto]);
      });

      test("emptyHasManyArray.add(x) works correctly", function (assert) {
        sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
        sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

        const { Photo, User } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
        let array = new HasManyArray();

        assert.deepEqual(array, []);
        assert.equal(array.length, 0);

        assert.strictEqual(array.add(firstPhoto), array);

        assert.equal(array.length, 1);
        assert.deepEqual(array, [firstPhoto]);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 1);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, firstPhoto]);

        assert.strictEqual(array.add(secondPhoto), array);
        assert.equal(array.length, 2);
        assert.deepEqual(array, [firstPhoto, secondPhoto]);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 2);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, secondPhoto]);

        try {
          array.add(User.build({ first_name: "Izel" }));
        } catch (error) {
          assert.ok(error instanceof Error);
          assert.equal(error.message, "This HasManyArray accepts Photo instances, you tried to assign User instance!");
        }

        assert.equal(array.length, 2);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 2);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
      });

      test("array.add($model) works correctly for HasManyArray with existing items", function (assert) {
        sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
        sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

        const { Photo } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
        let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
        let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
        let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
        assert.equal(array.length, 3);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(0).args, [array, firstPhoto]);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(1).args, [array, secondPhoto]);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(2).args, [array, thirdPhoto]);

        assert.strictEqual(array.add(fourthPhoto), array);
        assert.equal(array.length, 4);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 4);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, fourthPhoto]);

        assert.strictEqual(array.add(fifthPhoto), array);
        assert.equal(array.length, 5);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 5);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, fifthPhoto]);
      });

      test("array.add($model) pushing an existing item does nothing", function (assert) {
        sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
        sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

        const { Photo } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
        let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
        assert.equal(array.length, 3);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(0).args, [array, firstPhoto]);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(1).args, [array, secondPhoto]);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(2).args, [array, thirdPhoto]);

        assert.strictEqual(array.add(secondPhoto), array);
        assert.equal(array.length, 3);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

        assert.strictEqual(array.add(firstPhoto), array);
        assert.equal(array.length, 3);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
      });

      test("array.add($model) pushing an existing instance group item replaces it", function (assert) {
        sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
        sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

        const { Photo } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let firstPhotoCopy = Photo.build(firstPhoto);
        let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
        let secondPhotoCopy = Photo.build({ id: 2, name: "Second photo copy" });
        let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
        let array = new HasManyArray([firstPhotoCopy, secondPhotoCopy, thirdPhoto]);

        assert.deepEqual(array, [firstPhotoCopy, secondPhotoCopy, thirdPhoto]);
        assert.equal(array.length, 3);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(0).args, [array, firstPhotoCopy]);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(1).args, [array, secondPhotoCopy]);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(2).args, [array, thirdPhoto]);

        assert.strictEqual(array.add(secondPhoto), array);
        assert.equal(array.length, 3);
        assert.deepEqual(array, [firstPhotoCopy, secondPhoto, thirdPhoto]);
        assert.notDeepEqual(array, [firstPhotoCopy, secondPhotoCopy, thirdPhoto]);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 4);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 1);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, secondPhoto]);
        assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, secondPhotoCopy]);

        assert.strictEqual(array.add(firstPhoto), array);
        assert.equal(array.length, 3);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 5);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 2);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, firstPhoto]);
        assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, firstPhotoCopy]);
      });
    });

    module("array.add(...[values])", function () {
      test("array.add($invalidParams) throws", function (assert) {
        sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
        sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

        const { Photo } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let array = new HasManyArray([firstPhoto]);

        class SomeClass {}

        assert.deepEqual(array, [firstPhoto]);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 1);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, firstPhoto]);

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
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 1);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
      });

      test("array.add($falsyValues) does nothing", function (assert) {
        sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
        sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

        const { Photo } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let array = new HasManyArray([firstPhoto]);

        assert.deepEqual(array, [firstPhoto]);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 1);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, firstPhoto]);

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
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 1);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
      });

      test("array.add($wrongModelInstances) throws", function (assert) {
        sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
        sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

        const { Photo, User, Group } = generateModels();

        let firstPhoto = Photo.build({ name: "First photo" });
        let array = new HasManyArray([firstPhoto]);

        assert.deepEqual(array, [firstPhoto]);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 1);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, firstPhoto]);

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
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 1);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
      });

      test("emptyHasManyArray.add([modelX, modelY, modelZ]) works correctly", function (assert) {
        sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
        sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

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
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 0);

        assert.strictEqual(array.add([firstPhoto, secondPhoto, thirdPhoto]), array);
        assert.equal(array.length, 3);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(0).args, [array, firstPhoto]);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(1).args, [array, secondPhoto]);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(2).args, [array, thirdPhoto]);

        assert.strictEqual(array.add([fifthPhoto, sixthPhoto, fourthPhoto]), array);
        assert.equal(array.length, 6);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fifthPhoto, sixthPhoto, fourthPhoto]);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 6);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(3).args, [array, fifthPhoto]);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(4).args, [array, sixthPhoto]);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(5).args, [array, fourthPhoto]);

        try {
          array.add(User.build({ first_name: "Izel" }));
        } catch (error) {
          assert.ok(error instanceof Error);
          assert.equal(error.message, "This HasManyArray accepts Photo instances, you tried to assign User instance!");
        }

        assert.equal(array.length, 6);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 6);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
      });

      test("array.add([modelX, modelY, modelZ]) works correctly", function (assert) {
        sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
        sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

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
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

        assert.strictEqual(array.add([fourthPhoto, fifthPhoto]), array);
        assert.equal(array.length, 5);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 5);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(3).args, [array, fourthPhoto]);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(4).args, [array, fifthPhoto]);

        assert.strictEqual(array.add([sixthPhoto]), array);
        assert.equal(array.length, 6);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 6);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, sixthPhoto]);
      });

      test("array.add([modelX, modelY, modelZ]) pushing an existing item on it works correctly", function (assert) {
        sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
        sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

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
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

        assert.strictEqual(array.add([fourthPhoto, secondPhoto, fifthPhoto]), array);
        assert.equal(array.length, 5);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 5);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(3).args, [array, fourthPhoto]);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(4).args, [array, fifthPhoto]);

        assert.strictEqual(array.add([firstPhoto, sixthPhoto, firstPhoto, thirdPhoto]), array);
        assert.equal(array.length, 6);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 6);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, sixthPhoto]);
      });

      test("array.add($model) pushing an existing instance group item on it works & replaces it correctly", function (assert) {
        sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
        sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

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
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

        assert.strictEqual(array.add([fourthPhoto, secondPhotoCopy, fifthPhoto]), array);
        assert.equal(array.length, 5);
        assert.deepEqual(array, [firstPhoto, secondPhotoCopy, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 6);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 1);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(3).args, [array, fourthPhoto]);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(4).args, [array, secondPhotoCopy]);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(5).args, [array, fifthPhoto]);
        assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, secondPhoto]);

        assert.strictEqual(array.add([firstPhotoCopy, sixthPhoto, firstPhotoCopy, thirdPhotoCopy]), array);
        assert.equal(array.length, 6);
        assert.deepEqual(array, [firstPhotoCopy, secondPhotoCopy, thirdPhotoCopy, fourthPhoto, fifthPhoto, sixthPhoto]);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 9);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 3);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(6).args, [array, firstPhotoCopy]);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(7).args, [array, sixthPhoto]);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(8).args, [array, thirdPhotoCopy]);
        assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(1).args, [array, firstPhoto]);
        assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(2).args, [array, thirdPhoto]);
      });
    });
  });

  module("replace", function () {
    test("replace(emptyExistingReference, newModel) works correctly", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let newModel = Photo.build({ name: "Third photo" });

      let array = new HasManyArray([firstPhoto, secondPhoto]);

      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 2);
      assert.deepEqual(array.replace([], newModel), [firstPhoto, secondPhoto, newModel]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, newModel]);
      assert.equal(array.length, 3);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, newModel]);
    });

    test("replace(emptyExistingReference, models) works correctly", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });

      let array = new HasManyArray([firstPhoto, secondPhoto]);

      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 2);
      assert.deepEqual(array.replace([], [fourthPhoto, fifthPhoto, thirdPhoto]), [
        firstPhoto,
        secondPhoto,
        fourthPhoto,
        fifthPhoto,
        thirdPhoto,
      ]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, fourthPhoto, fifthPhoto, thirdPhoto]);
      assert.equal(array.length, 5);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 5);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(2).args, [array, fourthPhoto]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(3).args, [array, fifthPhoto]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(4).args, [array, thirdPhoto]);
    });

    test("replace(existingReference, model) works correctly", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 4);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(array.replace(thirdPhoto, fifthPhoto), [firstPhoto, secondPhoto, fifthPhoto, fourthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, fifthPhoto, fourthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 5);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 1);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, fifthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, thirdPhoto]);
    });

    test("replace(existingReference, existingModel) works correctly", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 4);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      assert.deepEqual(array.replace(thirdPhoto, thirdPhoto), [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 4);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      assert.deepEqual(array.replace(secondPhoto, fourthPhoto), [firstPhoto, fourthPhoto, thirdPhoto]);
      assert.deepEqual(array, [firstPhoto, fourthPhoto, thirdPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 4);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 1);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, secondPhoto]);
    });

    test("replace(existingReference, modelWithExistingInstanceGroup) works correctly", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let thirdPhotoCopy = Photo.build({ id: 3, name: "Third photo copy" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 4);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(array.replace(thirdPhoto, thirdPhotoCopy), [
        firstPhoto,
        secondPhoto,
        thirdPhotoCopy,
        fourthPhoto,
      ]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhotoCopy, fourthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 5);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 1);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, thirdPhotoCopy]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, thirdPhoto]);
    });

    test("replace(existingReference, models) works correctly", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let secondPhotoCopy = Photo.build({ id: 2, name: "Second photo copy" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let thirdPhotoCopy = Photo.build({ id: 3, name: "Third photo copy" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 4);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(array.replace(thirdPhoto, [fifthPhoto, thirdPhotoCopy, sixthPhoto, secondPhotoCopy]), [
        firstPhoto,
        secondPhotoCopy,
        fifthPhoto,
        fourthPhoto,
        thirdPhotoCopy,
        sixthPhoto,
      ]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 8);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 2);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(4).args, [array, fifthPhoto]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(5).args, [array, thirdPhotoCopy]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(6).args, [array, sixthPhoto]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(7).args, [array, secondPhotoCopy]);
    });

    test("replace(existingReference, invalidValues) throws", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo, User } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let user = User.build({ id: 1, name: "John" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      try {
        array.replace(thirdPhoto, [fourthPhoto, fifthPhoto, user]);
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(
          error.message,
          "HasManyArray cannot be instantiated or added with model types different than one another!"
        );
      }

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });

    test("replace(existingReference, invalidValue) throws", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo, User } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let user = User.build({ id: 1, name: "John" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      try {
        array.replace(thirdPhoto, user);
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(
          error.message,
          "HasManyArray cannot be instantiated or added with model types different than one another!"
        );
      }

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });

    test("replace(existingReferences, model) works correctly", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 5);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(array.replace([firstPhoto, fourthPhoto, secondPhoto, Photo.build()], sixthPhoto), [
        sixthPhoto,
        thirdPhoto,
        fifthPhoto,
      ]);
      assert.deepEqual(array, [sixthPhoto, thirdPhoto, fifthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 6);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, sixthPhoto]);
    });

    test("replace(existingReferences, existingModel) works correctly", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 5);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(array.replace([firstPhoto, fourthPhoto, secondPhoto], fourthPhoto), [
        fourthPhoto,
        thirdPhoto,
        fifthPhoto,
      ]);
      assert.deepEqual(array, [fourthPhoto, thirdPhoto, fifthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 5);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 2);
    });

    test("replace(existingReferences, modelWithExistingInstanceGroup) works correctly", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fourthPhotoCopy = Photo.build({ id: 4, name: "Fourth photo copy" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 5);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(array.replace([firstPhoto, fourthPhoto, secondPhoto], fourthPhotoCopy), [
        fourthPhotoCopy,
        thirdPhoto,
        fifthPhoto,
      ]);
      assert.deepEqual(array, [fourthPhotoCopy, thirdPhoto, fifthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 6);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 3);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, fourthPhotoCopy]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(0).args, [array, firstPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(1).args, [array, fourthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(2).args, [array, secondPhoto]);
    });

    test("replace(existingReferences, models) works correctly", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

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
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 5);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(
        array.replace([firstPhoto, fourthPhoto, secondPhoto], [sixthPhoto, fourthPhotoCopy, thirdPhoto]),
        [sixthPhoto, fourthPhotoCopy, thirdPhoto, fifthPhoto]
      );
      assert.deepEqual(array, [sixthPhoto, fourthPhotoCopy, thirdPhoto, fifthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 7);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 3);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(5).args, [array, sixthPhoto]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(6).args, [array, fourthPhotoCopy]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(0).args, [array, firstPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(1).args, [array, secondPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(2).args, [array, fourthPhoto]);
    });

    test("replace(existingReferences, invalidValues) throws", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo, User } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let user = User.build({ id: 1, name: "John" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      try {
        array.replace([firstPhoto, secondPhoto, thirdPhoto], [firstPhoto, user, thirdPhoto]);
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(
          error.message,
          "HasManyArray cannot be instantiated or added with model types different than one another!"
        );
      }

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });

    test("replace(existingReferences, invalidValue) throws", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo, User } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let user = User.build({ id: 1, name: "John" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      try {
        array.replace([firstPhoto, secondPhoto, thirdPhoto], user);
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(
          error.message,
          "HasManyArray cannot be instantiated or added with model types different than one another!"
        );
      }

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });
  });

  module("delete", function () {
    test("array.delete($model) works correctly can can clear the items iteratively", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      assert.strictEqual(array.delete(thirdPhoto), true);
      assert.deepEqual(array, [firstPhoto, secondPhoto]);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 1);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, thirdPhoto]);
      assert.strictEqual(array.delete(firstPhoto), true);
      assert.deepEqual(array, [secondPhoto]);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 2);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, firstPhoto]);
      assert.strictEqual(array.delete(secondPhoto), true);
      assert.deepEqual(array, []);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 3);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, secondPhoto]);
      assert.strictEqual(array.delete(firstPhoto), false);
      assert.deepEqual(array, []);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 3);
    });

    test("emptyHasManyArray.delete($anyItem) works correctly", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

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

      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 0);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });

    test("array.delete($notExistingItem) works correctly", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

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
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

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

      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });
  });

  module("clear", function () {
    test("array.clear() works correctly", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 4);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
      assert.strictEqual(array.clear(), array);
      assert.deepEqual(array, []);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 4);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 4);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(0).args, [array, firstPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(1).args, [array, secondPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(2).args, [array, thirdPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(3).args, [array, fourthPhoto]);
    });

    test("emptyArray.clear() works correctly", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      let array = new HasManyArray();

      assert.deepEqual(array, []);
      assert.strictEqual(array.clear(), array);
      assert.deepEqual(array, []);

      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 0);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });
  });

  // add to the end or some index(and beginning)
  // trying to add an already existing item
  // trying to add an item with an existing instance group
  // wrong item type throws
  module("insertAt", function () {
    test("array.insertAt(index, $model) works correctly on different positive index locations", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

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
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 4);

      array.insertAt(2, fifthPhoto);

      assert.deepEqual(array, [firstPhoto, secondPhoto, fifthPhoto, thirdPhoto, fourthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 5);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, fifthPhoto]);

      array.insertAt(0, [sixthPhoto, seventhPhoto]);

      assert.deepEqual(array, [sixthPhoto, seventhPhoto, firstPhoto, secondPhoto, fifthPhoto, thirdPhoto, fourthPhoto]);
      assert.equal(array.length, 7);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 7);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(5).args, [array, sixthPhoto]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(6).args, [array, seventhPhoto]);

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
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 8);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, eighthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });

    test("array.insertAt(index, $model) works correctly on different negative index locations", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

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
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 4);

      array.insertAt(-1, fifthPhoto);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.equal(array.length, 5);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 5);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, fifthPhoto]);

      array.insertAt(-4, sixthPhoto);

      assert.deepEqual(array, [firstPhoto, secondPhoto, sixthPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.equal(array.length, 6);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 6);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, sixthPhoto]);

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
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 8);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(6).args, [array, seventhPhoto]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, eighthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });

    test("array.insertAt(index, $model) throws when index is out of bounds", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });

      Photo.build({ id: 6, name: "Sixth photo copy" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);

      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 4);

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

      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 4);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });

    test("array.insertAt(index, $model) replaces a model index when same instance group already exists", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

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
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 4);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      array.insertAt(4, [secondPhotoCopy, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhotoCopy, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 6);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.callCount, 1);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(4).args, [array, secondPhotoCopy]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(5).args, [array, fifthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, secondPhoto]);

      array.insertAt(0, thirdPhotoCopy);

      assert.deepEqual(array, [thirdPhotoCopy, firstPhoto, secondPhotoCopy, fourthPhoto, fifthPhoto]);
      assert.equal(array.length, 5);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 7);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.callCount, 2);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, thirdPhotoCopy]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, thirdPhoto]);

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
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 10);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.callCount, 3);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(7).args, [array, fourthPhotoCopy]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(8).args, [array, sixthPhoto]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(9).args, [array, seventhPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, fourthPhoto]);
    });
  });

  module("deleteAt", function () {
    test("works correctly for positive indexes and different amounts", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

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
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 7);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      array.deleteAt(6);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
      assert.equal(array.length, 6);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 1);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, seventhPhoto]);

      array.deleteAt(5, 55);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 2);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, sixthPhoto]);

      array.deleteAt(0, 3);

      assert.deepEqual(array, [fourthPhoto, fifthPhoto]);
      assert.equal(array.length, 2);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 5);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(2).args, [array, firstPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(3).args, [array, secondPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(4).args, [array, thirdPhoto]);

      array.deleteAt(1, 2);

      assert.deepEqual(array, [fourthPhoto]);
      assert.equal(array.length, 1);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 7);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 6);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, fifthPhoto]);
    });

    test("works correctly for negative indexes and different amounts", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

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
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 7);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      array.deleteAt(-1);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 7);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 1);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, seventhPhoto]);

      array.deleteAt(-6, 3);

      assert.deepEqual(array, [fourthPhoto, fifthPhoto, sixthPhoto]);
      assert.equal(array.length, 3);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 7);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 4);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(1).args, [array, firstPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(2).args, [array, secondPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(3).args, [array, thirdPhoto]);

      array.deleteAt(-1, 5);

      assert.deepEqual(array, [fourthPhoto, fifthPhoto]);
      assert.equal(array.length, 2);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 7);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 5);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, sixthPhoto]);

      array.deleteAt(-1, 0);

      assert.deepEqual(array, [fourthPhoto, fifthPhoto]);
      assert.equal(array.length, 2);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 7);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 5);
    });

    test("delete($index) throws when index is out of bounds", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      assert.expect(9);

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
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 7);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

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

      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 7);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });
  });

  module("uniqBy", function () {
    test("uniqBy works correctly", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

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
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 7);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(array.uniqBy("name"), [
        firstPhoto,
        secondPhoto,
        thirdPhoto,
        fourthPhoto,
        fifthPhoto,
        sixthPhoto,
        seventhPhoto,
      ]);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(array.uniqBy("owner_id"), [firstPhoto, secondPhoto, thirdPhoto, fifthPhoto, sixthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fifthPhoto, sixthPhoto]);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 2);
      assert.deepEqual(array.uniqBy("is_public"), [firstPhoto, secondPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, fifthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 7);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 4);
    });

    test("fails when called with an array that has the key missing", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo", is_public: true, owner_id: 1 });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo", is_public: false, owner_id: 2 });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo", is_public: true });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      try {
        array.uniqBy("some_id");
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "uniqBy: Key some_id not found in a model inside the array!");
      }

      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });
  });

  module("sortBy", function () {
    test("it works correctly for single sortBy parameters", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

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
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 7);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(array.sortBy("name"), [
        fifthPhoto,
        firstPhoto,
        fourthPhoto,
        secondPhoto,
        seventhPhoto,
        sixthPhoto,
        thirdPhoto,
      ]);
      assert.deepEqual(array, [fifthPhoto, firstPhoto, fourthPhoto, secondPhoto, seventhPhoto, sixthPhoto, thirdPhoto]);
      assert.deepEqual(array.sortBy("name"), [
        fifthPhoto,
        firstPhoto,
        fourthPhoto,
        secondPhoto,
        seventhPhoto,
        sixthPhoto,
        thirdPhoto,
      ]);
      assert.deepEqual(array.sortBy("id"), [
        firstPhoto,
        secondPhoto,
        thirdPhoto,
        fourthPhoto,
        fifthPhoto,
        sixthPhoto,
        seventhPhoto,
      ]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto, seventhPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 7);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });

    test("it works correctly for multiple sortBy parameters", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

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
      assert.deepEqual(array.sortBy("owner_id", "id"), [
        thirdPhoto,
        fourthPhoto,
        firstPhoto,
        secondPhoto,
        sixthPhoto,
        fifthPhoto,
        seventhPhoto,
      ]);
      assert.deepEqual(array, [thirdPhoto, fourthPhoto, firstPhoto, secondPhoto, sixthPhoto, fifthPhoto, seventhPhoto]);
      assert.deepEqual(array.sortBy("owner_id", "name"), [
        fourthPhoto,
        thirdPhoto,
        firstPhoto,
        secondPhoto,
        sixthPhoto,
        fifthPhoto,
        seventhPhoto,
      ]);
      assert.deepEqual(array, [fourthPhoto, thirdPhoto, firstPhoto, secondPhoto, sixthPhoto, fifthPhoto, seventhPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 7);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });

    test("it works correctly for array sortBy parameters", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

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
      assert.deepEqual(array.sortBy(["owner_id", "id"]), [
        thirdPhoto,
        fourthPhoto,
        firstPhoto,
        secondPhoto,
        sixthPhoto,
        fifthPhoto,
        seventhPhoto,
      ]);
      assert.deepEqual(array, [thirdPhoto, fourthPhoto, firstPhoto, secondPhoto, sixthPhoto, fifthPhoto, seventhPhoto]);
      assert.deepEqual(array.sortBy(["owner_id", "name"]), [
        fourthPhoto,
        thirdPhoto,
        firstPhoto,
        secondPhoto,
        sixthPhoto,
        fifthPhoto,
        seventhPhoto,
      ]);
      assert.deepEqual(array, [fourthPhoto, thirdPhoto, firstPhoto, secondPhoto, sixthPhoto, fifthPhoto, seventhPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 7);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });
  });

  module("filterBy", function () {
    test("it works and filters the array for various keys", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

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
      assert.deepEqual(array.filterBy("name", String), [
        firstPhoto,
        secondPhoto,
        thirdPhoto,
        fourthPhoto,
        fifthPhoto,
        sixthPhoto,
        seventhPhoto,
      ]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 7);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(array.filterBy("id", Number), [
        secondPhoto,
        thirdPhoto,
        fourthPhoto,
        fifthPhoto,
        sixthPhoto,
        seventhPhoto,
      ]);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 1);
      assert.deepEqual(array, [secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto, seventhPhoto]);
      assert.deepEqual(array.filterBy("is_public", false), [secondPhoto, fourthPhoto]);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 5);
      assert.deepEqual(array, [secondPhoto, fourthPhoto]);
      assert.deepEqual(array.filterBy("name", "Fourth photo"), [fourthPhoto]);
      assert.deepEqual(array, [fourthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 7);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 6);
    });

    test("it clears the array when it cant find elements for matching value", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

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
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 7);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(array.filterBy("something", true), []);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 7);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 7);
    });
  });
});
