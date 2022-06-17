import Model, { PrimaryGeneratedColumn, Column, RuntimeError, Serializer, RelationshipDB } from "@memoria/model";
import { module, test, skip } from "qunitx";
import setupMemoria from "../../helpers/setup-memoria.js";
import setupRESTModels from "../../helpers/models-with-relations/rest/id/index.js";

module(
  "@memoria/adapters | RESTAdapter | Relationships | @hasOne API for ID(integer)",
  function (hooks) {
    setupMemoria(hooks);

    // TODO: also add embed + serializer tests to the test cases correctly
    test("new model can be built from scratch and it sends the right data to the server during post", async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let photo = RESTPhoto.build({ name: "Some photo" });
      let group = RESTGroup.build({ name: "Hacker Log", photo });

      assert.strictEqual(group.photo, photo);
      assert.equal(photo.group_id, null);

      let insertedGroup = await RESTGroup.insert(group);

      assert.strictEqual(group.photo, photo);
      assert.strictEqual(insertedGroup.photo, photo);
      assert.equal(photo.group_id, insertedGroup.id);

      let insertedPhoto = await RESTPhoto.insert(photo);

      assert.strictEqual(group.photo, insertedPhoto);
      assert.strictEqual(insertedGroup.photo, insertedPhoto);
    });

    test("new model can have relationship set afterwards and it sends the right data to the server during post", async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let photo = RESTPhoto.build({ name: "Cover photo" });
      let group = RESTGroup.build({ name: "Dinner group" });
      let secondGroup = RESTGroup.build({ name: "Padel group" });

      assert.equal(await group.photo, null);
      assert.equal(await secondGroup.photo, null);

      let insertedGroup = await RESTGroup.insert(group);

      assert.equal(await group.photo, null);
      assert.equal(await insertedGroup.photo, null);

      secondGroup.photo = photo;

      assert.strictEqual(secondGroup.photo, photo);
      assert.strictEqual(photo.group, secondGroup);
      assert.equal(photo.group_id, secondGroup.id);

      let secondInsertedGroup = await RESTGroup.insert(secondGroup);

      assert.strictEqual(secondGroup.photo, photo);
      assert.strictEqual(secondInsertedGroup.photo, photo);
      assert.strictEqual(photo.group, secondInsertedGroup);
      assert.equal(photo.group_id, secondInsertedGroup.id);
    });

    test("fetched model can request the relationship(without embed) and change the relationship before update", async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let photo = await RESTPhoto.insert({ name: "Cover photo" });

      assert.equal(photo.group_id, null);

      let group = await RESTGroup.insert({ name: "Dinner group", photo });

      assert.strictEqual(group.photo, photo);
      assert.equal(photo.group_id, group.id);
      assert.deepEqual(photo.changes, { group_id: 1 });

      let fetchedGroup = await RESTGroup.find(group.id);

      assert.strictEqual(fetchedGroup.photo, photo);
      assert.strictEqual(group.photo, photo);
      assert.strictEqual(photo.group, fetchedGroup);
      assert.equal(photo.group_id, fetchedGroup.id);

      let newPhoto = RESTPhoto.build({ name: "Another cover photo" });

      assert.strictEqual(photo.group, fetchedGroup);

      fetchedGroup.photo = newPhoto;

      assert.strictEqual(fetchedGroup.photo, newPhoto);
      assert.equal(newPhoto.group_id, fetchedGroup.id);

      assert.strictEqual(group.photo, photo);

      assert.strictEqual(photo.group, group); // NOTE: this should be fetchedGroup(?), probably not due to controversial target lookups on relationship cleanups
      assert.equal(photo.group_id, group.id);

      let updatedGroup = await RESTGroup.update(fetchedGroup); // NOTE: this makes firstPhoto.group to updatedGroup.id, probably good/intentional

      assert.strictEqual(updatedGroup.photo, newPhoto);
      assert.strictEqual(fetchedGroup.photo, newPhoto);
      assert.strictEqual(newPhoto.group, updatedGroup);
      assert.strictEqual(photo.group, updatedGroup);
    });

    test("fetched model can remove the relationship before update", async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let photo = await RESTPhoto.insert({ name: "Cover photo" });

      assert.equal(photo.group_id, null);

      let group = await RESTGroup.insert({ name: "Dinner group", photo });

      assert.strictEqual(group.photo, photo);
      assert.strictEqual(photo.group, group);
      assert.equal(photo.group_id, group.id);
      assert.deepEqual(photo.changes, { group_id: 1 });

      let fetchedGroup = await RESTGroup.find(group.id);

      assert.strictEqual(group.photo, photo);
      assert.strictEqual(fetchedGroup.photo, photo);
      assert.strictEqual(photo.group, fetchedGroup);
      assert.equal(photo.group_id, fetchedGroup.id);

      fetchedGroup.photo = null;

      assert.strictEqual(fetchedGroup.photo, null);
      assert.strictEqual(group.photo, photo);
      assert.equal(photo.group_id, group.id);
      assert.strictEqual(photo.group, group);

      let updatedGroup = await RESTGroup.update(fetchedGroup);

      assert.strictEqual(photo.group, updatedGroup);
      assert.equal(photo.group_id, updatedGroup.id);
      assert.strictEqual(group.photo, photo);
    });

    test("fetched model can remove the relationship before delete", async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let photo = await RESTPhoto.insert({ name: "Cover photo" });

      assert.equal(photo.group_id, null);

      let group = await RESTGroup.insert({ name: "Dinner group", photo });

      assert.strictEqual(group.photo, photo);
      assert.equal(photo.group_id, group.id);
      assert.deepEqual(photo.changes, { group_id: 1 });

      let fetchedGroup = await RESTGroup.find(group.id);

      assert.strictEqual(fetchedGroup.photo, photo);
      assert.strictEqual(group.photo, photo);
      assert.strictEqual(photo.group, fetchedGroup);
      assert.equal(photo.group_id, group.id);

      fetchedGroup.photo = null;

      assert.equal(fetchedGroup.photo, null);
      assert.strictEqual(group.photo, photo);

      // it should be done only if its null
      assert.strictEqual(photo.group, group);

      assert.deepEqual(photo.group.toJSON(), fetchedGroup.toJSON());

      assert.equal(photo.group_id, group.id);

      group.photo = null;

      assert.equal(group.photo, null);
      assert.equal(fetchedGroup.photo, null);
      assert.equal(photo.group_id, group.id);
      assert.deepEqual(photo.group.toJSON(), fetchedGroup.toJSON());

      group.photo = photo;

      assert.equal(fetchedGroup.photo, null);
      assert.strictEqual(photo.group, group);
      assert.strictEqual(group.photo, photo);
      assert.equal(photo.group_id, group.id);

      let deletedGroup = await RESTGroup.delete(fetchedGroup);

      assert.equal(fetchedGroup.photo, null);
      assert.equal(deletedGroup.photo, null);
      assert.equal(photo.group, null);
      assert.equal(photo.group_id, null);
      assert.equal(group.photo, null);
    });

    test("a model can be built, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let firstPhoto = await RESTPhoto.insert({ name: "First photo" });
      let secondPhoto = await RESTPhoto.insert({ name: "Second photo" });
      let group = RESTGroup.build({ name: "Dinner group", photo: secondPhoto });

      assert.strictEqual(group.photo, secondPhoto);
      assert.strictEqual(secondPhoto.group, group);
      assert.equal(secondPhoto.group_id, group.id);

      group.photo = firstPhoto;

      assert.strictEqual(group.photo, firstPhoto);
      assert.strictEqual(firstPhoto.group, group);
      assert.equal(firstPhoto.group_id, group.id);

      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_id, null);

      let insertedGroup = await RESTGroup.insert(group);

      assert.strictEqual(insertedGroup.photo, firstPhoto);
      assert.strictEqual(group.photo, firstPhoto);
      assert.strictEqual(firstPhoto.group, insertedGroup);
      assert.equal(firstPhoto.group_id, insertedGroup.id);

      insertedGroup.photo = secondPhoto;

      assert.strictEqual(insertedGroup.photo, secondPhoto);
      assert.strictEqual(secondPhoto.group, insertedGroup);
      assert.equal(secondPhoto.group_id, insertedGroup.id);

      assert.strictEqual(firstPhoto.group, group); // NOTE: this was controversial but probably makes sense
      assert.equal(firstPhoto.group_id, group.id);
      assert.strictEqual(group.photo, firstPhoto);

      let updatedGroup = await RESTGroup.update(insertedGroup); // NOTE: this makes firstPhoto.group to updatedGroup.id, probably good/intentional

      assert.strictEqual(group.photo, firstPhoto);

      assert.strictEqual(insertedGroup.photo, secondPhoto);
      assert.strictEqual(updatedGroup.photo, secondPhoto);
      assert.strictEqual(secondPhoto.group, updatedGroup);
      assert.equal(secondPhoto.group_id, updatedGroup.id);
      assert.strictEqual(firstPhoto.group, updatedGroup);
      assert.equal(firstPhoto.group_id, updatedGroup.id);

      updatedGroup.photo = null;

      assert.equal(updatedGroup.photo, null);
      assert.strictEqual(insertedGroup.photo, secondPhoto);
      assert.strictEqual(secondPhoto.group, insertedGroup);
      assert.equal(secondPhoto.group_id, insertedGroup.id);

      assert.strictEqual(firstPhoto.group, insertedGroup)
      assert.equal(firstPhoto.group_id, insertedGroup.id);

      let deletedGroup = await RESTGroup.delete(updatedGroup);

      assert.equal(deletedGroup.photo, null);
      assert.equal(updatedGroup.photo, null);
      assert.equal(insertedGroup.photo, null);
      assert.equal(firstPhoto.group, null);
      assert.equal(firstPhoto.group_id, null);
      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_id, null);
    });

    test("a model can be fetched, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
      let { Server, RESTPhoto, MemoryPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      MemoryPhoto.cache([
        {
          id: 1,
          name: "First photo",
        },
        {
          id: 2,
          name: "Second photo",
        },
      ]);

      let firstPhoto = await RESTPhoto.find(1);
      let secondPhoto = await RESTPhoto.find(2);
      let group = RESTGroup.build({ name: "Dinner group", photo: secondPhoto });

      assert.strictEqual(group.photo, secondPhoto);
      assert.equal(firstPhoto.group, null);
      assert.equal(firstPhoto.group_id, null);
      assert.strictEqual(secondPhoto.group, group);
      assert.equal(secondPhoto.group_id, group.id);

      group.photo = firstPhoto;

      assert.strictEqual(group.photo, firstPhoto);
      assert.strictEqual(firstPhoto.group, group);
      assert.equal(firstPhoto.group_id, group.id);
      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_id, null);

      let insertedGroup = await RESTGroup.insert(group);

      assert.strictEqual(group.photo, firstPhoto);
      assert.strictEqual(insertedGroup.photo, firstPhoto);
      assert.strictEqual(firstPhoto.group, insertedGroup);
      assert.equal(firstPhoto.group_id, insertedGroup.id);
      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_id, null);

      insertedGroup.photo = secondPhoto;

      assert.strictEqual(insertedGroup.photo, secondPhoto);
      assert.strictEqual(group.photo, firstPhoto);
      assert.strictEqual(firstPhoto.group, group);
      assert.equal(firstPhoto.group_id, group.id);
      assert.strictEqual(secondPhoto.group, insertedGroup);
      assert.equal(secondPhoto.group_id, insertedGroup.id);

      let updatedGroup = await RESTGroup.update(insertedGroup);

      assert.strictEqual(updatedGroup.photo, secondPhoto);
      assert.strictEqual(secondPhoto.group, updatedGroup);
      assert.equal(secondPhoto.group_id, updatedGroup.id);

      assert.strictEqual(group.photo, firstPhoto);
      assert.strictEqual(firstPhoto.group, updatedGroup);
      assert.equal(firstPhoto.group_id, updatedGroup.id);

      updatedGroup.photo = null;

      assert.strictEqual(updatedGroup.photo, null);
      assert.strictEqual(secondPhoto.group, insertedGroup);
      assert.equal(secondPhoto.group_id, insertedGroup.id);

      assert.strictEqual(group.photo, firstPhoto);
      assert.strictEqual(firstPhoto.group, insertedGroup);
      assert.equal(firstPhoto.group_id, insertedGroup.id);

      let deletedGroup = await RESTGroup.delete(updatedGroup);

      assert.equal(group.photo, null);
      assert.equal(insertedGroup.photo, null);
      assert.equal(updatedGroup.photo, null);
      assert.equal(deletedGroup.photo, null);
      assert.equal(firstPhoto.group, null);
      assert.equal(firstPhoto.group_id, null);
      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_id, null);
    });

    test("a model can fetch its not loaded relationship", async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let group = await RESTGroup.insert({ name: "Dinner group" });
      let firstPhoto = await RESTPhoto.insert({ name: "First photo" });
      let secondPhoto = await RESTPhoto.insert({ name: "Second photo", group_id: group.id });

      assert.equal(secondPhoto.group_id, group.id);
      assert.deepEqual(group.photo, secondPhoto);
      assert.notStrictEqual(group.photo, secondPhoto);
    });

    test("a models relationship lookup gets activated when relationship foreign key sets to null", async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let group = await RESTGroup.insert({ name: "Dinner group" });
      let firstPhoto = await RESTPhoto.insert({ name: "First photo" });
      let secondPhoto = await RESTPhoto.insert({ name: "Second photo", group });

      assert.strictEqual(group.photo, secondPhoto);
      assert.equal(secondPhoto.group_id, group.id);

      secondPhoto.group_id = null;

      assert.notOk(RelationshipDB.has(group, 'photo'));
      assert.notStrictEqual(group.photo, secondPhoto);
      assert.deepEqual(group.photo.toJSON(), { ...secondPhoto.toJSON(), group_id: group.id }); // NOTE: id reference is still in the cache so a built relationship gets returned from cache
    });

    test("a models empty relationship reference turns to promise and can fetch when changed", async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let group = await RESTGroup.insert({ name: "Dinner group" });
      let firstPhoto = await RESTPhoto.insert({ name: "First photo" });
      let secondPhoto = await RESTPhoto.insert({ name: "Second photo" });

      assert.equal(await group.photo, null);
      assert.equal(firstPhoto.group_id, null);

      firstPhoto.group_id = group.id;

      assert.equal(firstPhoto.group_id, group.id);
      assert.deepEqual(group.photo, firstPhoto);
    });
  }
);
