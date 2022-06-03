import Model, { PrimaryGeneratedColumn, Column, RuntimeError, Serializer, RelationshipPromise } from "@memoria/model";
import { module, test, skip } from "qunitx";
import setupMemoria from "../../helpers/setup-memoria.js";
import generateModels from "../../helpers/models-with-relations/memory/uuid/index.js";

module(
  "@memoria/adapters | MemoryAdapter | Relationships | @belongsTo API for UUID(string) pointing to HasOne",
  function (hooks) {
    setupMemoria(hooks);

    // TODO: also add embed + serializer tests to the test cases correctly
    test("new model can be built from scratch and it sends the right data to the server during post", async function (assert) {
      let { MemoryPhoto, MemoryGroup } = generateModels();

      let group = MemoryGroup.build({ name: "Some group" });
      let photo = MemoryPhoto.build({ name: "Dinner photo", group });

      assert.strictEqual(photo.group, group);
      assert.equal(photo.group_uuid, group.uuid);

      let insertedPhoto = await MemoryPhoto.insert(photo);

      assert.strictEqual(photo.group, group);
      assert.strictEqual(insertedPhoto.group, group);
      assert.equal(insertedPhoto.group_uuid, group.uuid);

      let insertedGroup = await MemoryGroup.insert(group);

      assert.strictEqual(photo.group, insertedGroup);
      assert.strictEqual(insertedPhoto.group, insertedGroup);
      assert.strictEqual(group.photo, insertedPhoto);
    });

    test("new model can have relationship set afterwards and it sends the right data to the server during post", async function (assert) {
      let { MemoryPhoto, MemoryGroup } = generateModels();

      let group = MemoryGroup.build({ name: "Some group" });
      let photo = MemoryPhoto.build({ name: "Dinner photo" });
      let secondPhoto = MemoryPhoto.build({ name: "Second photo" });

      assert.equal(photo.group, null);
      assert.equal(secondPhoto.group, null);

      let insertedPhoto = await MemoryPhoto.insert(photo);

      assert.equal(photo.group, null);
      assert.equal(insertedPhoto.group, null);

      secondPhoto.group = group;

      let secondInsertedPhoto = await MemoryPhoto.insert(secondPhoto);

      assert.strictEqual(secondPhoto.group, group);
      assert.equal(secondPhoto.group_uuid, group.uuid);
      assert.strictEqual(secondInsertedPhoto.group, group);
      assert.equal(secondInsertedPhoto.group_uuid, group.uuid);
    });

    test("fetched model can request the relationship(without embed) and change the relationship before update", async function (assert) {
      let { MemoryPhoto, MemoryGroup } = generateModels();

      let group = await MemoryGroup.insert({ name: "Some group" });
      let photo = await MemoryPhoto.insert({ name: "Dinner photo", group_uuid: group.uuid });

      assert.deepEqual(photo.group, group);
      assert.notStrictEqual(photo.group, group);
      assert.equal(photo.group_uuid, group.uuid);

      let fetchedPhoto = await MemoryPhoto.find(photo.uuid);

      assert.deepEqual(fetchedPhoto.group, group);
      assert.notStrictEqual(fetchedPhoto.group, group);
      assert.equal(fetchedPhoto.group_uuid, group.uuid);

      let newGroup = MemoryGroup.build({ name: "Another group" });

      fetchedPhoto.group = newGroup;

      assert.strictEqual(fetchedPhoto.group, newGroup);
      assert.equal(fetchedPhoto.group_uuid, null);

      let updatedPhoto = await MemoryPhoto.update(fetchedPhoto);

      assert.strictEqual(fetchedPhoto.group, newGroup);
      assert.equal(fetchedPhoto.group_uuid, null);
      assert.strictEqual(updatedPhoto.group, newGroup);
      assert.equal(updatedPhoto.group_uuid, null);
    });

    test("fetched model can remove the relationship before update", async function (assert) {
      let { MemoryPhoto, MemoryGroup } = generateModels();

      let group = await MemoryGroup.insert({ name: "Some group" });
      let photo = await MemoryPhoto.insert({ name: "Dinner photo", group_uuid: group.uuid });

      assert.deepEqual(photo.group, group);
      assert.notStrictEqual(photo.group, group);

      let fetchedPhoto = await MemoryPhoto.find(photo.uuid);

      assert.deepEqual(fetchedPhoto.group, group);
      assert.notStrictEqual(fetchedPhoto.group, group);
      assert.equal(fetchedPhoto.group_uuid, group.uuid);

      fetchedPhoto.group = null;

      assert.equal(fetchedPhoto.group, null);
      assert.equal(fetchedPhoto.group_uuid, null);

      let updatedPhoto = await MemoryPhoto.update(fetchedPhoto);

      assert.equal(fetchedPhoto.group, null);
      assert.equal(updatedPhoto.group, null);
      assert.equal(updatedPhoto.group_uuid, null);
    });

    test("fetched model can remove the relationship before delete", async function (assert) {
      let { MemoryPhoto, MemoryGroup } = generateModels();

      let group = await MemoryGroup.insert({ name: "Some group" });
      let photo = await MemoryPhoto.insert({ name: "Dinner photo", group_uuid: group.uuid });

      assert.deepEqual(photo.group, group);

      let fetchedPhoto = await MemoryPhoto.find(photo.uuid);

      assert.deepEqual(fetchedPhoto.group, group);
      assert.notStrictEqual(fetchedPhoto.group, group);
      assert.equal(fetchedPhoto.group_uuid, group.uuid);

      fetchedPhoto.group = null;

      assert.equal(fetchedPhoto.group, null);
      assert.equal(fetchedPhoto.group_uuid, null);

      let deletedPhoto = await MemoryPhoto.delete(fetchedPhoto);

      assert.equal(fetchedPhoto.group, null);
      assert.equal(deletedPhoto.group, null);
      assert.equal(deletedPhoto.group_uuid, null);
    });

    // TODO: add this test case
    // test('when related models reflective relationships are completely cleared it deosnt clear the foreign key, just the relationship of the model', async function (assert) {

    // });

    test("a model can be built, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
      let { MemoryPhoto, MemoryGroup } = generateModels();

      let firstGroup = await MemoryGroup.insert({ name: "Some group" });
      let secondGroup = await MemoryGroup.insert({ name: "Another group" });
      let photo = MemoryPhoto.build({ name: "Dinner photo", group: secondGroup });

      assert.strictEqual(photo.group, secondGroup);
      assert.equal(photo.group_uuid, secondGroup.uuid);

      photo.group = firstGroup;

      assert.strictEqual(photo.group, firstGroup);
      assert.equal(photo.group_uuid, firstGroup.uuid);

      let insertedPhoto = await MemoryPhoto.insert(photo);

      assert.strictEqual(insertedPhoto.group, firstGroup);
      assert.strictEqual(photo.group, insertedPhoto.group);

      insertedPhoto.group = secondGroup;

      assert.strictEqual(insertedPhoto.group, secondGroup);
      assert.equal(insertedPhoto.group_uuid, secondGroup.uuid);

      let updatedPhoto = await MemoryPhoto.update(insertedPhoto);

      assert.strictEqual(updatedPhoto.group, secondGroup);
      assert.strictEqual(insertedPhoto.group, secondGroup);

      updatedPhoto.group = null;

      assert.equal(updatedPhoto.group, null);
      assert.equal(updatedPhoto.group_uuid, null);

      let deletedPhoto = await MemoryPhoto.delete(updatedPhoto);

      assert.equal(updatedPhoto.group, null);
      assert.equal(deletedPhoto.group, null);
      assert.equal(deletedPhoto.group_uuid, null);
    });

    test("reflexive side test: a model can be built, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
      let { MemoryPhoto, MemoryGroup } = generateModels();

      let firstPhoto = await MemoryPhoto.insert({ name: "First photo" });
      let secondPhoto = await MemoryPhoto.insert({ name: "Second photo" });
      let group = MemoryGroup.build({ name: "Dinner group", photo: secondPhoto });

      assert.strictEqual(group.photo, secondPhoto);
      assert.equal(secondPhoto.group_uuid, group.uuid);

      firstPhoto.group = group; // TODO: this should trigger a logical warning(!!) setting group to firstPhoto but secondPhoto already has group as well(?) clean that first(?)

      assert.strictEqual(firstPhoto.group, group);
      assert.equal(firstPhoto.group_uuid, group.uuid);
      assert.strictEqual(secondPhoto.group, group);
      assert.equal(secondPhoto.group_uuid, group.uuid);
      assert.strictEqual(group.photo, firstPhoto);

      let insertedGroup = await MemoryGroup.insert(group);

      assert.strictEqual(insertedGroup.photo, firstPhoto);
      assert.strictEqual(group.photo, firstPhoto);

      assert.strictEqual(firstPhoto.group, insertedGroup);
      assert.equal(firstPhoto.group_uuid, insertedGroup.uuid);
      assert.strictEqual(secondPhoto.group, insertedGroup);
      assert.equal(secondPhoto.group_uuid, insertedGroup.uuid);

      secondPhoto.group = insertedGroup;

      assert.strictEqual(insertedGroup.photo, secondPhoto);
      assert.strictEqual(group.photo, firstPhoto);
      assert.strictEqual(firstPhoto.group, insertedGroup);
      assert.equal(firstPhoto.group_uuid, insertedGroup.uuid);
      assert.strictEqual(secondPhoto.group, insertedGroup);
      assert.equal(secondPhoto.group_uuid, insertedGroup.uuid);

      let updatedGroup = await MemoryGroup.update(insertedGroup);

      assert.strictEqual(insertedGroup.photo, secondPhoto);
      assert.strictEqual(updatedGroup.photo, secondPhoto);
      assert.strictEqual(group.photo, firstPhoto);

      assert.strictEqual(secondPhoto.group, updatedGroup);
      assert.equal(secondPhoto.group_uuid, updatedGroup.uuid);
      assert.strictEqual(firstPhoto.group, updatedGroup);
      assert.equal(firstPhoto.group_uuid, updatedGroup.uuid);

      secondPhoto.group = null;

      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_uuid, null);
      assert.strictEqual(updatedGroup.photo, firstPhoto);

      assert.strictEqual(firstPhoto.group, updatedGroup);
      assert.equal(firstPhoto.group_uuid, updatedGroup.uuid);
      assert.strictEqual(insertedGroup.photo, firstPhoto);
      assert.strictEqual(group.photo, firstPhoto);

      let deletedGroup = await MemoryGroup.delete(updatedGroup);

      assert.equal(updatedGroup.photo, null);
      assert.equal(await deletedGroup.photo, null);
      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_uuid, null);
      assert.equal(firstPhoto.group, null);
      assert.equal(firstPhoto.group_uuid, null);
    });

    test("a model can be fetched, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
      let { MemoryPhoto, MemoryGroup } = generateModels();

      MemoryGroup.cache([
        {
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          name: "Some group",
        },
        {
          uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
          name: "Another group",
        },
      ]);

      let firstGroup = await MemoryGroup.find("499ec646-493f-4eea-b92e-e383d94182f4");
      let secondGroup = await MemoryGroup.find("77653ad3-47e4-4ec2-b49f-57ea36a627e7");
      let photo = MemoryPhoto.build({ name: "Dinner photo", group: secondGroup });

      assert.strictEqual(photo.group, secondGroup);
      assert.equal(photo.group_uuid, secondGroup.uuid);

      photo.group = firstGroup;

      assert.strictEqual(photo.group, firstGroup);
      assert.equal(photo.group_uuid, firstGroup.uuid);

      let insertedPhoto = await MemoryPhoto.insert(photo);

      assert.strictEqual(insertedPhoto.group, firstGroup);
      assert.equal(photo.group, insertedPhoto.group);

      insertedPhoto.group = secondGroup;

      assert.strictEqual(insertedPhoto.group, secondGroup);
      assert.equal(insertedPhoto.group_uuid, secondGroup.uuid);

      let updatedPhoto = await MemoryPhoto.update(insertedPhoto);

      assert.strictEqual(updatedPhoto.group, secondGroup);
      assert.strictEqual(insertedPhoto.group, secondGroup);

      updatedPhoto.group = null;

      assert.equal(updatedPhoto.group, null);
      assert.equal(updatedPhoto.group_uuid, null);

      let deletedPhoto = await MemoryPhoto.delete(updatedPhoto);

      assert.equal(updatedPhoto.group, null);
      assert.equal(deletedPhoto.group, null);
      assert.equal(deletedPhoto.group_uuid, null);
    });

    test("a model can fetch its not loaded relationship", async function (assert) {
      let { MemoryPhoto, MemoryGroup } = generateModels();

      let firstGroup = await MemoryGroup.insert({ name: "Some group" });
      let secondGroup = await MemoryGroup.insert({ name: "Another group" });
      let photo = MemoryPhoto.build({ name: "Dinner photo", group_uuid: secondGroup.uuid });

      assert.deepEqual(photo.group, secondGroup);
      assert.notStrictEqual(photo.group, secondGroup);
      assert.equal(photo.group_uuid, secondGroup.uuid);
    });

    test("a models relationship promise reference turns to null when relationship foreign key sets to null", async function (assert) {
      let { MemoryPhoto, MemoryGroup } = generateModels();

      let firstGroup = await MemoryGroup.insert({ name: "Some group" });
      let secondGroup = await MemoryGroup.insert({ name: "Another group" });
      let photo = MemoryPhoto.build({ name: "Dinner photo", group_uuid: secondGroup.uuid });

      assert.deepEqual(photo.group, secondGroup);

      photo.group_uuid = null;

      assert.equal(photo.group, null);
    });

    test("a models empty relationship reference turns to promise and can fetch when changed", async function (assert) {
      let { MemoryPhoto, MemoryGroup } = generateModels();

      let firstGroup = await MemoryGroup.insert({ name: "Some group" });
      let secondGroup = await MemoryGroup.insert({ name: "Another group" });
      let photo = MemoryPhoto.build({ name: "Dinner photo" });

      assert.equal(photo.group, null);
      assert.equal(photo.group_uuid, null);

      photo.group_uuid = secondGroup.uuid;

      assert.deepEqual(photo.group, secondGroup);
      assert.notStrictEqual(photo.group, secondGroup);
      assert.equal(photo.group_uuid, secondGroup.uuid);
    });
  }
);
