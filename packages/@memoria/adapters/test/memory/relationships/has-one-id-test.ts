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
      assert.strictEqual(group.photo, photo);
      assert.equal(photo.group_id, null);

      let insertedGroup = await MemoryGroup.insert(group);

      assert.ok(photo.isNew);
      assert.notOk(group.isNew);
      assert.notOk(insertedGroup.isNew);

      assert.strictEqual(group.photo, photo);
      assert.strictEqual(insertedGroup.photo, photo);
      assert.equal(photo.group_id, insertedGroup.id);
      assert.ok(insertedGroup.photo.isNew);

      let insertedPhoto = await MemoryPhoto.insert(photo);

      assert.notOk(photo.isNew);
      assert.notOk(insertedPhoto.isNew);
      assert.notOk(insertedGroup.photo.isNew);

      assert.strictEqual(group.photo, insertedPhoto);
      assert.strictEqual(insertedGroup.photo, insertedPhoto);

      assert.notStrictEqual(photo, insertedPhoto);
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
      assert.notStrictEqual(insertedGroup, group);
      assert.equal(await group.photo, null);
      assert.equal(await insertedGroup.photo, null);

      secondGroup.photo = photo;

      let secondInsertedGroup = await MemoryGroup.insert(secondGroup);

      assert.notStrictEqual(secondInsertedGroup, secondGroup);
      assert.notOk(secondInsertedGroup.isNew);
      assert.notOk(secondGroup.isNew);
      assert.strictEqual(secondGroup.photo, photo);
      assert.strictEqual(photo.group, secondInsertedGroup);
      assert.equal(photo.group_id, secondInsertedGroup.id);
      assert.equal(photo.group_id, secondGroup.id);
    });

    // NOTE: decide on this hasOne change shouldnt remove belongsTo relationship(?)
    test("fetched model can request the relationship(without embed) and change the relationship before update", async function (assert) {
      let { MemoryGroup, MemoryPhoto } = generateModels();

      let photo = await MemoryPhoto.insert({ name: "Cover photo" });

      assert.equal(photo.group_id, null);

      let group = await MemoryGroup.insert({ name: "Dinner group", photo });

      assert.equal(photo.name, "Cover photo");
      assert.notOk(group.isNew);
      assert.strictEqual(group.photo, photo);
      assert.equal(photo.group_id, group.id);
      assert.deepEqual(photo.changes, { group_id: 1 });

      let fetchedGroup = await MemoryGroup.find(group.id); // TODO: this should set the last one maybe(?) should have group in revisionHistory

      assert.notOk(fetchedGroup.isNew);

      assert.strictEqual(fetchedGroup.photo, photo);
      assert.strictEqual(group.photo, photo);
      assert.strictEqual(photo.group, fetchedGroup);
      assert.equal(photo.group_id, group.id);

      let newPhoto = MemoryPhoto.build({ name: "Another cover photo" });

      assert.equal(newPhoto.name, "Another cover photo");
      assert.strictEqual(photo.group, fetchedGroup);

      fetchedGroup.photo = newPhoto;

      assert.strictEqual(fetchedGroup.photo, newPhoto);
      assert.equal(newPhoto.group_id, fetchedGroup.id);
      assert.strictEqual(group.photo, photo); // TODO: should this be fetchedGroup(?)
      assert.strictEqual(photo.group, group);
      assert.equal(photo.group_id, fetchedGroup.id);

      let updatedGroup = await MemoryGroup.update(fetchedGroup);

      assert.strictEqual(fetchedGroup.photo, newPhoto);
      assert.deepEqual(updatedGroup, fetchedGroup);
      assert.strictEqual(updatedGroup.photo, newPhoto);
      assert.strictEqual(newPhoto.group, updatedGroup);
      assert.strictEqual(photo.group, updatedGroup);
    });

    test("fetched model can remove the relationship before update", async function (assert) {
      let { MemoryGroup, MemoryPhoto } = generateModels();

      let photo = await MemoryPhoto.insert({ name: "Cover photo" });

      assert.equal(photo.group_id, null);

      let group = await MemoryGroup.insert({ name: "Dinner group", photo });

      assert.equal(photo.name, "Cover photo");
      assert.notOk(group.isNew);
      assert.strictEqual(group.photo, photo);
      assert.strictEqual(photo.group, group);
      assert.equal(photo.group_id, group.id);
      assert.deepEqual(photo.changes, { group_id: 1 });

      let fetchedGroup = await MemoryGroup.find(group.id);

      assert.notOk(fetchedGroup.isNew);
      assert.strictEqual(fetchedGroup.photo, photo);
      assert.strictEqual(photo.group, fetchedGroup);
      assert.equal(photo.group_id, group.id);

      fetchedGroup.photo = null;

      assert.strictEqual(fetchedGroup.photo, null);
      assert.strictEqual(group.photo, photo);
      assert.equal(photo.group_id, group.id);
      assert.strictEqual(photo.group, group);

      let updatedGroup = await MemoryGroup.update(fetchedGroup);

      assert.deepEqual(fetchedGroup, updatedGroup);
      assert.strictEqual(fetchedGroup.photo, null);
      assert.strictEqual(updatedGroup.photo, null);

      assert.strictEqual(photo.group, updatedGroup);
      assert.equal(photo.group_id, group.id);
      assert.strictEqual(group.photo, photo);
    });

    test("fetched model can remove the relationship before delete", async function (assert) {
      let { MemoryGroup, MemoryPhoto } = generateModels();

      let photo = await MemoryPhoto.insert({ name: "Cover photo" });

      assert.equal(photo.group_id, null);

      let group = await MemoryGroup.insert({ name: "Dinner group", photo });

      assert.equal(photo.name, "Cover photo");
      assert.notOk(group.isNew);
      assert.strictEqual(group.photo, photo);
      assert.equal(photo.group_id, group.id);
      assert.deepEqual(photo.changes, { group_id: 1 });

      let fetchedGroup = await MemoryGroup.find(group.id);

      assert.notOk(fetchedGroup.isNew);
      assert.strictEqual(fetchedGroup.photo, photo);
      assert.strictEqual(group.photo, photo);
      assert.strictEqual(photo.group, fetchedGroup);
      assert.equal(photo.group_id, group.id);

      fetchedGroup.photo = null;

      assert.equal(fetchedGroup.photo, null);
      assert.strictEqual(group.photo, photo);
      assert.strictEqual(photo.group, group);
      assert.deepEqual(photo.group.toJSON(), fetchedGroup.toJSON());
      assert.equal(photo.group_id, group.id);

      // TODO: implement this!
      // group.photo = null;

      // assert.equal(group.photo, null);
      // assert.equal(photo.group, null);
      // assert.equal(photo.group_id, null);

      // group.photo = photo;

      // assert.equal(fetchedGroup.photo, null);
      // assert.strictEqual(group.photo, photo);
      // assert.strictEqual(photo.group, group);
      // assert.deepEqual(photo.group.toJSON(), fetchedGroup.toJSON());
      // assert.equal(photo.group_id, group.id);

      let deletedGroup = await MemoryGroup.delete(fetchedGroup);

      assert.deepEqual(fetchedGroup, deletedGroup);
      assert.equal(fetchedGroup.photo, null);
      assert.equal(deletedGroup.photo, null);
      assert.equal(photo.group, null);
      assert.equal(photo.group_id, null);
      assert.equal(group.photo, null);
    });

    test("a model can be built, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
      let { MemoryGroup, MemoryPhoto } = generateModels();

      let firstPhoto = await MemoryPhoto.insert({ name: "First photo" });
      let secondPhoto = await MemoryPhoto.insert({ name: "Second photo" });
      let group = MemoryGroup.build({ name: "Dinner group", photo: secondPhoto });

      assert.ok(group.isNew);
      assert.equal(group.photo, secondPhoto);
      assert.equal(secondPhoto.group, group);
      assert.equal(secondPhoto.group_id, group.id);

      window.firstPhoto = firstPhoto;
      window.secondPhoto = secondPhoto;
      window.group = group;

      group.photo = firstPhoto;

      assert.equal(group.photo, firstPhoto);
      assert.equal(firstPhoto.group, group);
      assert.equal(firstPhoto.group_id, group.id);

      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_id, null);

      let insertedGroup = await MemoryGroup.insert(group);

      assert.equal(insertedGroup.photo, firstPhoto);
      assert.equal(group.photo, firstPhoto);
      assert.equal(firstPhoto.group, insertedGroup);

      debugger;
      insertedGroup.photo = secondPhoto; // NOTE: this fucks up firstPhoto.group reference
      debugger;

      assert.equal(insertedGroup.photo, secondPhoto);
      assert.equal(secondPhoto.group, insertedGroup);
      assert.equal(secondPhoto.group_id, insertedGroup.id);

      assert.equal(firstPhoto.group, group); // NOTE: this is bit odd change after reflection(?)
      assert.equal(firstPhoto.group_id, group.id);
      assert.equal(group.photo, firstPhoto);

      let updatedGroup = await MemoryGroup.update(insertedGroup); // TODO: BUG: this makes firstPhoto.group to updatedGroup.id
      // TODO: this is the *FIRST* problem
      // groupInstance[0] & [2] still points to firstPhoto!! on photoMap
      // debugger;
      // console.log('YYYYYYYYY');

      assert.equal(group.photo, firstPhoto);
      assert.deepEqual(insertedGroup.photo, secondPhoto);
      assert.equal(updatedGroup.photo, secondPhoto);
      assert.equal(secondPhoto.group, updatedGroup);
      assert.equal(secondPhoto.group_id, updatedGroup.id);
      assert.equal(firstPhoto.group, updatedGroup);
      assert.equal(firstPhoto.group_id, updatedGroup.id);

      window.insertedGroup = insertedGroup;
      window.updatedGroup = updatedGroup;
      window.secondPhoto = secondPhoto;
      window.firstPhoto = firstPhoto;

      console.log('XXXXXXXXXXX');
      debugger;
      updatedGroup.photo = null;  // firstPhoto.group -> updatedGroup becomes dangling because updatedGroup.photo points to secondPhoto

      // NOTE: when this happens secondPhoto.group(updatedGroup) is null , insertedGroup just gets it from updatedGroup
      debugger;
      console.log('YYYYYYYYYYYY');

      assert.equal(updatedGroup.photo, null);
      assert.equal(insertedGroup.photo, secondPhoto);
      assert.equal(secondPhoto.group, insertedGroup);
      assert.equal(secondPhoto.group_id, insertedGroup.id);
      // This has nothing to do with firstPhoto.group (belongsTo) -> updatedGroup

      assert.equal(firstPhoto.group, insertedGroup)
      assert.equal(firstPhoto.group_id, insertedGroup.id);

      let deletedGroup = await MemoryGroup.delete(updatedGroup);

      assert.equal(deletedGroup.photo, null);
      assert.equal(updatedGroup.photo, null);
      assert.equal(firstPhoto.group, null);
      assert.equal(firstPhoto.group_id, null);
      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_id, null);
    });

    // // test("a model can be fetched, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
    //   // let { MemoryGroup, MemoryPhoto } = generateModels();

    //   // MemoryPhoto.cache([
    //     // {
    //       // id: 1,
    //       // first_name: "Izel",
    //     // },
    //     // {
    //       // id: 2,
    //       // first_name: "Moris",
    //     // },
    //   // ]);

    //   // let firstPhoto = await MemoryPhoto.find(1);
    //   // let secondPhoto = await MemoryPhoto.find(2);
    //   // let group = MemoryGroup.build({ name: "Dinner group", photo: secondPhoto });

    //   // assert.ok(group.isNew);
    //   // assert.equal(group.photo, secondPhoto);
    //   // assert.equal(firstPhoto.group_id, null);
    //   // assert.equal(secondPhoto.group_id, group.id);

    //   // group.photo = firstPhoto;

    //   // assert.equal(group.photo, firstPhoto);
    //   // assert.equal(firstPhoto.group_id, group.id);
    //   // assert.equal(secondPhoto.group_id, null);

    //   // let insertedGroup = await MemoryGroup.insert(group);

    //   // assert.equal(insertedGroup.photo, firstPhoto);
    //   // assert.equal(group.photo, insertedGroup.photo);
    //   // assert.equal(firstPhoto.group_id, insertedGroup.id);
    //   // assert.equal(secondPhoto.group_id, null);

    //   // insertedGroup.photo = secondPhoto;

    //   // assert.equal(insertedGroup.photo, secondPhoto);
    //   // assert.equal(firstPhoto.group_id, null);
    //   // assert.equal(secondPhoto.group_id, insertedGroup.id);

    //   // let updatedGroup = await MemoryGroup.update(insertedGroup);

    //   // assert.equal(updatedGroup.photo, secondPhoto);
    //   // assert.equal(insertedGroup.photo, secondPhoto);

    //   // updatedGroup.photo = null;

    //   // assert.equal(updatedGroup.photo, null);
    //   // assert.equal(firstPhoto.group_id, null);
    //   // assert.equal(secondPhoto.group_id, null);

    //   // let deletedGroup = await MemoryGroup.delete(updatedGroup);

    //   // assert.equal(updatedGroup.photo, null);
    //   // assert.equal(deletedGroup.photo, null);
    //   // assert.equal(firstPhoto.group_id, null);
    //   // assert.equal(secondPhoto.group_id, null);
    // // });

    // // test("a model can fetch its not loaded relationship", async function (assert) {
    //   // let { MemoryGroup, MemoryPhoto } = generateModels();

    //   // let group = await MemoryGroup.insert({ name: "Dinner group" });
    //   // let firstPhoto = await MemoryPhoto.insert({ name: "First photo" });
    //   // let secondPhoto = await MemoryPhoto.insert({ name: "Second photo", group: group });

    //   // assert.equal(secondPhoto.group_id, group.id);
    //   // assert.equal(group.photo, secondPhoto);
    // // });

    // // TODO: bugfix this one
    // // test("a models relationship promise reference turns to null when relationship foreign key sets to null", async function (assert) {
    //   // let { MemoryGroup, MemoryPhoto } = generateModels();

    //   // let group = await MemoryGroup.insert({ name: "Dinner group" });
    //   // let firstPhoto = await MemoryPhoto.insert({ name: "First photo" });
    //   // let secondPhoto = await MemoryPhoto.insert({ name: "Second photo", group: group });

    //   // assert.equal(group.photo, secondPhoto);

    //   // console.log('XXXXXXXXX');
    //   // debugger;
    //   // secondPhoto.group_id = null;
    //   // debugger;
    //   // console.log('YYYYYYYY');

    //   // assert.equal(group.photo, null);
    // // });

    // // TODO: NOTE: Im here
    // // TODO: all photos will be groups, all users will be photo
    // // Completely change this
    // // test("a models empty relationship reference turns to promise and can fetch when changed", async function (assert) {
    // //   let { MemoryPhoto, MemoryUser } = generateModels();

    // //   let firstUser = await MemoryUser.insert({ first_name: "Izel" });
    // //   let secondUser = await MemoryUser.insert({ first_name: "Moris" });
    // //   let photo = MemoryPhoto.build({ name: "Dinner photo" });

    // //   assert.equal(photo.owner, null);
    // //   assert.equal(photo.owner_id, null);

    // //   photo.owner_id = secondUser.id;

    // //   assert.deepEqual(photo.owner, secondUser);
    // //   assert.equal(photo.owner_id, secondUser.id);
    // // });
  }
);
