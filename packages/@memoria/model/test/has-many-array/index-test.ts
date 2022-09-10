import sinon from "sinon";
import { module, test } from "qunitx";
import { HasManyArray, RelationshipUtils } from "@memoria/model";
import setupMemoria from "../helpers/setup-memoria.js";
import generateModels from "../helpers/relationship-test-models/index.js";
import setupSinon from "../helpers/setup-sinon.js";

module("@memoria/model | HasManyArray", function (hooks) {
  setupMemoria(hooks);
  setupSinon(hooks);

  module("new HasManyArray() instantiation tests", function () {
    test("new HasManyArray() and HasManyArray([]) works", async function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let model = Photo.build({ name: "Some model" });
      let array = new HasManyArray();

      assert.deepEqual(array, []);
      assert.equal(array.metadata.RelationshipClass, undefined);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 0);

      array.push(model);

      assert.deepEqual(array, [model]);
      assert.strictEqual(array.metadata.RelationshipClass, Photo);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 1);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.lastCall.args, [array, model]);

      let newArray = new HasManyArray([]);

      assert.deepEqual(newArray, []);
      assert.strictEqual(newArray.metadata.RelationshipClass, undefined);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 1);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);

      newArray.push(model);

      assert.deepEqual(newArray, [model]);
      assert.strictEqual(newArray.metadata.RelationshipClass, Photo);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 2);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.lastCall.args, [newArray, model]);
    });

    test("new HasManyArray($models) work", async function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let [firstPhoto, secondPhoto] = [Photo.build({ name: "First photo" }), Photo.build({ name: "Second photo" })];
      let thirdPhoto = Photo.build({ name: "First photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto]);
      assert.strictEqual(array.metadata.RelationshipClass, Photo);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 2);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.getCall(0).args, [array, firstPhoto]);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.getCall(1).args, [array, secondPhoto]);

      array.push(thirdPhoto);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.lastCall.args, [array, thirdPhoto]);
    });

    test("new HasManyArray() throws when there are 2 different model types", async function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      const { User, Photo } = generateModels();

      let [firstPhoto, secondPhoto] = [Photo.build({ name: "First photo" }), Photo.build({ name: "Second photo" })];
      let user = User.build({ first_name: "Izel", last_name: "Nakri" });

      try {
        new HasManyArray([firstPhoto, user]);
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(
          error.message,
          "HasManyArray cannot be instantiated or added with model types different than one another!"
        );
      }

      try {
        new HasManyArray([user, firstPhoto, secondPhoto]);
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(
          error.message,
          "HasManyArray cannot be instantiated or added with model types different than one another!"
        );
      }

      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 0);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
    });

    test("new HasManyArray([instance, instanceCopy, anotherModel]) filters correctly", async function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let firstPhotoCopy = Photo.build(firstPhoto);
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let secondPhotoCopy = Photo.build({ id: 2, name: "Second photo copy" });
      let array = new HasManyArray([firstPhoto, firstPhotoCopy, secondPhoto, secondPhotoCopy]);

      assert.deepEqual(array, [firstPhotoCopy, secondPhotoCopy]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 2);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.getCall(0).args, [array, firstPhotoCopy]);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.getCall(1).args, [array, secondPhotoCopy]);
    });

    test("new HasManyArray(param) throws on wrong param types", async function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      class SomeClass {}

      [undefined, true, false, 0, 1, "a", 100, {}, SomeClass, new SomeClass()].forEach((value) => {
        try {
          new HasManyArray(value);
        } catch (error) {
          assert.ok(error instanceof Error);
          assert.equal(
            error.message,
            "Invalid param passed to HasManyArray. Either provide an array of memoria Models or dont provide any elements"
          );
        }
      });

      [[undefined], [true], [false], [0], [1], ["a"], [100], [{}], [SomeClass], [new SomeClass()]].forEach(
        (classValue) => {
          try {
            new HasManyArray(classValue);
          } catch (error) {
            assert.ok(error instanceof Error);
            assert.equal(error.message, "HasManyArray cannot have non memoria Model instance inside!");
          }
        }
      );

      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 0);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
    });
  });

  module("HasManyArray.of() tests", function () {
    test("HasManyArray.of() creates an empty HasManyArray", function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      let result = HasManyArray.of();

      assert.ok(result instanceof HasManyArray);
      assert.deepEqual(result, []);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 0);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
    });

    test("HasManyArray.of(model) creates an HasManyArray with only model", function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ name: "Second photo" });
      let thirdPhoto = Photo.build({ name: "Third photo" });
      let result = HasManyArray.of(firstPhoto);

      assert.ok(result instanceof HasManyArray);
      assert.deepEqual(result, [firstPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 1);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.lastCall.args, [result, firstPhoto]);

      let anotherResult = HasManyArray.of(secondPhoto, firstPhoto, thirdPhoto);

      assert.ok(anotherResult instanceof HasManyArray);
      assert.deepEqual(anotherResult, [secondPhoto, firstPhoto, thirdPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 4);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.getCall(1).args, [anotherResult, secondPhoto]);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.getCall(2).args, [anotherResult, firstPhoto]);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.getCall(3).args, [anotherResult, thirdPhoto]);
    });

    test("HasManyArray.of(models) creates HasManyArray with models", function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ name: "Second photo" });
      let thirdPhoto = Photo.build({ name: "Third photo" });
      let result = HasManyArray.of([secondPhoto, thirdPhoto]);

      assert.ok(result instanceof HasManyArray);
      assert.deepEqual(result, [secondPhoto, thirdPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 2);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.getCall(0).args, [result, secondPhoto]);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.getCall(1).args, [result, thirdPhoto]);

      let anotherResult = HasManyArray.of([secondPhoto, firstPhoto, secondPhoto, thirdPhoto]);

      assert.ok(anotherResult instanceof HasManyArray);
      assert.deepEqual(anotherResult, [secondPhoto, firstPhoto, thirdPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 5);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.getCall(2).args, [anotherResult, secondPhoto]);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.getCall(3).args, [anotherResult, firstPhoto]);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.getCall(4).args, [anotherResult, thirdPhoto]);
    });

    test("HasManyArray.of(invalidValue) throws", function (assert) {
      assert.expect(22);

      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      class SomeClass {}
      [undefined, true, false, 0, 1, "a", 100, {}, SomeClass, new SomeClass()].forEach((value) => {
        try {
          HasManyArray.of(value);
        } catch (error) {
          assert.ok(error instanceof Error);
          assert.equal(error.message, "HasManyArray cannot have non memoria Model instance inside!");
        }
      });

      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 0);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
    });

    test("HasManyArray.of(invalidModels) creates an HasManyArray with valid models", function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      const { User, Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ name: "Second photo" });
      let thirdPhoto = Photo.build({ name: "Third photo" });
      let user = User.build({ first_name: "Izel", last_name: "Nakri" });

      class SomeClass {}

      let inputArray = [undefined, true, false, 0, 1, "a", 100, {}, SomeClass, new SomeClass()];
      inputArray.forEach((value, index) => {
        try {
          HasManyArray.of([value, inputArray[inputArray.length - index]]);
        } catch (error) {
          assert.ok(error instanceof Error);
          assert.equal(error.message, "HasManyArray cannot have non memoria Model instance inside!");
        }
      });

      try {
        HasManyArray.of([firstPhoto, user, secondPhoto, thirdPhoto]);
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(
          error.message,
          "HasManyArray cannot be instantiated or added with model types different than one another!"
        );
      }

      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 0);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
    });
  });

  module("hasManyArray[] = x; assignment tests", function (assert) {
    test("hasManyArray[hasManyArray.length] = x; appends model", function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ name: "Second photo" });
      let thirdPhoto = Photo.build({ name: "Third photo" });
      let array = new HasManyArray();

      assert.deepEqual(array, []);

      array[0] = firstPhoto;

      assert.deepEqual(array, [firstPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 1);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.getCall(0).args, [array, firstPhoto]);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);

      array[1] = secondPhoto;

      assert.deepEqual(array, [firstPhoto, secondPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 2);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.getCall(1).args, [array, secondPhoto]);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);

      let secondArray = new HasManyArray([firstPhoto]);

      assert.deepEqual(secondArray, [firstPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 3);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.getCall(2).args, [secondArray, firstPhoto]);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);

      secondArray[1] = secondPhoto;

      assert.deepEqual(secondArray, [firstPhoto, secondPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 4);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.getCall(3).args, [secondArray, secondPhoto]);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);

      secondArray[2] = thirdPhoto;

      assert.deepEqual(secondArray, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 5);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.getCall(4).args, [secondArray, thirdPhoto]);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
    });

    test("hasManyArray[hasManyArray.length] = invalidParam; throws", function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);

      class SomeClass {}

      [true, 1, "a", 100, {}, SomeClass, new SomeClass()].forEach((value) => {
        try {
          array[array.length] = value;
        } catch (error) {
          assert.ok(error instanceof Error);
          assert.equal(
            error.message,
            `HasManyArray accepts memoria Models or falsy values for assignment, not ${value}`
          );
        }
      });

      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
    });

    test("hasManyArray[hasManyArray.length] = wrongModel; throws", function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      const { User, Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);

      try {
        array[array.length] = User.build({ first_name: "Izel" });
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "This HasManyArray accepts Photo instances, you tried to assign User instance!");
      }

      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
    });

    test("hasManyArray[hasManyArray.length] = falsyValue; does nothing", function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);

      [undefined, false, 0].forEach((value) => {
        array[array.length] = value;
        assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      });

      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
    });

    test("hasManyArray[hasManyArray.length] = null should do nothing", function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let array = new HasManyArray();

      array[0] = null;

      assert.deepEqual(array, []);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 0);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);

      array[0] = firstPhoto;

      assert.deepEqual(array, [firstPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 1);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.lastCall.args, [array, firstPhoto]);

      array[1] = null;

      assert.deepEqual(array, [firstPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 1);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);

      let secondArray = new HasManyArray([firstPhoto, secondPhoto]);

      assert.deepEqual(secondArray, [firstPhoto, secondPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);

      secondArray[2] = null;

      assert.deepEqual(secondArray, [firstPhoto, secondPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
    });

    test("hasManyArray[hasManyArray.length] = x; replaces a model on the right index when x reference already exists", async function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let firstPhotoCopy = Photo.build(firstPhoto);
      let secondPhoto = await Photo.insert({ id: 2, name: "Second photo" });
      let secondPhotoCopy = Photo.build({ id: 2, name: "Second photo copy" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let thirdPhotoCopy = Photo.build(thirdPhoto);
      let array = new HasManyArray();

      array[0] = firstPhoto;
      array[1] = secondPhotoCopy;

      assert.deepEqual(array, [firstPhoto, secondPhotoCopy]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 2);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.getCall(0).args, [array, firstPhoto]);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.getCall(1).args, [array, secondPhotoCopy]);

      array[2] = firstPhotoCopy;

      assert.deepEqual(array, [firstPhotoCopy, secondPhotoCopy]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 1);
      assert.deepEqual(RelationshipUtils.removeHasManyRelationshipFor.lastCall.args, [array, firstPhoto]);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.lastCall.args, [array, firstPhotoCopy]);

      array[2] = secondPhoto;

      assert.deepEqual(array, [firstPhotoCopy, secondPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 4);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 2);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.lastCall.args, [array, secondPhoto]);
      assert.deepEqual(RelationshipUtils.removeHasManyRelationshipFor.lastCall.args, [array, secondPhotoCopy]);

      let secondArray = new HasManyArray([firstPhotoCopy, thirdPhoto]);

      assert.deepEqual(secondArray, [firstPhotoCopy, thirdPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 6);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 2);

      secondArray[2] = secondPhoto;

      assert.deepEqual(secondArray, [firstPhotoCopy, thirdPhoto, secondPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 7);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 2);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.lastCall.args, [secondArray, secondPhoto]);

      secondArray[3] = secondPhotoCopy;
      secondArray[3] = firstPhoto;
      secondArray[3] = thirdPhotoCopy;

      assert.deepEqual(secondArray, [firstPhoto, thirdPhotoCopy, secondPhotoCopy]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 10);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 5);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.getCall(7).args, [secondArray, secondPhotoCopy]);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.getCall(8).args, [secondArray, firstPhoto]);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.getCall(9).args, [secondArray, thirdPhotoCopy]);
      assert.deepEqual(RelationshipUtils.removeHasManyRelationshipFor.getCall(2).args, [secondArray, secondPhoto]);
      assert.deepEqual(RelationshipUtils.removeHasManyRelationshipFor.getCall(3).args, [secondArray, firstPhotoCopy]);
      assert.deepEqual(RelationshipUtils.removeHasManyRelationshipFor.getCall(4).args, [secondArray, thirdPhoto]);
    });

    test("hasManyArray[hasManyArray.length] = $existingModel should do nothing", async function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = await Photo.insert({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);

      array[3] = firstPhoto;
      array[3] = secondPhoto;
      array[3] = thirdPhoto;

      assert.deepEqual(array, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
    });

    test("hasManyArray[x] = y; throws when y is not a correct value", function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 2);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);

      class SomeClass {}

      [true, 1, "a", 100, {}, [], SomeClass, new SomeClass()].forEach((value) => {
        try {
          array[0] = value;
        } catch (error) {
          assert.ok(error instanceof Error);
          assert.equal(
            error.message,
            `HasManyArray accepts memoria Models or falsy values for assignment, not ${value}`
          );
        }
      });

      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 2);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
    });

    test("hasManyArray[x] = y; throws when y is not a correct instance", function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      const { User, Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let user = User.build({ first_name: "Izel", last_name: "Nakri" });
      let array = new HasManyArray();

      array[0] = firstPhoto;

      assert.deepEqual(array, [firstPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 1);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.lastCall.args, [array, firstPhoto]);

      try {
        array[1] = user;
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, `This HasManyArray accepts Photo instances, you tried to assign User instance!`);
      }

      array[1] = secondPhoto;

      assert.deepEqual(array, [firstPhoto, secondPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 2);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.lastCall.args, [array, secondPhoto]);

      let secondArray = new HasManyArray([firstPhoto, secondPhoto]);

      assert.deepEqual(secondArray, [firstPhoto, secondPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 4);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);

      try {
        secondArray[2] = user;
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, `This HasManyArray accepts Photo instances, you tried to assign User instance!`);
      }

      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 4);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
    });

    test("hasManyArray[x] = y; throws when x is hasManyArray.length + n + 1", function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let firstPhotoCopy = Photo.build(firstPhoto);
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let array = new HasManyArray();

      try {
        array[1] = firstPhoto;
      } catch (error) {
        assert.equal(
          error.message,
          `You cannot add HasManyArray[1] to HasManyArray of 0 elements. You can expand the HasManyArray by one element at a time!`
        );
      }

      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 0);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);

      array[0] = firstPhoto;
      array[1] = secondPhoto;

      assert.deepEqual(array, [firstPhoto, secondPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 2);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.getCall(0).args, [array, firstPhoto]);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.getCall(1).args, [array, secondPhoto]);

      try {
        array[5] = firstPhotoCopy;
      } catch (error) {
        assert.equal(
          error.message,
          `You cannot add HasManyArray[5] to HasManyArray of 2 elements. You can expand the HasManyArray by one element at a time!`
        );
      }

      let secondArray = new HasManyArray([firstPhoto, secondPhoto]);

      assert.deepEqual(secondArray, [firstPhoto, secondPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 4);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);

      try {
        secondArray[5] = firstPhotoCopy;
      } catch (error) {
        assert.equal(
          error.message,
          `You cannot add HasManyArray[5] to HasManyArray of 2 elements. You can expand the HasManyArray by one element at a time!`
        );
      }

      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 4);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
    });

    test("hasManyArray[x] = y; replaces the model with y model correctly", function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ name: "Second photo" });
      let thirdPhoto = Photo.build({ name: "Third photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 2);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);

      array[0] = thirdPhoto;

      assert.deepEqual(array, [thirdPhoto, secondPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 1);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.lastCall.args, [array, thirdPhoto]);
      assert.deepEqual(RelationshipUtils.removeHasManyRelationshipFor.lastCall.args, [array, firstPhoto]);
    });

    test("hasManyArray[x] = y; replaces the model when another when model reference already exists in array", function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ id: 1, name: "First photo" });
      let firstPhotoCopy = Photo.build({ id: 1, name: "First photo copy" });
      let secondPhoto = Photo.build({ name: "Second photo" });
      let array = new HasManyArray([firstPhotoCopy, secondPhoto]);

      assert.deepEqual(array, [firstPhotoCopy, secondPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 2);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);

      array[0] = firstPhoto;

      assert.deepEqual(array, [firstPhoto, secondPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 1);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.lastCall.args, [array, firstPhoto]);
      assert.deepEqual(RelationshipUtils.removeHasManyRelationshipFor.lastCall.args, [array, firstPhotoCopy]);
    });

    test("hasManyArray[x] = y; should add u if the y instanceGroup already exists but replace order if x index is different, ensures y is at x", function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let secondPhotoCopy = Photo.build({ id: 2, name: "Second photo copy" });
      let secondPhotoAnotherCopya = Photo.build({ id: 2, name: "Second photo another copy" });
      let thirdPhoto = Photo.build({ name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo" });
      let array = new HasManyArray([firstPhoto, secondPhotoCopy, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);

      assert.deepEqual(array, [firstPhoto, secondPhotoCopy, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
      assert.notDeepEqual(array, [firstPhoto, thirdPhoto, fourthPhoto, secondPhoto, fifthPhoto, sixthPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 6);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);

      array[3] = secondPhoto;

      assert.deepEqual(array, [firstPhoto, thirdPhoto, fourthPhoto, secondPhoto, fifthPhoto, sixthPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 7);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 1);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.lastCall.args, [array, secondPhoto]);
      assert.deepEqual(RelationshipUtils.removeHasManyRelationshipFor.lastCall.args, [array, secondPhotoCopy]);

      let anotherArray = new HasManyArray([
        firstPhoto,
        secondPhotoCopy,
        thirdPhoto,
        fourthPhoto,
        fifthPhoto,
        sixthPhoto,
      ]);

      assert.deepEqual(anotherArray, [firstPhoto, secondPhotoCopy, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
      assert.notDeepEqual(anotherArray, [firstPhoto, secondPhotoCopy, fifthPhoto, thirdPhoto, fourthPhoto, sixthPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 13);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 1);

      anotherArray[2] = fifthPhoto;

      assert.deepEqual(anotherArray, [firstPhoto, secondPhotoCopy, fifthPhoto, thirdPhoto, fourthPhoto, sixthPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 13);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 1);

      let lastArray = new HasManyArray([firstPhoto, secondPhotoCopy, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);

      assert.deepEqual(lastArray, [firstPhoto, secondPhotoCopy, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
      assert.notDeepEqual(lastArray, [firstPhoto, thirdPhoto, secondPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 19);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 1);

      lastArray[2] = secondPhoto;

      assert.deepEqual(lastArray, [firstPhoto, thirdPhoto, secondPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 20);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 2);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.lastCall.args, [lastArray, secondPhoto]);
      assert.deepEqual(RelationshipUtils.removeHasManyRelationshipFor.lastCall.args, [lastArray, secondPhotoCopy]);
    });

    test("hasManyArray[x] = null; or falsy values removes the reference in index correctly", function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let fifthPhoto = Photo.build({ id: 5, name: "Fifth photo" });
      let sixthPhoto = Photo.build({ id: 6, name: "Sixth photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);

      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 6);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);

      [undefined, false, 0, null].forEach((value) => {
        array[0] = value;
      });

      assert.deepEqual(array, [fifthPhoto, sixthPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 6);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 4);
      assert.deepEqual(RelationshipUtils.removeHasManyRelationshipFor.getCall(0).args, [array, firstPhoto]);
      assert.deepEqual(RelationshipUtils.removeHasManyRelationshipFor.getCall(1).args, [array, secondPhoto]);
      assert.deepEqual(RelationshipUtils.removeHasManyRelationshipFor.getCall(2).args, [array, thirdPhoto]);
      assert.deepEqual(RelationshipUtils.removeHasManyRelationshipFor.getCall(3).args, [array, fourthPhoto]);

      let secondArray = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto, fourthPhoto, fifthPhoto, sixthPhoto]);

      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 12);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 4);

      [undefined, false, 0, null].forEach((value) => {
        secondArray[secondArray.length - 1] = value;
      });

      assert.deepEqual(secondArray, [firstPhoto, secondPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 12);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 8);
      assert.deepEqual(RelationshipUtils.removeHasManyRelationshipFor.getCall(4).args, [secondArray, sixthPhoto]);
      assert.deepEqual(RelationshipUtils.removeHasManyRelationshipFor.getCall(5).args, [secondArray, fifthPhoto]);
      assert.deepEqual(RelationshipUtils.removeHasManyRelationshipFor.getCall(6).args, [secondArray, fourthPhoto]);
      assert.deepEqual(RelationshipUtils.removeHasManyRelationshipFor.getCall(7).args, [secondArray, thirdPhoto]);
    });

    test("emptyHasManyArray[0] = null or falsy values does nothing", function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let array = new HasManyArray();

      assert.deepEqual(array, []);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 0);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);

      [undefined, false, 0, null].forEach((value) => {
        array[0] = value;
      });

      assert.deepEqual(array, []);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 0);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);

      array[0] = firstPhoto;

      assert.deepEqual(array, [firstPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 1);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.lastCall.args, [array, firstPhoto]);
    });

    test("emptyHasManyArray[0] = y; works and changes arrays metadata(also checks throws)", function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      const { User, Photo } = generateModels();

      let photo = Photo.build({ name: "First photo" });
      let user = User.build({ first_name: "Izel" });
      let firstArray = new HasManyArray();

      assert.equal(firstArray.metadata.RelationshipClass, null);

      firstArray[0] = photo;

      assert.strictEqual(firstArray.metadata.RelationshipClass, Photo);
      assert.deepEqual(firstArray, [photo]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 1);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.lastCall.args, [firstArray, photo]);

      try {
        firstArray[1] = user;
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "This HasManyArray accepts Photo instances, you tried to assign User instance!");
      }

      assert.deepEqual(firstArray, [photo]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 1);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.lastCall.args, [firstArray, photo]);

      let secondArray = new HasManyArray();

      secondArray[0] = user;

      assert.strictEqual(secondArray.metadata.RelationshipClass, User);
      assert.deepEqual(secondArray, [user]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 2);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.lastCall.args, [secondArray, user]);

      try {
        secondArray[1] = photo;
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "This HasManyArray accepts User instances, you tried to assign Photo instance!");
      }

      assert.deepEqual(secondArray, [user]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 2);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.lastCall.args, [secondArray, user]);
    });
  });

  module("delete hasManyArray[x]; tests", function (assert) {
    test("delete hasManyArray[y] throws when y index doesnt exist", function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let photo = Photo.build({ name: "First photo" });
      let array = new HasManyArray();

      try {
        delete array[20];
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "You cant delete the index of 20 when hasManyArray.length is 0");
      }

      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 0);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);

      array[0] = photo;

      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 1);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.lastCall.args, [array, photo]);

      try {
        delete array[2];
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "You cant delete the index of 2 when hasManyArray.length is 1");
      }

      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 1);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
    });

    test("delete hasManyArray[y] works correctly for y correct index", function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ name: "Second photo" });
      let thirdPhoto = Photo.build({ name: "Third photo" });
      let array = new HasManyArray();

      array[0] = firstPhoto;

      assert.deepEqual(array, [firstPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 1);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);

      delete array[0];

      assert.deepEqual(array, []);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 1);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 1);
      assert.deepEqual(RelationshipUtils.removeHasManyRelationshipFor.lastCall.args, [array, firstPhoto]);

      let newArray = new HasManyArray([secondPhoto, thirdPhoto, firstPhoto]);

      assert.deepEqual(newArray, [secondPhoto, thirdPhoto, firstPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 4);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 1);

      delete newArray[1];

      assert.deepEqual(newArray, [secondPhoto, firstPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 4);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 2);
      assert.deepEqual(RelationshipUtils.removeHasManyRelationshipFor.lastCall.args, [newArray, thirdPhoto]);

      delete newArray[1];

      assert.deepEqual(newArray, [secondPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 4);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 3);
      assert.deepEqual(RelationshipUtils.removeHasManyRelationshipFor.lastCall.args, [newArray, firstPhoto]);
    });
  });

  module("hasManyArray.length tests", function (assert) {
    test("hasManyArray.length getter works correctly", function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ name: "Second photo" });
      let thirdPhoto = Photo.build({ name: "Third photo" });
      let array = new HasManyArray();

      assert.equal(array.length, 0);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 0);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);

      array[0] = firstPhoto;

      assert.equal(array.length, 1);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 1);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
      assert.deepEqual(RelationshipUtils.addHasManyRelationshipFor.lastCall.args, [array, firstPhoto]);

      delete array[0];

      assert.equal(array.length, 0);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 1);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 1);
      assert.deepEqual(RelationshipUtils.removeHasManyRelationshipFor.lastCall.args, [array, firstPhoto]);

      let newArray = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

      assert.equal(newArray.length, 3);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 4);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 1);

      delete newArray[1];

      assert.equal(newArray.length, 2);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 4);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 2);
      assert.deepEqual(RelationshipUtils.removeHasManyRelationshipFor.lastCall.args, [newArray, secondPhoto]);
    });

    test("hasManyArray.length = hasManyArray.length + n throws", function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ name: "Second photo" });
      let thirdPhoto = Photo.build({ name: "Third photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);

      try {
        array.length = 99;
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "You cant change the length of an hasManyArray to 99 when actual length is 3");
      }

      let newArray = new HasManyArray();

      try {
        newArray.length = 1;
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "You cant change the length of an hasManyArray to 1 when actual length is 0");
      }

      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);
    });

    test("hasManyArray.length = n works correctly when n is lower than hasManyArray.length", function (assert) {
      sinon.spy(RelationshipUtils, "addHasManyRelationshipFor");
      sinon.spy(RelationshipUtils, "removeHasManyRelationshipFor");

      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ name: "Second photo" });
      let thirdPhoto = Photo.build({ name: "Third photo" });
      let array = new HasManyArray([firstPhoto, secondPhoto, thirdPhoto]);

      assert.equal(array.length, 3);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 0);

      array.length = 1;

      assert.equal(array.length, 1);
      assert.deepEqual(array, [firstPhoto]);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 2);
      assert.deepEqual(RelationshipUtils.removeHasManyRelationshipFor.getCall(0).args, [array, thirdPhoto]);
      assert.deepEqual(RelationshipUtils.removeHasManyRelationshipFor.getCall(1).args, [array, secondPhoto]);

      let newArray = new HasManyArray();

      newArray.length = 0;

      assert.equal(newArray.length, 0);
      assert.deepEqual(newArray, []);
      assert.equal(RelationshipUtils.addHasManyRelationshipFor.callCount, 3);
      assert.equal(RelationshipUtils.removeHasManyRelationshipFor.callCount, 2);
    });
  });
});
