import Model, { PrimaryGeneratedColumn, Column, RuntimeError, Serializer, RelationshipDB } from "@memoria/model";
import { module, test, skip } from "qunitx";
import setupMemoria from "../../helpers/setup-memoria.js";
import setupSQLModels from "../../helpers/models-with-relations/sql/uuid/index.js";

const FIRST_TARGET_UUID = "374c7f4a-85d6-429a-bf2a-0719525f5f21";
const SECOND_TARGET_UUID = "374c7f4a-85d6-429a-bf2a-0719525f5f22";

module(
  "@memoria/adapters | SQLAdapter | Relationships | @hasOne API for UUID(uuid)",
  function (hooks) {
    setupMemoria(hooks);

    // TODO: also add embed + serializer tests to the test cases correctly
    test("new model can be built from scratch and it sends the right data oo the server during post", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let photo = SQLPhoto.build({ name: "Some photo" });
      let group = SQLGroup.build({ name: "Hacker Log", photo });

      assert.strictEqual(group.photo, photo);
      assert.equal(photo.group_uuid, null);

      let insertedGroup = await SQLGroup.insert(group);

      assert.strictEqual(group.photo, photo);
      assert.strictEqual(insertedGroup.photo, photo);
      assert.equal(photo.group_uuid, insertedGroup.uuid);

      let insertedPhoto = await SQLPhoto.insert(photo);

      assert.strictEqual(group.photo, insertedPhoto);
      assert.strictEqual(insertedGroup.photo, insertedPhoto);
    });

    test("new model can have relationship set afterwards and it sends the right data to the server during post", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let photo = SQLPhoto.build({ name: "Cover photo" });
      let group = SQLGroup.build({ name: "Dinner group" });
      let secondGroup = SQLGroup.build({ name: "Padel group" });

      assert.equal(await group.photo, null);
      assert.equal(await secondGroup.photo, null);

      let insertedGroup = await SQLGroup.insert(group);

      assert.equal(await group.photo, null);
      assert.equal(await insertedGroup.photo, null);

      secondGroup.photo = photo;

      assert.strictEqual(secondGroup.photo, photo);
      assert.strictEqual(photo.group, secondGroup);
      assert.equal(photo.group_uuid, secondGroup.uuid);

      let secondInsertedGroup = await SQLGroup.insert(secondGroup);

      assert.strictEqual(secondGroup.photo, photo);
      assert.strictEqual(secondInsertedGroup.photo, photo);
      assert.strictEqual(photo.group, secondInsertedGroup);
      assert.equal(photo.group_uuid, secondInsertedGroup.uuid);
    });

    test("fetched model can request the relationship(without embed) and change the relationship before update", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let photo = await SQLPhoto.insert({ name: "Cover photo" });

      assert.equal(photo.group_uuid, null);

      let group = await SQLGroup.insert({ name: "Dinner group", photo });

      assert.strictEqual(group.photo, photo);
      assert.equal(photo.group_uuid, group.uuid);
      assert.deepEqual(photo.changes, { group_uuid: group.uuid });

      let fetchedGroup = await SQLGroup.find(group.uuid);

      assert.strictEqual(fetchedGroup.photo, photo);
      assert.strictEqual(group.photo, photo);
      assert.strictEqual(photo.group, fetchedGroup);
      assert.equal(photo.group_uuid, fetchedGroup.uuid);

      let newPhoto = SQLPhoto.build({ name: "Another cover photo" });

      assert.strictEqual(photo.group, fetchedGroup);

      fetchedGroup.photo = newPhoto;

      assert.strictEqual(fetchedGroup.photo, newPhoto);
      assert.equal(newPhoto.group_uuid, fetchedGroup.uuid);

      assert.strictEqual(group.photo, photo);

      assert.strictEqual(photo.group, group); // NOTE: this should be fetchedGroup(?), probably not due to controversial target lookups on relationship cleanups
      assert.equal(photo.group_uuid, group.uuid);

      let updatedGroup = await SQLGroup.update(fetchedGroup); // NOTE: this makes firstPhoto.group to updatedgroup.uuid, probably good/intentional

      assert.strictEqual(updatedGroup.photo, newPhoto);
      assert.strictEqual(fetchedGroup.photo, newPhoto);
      assert.strictEqual(newPhoto.group, updatedGroup);
      assert.strictEqual(photo.group, updatedGroup);
    });

    test("fetched model can remove the relationship before update", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let photo = await SQLPhoto.insert({ name: "Cover photo" });

      assert.equal(photo.group_uuid, null);

      let group = await SQLGroup.insert({ name: "Dinner group", photo });

      assert.strictEqual(group.photo, photo);
      assert.strictEqual(photo.group, group);
      assert.equal(photo.group_uuid, group.uuid);
      assert.deepEqual(photo.changes, { group_uuid: group.uuid });

      let fetchedGroup = await SQLGroup.find(group.uuid);

      assert.strictEqual(group.photo, photo);
      assert.strictEqual(fetchedGroup.photo, photo);
      assert.strictEqual(photo.group, fetchedGroup);
      assert.equal(photo.group_uuid, fetchedGroup.uuid);

      fetchedGroup.photo = null;

      assert.strictEqual(fetchedGroup.photo, null);
      assert.strictEqual(group.photo, photo);
      assert.equal(photo.group_uuid, group.uuid);
      assert.strictEqual(photo.group, group);

      let updatedGroup = await SQLGroup.update(fetchedGroup);

      assert.strictEqual(photo.group, updatedGroup);
      assert.equal(photo.group_uuid, updatedGroup.uuid);
      assert.strictEqual(group.photo, photo);
    });

    test("fetched model can remove the relationship before delete", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let photo = await SQLPhoto.insert({ name: "Cover photo" });

      assert.equal(photo.group_uuid, null);

      let group = await SQLGroup.insert({ name: "Dinner group", photo });

      assert.strictEqual(group.photo, photo);
      assert.equal(photo.group_uuid, group.uuid);
      assert.deepEqual(photo.changes, { group_uuid: group.uuid });

      let fetchedGroup = await SQLGroup.find(group.uuid);

      assert.strictEqual(fetchedGroup.photo, photo);
      assert.strictEqual(group.photo, photo);
      assert.strictEqual(photo.group, fetchedGroup);
      assert.equal(photo.group_uuid, group.uuid);

      fetchedGroup.photo = null;

      assert.equal(fetchedGroup.photo, null);
      assert.strictEqual(group.photo, photo);

      // it should be done only if its null
      assert.strictEqual(photo.group, group);

      assert.deepEqual(photo.group.toJSON(), fetchedGroup.toJSON());

      assert.equal(photo.group_uuid, group.uuid);

      group.photo = null;

      assert.equal(group.photo, null);
      assert.equal(fetchedGroup.photo, null);
      assert.equal(photo.group_uuid, group.uuid);
      assert.deepEqual(photo.group.toJSON(), fetchedGroup.toJSON());

      group.photo = photo;

      assert.equal(fetchedGroup.photo, null);
      assert.strictEqual(photo.group, group);
      assert.strictEqual(group.photo, photo);
      assert.equal(photo.group_uuid, group.uuid);

      let deletedGroup = await SQLGroup.delete(fetchedGroup);

      assert.equal(fetchedGroup.photo, null);
      assert.equal(deletedGroup.photo, null);
      assert.equal(photo.group, null);
      assert.equal(photo.group_uuid, null);
      assert.equal(group.photo, null);
    });

    test("a model can be built, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let firstPhoto = await SQLPhoto.insert({ name: "First photo" });
      let secondPhoto = await SQLPhoto.insert({ name: "Second photo" });
      let group = SQLGroup.build({ name: "Dinner group", photo: secondPhoto });

      assert.strictEqual(group.photo, secondPhoto);
      assert.strictEqual(secondPhoto.group, group);
      assert.equal(secondPhoto.group_uuid, group.uuid);

      group.photo = firstPhoto;

      assert.strictEqual(group.photo, firstPhoto);
      assert.strictEqual(firstPhoto.group, group);
      assert.equal(firstPhoto.group_uuid, group.uuid);

      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_uuid, null);

      let insertedGroup = await SQLGroup.insert(group);

      assert.strictEqual(insertedGroup.photo, firstPhoto);
      assert.strictEqual(group.photo, firstPhoto);
      assert.strictEqual(firstPhoto.group, insertedGroup);
      assert.equal(firstPhoto.group_uuid, insertedGroup.uuid);

      insertedGroup.photo = secondPhoto;

      assert.strictEqual(insertedGroup.photo, secondPhoto);
      assert.strictEqual(secondPhoto.group, insertedGroup);
      assert.equal(secondPhoto.group_uuid, insertedGroup.uuid);

      assert.strictEqual(firstPhoto.group, group); // NOTE: this was controversial but probably makes sense
      assert.equal(firstPhoto.group_uuid, group.uuid);
      assert.strictEqual(group.photo, firstPhoto);

      let updatedGroup = await SQLGroup.update(insertedGroup); // NOTE: this makes firstPhoto.group to updatedgroup.uuid, probably good/intentional

      assert.strictEqual(group.photo, firstPhoto);

      assert.strictEqual(insertedGroup.photo, secondPhoto);
      assert.strictEqual(updatedGroup.photo, secondPhoto);
      assert.strictEqual(secondPhoto.group, updatedGroup);
      assert.equal(secondPhoto.group_uuid, updatedGroup.uuid);
      assert.strictEqual(firstPhoto.group, updatedGroup);
      assert.equal(firstPhoto.group_uuid, updatedGroup.uuid);

      updatedGroup.photo = null;

      assert.equal(updatedGroup.photo, null);
      assert.strictEqual(insertedGroup.photo, secondPhoto);
      assert.strictEqual(secondPhoto.group, insertedGroup);
      assert.equal(secondPhoto.group_uuid, insertedGroup.uuid);

      assert.strictEqual(firstPhoto.group, insertedGroup)
      assert.equal(firstPhoto.group_uuid, insertedGroup.uuid);

      let deletedGroup = await SQLGroup.delete(updatedGroup);

      assert.equal(deletedGroup.photo, null);
      assert.equal(updatedGroup.photo, null);
      assert.equal(insertedGroup.photo, null);
      assert.equal(firstPhoto.group, null);
      assert.equal(firstPhoto.group_uuid, null);
      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_uuid, null);
    });

    test("a model can be fetched, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
      let { SQLPhoto, MemoryPhoto, SQLGroup } = setupSQLModels();

      let photosToUnload = await SQLPhoto.insertAll([
        {
          uuid: FIRST_TARGET_UUID,
          name: "First photo",
        },
        {
          uuid: SECOND_TARGET_UUID,
          name: "Second photo",
        },
      ]);
      await Promise.all(photosToUnload.map((photo) => SQLPhoto.unload(photo.toJSON())));

      let firstPhoto = await SQLPhoto.find(FIRST_TARGET_UUID);
      let secondPhoto = await SQLPhoto.find(SECOND_TARGET_UUID);
      let group = SQLGroup.build({ name: "Dinner group", photo: secondPhoto });

      assert.strictEqual(group.photo, secondPhoto);
      assert.equal(firstPhoto.group, null);
      assert.equal(firstPhoto.group_uuid, null);
      assert.strictEqual(secondPhoto.group, group);
      assert.equal(secondPhoto.group_uuid, group.uuid);

      group.photo = firstPhoto;

      assert.strictEqual(group.photo, firstPhoto);
      assert.strictEqual(firstPhoto.group, group);
      assert.equal(firstPhoto.group_uuid, group.uuid);
      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_uuid, null);

      let insertedGroup = await SQLGroup.insert(group);

      assert.strictEqual(group.photo, firstPhoto);
      assert.strictEqual(insertedGroup.photo, firstPhoto);
      assert.strictEqual(firstPhoto.group, insertedGroup);
      assert.equal(firstPhoto.group_uuid, insertedGroup.uuid);
      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_uuid, null);

      insertedGroup.photo = secondPhoto;

      assert.strictEqual(insertedGroup.photo, secondPhoto);
      assert.strictEqual(group.photo, firstPhoto);
      assert.strictEqual(firstPhoto.group, group);
      assert.equal(firstPhoto.group_uuid, group.uuid);
      assert.strictEqual(secondPhoto.group, insertedGroup);
      assert.equal(secondPhoto.group_uuid, insertedGroup.uuid);

      let updatedGroup = await SQLGroup.update(insertedGroup);

      assert.strictEqual(updatedGroup.photo, secondPhoto);
      assert.strictEqual(secondPhoto.group, updatedGroup);
      assert.equal(secondPhoto.group_uuid, updatedGroup.uuid);

      assert.strictEqual(group.photo, firstPhoto);
      assert.strictEqual(firstPhoto.group, updatedGroup);
      assert.equal(firstPhoto.group_uuid, updatedGroup.uuid);

      updatedGroup.photo = null;

      assert.strictEqual(updatedGroup.photo, null);
      assert.strictEqual(secondPhoto.group, insertedGroup);
      assert.equal(secondPhoto.group_uuid, insertedGroup.uuid);

      assert.strictEqual(group.photo, firstPhoto);
      assert.strictEqual(firstPhoto.group, insertedGroup);
      assert.equal(firstPhoto.group_uuid, insertedGroup.uuid);

      let deletedGroup = await SQLGroup.delete(updatedGroup);

      assert.equal(group.photo, null);
      assert.equal(insertedGroup.photo, null);
      assert.equal(updatedGroup.photo, null);
      assert.equal(deletedGroup.photo, null);
      assert.equal(firstPhoto.group, null);
      assert.equal(firstPhoto.group_uuid, null);
      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_uuid, null);
    });

    test("a model can fetch its not loaded relationship", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let group = await SQLGroup.insert({ name: "Dinner group" });
      let firstPhoto = await SQLPhoto.insert({ name: "First photo" });
      let secondPhoto = await SQLPhoto.insert({ name: "Second photo", group_uuid: group.uuid });

      assert.equal(secondPhoto.group_uuid, group.uuid);
      assert.deepEqual(group.photo, secondPhoto);
      assert.notStrictEqual(group.photo, secondPhoto);
    });

    test("a models relationship lookup gets activated when relationship foreign key sets to null", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let group = await SQLGroup.insert({ name: "Dinner group" });
      let firstPhoto = await SQLPhoto.insert({ name: "First photo" });
      let secondPhoto = await SQLPhoto.insert({ name: "Second photo", group });

      assert.strictEqual(group.photo, secondPhoto);
      assert.equal(secondPhoto.group_uuid, group.uuid);

      secondPhoto.group_uuid = null;

      assert.notOk(RelationshipDB.has(group, 'photo'));
      assert.notStrictEqual(group.photo, secondPhoto);
      assert.deepEqual(group.photo.toJSON(), { ...secondPhoto.toJSON(), group_uuid: group.uuid }); // NOTE: id reference is still in the cache so a built relationship gets returned from cache
    });

    test("a models empty relationship reference turns to promise and can fetch when changed", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let group = await SQLGroup.insert({ name: "Dinner group" });
      let firstPhoto = await SQLPhoto.insert({ name: "First photo" });
      let secondPhoto = await SQLPhoto.insert({ name: "Second photo" });

      assert.equal(await group.photo, null);
      assert.equal(firstPhoto.group_uuid, null);

      firstPhoto.group_uuid = group.uuid;

      assert.equal(firstPhoto.group_uuid, group.uuid);
      assert.deepEqual(group.photo, firstPhoto);
    });
  }
);
