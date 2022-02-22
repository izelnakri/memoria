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

    test("new model can have relationship set afterwards and it sends the right data to the server during post", async function (assert) {
      let { MemoryGroup, MemoryPhoto } = generateModels();

      let photo = MemoryPhoto.build({ name: "Cover photo" });
      let group = MemoryGroup.build({ name: "Dinner group" });
      let secondGroup = MemoryGroup.build({ name: "Padel group" });

      assert.equal(await group.photo, null);
      assert.equal(await secondGroup.photo, null);
      assert.ok(group.isNew);
      assert.ok(secondGroup.isNew);

      let insertedGroup = await MemoryGroup.insert(group);

      assert.notOk(group.isNew);
      assert.notOk(insertedGroup.isNew);
      assert.ok(insertedGroup !== group);
      assert.equal(await group.photo, null);
      assert.equal(await insertedGroup.photo, null);

      secondGroup.photo = photo;

      let secondInsertedGroup = await MemoryGroup.insert(secondGroup);

      assert.ok(secondInsertedGroup !== secondGroup);
      assert.notOk(secondGroup.isNew);
      assert.notOk(secondInsertedGroup.isNew);
      assert.ok(secondGroup !== secondInsertedGroup);
      assert.deepEqual(photo.group, secondInsertedGroup);
      assert.deepEqual(photo.group_id, secondInsertedGroup.id);
      assert.deepEqual(photo, secondGroup.photo);
      assert.equal(photo.group_id, secondGroup.id);
    });

    test("fetched model can request the relationship(without embed) and change the relationship before update", async function (assert) {
      let { MemoryGroup, MemoryPhoto } = generateModels();

      let photo = await MemoryPhoto.insert({ name: "Cover photo" });

      assert.equal(photo.group_id, null);

      let group = await MemoryGroup.insert({ name: "Dinner group", photo });

      assert.equal(photo.name, "Cover photo");
      assert.notOk(group.isNew);
      assert.deepEqual(group.photo, photo);
      assert.equal(photo.group_id, group.id); // NOTE: should this be assert.equal(photo.group_id, null); ??
      assert.deepEqual(photo.changes, { group_id: 1 });

      let fetchedGroup = await MemoryGroup.find(group.id);

      assert.notOk(fetchedGroup.isNew);
      assert.deepEqual(fetchedGroup.photo, photo);
      assert.equal(photo.group_id, group.id);

      let newPhoto = MemoryPhoto.build({ name: "Another cover photo" });

      assert.equal(newPhoto.name, "Another cover photo");

      fetchedGroup.photo = newPhoto;

      assert.deepEqual(fetchedGroup.photo, newPhoto);
      assert.equal(newPhoto.group_id, fetchedGroup.id);

      let updatedGroup = await MemoryGroup.update(fetchedGroup);

      assert.deepEqual(fetchedGroup, updatedGroup);
      assert.deepEqual(fetchedGroup.photo, newPhoto);
      assert.deepEqual(updatedGroup.photo, newPhoto);
      assert.equal(newPhoto.group, updatedGroup);
    });

    test("fetched model can remove the relationship before update", async function (assert) {
      let { MemoryGroup, MemoryPhoto } = generateModels();

      let photo = await MemoryPhoto.insert({ name: "Cover photo" });

      assert.equal(photo.group_id, null);

      let group = await MemoryGroup.insert({ name: "Dinner group", photo });

      assert.equal(photo.name, "Cover photo");
      assert.notOk(group.isNew);
      assert.deepEqual(group.photo, photo);
      assert.equal(photo.group_id, group.id);
      assert.deepEqual(photo.changes, { group_id: 1 });

      let fetchedGroup = await MemoryGroup.find(group.id);

      assert.notOk(fetchedGroup.isNew);
      assert.deepEqual(fetchedGroup.photo, photo);
      assert.equal(photo.group_id, group.id);

      fetchedGroup.photo = null;

      assert.equal(fetchedGroup.photo, null);
      assert.equal(photo.group_id, null);

      let updatedGroup = await MemoryGroup.update(fetchedGroup);

      assert.propEqual(fetchedGroup, updatedGroup);
      assert.equal(fetchedGroup.photo, null);
      assert.equal(updatedGroup.photo, null);
      assert.equal(photo.group_id, null);
    });

    test("fetched model can remove the relationship before delete", async function (assert) {
      let { MemoryGroup, MemoryPhoto } = generateModels();

      let photo = await MemoryPhoto.insert({ name: "Cover photo" });

      assert.equal(photo.group_id, null);

      let group = await MemoryGroup.insert({ name: "Dinner group", photo });

      assert.equal(photo.name, "Cover photo");
      assert.notOk(group.isNew);
      assert.deepEqual(group.photo, photo);
      assert.equal(photo.group_id, group.id);
      assert.deepEqual(photo.changes, { group_id: 1 });

      let fetchedGroup = await MemoryGroup.find(group.id);

      assert.notOk(fetchedGroup.isNew);
      assert.deepEqual(fetchedGroup.photo, photo);
      assert.equal(photo.group_id, group.id);

      fetchedGroup.photo = null;

      assert.equal(fetchedGroup.photo, null);
      assert.equal(photo.group_id, null);

      let deletedGroup = await MemoryGroup.delete(fetchedGroup);

      assert.propEqual(fetchedGroup, deletedGroup);
      assert.equal(fetchedGroup.photo, null);
      assert.equal(deletedGroup.photo, null);
      assert.equal(photo.group_id, null);
    });
  }
);
