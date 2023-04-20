import { HasManyArray, RelationshipMutation } from "@memoria/model";
import { module, test } from "qunitx";
import sinon from "sinon";
import setupMemoria from "../helpers/setup-memoria.js";
import setupSinon from "../helpers/setup-sinon.js";
import generateModels from "../helpers/relationship-test-models/index.js";

module("@memoria/model | HasManyArray Array.prototype methods", function (hooks) {
  setupMemoria(hooks);
  setupSinon(hooks);

  module("concat", function () {
    test("array.concat(array) works, creates an array for array of models", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let firstPhotoCopy = Photo.build(firstPhoto);
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });

      let array = new HasManyArray([firstPhoto, secondPhoto]);

      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 2);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      let inputArray = [firstPhotoCopy, thirdPhoto];
      let result = array.concat(inputArray);

      assert.deepEqual(array, [firstPhoto, secondPhoto]);
      assert.deepEqual(inputArray, [firstPhotoCopy, thirdPhoto]);
      assert.notOk(inputArray instanceof HasManyArray);
      assert.deepEqual(result, [firstPhotoCopy, secondPhoto, thirdPhoto]);
      assert.notOk(result instanceof HasManyArray);

      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 2);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });

    test("array.concat(array) works, creates an array for hasManyArray of models", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let firstPhotoCopy = Photo.build(firstPhoto);
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let thirdPhotoCopy = Photo.build(thirdPhoto);
      let array = new HasManyArray([firstPhoto, thirdPhotoCopy]);
      let inputArray = new HasManyArray([secondPhoto, thirdPhoto]);

      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 4);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      let result = array.concat(inputArray);

      assert.deepEqual(array, [firstPhoto, thirdPhotoCopy]);
      assert.deepEqual(inputArray, [secondPhoto, thirdPhoto]);
      assert.ok(inputArray instanceof HasManyArray);
      assert.deepEqual(result, [firstPhotoCopy, thirdPhoto, secondPhoto]);
      assert.notOk(result instanceof HasManyArray);

      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 4);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });

    test("array.concat(invalidParams) throws when array has invalid parameteres", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto]);

      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 2);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      class SomeClass {}

      try {
        let result = array.concat([thirdPhoto, new SomeClass()]);
      } catch (error) {
        assert.deepEqual(array, [firstPhoto, secondPhoto]);
        assert.ok(error instanceof Error);
        assert.equal(error.message, "HasManyArray cannot have non memoria Model instance inside!");
      }

      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 2);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });
  });

  module("fill", function () {
    test("array.fill(null) resets the array", function (assert) {
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

      let result = array.fill(null);

      assert.deepEqual(array, []);
      assert.strictEqual(result, array);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 5);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 5);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(0).args, [array, firstPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(1).args, [array, secondPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(2).args, [array, thirdPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(3).args, [array, fourthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(4).args, [array, fifthPhoto]);
    });

    test("array.fill(Model) resets the array and sets the array with one element", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let thirdPhotoCopy = Photo.build(thirdPhoto);
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 4);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      let result = array.fill(fifthPhoto);

      assert.deepEqual(array, [fifthPhoto]);
      assert.strictEqual(result, array);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 5);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 4);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, fifthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(0).args, [array, firstPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(1).args, [array, secondPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(2).args, [array, thirdPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(3).args, [array, fourthPhoto]);

      let newArray = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

      assert.deepEqual(newArray, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 8);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 4);

      let newResult = newArray.fill(secondPhoto);

      assert.deepEqual(newArray, [secondPhoto]);
      assert.strictEqual(newResult, newArray);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 9);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 7);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [newResult, secondPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(4).args, [newResult, firstPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(5).args, [newResult, secondPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(6).args, [newResult, thirdPhoto]);

      let lastArray = new HasManyArray([firstPhoto, secondPhoto, thirdPhotoCopy]);

      assert.deepEqual(lastArray, [firstPhoto, secondPhoto, thirdPhotoCopy]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 12);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 7);

      let lastResult = lastArray.fill(thirdPhoto);

      assert.deepEqual(lastArray, [thirdPhoto]);
      assert.strictEqual(lastResult, lastArray);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 13);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 10);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [lastArray, thirdPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(7).args, [lastArray, firstPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(8).args, [lastArray, secondPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(9).args, [lastArray, thirdPhotoCopy]);
    });

    test("array.fill(null, index) resets the array from set index", function (assert) {
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

      let result = array.fill(null, 2);

      assert.deepEqual(array, [firstPhoto, secondPhoto]);
      assert.strictEqual(array, result);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 5);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 3);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(0).args, [array, thirdPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(1).args, [array, fourthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(2).args, [array, fifthPhoto]);
    });

    test("array.fill(Model, index) resets the array at set index and adds Model at set index if it isnt exist", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, fourthPhoto, fifthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 4);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      let result = array.fill(thirdPhoto, 2);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.strictEqual(array, result);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 5);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 2);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, thirdPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(0).args, [array, fourthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(1).args, [array, fifthPhoto]);
    });

    test("array.fill(Model, index) resets the array at set index and replaces the Model from its instance group in another index", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let thirdPhotoCopy = Photo.build(thirdPhoto);
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 5);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      let result = array.fill(thirdPhotoCopy, 3);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhotoCopy]);
      assert.strictEqual(array, result);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 6);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 3);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, thirdPhotoCopy]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(0).args, [array, fourthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(1).args, [array, fifthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(2).args, [array, thirdPhoto]);

      let anotherArray = new HasManyArray([firstPhoto, secondPhoto, thirdPhotoCopy, fourthPhoto, fifthPhoto]);

      assert.deepEqual(anotherArray, [firstPhoto, secondPhoto, thirdPhotoCopy, fourthPhoto, fifthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 11);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 3);

      let lastResult = anotherArray.fill(thirdPhoto, 3);

      assert.deepEqual(anotherArray, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.strictEqual(anotherArray, lastResult);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 12);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 6);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [anotherArray, thirdPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(3).args, [anotherArray, fourthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(4).args, [anotherArray, fifthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(5).args, [
        anotherArray,
        thirdPhotoCopy,
      ]);
    });

    test("array.fill(null, index, end) resets the array from set index until the end index", function (assert) {
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

      let result = array.fill(null, 2, 3);

      assert.deepEqual(array, [firstPhoto, secondPhoto, fifthPhoto]);
      assert.strictEqual(array, result);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 5);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 2);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(0).args, [array, thirdPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(1).args, [array, fourthPhoto]);
    });

    test("array.fill(Model, index, end) resets the array at set index and the end index adds Model do set index if it isnt exist", function (assert) {
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

      let result = array.fill(fifthPhoto, 1, 2);

      assert.deepEqual(array, [firstPhoto, fifthPhoto, fourthPhoto]);
      assert.strictEqual(array, result);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 5);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 2);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, fifthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(0).args, [array, secondPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(1).args, [array, thirdPhoto]);
    });

    test("array.fill(Model, index, end) resets the array at set index and end index and replaces the Model from its instance group in another index", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

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
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 6);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      let result = array.fill(fifthPhoto, 1, 2);

      assert.deepEqual(array, [firstPhoto, fifthPhoto, fourthPhoto, sixthPhoto]);
      assert.strictEqual(array, result);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 7);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 3);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, fifthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(0).args, [array, secondPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(1).args, [array, thirdPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(2).args, [array, fifthPhotoCopy]);
    });
  });

  module("slice", function () {
    test("array.slice(-3, -1) creates a new array from array with last 2nd and last 3rd item, array.slice(-3, -2) creates a new array with only third last item", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

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
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 6);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      let result = array.slice(-3, -1);

      assert.notOk(result instanceof HasManyArray);
      assert.ok(result instanceof Array);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
      assert.deepEqual(result, [fourthPhoto, fifthPhoto]);
      assert.notStrictEqual(array, result);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 6);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      let secondResult = array.slice(-3, -2);

      assert.notOk(result instanceof HasManyArray);
      assert.ok(result instanceof Array);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
      assert.deepEqual(secondResult, [fourthPhoto]);
      assert.notStrictEqual(array, result);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 6);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });
  });

  module("pop", function () {
    test("array.pop() works correctly can can clear the item iteratively", function (assert) {
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
      assert.strictEqual(array.pop(), thirdPhoto);
      assert.deepEqual(array, [firstPhoto, secondPhoto]);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 1);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, thirdPhoto]);
      assert.strictEqual(array.pop(), secondPhoto);
      assert.deepEqual(array, [firstPhoto]);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 2);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, secondPhoto]);
      assert.strictEqual(array.pop(), firstPhoto);
      assert.deepEqual(array, []);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 3);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, firstPhoto]);
      assert.strictEqual(array.pop(), undefined);
      assert.deepEqual(array, []);
      assert.strictEqual(array.pop(), undefined);
      assert.deepEqual(array, []);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 3);
    });

    test("emptyHasManyArray.pop() should return undefined", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      let array = new HasManyArray();

      assert.deepEqual(array, []);
      assert.strictEqual(array.pop(), undefined);
      assert.deepEqual(array, []);
      assert.strictEqual(array.pop(), undefined);
      assert.deepEqual(array, []);

      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 0);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });
  });

  module("push", function () {
    test("array.push($invalidParam) throws", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let array = new HasManyArray([firstPhoto]);

      class SomeClass {}

      assert.deepEqual(array, [firstPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 1);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      [true, 1, "a", 100, {}, SomeClass, new SomeClass()].forEach((value) => {
        try {
          array.push(value);
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
    });

    test("array.push($falsyValue) does nothing", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let array = new HasManyArray([firstPhoto]);

      assert.deepEqual(array, [firstPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 1);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      [undefined, false, 0].forEach((value) => {
        try {
          array.push(value);
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
    });

    test("array.push($wrongModelInstance) throws", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo, User } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let array = new HasManyArray([firstPhoto]);

      assert.deepEqual(array, [firstPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 1);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      try {
        array.push(User.build({ first_name: "Izel" }));
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "This HasManyArray accepts Photo instances, you tried to assign User instance!");
      }

      assert.deepEqual(array, [firstPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 1);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });

    test("emptyHasManyArray.push(x) works correctly", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo, User } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let array = new HasManyArray();

      assert.deepEqual(array, []);
      assert.equal(array.length, 0);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 0);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      let result = array.push(firstPhoto);

      assert.equal(result, 1);
      assert.equal(array.length, 1);
      assert.deepEqual(array, [firstPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 1);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, firstPhoto]);

      let resultTwo = array.push(secondPhoto);

      assert.equal(resultTwo, 2);
      assert.equal(array.length, 2);
      assert.deepEqual(array, [firstPhoto, secondPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 2);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, secondPhoto]);

      try {
        array.push(User.build({ first_name: "Izel" }));
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "This HasManyArray accepts Photo instances, you tried to assign User instance!");
      }

      assert.equal(array.length, 2);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 2);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });

    test("array.push($model) works correctly", function (assert) {
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

      let result = array.push(fourthPhoto);

      assert.equal(result, 4);
      assert.equal(array.length, 4);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 4);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, fourthPhoto]);

      let resultTwo = array.push(fifthPhoto);

      assert.equal(resultTwo, 5);
      assert.equal(array.length, 5);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 5);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, fifthPhoto]);
    });

    test("array.push($model) pushing an existing item does nothing", function (assert) {
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

      let result = array.push(secondPhoto);

      assert.equal(result, 3);
      assert.equal(array.length, 3);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      let resultTwo = array.push(firstPhoto);

      assert.equal(resultTwo, 3);
      assert.equal(array.length, 3);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });

    test("array.push($model) pushing an existing instance group item replaces it", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let firstPhotoCopy = Photo.build(firstPhoto);
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let secondPhotoCopy = Photo.build({ id: 2, name: "Second photo copy" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let array = new HasManyArray([firstPhoto, secondPhotoCopy, thirdPhoto]);

      assert.deepEqual(array, [firstPhotoCopy, secondPhotoCopy, thirdPhoto]);
      assert.equal(array.length, 3);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      let result = array.push(secondPhoto);

      assert.equal(result, 3);
      assert.equal(array.length, 3);
      assert.deepEqual(array, [firstPhotoCopy, secondPhoto, thirdPhoto]);
      assert.notDeepEqual(array, [firstPhotoCopy, secondPhotoCopy, thirdPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 4);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 1);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, secondPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, secondPhotoCopy]);

      let resultTwo = array.push(firstPhotoCopy);

      assert.equal(resultTwo, 3);
      assert.equal(array.length, 3);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 5);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 2);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, firstPhotoCopy]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, firstPhoto]);
    });
  });

  module("shift", function () {
    test("array.shift() works correctly can can clear the item iteratively", function (assert) {
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

      assert.strictEqual(array.shift(), firstPhoto);
      assert.deepEqual(array, [secondPhoto, thirdPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 1);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, firstPhoto]);
      assert.strictEqual(array.shift(), secondPhoto);
      assert.deepEqual(array, [thirdPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 2);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, secondPhoto]);
      assert.strictEqual(array.shift(), thirdPhoto);
      assert.deepEqual(array, []);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 3);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, thirdPhoto]);
      assert.strictEqual(array.shift(), undefined);
      assert.deepEqual(array, []);
      assert.strictEqual(array.shift(), undefined);
      assert.deepEqual(array, []);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 3);
    });

    test("emptyHasManyArray.shift() should return undefined", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let array = new HasManyArray();

      assert.deepEqual(array, []);
      assert.strictEqual(array.shift(), undefined);
      assert.deepEqual(array, []);
      assert.strictEqual(array.shift(), undefined);
      assert.deepEqual(array, []);

      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 0);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });
  });

  module("splice", function () {
    test("emptyHasManyArray.splice(x) works correctly for possible x integer values", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      let array = new HasManyArray();

      assert.deepEqual(array, []);
      assert.deepEqual(array.splice(), []);
      assert.deepEqual(array, []);
      [-2, 0, 2].forEach((value) => {
        assert.deepEqual(array.splice(value), []);
        assert.deepEqual(array, []);
      });
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 0);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });

    test("emptyHasManyArray.splice(x, y) works correctly for possible x and y integer values", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      let array = new HasManyArray();

      [-2, 0, 2].forEach((value) => {
        assert.deepEqual(array.splice(-2, value), []);
        assert.deepEqual(array.splice(0, value), []);
        assert.deepEqual(array.splice(2, value), []);
        assert.deepEqual(array, []);
      });

      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 0);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });

    test("emptyHasManyArray.splice(x, y, z) works correctly for possible x and y and z integer values", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });

      let addHasManyRelationshipTargetCount = 0;
      [-2, 0, 2].forEach((value) => {
        [-2, 0, 2].forEach((secondParam) => {
          let array = new HasManyArray();

          let result = array.splice(value, value, firstPhoto);

          assert.deepEqual(result, []);
          assert.notOk(result instanceof HasManyArray);
          assert.deepEqual(array, [firstPhoto]);
          addHasManyRelationshipTargetCount += 1;
          assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
          assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
          assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, firstPhoto]);
        });
      });
    });

    test("emptyHasManyArray.splice(x, y, z, a, b) works correctly for possible x and y and z integer values and adds z, a & b", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });

      let addHasManyRelationshipTargetCount = 0;
      [-2, 0, 2].forEach((value) => {
        [-2, 0, 2].forEach((secondParam) => {
          let array = new HasManyArray();
          let result = array.splice(value, value, firstPhoto, null, secondPhoto, thirdPhoto);

          assert.deepEqual(result, []);
          assert.notOk(result instanceof HasManyArray);
          assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
          addHasManyRelationshipTargetCount += 3;
          assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
          assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

          assert.deepEqual(
            RelationshipMutation.addHasManyRelationshipFor
              .getCalls()
              .slice(-3)
              .map((call) => call.args),
            [
              [array, firstPhoto],
              [array, secondPhoto],
              [array, thirdPhoto],
            ]
          );
        });
      });
    });

    test("array.splice(x) works correctly for possible x integer values", function (assert) {
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

      assert.deepEqual(array.splice(), []);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 5);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      assert.deepEqual(array.splice(0), [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, []);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 5);
      // x
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 5);

      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(0).args, [array, firstPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(1).args, [array, secondPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(2).args, [array, thirdPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(3).args, [array, fourthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(4).args, [array, fifthPhoto]);

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 10);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 5);

      assert.deepEqual(array.splice(-2), [fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 10);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 7);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(5).args, [array, fourthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(6).args, [array, fifthPhoto]);

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 15);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 7);

      assert.deepEqual(array.splice(2), [thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 15);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 10);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(7).args, [array, thirdPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(8).args, [array, fourthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(9).args, [array, fifthPhoto]);
    });

    test("array.splice(x, y) works correctly for possible x and y integer values", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo" });

      let addHasManyRelationshipTargetCount = 0;
      [-2, 0, 2].forEach((param) => {
        [-2, 0].forEach((secondParam) => {
          addHasManyRelationshipTargetCount += 6;
          let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
          assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
          assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
          assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

          assert.deepEqual(array.splice(param, secondParam), []);
          assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
          assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
          assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
        });
      });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 42);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      assert.deepEqual(array.splice(-2, 2), [fifthPhoto, sixthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 42);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 2);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(0).args, [array, fifthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(1).args, [array, sixthPhoto]);

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 48);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 2);

      assert.deepEqual(array.splice(0, 2), [firstPhoto, secondPhoto]);
      assert.deepEqual(array, [thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 48);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 4);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(2).args, [array, firstPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(3).args, [array, secondPhoto]);

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 54);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 4);

      assert.deepEqual(array.splice(2, 2), [thirdPhoto, fourthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, fifthPhoto, sixthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 54);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 6);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(4).args, [array, thirdPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(5).args, [array, fourthPhoto]);
    });

    test("array.splice(x, y, newModel) works correctly for possible x and y and z integer values", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo" });

      let addHasManyRelationshipTargetCount = 0;
      [-2, 0].forEach((deleteCount) => {
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

        addHasManyRelationshipTargetCount += 5;

        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

        assert.deepEqual(array.splice(-2, deleteCount, sixthPhoto), []);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, sixthPhoto, fourthPhoto, fifthPhoto]);

        addHasManyRelationshipTargetCount += 1;

        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, sixthPhoto]);
      });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      addHasManyRelationshipTargetCount += 5;
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      assert.deepEqual(array.splice(-2, 2, sixthPhoto), [fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, sixthPhoto]);

      addHasManyRelationshipTargetCount += 1;

      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 2);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, sixthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(0).args, [array, fourthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(1).args, [array, fifthPhoto]);

      [-2, 0].forEach((deleteCount) => {
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

        addHasManyRelationshipTargetCount += 5;
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 2);

        assert.deepEqual(array.splice(0, deleteCount, sixthPhoto), []);
        assert.deepEqual(array, [sixthPhoto, firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

        addHasManyRelationshipTargetCount += 1;

        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 2);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, sixthPhoto]);
      });

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      addHasManyRelationshipTargetCount += 5;
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 2);

      assert.deepEqual(array.splice(0, 2, sixthPhoto), [firstPhoto, secondPhoto]);
      assert.deepEqual(array, [sixthPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      addHasManyRelationshipTargetCount += 1;

      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 4);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, sixthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(2).args, [array, firstPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(3).args, [array, secondPhoto]);

      [-2, 0].forEach((deleteCount) => {
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

        addHasManyRelationshipTargetCount += 5;
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 4);

        assert.deepEqual(array.splice(2, deleteCount, sixthPhoto), []);
        assert.deepEqual(array, [firstPhoto, secondPhoto, sixthPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

        addHasManyRelationshipTargetCount += 1;

        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 4);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, sixthPhoto]);
      });

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      addHasManyRelationshipTargetCount += 5;
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 4);

      assert.deepEqual(array.splice(2, 2, sixthPhoto), [thirdPhoto, fourthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, sixthPhoto, fifthPhoto]);

      addHasManyRelationshipTargetCount += 1;

      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 6);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, sixthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(4).args, [array, thirdPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(5).args, [array, fourthPhoto]);
    });

    test("array.splice(x, y, existingModel) works correctly for possible x and y and z integer values", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });

      let addHasManyRelationshipTargetCount = 0;
      [-2, 0].forEach((deleteCount) => {
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

        addHasManyRelationshipTargetCount += 5;
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

        assert.deepEqual(array.splice(-2, deleteCount, thirdPhoto), []);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
      });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      addHasManyRelationshipTargetCount += 5;
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      assert.deepEqual(array.splice(-2, 2, thirdPhoto), [fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 2);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(0).args, [array, fourthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(1).args, [array, fifthPhoto]);

      [-2, 0].forEach((deleteCount) => {
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

        addHasManyRelationshipTargetCount += 5;
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 2);

        assert.deepEqual(array.splice(0, deleteCount, thirdPhoto), []);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 2);
      });

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      addHasManyRelationshipTargetCount += 5;
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 2);

      assert.deepEqual(array.splice(0, 2, thirdPhoto), [firstPhoto, secondPhoto]);
      assert.deepEqual(array, [thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 4);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(2).args, [array, firstPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(3).args, [array, secondPhoto]);

      [-2, 0].forEach((deleteCount) => {
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

        addHasManyRelationshipTargetCount += 5;
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 4);

        assert.deepEqual(array.splice(2, deleteCount, thirdPhoto), []);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 4);
      });

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      addHasManyRelationshipTargetCount += 5;
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 4);

      assert.deepEqual(array.splice(2, 2, thirdPhoto), [thirdPhoto, fourthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fifthPhoto]);

      addHasManyRelationshipTargetCount += 1;
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 6);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, thirdPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(4).args, [array, thirdPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(5).args, [array, fourthPhoto]);
    });

    test("array.splice(x, y, existingInstanceGroupAnotherModel) works correctly for possible x and y and z integer values", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let thirdPhotoCopy = Photo.build({ id: 3, name: "Third photo copy" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });

      let addHasManyRelationshipTargetCount = 0;
      let removeHasManyRelationshipTargetCount = 0;
      [-2, 0].forEach((deleteCount) => {
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

        addHasManyRelationshipTargetCount += 5;
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, removeHasManyRelationshipTargetCount);

        assert.deepEqual(array.splice(-2, deleteCount, thirdPhotoCopy), []);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhotoCopy, fourthPhoto, fifthPhoto]);

        addHasManyRelationshipTargetCount += 1;
        removeHasManyRelationshipTargetCount += 1;
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, removeHasManyRelationshipTargetCount);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, thirdPhotoCopy]);
        assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, thirdPhoto]);
      });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      addHasManyRelationshipTargetCount += 5;
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, removeHasManyRelationshipTargetCount);

      assert.deepEqual(array.splice(-2, 2, thirdPhotoCopy), [fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhotoCopy]);

      addHasManyRelationshipTargetCount += 1;
      removeHasManyRelationshipTargetCount += 3;
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, removeHasManyRelationshipTargetCount);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, thirdPhotoCopy]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(2).args, [array, fourthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(3).args, [array, fifthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(4).args, [array, thirdPhoto]);

      [-2, 0].forEach((deleteCount) => {
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

        addHasManyRelationshipTargetCount += 5;
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, removeHasManyRelationshipTargetCount);

        assert.deepEqual(array.splice(0, deleteCount, thirdPhotoCopy), []);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhotoCopy, fourthPhoto, fifthPhoto]);

        addHasManyRelationshipTargetCount += 1;
        removeHasManyRelationshipTargetCount += 1;
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, removeHasManyRelationshipTargetCount);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, thirdPhotoCopy]);
        assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, thirdPhoto]);
      });

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      addHasManyRelationshipTargetCount += 5;
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, removeHasManyRelationshipTargetCount);

      assert.deepEqual(array.splice(0, 2, thirdPhotoCopy), [firstPhoto, secondPhoto]);
      assert.deepEqual(array, [thirdPhotoCopy, fourthPhoto, fifthPhoto]);

      addHasManyRelationshipTargetCount += 1;
      removeHasManyRelationshipTargetCount += 3;
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, thirdPhotoCopy]);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, removeHasManyRelationshipTargetCount);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(7).args, [array, firstPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(8).args, [array, secondPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(9).args, [array, thirdPhoto]);

      [-2, 0].forEach((deleteCount) => {
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

        addHasManyRelationshipTargetCount += 5;
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, removeHasManyRelationshipTargetCount);

        assert.deepEqual(array.splice(2, deleteCount, thirdPhotoCopy), []);
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhotoCopy, fourthPhoto, fifthPhoto]);

        addHasManyRelationshipTargetCount += 1;
        removeHasManyRelationshipTargetCount += 1;
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, removeHasManyRelationshipTargetCount);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, thirdPhotoCopy]);
        assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, thirdPhoto]);
      });

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      addHasManyRelationshipTargetCount += 5;
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, removeHasManyRelationshipTargetCount);

      assert.deepEqual(array.splice(2, 2, thirdPhotoCopy), [thirdPhoto, fourthPhoto]);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhotoCopy, fifthPhoto]);

      addHasManyRelationshipTargetCount += 1;
      removeHasManyRelationshipTargetCount += 2;
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, removeHasManyRelationshipTargetCount);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, thirdPhotoCopy]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(12).args, [array, thirdPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(13).args, [array, fourthPhoto]);
    });

    test("array.splice(x, y, z, a, b) works correctly for possible x and y and z integer values and adds z, a & b", function (assert) {
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
      let anotherPhoto = Photo.build({ id: 7, name: "Another photo" });

      let addHasManyRelationshipTargetCount = 0;
      let removeHasManyRelationshipTargetCount = 0;
      [-2, 0].forEach((deleteCount) => {
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

        addHasManyRelationshipTargetCount += 5;
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, removeHasManyRelationshipTargetCount);

        assert.deepEqual(
          array.splice(-2, deleteCount, null, sixthPhoto, anotherPhoto, thirdPhotoCopy, null, secondPhotoCopy),
          []
        );
        assert.deepEqual(array, [
          firstPhoto,
          secondPhotoCopy,
          thirdPhotoCopy,
          sixthPhoto,
          anotherPhoto,
          fourthPhoto,
          fifthPhoto,
        ]);

        addHasManyRelationshipTargetCount += 4;
        removeHasManyRelationshipTargetCount += 2;
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, removeHasManyRelationshipTargetCount);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(5).args, [array, sixthPhoto]);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(6).args, [array, anotherPhoto]);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(7).args, [array, thirdPhotoCopy]);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(8).args, [array, secondPhotoCopy]);
        assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(0).args, [array, thirdPhoto]);
        assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(1).args, [array, secondPhoto]);
      });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      addHasManyRelationshipTargetCount += 5;
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, removeHasManyRelationshipTargetCount);

      assert.deepEqual(array.splice(-2, 2, null, sixthPhoto, anotherPhoto, thirdPhotoCopy, null, secondPhotoCopy), [
        fourthPhoto,
        fifthPhoto,
      ]);
      assert.deepEqual(array, [firstPhoto, secondPhotoCopy, thirdPhotoCopy, sixthPhoto, anotherPhoto]);

      addHasManyRelationshipTargetCount += 4;
      removeHasManyRelationshipTargetCount += 4;

      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, removeHasManyRelationshipTargetCount);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(23).args, [array, sixthPhoto]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(24).args, [array, anotherPhoto]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(25).args, [array, thirdPhotoCopy]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(26).args, [array, secondPhotoCopy]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(4).args, [array, fourthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(5).args, [array, fifthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(6).args, [array, thirdPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(7).args, [array, secondPhoto]);

      [-2, 0].forEach((deleteCount) => {
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

        addHasManyRelationshipTargetCount += 5;
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, removeHasManyRelationshipTargetCount);

        assert.deepEqual(
          array.splice(0, deleteCount, null, sixthPhoto, anotherPhoto, thirdPhotoCopy, null, secondPhotoCopy),
          []
        );
        assert.deepEqual(array, [
          sixthPhoto,
          anotherPhoto,
          firstPhoto,
          secondPhotoCopy,
          thirdPhotoCopy,
          fourthPhoto,
          fifthPhoto,
        ]);

        addHasManyRelationshipTargetCount += 4;
        removeHasManyRelationshipTargetCount += 2;

        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, removeHasManyRelationshipTargetCount);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(32).args, [array, sixthPhoto]);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(33).args, [array, anotherPhoto]);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(34).args, [array, thirdPhotoCopy]);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(35).args, [array, secondPhotoCopy]);
        assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(8).args, [array, thirdPhoto]);
        assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(9).args, [array, secondPhoto]);
      });

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      addHasManyRelationshipTargetCount += 5;
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, removeHasManyRelationshipTargetCount);

      assert.deepEqual(array.splice(0, 2, null, sixthPhoto, anotherPhoto, thirdPhotoCopy, null, secondPhotoCopy), [
        firstPhoto,
        secondPhoto,
      ]);
      assert.deepEqual(array, [sixthPhoto, anotherPhoto, secondPhotoCopy, thirdPhotoCopy, fourthPhoto, fifthPhoto]);

      addHasManyRelationshipTargetCount += 4;
      removeHasManyRelationshipTargetCount += 3;

      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, removeHasManyRelationshipTargetCount);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(50).args, [array, sixthPhoto]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(51).args, [array, anotherPhoto]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(52).args, [array, thirdPhotoCopy]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(53).args, [array, secondPhotoCopy]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(12).args, [array, firstPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(13).args, [array, secondPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(14).args, [array, thirdPhoto]);

      [-2, 0].forEach((deleteCount) => {
        let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

        addHasManyRelationshipTargetCount += 5;
        assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
        assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, removeHasManyRelationshipTargetCount);

        assert.deepEqual(
          array.splice(2, deleteCount, null, sixthPhoto, anotherPhoto, thirdPhotoCopy, null, secondPhotoCopy),
          []
        );
        assert.deepEqual(array, [
          firstPhoto,
          secondPhotoCopy,
          sixthPhoto,
          anotherPhoto,
          thirdPhotoCopy,
          fourthPhoto,
          fifthPhoto,
        ]);

        addHasManyRelationshipTargetCount += 4;
        removeHasManyRelationshipTargetCount += 2;
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(59).args, [array, sixthPhoto]);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(60).args, [array, anotherPhoto]);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(61).args, [array, thirdPhotoCopy]);
        assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(62).args, [array, secondPhotoCopy]);
        assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(15).args, [array, thirdPhoto]);
        assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(16).args, [array, secondPhoto]);
      });

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      addHasManyRelationshipTargetCount += 5;
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, removeHasManyRelationshipTargetCount);

      assert.deepEqual(array.splice(2, 2, null, sixthPhoto, anotherPhoto, thirdPhotoCopy, null, secondPhotoCopy), [
        thirdPhoto,
        fourthPhoto,
      ]);
      assert.deepEqual(array, [firstPhoto, secondPhotoCopy, sixthPhoto, anotherPhoto, thirdPhotoCopy, fifthPhoto]);

      addHasManyRelationshipTargetCount += 4;
      removeHasManyRelationshipTargetCount += 3;
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, addHasManyRelationshipTargetCount);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, removeHasManyRelationshipTargetCount);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(77).args, [array, sixthPhoto]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(78).args, [array, anotherPhoto]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(79).args, [array, thirdPhotoCopy]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(80).args, [array, secondPhotoCopy]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(19).args, [array, thirdPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(20).args, [array, fourthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(21).args, [array, secondPhoto]);
    });

    test("array.splice(x, y, z, a, b) works correctly for possible out of bound x and y ->(99, -99) and z integer values and adds z, a & b", function (assert) {
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
      let anotherPhoto = Photo.build({ id: 7, name: "Another photo" });

      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 5);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      assert.deepEqual(array.splice(-99, 2, null, sixthPhoto, anotherPhoto, thirdPhotoCopy, null, secondPhotoCopy), [
        firstPhoto,
        secondPhoto,
      ]);
      assert.deepEqual(array, [sixthPhoto, anotherPhoto, secondPhotoCopy, thirdPhotoCopy, fourthPhoto, fifthPhoto]);

      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 9);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 3);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(5).args, [array, sixthPhoto]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(6).args, [array, anotherPhoto]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(7).args, [array, thirdPhotoCopy]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(8).args, [array, secondPhotoCopy]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(0).args, [array, firstPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(1).args, [array, secondPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(2).args, [array, thirdPhoto]);

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 14);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 3);

      assert.deepEqual(array.splice(2, -99, null, sixthPhoto, anotherPhoto, thirdPhotoCopy, null, secondPhotoCopy), []);
      assert.deepEqual(array, [
        firstPhoto,
        secondPhotoCopy,
        sixthPhoto,
        anotherPhoto,
        thirdPhotoCopy,
        fourthPhoto,
        fifthPhoto,
      ]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 18);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 5);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(14).args, [array, sixthPhoto]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(15).args, [array, anotherPhoto]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(16).args, [array, thirdPhotoCopy]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(17).args, [array, secondPhotoCopy]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(3).args, [array, thirdPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(4).args, [array, secondPhoto]);

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 23);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 5);

      assert.deepEqual(array.splice(-2, 99, null, sixthPhoto, anotherPhoto, thirdPhotoCopy, null, secondPhotoCopy), [
        fourthPhoto,
        fifthPhoto,
      ]);

      assert.deepEqual(array, [firstPhoto, secondPhotoCopy, thirdPhotoCopy, sixthPhoto, anotherPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 27);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 9);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(23).args, [array, sixthPhoto]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(24).args, [array, anotherPhoto]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(25).args, [array, thirdPhotoCopy]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(26).args, [array, secondPhotoCopy]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(5).args, [array, fourthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(6).args, [array, fifthPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(7).args, [array, thirdPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(8).args, [array, secondPhoto]);

      array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 32);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 9);

      assert.deepEqual(array.splice(99, -2, null, sixthPhoto, anotherPhoto, thirdPhotoCopy, null, secondPhotoCopy), []);
      assert.deepEqual(array, [
        firstPhoto,
        secondPhotoCopy,
        thirdPhotoCopy,
        fourthPhoto,
        fifthPhoto,
        sixthPhoto,
        anotherPhoto,
      ]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 36);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 11);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(32).args, [array, sixthPhoto]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(33).args, [array, anotherPhoto]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(34).args, [array, thirdPhotoCopy]);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.getCall(35).args, [array, secondPhotoCopy]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(9).args, [array, thirdPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.getCall(10).args, [array, secondPhoto]);
    });
  });

  module("unshift", function () {
    test("array.unshift($invalidParam) throws", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let array = new HasManyArray([firstPhoto]);

      class SomeClass {}

      assert.deepEqual(array, [firstPhoto]);

      [true, 1, "a", 100, {}, SomeClass, new SomeClass()].forEach((value) => {
        try {
          array.unshift(value);
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
    });

    test("array.unshift($falsyValue) does nothing", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let array = new HasManyArray([firstPhoto]);

      assert.deepEqual(array, [firstPhoto]);

      [undefined, false, 0].forEach((value) => {
        try {
          array.unshift(value);
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
    });

    test("array.unshift($wrongModelInstance) throws", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo, User } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let array = new HasManyArray([firstPhoto]);

      assert.deepEqual(array, [firstPhoto]);

      try {
        array.unshift(User.build({ first_name: "Izel" }));
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "This HasManyArray accepts Photo instances, you tried to assign User instance!");
      }

      assert.deepEqual(array, [firstPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 1);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });

    test("emptyHasManyArray.unshift(x) works correctly", function (assert) {
      sinon.spy(RelationshipMutation, "addHasManyRelationshipFor");
      sinon.spy(RelationshipMutation, "removeHasManyRelationshipFor");

      const { Photo, User } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let array = new HasManyArray();

      assert.deepEqual(array, []);
      assert.equal(array.length, 0);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 0);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);

      let result = array.unshift(firstPhoto);

      assert.equal(result, 1);
      assert.equal(array.length, 1);
      assert.deepEqual(array, [firstPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 1);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, firstPhoto]);

      let resultTwo = array.unshift(secondPhoto);

      assert.equal(resultTwo, 2);
      assert.equal(array.length, 2);
      assert.deepEqual(array, [secondPhoto, firstPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 2);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, secondPhoto]);

      try {
        array.unshift(User.build({ first_name: "Izel" }));
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "This HasManyArray accepts Photo instances, you tried to assign User instance!");
      }

      assert.equal(array.length, 2);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 2);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });

    test("array.unshift($model) works correctly", function (assert) {
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

      let result = array.unshift(fourthPhoto);

      assert.equal(result, 4);
      assert.equal(array.length, 4);
      assert.deepEqual(array, [fourthPhoto, firstPhoto, secondPhoto, thirdPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 4);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, fourthPhoto]);

      let resultTwo = array.unshift(fifthPhoto);

      assert.equal(resultTwo, 5);
      assert.equal(array.length, 5);
      assert.deepEqual(array, [fifthPhoto, fourthPhoto, firstPhoto, secondPhoto, thirdPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 5);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, fifthPhoto]);
    });

    test("array.unshift($model) pushing an existing item just moves it to first position", function (assert) {
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

      let result = array.unshift(secondPhoto);

      assert.equal(result, 3);
      assert.equal(array.length, 3);
      assert.deepEqual(array, [secondPhoto, firstPhoto, thirdPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);

      let resultTwo = array.unshift(thirdPhoto);

      assert.equal(resultTwo, 3);
      assert.equal(array.length, 3);
      assert.deepEqual(array, [thirdPhoto, secondPhoto, firstPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 0);
    });

    test("array.unshift($model) pushing an existing instance group item replaces it and moves it to first position", function (assert) {
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

      let result = array.unshift(secondPhoto);

      assert.equal(result, 3);
      assert.equal(array.length, 3);
      assert.deepEqual(array, [secondPhoto, firstPhotoCopy, thirdPhoto]);
      assert.notDeepEqual(array, [secondPhotoCopy, firstPhotoCopy, thirdPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 4);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 1);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, secondPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, secondPhotoCopy]);

      let resultTwo = array.unshift(firstPhoto);

      assert.equal(resultTwo, 3);
      assert.equal(array.length, 3);
      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.equal(RelationshipMutation.addHasManyRelationshipFor.callCount, 5);
      assert.equal(RelationshipMutation.removeHasManyRelationshipFor.callCount, 2);
      assert.deepEqual(RelationshipMutation.addHasManyRelationshipFor.lastCall.args, [array, firstPhoto]);
      assert.deepEqual(RelationshipMutation.removeHasManyRelationshipFor.lastCall.args, [array, firstPhotoCopy]);
    });
  });
});
