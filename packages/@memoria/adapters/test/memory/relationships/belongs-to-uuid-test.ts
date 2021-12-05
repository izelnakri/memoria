import Model, { PrimaryGeneratedColumn, Column, RuntimeError, Serializer } from "@memoria/model";
import { module, test, skip } from "qunitx";
import setupMemoria from "../../helpers/setup-memoria.js";
import generateModels from "../../helpers/models-with-relations/memory/uuid/index.js";

module(
  "@memoria/adapters | MemoryAdapter | Relationships | @belongsTo API for UUID(string)",
  function (hooks) {
    setupMemoria(hooks);

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

      assert.propEqual(fetchedPhoto, updatedPhoto);
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

    // NOTE: this could be more advanced test if new record wasnt created in-memory for CRUD from input
    test("a model can create, update, delete with correct changing relationships without GET in one flow", async function (assert) {
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

      assert.propEqual(updatedPhoto.owner, secondUser);
      assert.propEqual(insertedPhoto.owner, secondUser);

      updatedPhoto.owner = null;

      assert.equal(updatedPhoto.owner, null);
      assert.equal(updatedPhoto.owner_uuid, null);

      let deletedPhoto = await MemoryPhoto.delete(updatedPhoto);

      assert.equal(updatedPhoto.owner, null);
      assert.propEqual(deletedPhoto.owner, null);
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

    test("a models relationship promise reference turns to null when relationship gets destroyed either way", async function (assert) {
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

// test("a models empty relationship reference can turn to promise, incorrectly fetched(with server error), than can be retried to fetch correctly", async function (assert) {});
// });
// this.Server.post("/photos", async ({ params }) => {
//   assert.deepEqual(photo.serialize(), params.photo);

//   try {
//     let photo = await ServerMemoryPhoto.insert(request.params.photo);

//     return { photo: ServerMemoryPhoto.serializer(photo) };
//   } catch (changeset) {
//     return { errors: Changeset.serializer(changeset) };
//   }
// });
// function generateModels() {
//   let { Group, PhotoComment, Photo, User } = generateModels();

//   let ServerPhoto = Object.assign(Object.create({}), Photo);
//   Object.setPrototypeOf(ServerPhoto, Photo);

//   // NOTE: change the adapter maybe(?)

//   return { Group, PhotoComment, Photo, User, ServerPhoto };
// }
// Post /photos(should not have owner embedded by default on REST) but after post should still keep the reference
