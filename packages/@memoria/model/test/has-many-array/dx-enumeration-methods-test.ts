// TODO: array mixin methods
import { HasManyArray } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";
import generateModels from "../helpers/relationship-test-models/index.js";

module("@memoria/model | HasManyArray DX enumeration methods", function (hooks) {
  setupMemoria(hooks);

  module('any', function() {
    test('any works exactly like Array.prototype.some', function (assert) {
      const { Photo } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let firstPhotoCopy = Photo.build(firstPhoto);
      let secondPhoto = Photo.build({ id: 2, name: "Second photo" });
      let array = new HasManyArray([secondPhoto, firstPhotoCopy]);
      let emptyHasManyArray = new HasManyArray();

      assert.strictEqual(array.any((x) => x === firstPhoto), false);
      assert.strictEqual(array.any((x) => x === firstPhotoCopy), true);
      assert.strictEqual(array.any((x) => x), true);
      assert.strictEqual(emptyHasManyArray.any((x) => x === firstPhoto), false);
      assert.strictEqual(emptyHasManyArray.any((x) => x === firstPhotoCopy), false);
      assert.strictEqual(emptyHasManyArray.any((x) => x), false);
    });
  });
});
