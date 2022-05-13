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
      assert.equal(group.photo, null);
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
      assert.equal(group.photo, photo);
      assert.equal(photo.group_id, group.id);
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
      assert.equal(photo.group, updatedGroup);
      assert.equal(photo.group_id, updatedGroup.id);
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

    // TODO: move this test also to belongs-to id for belongsTo version
    test("a model can be built, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
      // TODO: all photos will be groups, all users will be photo
      // TODO: should be group.photo = photo; there is photo.group_id
      // intention is to really see if photo.group_id changes

      window.DEBUG = Model.DEBUG;
      let { MemoryGroup, MemoryPhoto } = generateModels();

      let firstPhoto = await MemoryPhoto.insert({ name: "First photo" });
      let secondPhoto = await MemoryPhoto.insert({ name: "Second photo" });
      let group = MemoryGroup.build({ name: "Dinner group", photo: secondPhoto });

      assert.ok(group.isNew);
      assert.deepEqual(group.photo, secondPhoto);
      assert.equal(secondPhoto.group_id, group.id);

      group.photo = firstPhoto; // should clear secondPhoto.group

      assert.deepEqual(group.photo, firstPhoto);
      assert.equal(firstPhoto.group_id, group.id);
      assert.equal(secondPhoto.group_id, null);
      assert.equal(secondPhoto.group, null);

      let insertedGroup = await MemoryGroup.insert(group);

      assert.deepEqual(insertedGroup.photo, firstPhoto);
      assert.deepEqual(group.photo, insertedGroup.photo);

      debugger;

      insertedGroup.photo = secondPhoto;

      debugger;

      assert.deepEqual(insertedGroup.photo, secondPhoto);
      assert.equal(secondPhoto.group_id, insertedGroup.id);
      assert.equal(firstPhoto.group_id, null); // TODO: this fails

      // let updatedGroup = await MemoryGroup.update(insertedGroup);

      // assert.deepEqual(insertedGroup.photo, secondPhoto);
      // assert.deepEqual(updatedGroup.photo, secondPhoto);

      // updatedGroup.photo = null;

      // assert.equal(updatedGroup.photo, null);
      // assert.equal(secondPhoto.group_id, null);
      // assert.equal(firstPhoto.group_id, null);

      // debugger;

      // let deletedGroup = await MemoryGroup.delete(updatedGroup);
      // // cache keeps it then get finds it

      // debugger;
      // assert.equal(updatedGroup.photo, null);
      // assert.propEqual(deletedGroup.photo, null);
      // assert.equal(secondPhoto.group_id, null);
      // assert.equal(firstPhoto.group_id, null);
    });

    // test("a model can be fetched, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
    //   let { MemoryPhoto, MemoryUser } = generateModels();

    //   MemoryUser.cache([
    //     {
    //       id: 1,
    //       first_name: "Izel",
    //     },
    //     {
    //       id: 2,
    //       first_name: "Moris",
    //     },
    //   ]);

    //   let firstUser = await MemoryUser.find(1);
    //   let secondUser = await MemoryUser.find(2);
    //   let photo = MemoryPhoto.build({ name: "Dinner photo", owner: secondUser });

    //   assert.ok(photo.isNew);
    //   assert.propEqual(photo.owner, secondUser);
    //   assert.equal(photo.owner_id, secondUser.id);

    //   photo.owner = firstUser;

    //   assert.propEqual(photo.owner, firstUser);
    //   assert.equal(photo.owner_id, firstUser.id);

    //   let insertedPhoto = await MemoryPhoto.insert(photo);

    //   assert.propEqual(insertedPhoto.owner, firstUser);
    //   assert.propEqual(photo.owner, insertedPhoto.owner);

    //   insertedPhoto.owner = secondUser;

    //   assert.propEqual(insertedPhoto.owner, secondUser);
    //   assert.equal(insertedPhoto.owner_id, secondUser.id);

    //   let updatedPhoto = await MemoryPhoto.update(insertedPhoto);

    //   assert.propEqual(updatedPhoto.owner, secondUser);
    //   assert.propEqual(insertedPhoto.owner, secondUser);

    //   updatedPhoto.owner = null;

    //   assert.equal(updatedPhoto.owner, null);
    //   assert.equal(updatedPhoto.owner_id, null);

    //   let deletedPhoto = await MemoryPhoto.delete(updatedPhoto);

    //   assert.equal(updatedPhoto.owner, null);
    //   assert.propEqual(deletedPhoto.owner, null);
    //   assert.equal(deletedPhoto.owner_id, null);
    // });

    // test("a model can fetch its not loaded relationship", async function (assert) {
    //   let { MemoryPhoto, MemoryUser } = generateModels();

    //   let firstUser = await MemoryUser.insert({ first_name: "Izel" });
    //   let secondUser = await MemoryUser.insert({ first_name: "Moris" });
    //   let photo = MemoryPhoto.build({ name: "Dinner photo", owner_id: secondUser.id });

    //   assert.deepEqual(photo.owner, secondUser);
    //   assert.equal(photo.owner_id, secondUser.id);
    // });

    // test("a models relationship promise reference turns to null when relationship foreign key sets to null", async function (assert) {
    //   let { MemoryPhoto, MemoryUser } = generateModels();

    //   let firstUser = await MemoryUser.insert({ first_name: "Izel" });
    //   let secondUser = await MemoryUser.insert({ first_name: "Moris" });
    //   let photo = MemoryPhoto.build({ name: "Dinner photo", owner_id: secondUser.id });

    //   assert.deepEqual(photo.owner, secondUser);

    //   photo.owner_id = null;

    //   assert.equal(photo.owner, null);
    // });

    // test("a models empty relationship reference turns to promise and can fetch when changed", async function (assert) {
    //   let { MemoryPhoto, MemoryUser } = generateModels();

    //   let firstUser = await MemoryUser.insert({ first_name: "Izel" });
    //   let secondUser = await MemoryUser.insert({ first_name: "Moris" });
    //   let photo = MemoryPhoto.build({ name: "Dinner photo" });

    //   assert.equal(photo.owner, null);
    //   assert.equal(photo.owner_id, null);

    //   photo.owner_id = secondUser.id;

    //   assert.deepEqual(photo.owner, secondUser);
    //   assert.equal(photo.owner_id, secondUser.id);
    // });
  }
);
