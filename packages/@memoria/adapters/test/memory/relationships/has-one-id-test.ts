import Model, { PrimaryGeneratedColumn, Column, RuntimeError, Serializer } from "@memoria/model";
import { module, test, skip } from "qunitx";
import setupMemoria from "../../helpers/setup-memoria.js";
import generateModels from "../../helpers/models-with-relations/memory/id/index.js";

module(
  "@memoria/adapters | MemoryAdapter | Relationships | @hasOne API for ID(integer)",
  function (hooks) {
    setupMemoria(hooks);

    // TODO: also add embed + serializer tests to the test cases correctly
    test("new model can be built from scratch and it sends the right data to the server during post", async function (assert) {
      let { MemoryGroup, MemoryPhoto } = generateModels();

      let photo = MemoryPhoto.build({ name: "Some photo" });
      let group = MemoryGroup.build({ name: "Hacker Log", photo: photo });

      assert.ok(photo instanceof MemoryPhoto);
      assert.ok(photo.isNew);
      assert.ok(group.isNew);
      assert.deepEqual(group.photo, photo);
      assert.equal(photo.group_id, null);

      let insertedGroup = await MemoryGroup.insert(group);

      assert.ok(photo.isNew);
      assert.notOk(group.isNew);
      assert.notOk(insertedGroup.isNew);

      assert.deepEqual(group.photo, photo);
      assert.deepEqual(insertedGroup.photo, photo);

      assert.equal(photo.group_id, insertedGroup.id);
      assert.equal(photo.group.id, insertedGroup.id);

      assert.ok(insertedGroup.photo.isNew, true);

      let insertedPhoto = await MemoryPhoto.insert(photo);

      assert.notOk(photo.isNew);
      assert.notOk(insertedPhoto.isNew);
      assert.notOk(insertedGroup.photo.isNew);

      assert.deepEqual(group.photo, photo);
      assert.deepEqual(insertedGroup.photo, photo);
      assert.deepEqual(insertedGroup.photo, insertedPhoto);

      assert.ok(photo !== insertedPhoto);
    });
  }
);
