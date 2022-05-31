import Model, { PrimaryGeneratedColumn, Column, RuntimeError, Serializer, RelationshipPromise } from "@memoria/model";
import { module, test, skip } from "qunitx";
import setupMemoria from "../../helpers/setup-memoria.js";
import generateModels from "../../helpers/models-with-relations/memory/uuid/index.js";

module(
  "@memoria/adapters | MemoryAdapter | Relationships | @belongsTo API for UUID(string)",
  function (hooks) {
    setupMemoria(hooks);

    // TODO: also add embed + serializer tests to the test cases correctly
    test("new model can be built from scratch and it sends the right data to the server during post", async function (assert) {
      let { MemoryPhoto, MemoryUser } = generateModels();

      let user = MemoryUser.build({ first_name: "Izel" });
      let photo = MemoryPhoto.build({ name: "Dinner photo", owner: user });

      assert.ok(user instanceof MemoryUser);
      assert.ok(user.isNew);
      assert.ok(photo.isNew);
      assert.deepEqual(photo.owner, user);
      assert.equal(photo.owner_uuid, user.uuid);

      let insertedPhoto = await MemoryPhoto.insert(photo);

      assert.ok(user.isNew);
      assert.notOk(photo.isNew);
      assert.notOk(insertedPhoto.isNew);

      assert.deepEqual(photo.owner, user);
      assert.deepEqual(insertedPhoto.owner, user);
      assert.equal(insertedPhoto.owner_uuid, user.uuid);
      assert.ok(insertedPhoto.owner.isNew, true);

      let insertedUser = await MemoryUser.insert(user);

      assert.notOk(user.isNew);
      assert.notOk(insertedUser.isNew);
      assert.notOk(insertedPhoto.owner.isNew);

      assert.deepEqual(photo.owner, user);
      assert.deepEqual(insertedPhoto.owner, user);
      assert.deepEqual(insertedPhoto.owner, insertedUser);

      assert.ok(user !== insertedUser);
    });

    test("new model can have relationship set afterwards and it sends the right data to the server during post", async function (assert) {
      let { MemoryPhoto, MemoryUser } = generateModels();

      let user = MemoryUser.build({ first_name: "Izel" });
      let photo = MemoryPhoto.build({ name: "Dinner photo" });
      let secondPhoto = MemoryPhoto.build({ name: "Second photo" });

      assert.equal(photo.owner, null);
      assert.equal(secondPhoto.owner, null);
      assert.ok(photo.isNew);
      assert.ok(secondPhoto.isNew);

      let insertedPhoto = await MemoryPhoto.insert(photo);

      assert.notOk(photo.isNew);
      assert.notOk(insertedPhoto.isNew);
      assert.ok(insertedPhoto !== photo);
      assert.equal(photo.owner, null);
      assert.equal(insertedPhoto.owner, null);

      secondPhoto.owner = user;

      let secondInsertedPhoto = await MemoryPhoto.insert(secondPhoto);

      assert.ok(secondInsertedPhoto !== secondPhoto);
      assert.notOk(secondPhoto.isNew);
      assert.notOk(secondInsertedPhoto.isNew);
      assert.ok(secondPhoto !== secondInsertedPhoto);
      assert.deepEqual(secondInsertedPhoto.owner, user);
      assert.equal(secondInsertedPhoto.owner_uuid, user.uuid);
      assert.deepEqual(secondPhoto.owner, user);
      assert.equal(secondPhoto.owner_uuid, user.uuid);
    });

    test("fetched model can request the relationship(without embed) and change the relationship before update", async function (assert) {
      let { MemoryPhoto, MemoryUser } = generateModels();

      let user = await MemoryUser.insert({ first_name: "Izel" });
      let photo = await MemoryPhoto.insert({ name: "Dinner photo", owner_uuid: user.uuid });

      assert.equal(user.first_name, "Izel");
      assert.notOk(photo.isNew);
      assert.propEqual(photo.owner, user);
      assert.equal(photo.owner_uuid, user.uuid);

      let fetchedPhoto = await MemoryPhoto.find(photo.uuid);

      assert.notOk(fetchedPhoto.isNew);
      assert.propEqual(fetchedPhoto.owner, user);
      assert.equal(fetchedPhoto.owner_uuid, user.uuid);

      let newOwner = MemoryUser.build({ first_name: "Moris" });

      assert.equal(newOwner.first_name, "Moris");

      fetchedPhoto.owner = newOwner;

      assert.deepEqual(fetchedPhoto.owner, newOwner);
      assert.equal(fetchedPhoto.owner_uuid, null);

      let updatedPhoto = await MemoryPhoto.update(fetchedPhoto);

      assert.deepEqual(fetchedPhoto, updatedPhoto);
      assert.deepEqual(fetchedPhoto.owner, newOwner);
      assert.deepEqual(updatedPhoto.owner, newOwner);
      assert.equal(updatedPhoto.owner_uuid, null);
    });

    test("fetched model can remove the relationship before update", async function (assert) {
      let { MemoryPhoto, MemoryUser } = generateModels();

      let user = await MemoryUser.insert({ first_name: "Izel" });
      let photo = await MemoryPhoto.insert({ name: "Dinner photo", owner_uuid: user.uuid });

      assert.equal(user.first_name, "Izel");
      assert.notOk(photo.isNew);
      assert.propEqual(photo.owner, user);

      let fetchedPhoto = await MemoryPhoto.find(photo.uuid);

      assert.notOk(fetchedPhoto.isNew);
      assert.propEqual(fetchedPhoto.owner, user);
      assert.equal(fetchedPhoto.owner_uuid, user.uuid);

      fetchedPhoto.owner = null;

      assert.equal(fetchedPhoto.owner, null);
      assert.equal(fetchedPhoto.owner_uuid, null);

      let updatedPhoto = await MemoryPhoto.update(fetchedPhoto);

      assert.propEqual(fetchedPhoto, updatedPhoto);
      assert.equal(fetchedPhoto.owner, null);
      assert.equal(updatedPhoto.owner, null);
      assert.equal(updatedPhoto.owner_uuid, null);
    });

    test("fetched model can remove the relationship before delete", async function (assert) {
      let { MemoryPhoto, MemoryUser } = generateModels();

      let user = await MemoryUser.insert({ first_name: "Izel" });
      let photo = await MemoryPhoto.insert({ name: "Dinner photo", owner_uuid: user.uuid });

      assert.equal(user.first_name, "Izel");
      assert.notOk(photo.isNew);
      assert.propEqual(photo.owner, user);

      let fetchedPhoto = await MemoryPhoto.find(photo.uuid);

      assert.notOk(fetchedPhoto.isNew);
      assert.propEqual(fetchedPhoto.owner, user);
      assert.equal(fetchedPhoto.owner_uuid, user.uuid);

      fetchedPhoto.owner = null;

      assert.equal(fetchedPhoto.owner, null);
      assert.equal(fetchedPhoto.owner_uuid, null);

      let deletedPhoto = await MemoryPhoto.delete(fetchedPhoto);

      assert.propEqual(fetchedPhoto, deletedPhoto);
      assert.equal(fetchedPhoto.owner, null);
      assert.equal(deletedPhoto.owner, null);
      assert.equal(deletedPhoto.owner_uuid, null);
    });

    test("a model can be built, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
      let { MemoryPhoto, MemoryUser } = generateModels();

      let firstUser = await MemoryUser.insert({ first_name: "Izel" });
      let secondUser = await MemoryUser.insert({ first_name: "Moris" });
      let photo = MemoryPhoto.build({ name: "Dinner photo", owner: secondUser });

      assert.ok(photo.isNew);
      assert.propEqual(photo.owner, secondUser);
      assert.equal(photo.owner_uuid, secondUser.uuid);

      photo.owner = firstUser;

      assert.propEqual(photo.owner, firstUser);
      assert.equal(photo.owner_uuid, firstUser.uuid);

      let insertedPhoto = await MemoryPhoto.insert(photo);

      assert.propEqual(insertedPhoto.owner, firstUser);
      assert.propEqual(photo.owner, insertedPhoto.owner);

      insertedPhoto.owner = secondUser;

      assert.propEqual(insertedPhoto.owner, secondUser);
      assert.equal(insertedPhoto.owner_uuid, secondUser.uuid);

      let updatedPhoto = await MemoryPhoto.update(insertedPhoto);

      assert.deepEqual(updatedPhoto.owner, secondUser);
      assert.deepEqual(insertedPhoto.owner, secondUser);

      updatedPhoto.owner = null;

      assert.equal(updatedPhoto.owner, null);
      assert.equal(updatedPhoto.owner_uuid, null);

      let deletedPhoto = await MemoryPhoto.delete(updatedPhoto);

      assert.equal(updatedPhoto.owner, null);
      assert.equal(deletedPhoto.owner, null);
      assert.equal(deletedPhoto.owner_uuid, null);
    });

    // TODO: insert() generates 3 instances when instance is provided, make it 2
    test("reflexive side test: a model can be built, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
      let { MemoryGroup, MemoryPhoto } = generateModels();

      let firstPhoto = await MemoryPhoto.insert({ name: "First photo" }); // insert generates 2 instanceCaches
      let secondPhoto = await MemoryPhoto.insert({ name: "Second photo" });
      let group = MemoryGroup.build({ name: "Dinner group", photo: secondPhoto });

      assert.ok(group.isNew);
      assert.deepEqual(group.photo, secondPhoto);
      assert.equal(secondPhoto.group_uuid, group.uuid);

      firstPhoto.group = group; // TODO: this should trigger a logical warning(!!) setting group to firstPhoto but secondPhoto already has group as well(?) clean that first(?)

      assert.deepEqual(firstPhoto.group, group);
      assert.equal(firstPhoto.group_uuid, group.uuid);
      assert.deepEqual(secondPhoto.group, group);
      assert.equal(secondPhoto.group_uuid, group.uuid);
      assert.deepEqual(group.photo, firstPhoto);

      let insertedGroup = await MemoryGroup.insert(group);

      assert.deepEqual(insertedGroup.photo, firstPhoto);
      assert.equal(group.photo, insertedGroup.photo);
      assert.deepEqual(group.photo, firstPhoto);

      assert.deepEqual(firstPhoto.group, insertedGroup);
      assert.equal(firstPhoto.group_uuid, insertedGroup.uuid);
      assert.equal(secondPhoto.group, insertedGroup);
      assert.equal(secondPhoto.group_uuid, insertedGroup.uuid);

      secondPhoto.group = insertedGroup;

      assert.deepEqual(secondPhoto.group, insertedGroup);
      assert.equal(secondPhoto.group_uuid, insertedGroup.uuid);
      assert.deepEqual(insertedGroup.photo, secondPhoto);
      assert.deepEqual(group.photo, firstPhoto);
      assert.deepEqual(firstPhoto.group, insertedGroup);
      assert.equal(firstPhoto.group_uuid, insertedGroup.uuid);

      let updatedGroup = await MemoryGroup.update(insertedGroup);

      assert.equal(insertedGroup.photo, secondPhoto);
      assert.equal(updatedGroup.photo, secondPhoto);
      assert.deepEqual(group.photo, firstPhoto);

      assert.equal(secondPhoto.group, updatedGroup);
      assert.equal(secondPhoto.group_uuid, updatedGroup.uuid);
      assert.deepEqual(firstPhoto.group, updatedGroup);
      assert.equal(firstPhoto.group_uuid, updatedGroup.uuid);

      secondPhoto.group = null;

      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_uuid, null);
      assert.notEqual(updatedGroup.photo, secondPhoto); // TODO: check the value to be firstPhoto instead of notEqual

      assert.equal(firstPhoto.group, updatedGroup);
      assert.equal(firstPhoto.group_uuid, updatedGroup.uuid);
      assert.notEqual(insertedGroup.photo, secondPhoto); // TODO: check the value to be firstPhoto instead of notEqual
      assert.deepEqual(group.photo, firstPhoto);

      let deletedGroup = await MemoryGroup.delete(updatedGroup);

      assert.equal(updatedGroup.photo, null);
      assert.equal(await deletedGroup.photo, null);
      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_uuid, null);
      assert.equal(firstPhoto.group, null);
      assert.equal(firstPhoto.group_uuid, null);
    });

    test("a model can be fetched, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
      let { MemoryPhoto, MemoryUser } = generateModels();

      MemoryUser.cache([
        {
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          first_name: "Izel",
        },
        {
          uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
          first_name: "Moris",
        },
      ]);

      let firstUser = await MemoryUser.find("499ec646-493f-4eea-b92e-e383d94182f4");
      let secondUser = await MemoryUser.find("77653ad3-47e4-4ec2-b49f-57ea36a627e7");
      let photo = MemoryPhoto.build({ name: "Dinner photo", owner: secondUser });

      assert.ok(photo.isNew);
      assert.equal(photo.owner, secondUser);
      assert.equal(photo.owner_uuid, secondUser.uuid);

      photo.owner = firstUser;

      assert.equal(photo.owner, firstUser);
      assert.equal(photo.owner_uuid, firstUser.uuid);

      let insertedPhoto = await MemoryPhoto.insert(photo);

      assert.equal(insertedPhoto.owner, firstUser);
      assert.equal(photo.owner, insertedPhoto.owner);

      insertedPhoto.owner = secondUser;

      assert.equal(insertedPhoto.owner, secondUser);
      assert.equal(insertedPhoto.owner_uuid, secondUser.uuid);

      let updatedPhoto = await MemoryPhoto.update(insertedPhoto);

      assert.equal(updatedPhoto.owner, secondUser);
      assert.equal(insertedPhoto.owner, secondUser);

      updatedPhoto.owner = null;

      assert.equal(updatedPhoto.owner, null);
      assert.equal(updatedPhoto.owner_uuid, null);

      let deletedPhoto = await MemoryPhoto.delete(updatedPhoto);

      assert.equal(updatedPhoto.owner, null);
      assert.equal(deletedPhoto.owner, null);
      assert.equal(deletedPhoto.owner_uuid, null);
    });

    test("a model can fetch its not loaded relationship", async function (assert) {
      let { MemoryPhoto, MemoryUser } = generateModels();

      let firstUser = await MemoryUser.insert({ first_name: "Izel" });
      let secondUser = await MemoryUser.insert({ first_name: "Moris" });
      let photo = MemoryPhoto.build({ name: "Dinner photo", owner_uuid: secondUser.uuid });

      assert.deepEqual(photo.owner, secondUser);
      assert.equal(photo.owner_uuid, secondUser.uuid);
    });

    test("a models relationship promise reference turns to null when relationship foreign key sets to null", async function (assert) {
      let { MemoryPhoto, MemoryUser } = generateModels();

      let firstUser = await MemoryUser.insert({ first_name: "Izel" });
      let secondUser = await MemoryUser.insert({ first_name: "Moris" });
      let photo = MemoryPhoto.build({ name: "Dinner photo", owner_uuid: secondUser.uuid });

      assert.deepEqual(photo.owner, secondUser);

      photo.owner_uuid = null;

      assert.equal(photo.owner, null);
    });

    test("a models empty relationship reference turns to promise and can fetch when changed", async function (assert) {
      let { MemoryPhoto, MemoryUser } = generateModels();

      let firstUser = await MemoryUser.insert({ first_name: "Izel" });
      let secondUser = await MemoryUser.insert({ first_name: "Moris" });
      let photo = MemoryPhoto.build({ name: "Dinner photo" });

      assert.equal(photo.owner, null);
      assert.equal(photo.owner_uuid, null);

      photo.owner_uuid = secondUser.uuid;

      assert.deepEqual(photo.owner, secondUser);
      assert.equal(photo.owner_uuid, secondUser.uuid);
    });
  }
);
