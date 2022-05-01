import Model, { PrimaryGeneratedColumn, Column, RuntimeError, Serializer } from "@memoria/model";
import { module, test, skip } from "qunitx";
import setupMemoria from "../../helpers/setup-memoria.js";
import generateModels from "../../helpers/models-with-relations/memory/id/index.js";

module(
  "@memoria/adapters | MemoryAdapter | Relationships | @belongsTo API for ID(integer)",
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
      assert.equal(photo.owner_id, user.id);

      let insertedPhoto = await MemoryPhoto.insert(photo);

      assert.ok(user.isNew);
      assert.notOk(photo.isNew);
      assert.notOk(insertedPhoto.isNew);

      assert.deepEqual(photo.owner, user);
      assert.deepEqual(insertedPhoto.owner, user);
      assert.equal(insertedPhoto.owner_id, user.id);
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
      assert.equal(secondInsertedPhoto.owner_id, user.id);
      assert.deepEqual(secondPhoto.owner, user);
      assert.equal(secondPhoto.owner_id, user.id);
    });

    test("fetched model can request the relationship(without embed) and change the relationship before update", async function (assert) {
      let { MemoryPhoto, MemoryUser } = generateModels();

      let user = await MemoryUser.insert({ first_name: "Izel" });
      let photo = await MemoryPhoto.insert({ name: "Dinner photo", owner_id: user.id });

      assert.equal(user.first_name, "Izel");
      assert.notOk(photo.isNew);
      assert.propEqual(photo.owner, user);
      assert.equal(photo.owner_id, user.id);

      let fetchedPhoto = await MemoryPhoto.find(photo.id);

      assert.notOk(fetchedPhoto.isNew);
      assert.propEqual(fetchedPhoto.owner, user);
      assert.equal(fetchedPhoto.owner_id, user.id);

      let newOwner = MemoryUser.build({ first_name: "Moris" });

      assert.equal(newOwner.first_name, "Moris");

      fetchedPhoto.owner = newOwner;

      assert.deepEqual(fetchedPhoto.owner, newOwner);
      assert.equal(fetchedPhoto.owner_id, null);

      let updatedPhoto = await MemoryPhoto.update(fetchedPhoto);

      assert.propEqual(fetchedPhoto, updatedPhoto);
      assert.deepEqual(fetchedPhoto.owner, newOwner);
      assert.deepEqual(updatedPhoto.owner, newOwner);
      assert.equal(updatedPhoto.owner_id, null);
    });

    test("fetched model can remove the relationship before update", async function (assert) {
      let { MemoryPhoto, MemoryUser } = generateModels();

      let user = await MemoryUser.insert({ first_name: "Izel" });
      let photo = await MemoryPhoto.insert({ name: "Dinner photo", owner_id: user.id });

      assert.equal(user.first_name, "Izel");
      assert.notOk(photo.isNew);
      assert.propEqual(photo.owner, user);

      let fetchedPhoto = await MemoryPhoto.find(photo.id);

      assert.notOk(fetchedPhoto.isNew);
      assert.propEqual(fetchedPhoto.owner, user);
      assert.equal(fetchedPhoto.owner_id, user.id);

      fetchedPhoto.owner = null;

      assert.equal(fetchedPhoto.owner, null);
      assert.equal(fetchedPhoto.owner_id, null);

      let updatedPhoto = await MemoryPhoto.update(fetchedPhoto);

      assert.propEqual(fetchedPhoto, updatedPhoto);
      assert.equal(fetchedPhoto.owner, null);
      assert.equal(updatedPhoto.owner, null);
      assert.equal(updatedPhoto.owner_id, null);
    });

    test("fetched model can remove the relationship before delete", async function (assert) {
      let { MemoryPhoto, MemoryUser } = generateModels();

      let user = await MemoryUser.insert({ first_name: "Izel" });
      let photo = await MemoryPhoto.insert({ name: "Dinner photo", owner_id: user.id });

      assert.equal(user.first_name, "Izel");
      assert.notOk(photo.isNew);
      assert.propEqual(photo.owner, user);

      let fetchedPhoto = await MemoryPhoto.find(photo.id);

      assert.notOk(fetchedPhoto.isNew);
      assert.propEqual(fetchedPhoto.owner, user);
      assert.equal(fetchedPhoto.owner_id, user.id);

      fetchedPhoto.owner = null;

      assert.equal(fetchedPhoto.owner, null);
      assert.equal(fetchedPhoto.owner_id, null);

      let deletedPhoto = await MemoryPhoto.delete(fetchedPhoto);

      assert.propEqual(fetchedPhoto, deletedPhoto);
      assert.equal(fetchedPhoto.owner, null);
      assert.equal(deletedPhoto.owner, null);
      assert.equal(deletedPhoto.owner_id, null);
    });

    test("a model can be built, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
      let { MemoryPhoto, MemoryUser } = generateModels();

      let firstUser = await MemoryUser.insert({ first_name: "Izel" });
      let secondUser = await MemoryUser.insert({ first_name: "Moris" });
      let photo = MemoryPhoto.build({ name: "Dinner photo", owner: secondUser });

      assert.ok(photo.isNew);
      assert.propEqual(photo.owner, secondUser);
      assert.equal(photo.owner_id, secondUser.id);

      photo.owner = firstUser;

      assert.propEqual(photo.owner, firstUser);
      assert.equal(photo.owner_id, firstUser.id);

      let insertedPhoto = await MemoryPhoto.insert(photo);

      assert.propEqual(insertedPhoto.owner, firstUser);
      assert.propEqual(photo.owner, insertedPhoto.owner);

      insertedPhoto.owner = secondUser;

      assert.propEqual(insertedPhoto.owner, secondUser);
      assert.equal(insertedPhoto.owner_id, secondUser.id);

      let updatedPhoto = await MemoryPhoto.update(insertedPhoto);

      assert.propEqual(updatedPhoto.owner, secondUser);
      assert.propEqual(insertedPhoto.owner, secondUser);

      updatedPhoto.owner = null;

      assert.equal(updatedPhoto.owner, null);
      assert.equal(updatedPhoto.owner_id, null);

      let deletedPhoto = await MemoryPhoto.delete(updatedPhoto);

      assert.equal(updatedPhoto.owner, null);
      assert.propEqual(deletedPhoto.owner, null);
      assert.equal(deletedPhoto.owner_id, null);
    });

    test("a model can create, update, delete with correct changing relationships without GET in one flow", async function (assert) {
      let { MemoryPhoto, MemoryUser } = generateModels();

      MemoryUser.cache([
        {
          id: 1,
          first_name: "Izel",
        },
        {
          id: 2,
          first_name: "Moris",
        },
      ]);

      let firstUser = await MemoryUser.find(1);
      let secondUser = await MemoryUser.find(2);
      let photo = MemoryPhoto.build({ name: "Dinner photo", owner: secondUser });

      assert.ok(photo.isNew);
      assert.propEqual(photo.owner, secondUser);
      assert.equal(photo.owner_id, secondUser.id);

      photo.owner = firstUser;

      assert.propEqual(photo.owner, firstUser);
      assert.equal(photo.owner_id, firstUser.id);

      let insertedPhoto = await MemoryPhoto.insert(photo);

      assert.propEqual(insertedPhoto.owner, firstUser);
      assert.propEqual(photo.owner, insertedPhoto.owner);

      insertedPhoto.owner = secondUser;

      assert.propEqual(insertedPhoto.owner, secondUser);
      assert.equal(insertedPhoto.owner_id, secondUser.id);

      let updatedPhoto = await MemoryPhoto.update(insertedPhoto);

      assert.propEqual(updatedPhoto.owner, secondUser);
      assert.propEqual(insertedPhoto.owner, secondUser);

      updatedPhoto.owner = null;

      assert.equal(updatedPhoto.owner, null);
      assert.equal(updatedPhoto.owner_id, null);

      let deletedPhoto = await MemoryPhoto.delete(updatedPhoto);

      assert.equal(updatedPhoto.owner, null);
      assert.propEqual(deletedPhoto.owner, null);
      assert.equal(deletedPhoto.owner_id, null);
    });

    test("a model can fetch its not loaded relationship", async function (assert) {
      let { MemoryPhoto, MemoryUser } = generateModels();

      let firstUser = await MemoryUser.insert({ first_name: "Izel" });
      let secondUser = await MemoryUser.insert({ first_name: "Moris" });
      let photo = MemoryPhoto.build({ name: "Dinner photo", owner_id: secondUser.id });

      assert.deepEqual(photo.owner, secondUser);
      assert.equal(photo.owner_id, secondUser.id);
    });

    test("a models relationship promise reference turns to null when relationship foreign key sets to null", async function (assert) {
      let { MemoryPhoto, MemoryUser } = generateModels();

      let firstUser = await MemoryUser.insert({ first_name: "Izel" });
      let secondUser = await MemoryUser.insert({ first_name: "Moris" });
      let photo = MemoryPhoto.build({ name: "Dinner photo", owner_id: secondUser.id });

      assert.deepEqual(photo.owner, secondUser);

      photo.owner_id = null;

      assert.equal(photo.owner, null);
    });

    test("a models empty relationship reference turns to promise and can fetch when changed", async function (assert) {
      let { MemoryPhoto, MemoryUser } = generateModels();

      let firstUser = await MemoryUser.insert({ first_name: "Izel" });
      let secondUser = await MemoryUser.insert({ first_name: "Moris" });
      let photo = MemoryPhoto.build({ name: "Dinner photo" });

      assert.equal(photo.owner, null);
      assert.equal(photo.owner_id, null);

      photo.owner_id = secondUser.id;

      assert.deepEqual(photo.owner, secondUser);
      assert.equal(photo.owner_id, secondUser.id);
    });
  }
);
