import { HasManyArray } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";
import generateModels from "../helpers/relationship-test-models/index.js";

module("@memoria/model | HasManyArray DX enumeration methods", function (hooks) {
  setupMemoria(hooks);

  module("any", function () {
    test("any works exactly like Array.prototype.some", function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let firstPhotoCopy = Photo.build(firstPhoto);
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let array = new HasManyArray([secondPhoto, firstPhotoCopy]);
      let emptyHasManyArray = new HasManyArray();

      assert.strictEqual(
        array.any((x) => x === firstPhoto),
        false
      );
      assert.strictEqual(
        array.any((x) => x === firstPhotoCopy),
        true
      );
      assert.strictEqual(
        array.any((x) => x),
        true
      );
      assert.strictEqual(
        emptyHasManyArray.any((x) => x === firstPhoto),
        false
      );
      assert.strictEqual(
        emptyHasManyArray.any((x) => x === firstPhotoCopy),
        false
      );
      assert.strictEqual(
        emptyHasManyArray.any((x) => x),
        false
      );
    });
  });

  module("mapBy", function () {
    test("works correctly for various array of objects", function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let firstPhotoCopy = Photo.build(firstPhoto);
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let array = new HasManyArray([secondPhoto, firstPhotoCopy, thirdPhoto]);

      assert.deepEqual(array.mapBy("name"), ["Second photo", "First photo", "Third photo"]);
      assert.deepEqual(array.mapBy("id"), [2, null, 3]);

      try {
        assert.deepEqual(array.mapBy("something"), [undefined, undefined, undefined]);
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "mapBy: Key something not found in an element of the array.");
      }

      let emptyHasManyArray = new HasManyArray();

      assert.deepEqual(emptyHasManyArray.mapBy("name"), []);
    });
  });

  module("objectsAt", function () {
    test("works correctly for various array of objects", function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let firstPhotoCopy = Photo.build(firstPhoto);
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let array = new HasManyArray([secondPhoto, firstPhotoCopy, thirdPhoto, fourthPhoto]);

      assert.deepEqual(array.objectsAt([0, 2]), [secondPhoto, thirdPhoto]);
      assert.deepEqual(array.objectsAt([0, 3, 1]), [secondPhoto, fourthPhoto, firstPhotoCopy]);
      assert.deepEqual(array.objectsAt([2, 0, 1]), [thirdPhoto, secondPhoto, firstPhotoCopy]);
      assert.deepEqual(array.objectsAt([1, 2, 3, 1]), [firstPhotoCopy, thirdPhoto, fourthPhoto, firstPhotoCopy]);
    });

    test("case with indexes more than the length of the array works", function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let firstPhotoCopy = Photo.build(firstPhoto);
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let array = new HasManyArray([secondPhoto, firstPhotoCopy, thirdPhoto, fourthPhoto]);

      assert.deepEqual(array.objectsAt([12, 123, 99]), [undefined, undefined, undefined]);
      assert.deepEqual(array.objectsAt([99, 0, 2]), [undefined, secondPhoto, thirdPhoto]);
      assert.deepEqual(array.objectsAt([0, 3, 222, 1]), [secondPhoto, fourthPhoto, undefined, firstPhotoCopy]);
      assert.deepEqual(array.objectsAt([88, 2, 99, 111]), [undefined, thirdPhoto, undefined, undefined]);
    });
  });

  module("findBy", function () {
    test("it works and finds the element for various keys", function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let firstPhotoCopy = Photo.build(firstPhoto);
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let array = new HasManyArray([secondPhoto, firstPhotoCopy, thirdPhoto, fourthPhoto]);

      assert.strictEqual(array.findBy("name", "First photo"), firstPhotoCopy);
      assert.strictEqual(array.findBy("id", 2), secondPhoto);
      assert.strictEqual(array.findBy("id", 3), thirdPhoto);
      assert.strictEqual(array.findBy("name", "Fourth photo"), fourthPhoto);
    });

    test("it works when it cant find the element for various keys", function (assert) {
      const { Photo } = generateModels();

      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let array = new HasManyArray([thirdPhoto, fourthPhoto]);

      assert.strictEqual(array.findBy("id", 999), null);
      assert.strictEqual(array.findBy("rank", 555), null);
    });
  });

  module("getProperties", function () {
    test("it works for various properties", function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let firstPhotoCopy = Photo.build(firstPhoto);
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let array = new HasManyArray([secondPhoto, firstPhotoCopy, thirdPhoto, fourthPhoto]);

      assert.deepEqual(array.getProperties(["name"]), [
        { name: "Second photo" },
        { name: "First photo" },
        { name: "Third photo" },
        { name: "Fourth photo" },
      ]);
      assert.deepEqual(array.getProperties(["id", "name"]), [
        { id: 2, name: "Second photo" },
        { id: null, name: "First photo" },
        { id: 3, name: "Third photo" },
        { id: 4, name: "Fourth photo" },
      ]);
    });

    test("it works when all or some properties not existing", function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let firstPhotoCopy = Photo.build(firstPhoto);
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let array = new HasManyArray([secondPhoto, firstPhotoCopy, thirdPhoto, fourthPhoto]);

      assert.deepEqual(array.getProperties(["name", "rank"]), [
        { name: "Second photo", rank: undefined },
        { name: "First photo", rank: undefined },
        { name: "Third photo", rank: undefined },
        { name: "Fourth photo", rank: undefined },
      ]);
      assert.deepEqual(array.getProperties(["id", "name", "city", "rank"]), [
        { id: 2, name: "Second photo", city: undefined, rank: undefined },
        { id: null, name: "First photo", city: undefined, rank: undefined },
        { id: 3, name: "Third photo", city: undefined, rank: undefined },
        { id: 4, name: "Fourth photo", city: undefined, rank: undefined },
      ]);
      assert.deepEqual(array.getProperties(["rank", "city"]), [
        { rank: undefined, city: undefined },
        { rank: undefined, city: undefined },
        { rank: undefined, city: undefined },
        { rank: undefined, city: undefined },
      ]);
    });
  });

  module("isAny", function () {
    test("it works correctly", function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let firstPhotoCopy = Photo.build(firstPhoto);
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let array = new HasManyArray([secondPhoto, firstPhotoCopy, thirdPhoto, fourthPhoto]);

      assert.strictEqual(array.isAny("id", null), true);
      assert.strictEqual(array.isAny("id", 3), true);
      assert.strictEqual(array.isAny("id", 99), false);
      assert.strictEqual(array.isAny("name", null), false);
      assert.strictEqual(array.isAny("name", "Third photo"), true);
      assert.strictEqual(array.isAny("name", "Tenth photo"), false);
    });
  });

  module("isEvery", function () {
    test("it works correctly", function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let firstPhotoCopy = Photo.build(firstPhoto);
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let thirdPhoto = Photo.build({ id: 3, name: "Third photo" });
      let fourthPhoto = Photo.build({ id: 4, name: "Fourth photo" });
      let array = new HasManyArray([secondPhoto, firstPhotoCopy, thirdPhoto, fourthPhoto]);

      assert.strictEqual(array.isEvery("id", null), false);
      assert.strictEqual(array.isEvery("id", 1), false);
      assert.strictEqual(array.isEvery("href", null), true);
      assert.strictEqual(array.isEvery("something", undefined), true);
      assert.strictEqual(array.isEvery("something", null), false);
    });
  });
});
