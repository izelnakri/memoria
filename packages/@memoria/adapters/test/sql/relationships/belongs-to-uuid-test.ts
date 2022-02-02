import Model, {
  Schema,
  PrimaryGeneratedColumn,
  RelationshipDB,
  Column,
  RuntimeError,
  Serializer,
  UnauthorizedError,
  NotFoundError,
  RelationshipPromise,
} from "@memoria/model";
import { module, test, skip } from "qunitx";
import setupMemoria from "../../helpers/setup-memoria.js";
import setupSQLModels from "../../helpers/models-with-relations/sql/uuid/index.js";

module(
  "@memoria/adapters | SQLAdapter | Relationships | @belongsTo API for UUID(string)",
  function (hooks) {
    setupMemoria(hooks);

    // TODO: also add embed tests to the test cases correctly
    test("new model can be built from scratch and it sends the right data to the server during post", async function (assert) {
      let { SQLPhoto, SQLUser } = setupSQLModels();

      let user = SQLUser.build({ first_name: "Izel" });
      let photo = SQLPhoto.build({ name: "Dinner photo", owner: user });

      assert.ok(user instanceof SQLUser);
      assert.ok(user.isNew);
      assert.ok(photo.isNew);
      assert.deepEqual(photo.owner, user);
      assert.equal(photo.owner_uui, user.uuid);

      let insertedPhoto = await SQLPhoto.insert(photo);

      assert.ok(user.isNew);
      assert.notOk(photo.isNew);
      assert.notOk(insertedPhoto.isNew);

      assert.deepEqual(photo.owner, user);

      assert.propEqual(insertedPhoto.owner, user);
      assert.equal(insertedPhoto.owner_uuid, user.uuid);
      assert.ok(insertedPhoto.owner.isNew, true);

      let insertedUser = await SQLUser.insert(user);

      assert.notOk(user.isNew);
      assert.notOk(insertedUser.isNew);
      assert.notOk(insertedPhoto.owner.isNew);

      assert.propEqual(photo.owner, user);
      assert.propEqual(insertedPhoto.owner, user);
      assert.propEqual(insertedPhoto.owner, insertedUser);

      assert.ok(user !== insertedUser);
    });

    test("new model can have relationship set afterwards and it sends the right data to the server during post", async function (assert) {
      let { SQLPhoto, SQLUser } = setupSQLModels();

      let user = SQLUser.build({ first_name: "Izel" });
      let photo = SQLPhoto.build({ name: "Dinner photo" });
      let secondPhoto = SQLPhoto.build({ name: "Second photo" });

      assert.equal(photo.owner, null);
      assert.equal(secondPhoto.owner, null);
      assert.ok(photo.isNew);
      assert.ok(secondPhoto.isNew);

      let insertedPhoto = await SQLPhoto.insert(photo);

      assert.notOk(photo.isNew);
      assert.notOk(insertedPhoto.isNew);
      assert.ok(insertedPhoto !== photo);
      assert.equal(photo.owner, null);
      assert.equal(insertedPhoto.owner, null);

      secondPhoto.owner = user;

      let secondInsertedPhoto = await SQLPhoto.insert(secondPhoto);

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
      let { SQLPhoto, SQLUser } = setupSQLModels();

      let user = await SQLUser.insert({ first_name: "Izel" });
      let photo = await SQLPhoto.insert({ name: "Dinner photo", owner_uuid: user.uuid });

      assert.equal(user.first_name, "Izel");
      assert.notOk(photo.isNew);
      assert.propEqual(photo.owner, user);
      assert.equal(photo.owner_uuid, user.uuid);

      let fetchedPhoto = await SQLPhoto.find(photo.uuid);

      assert.notOk(fetchedPhoto.isNew);
      assert.propEqual(fetchedPhoto.owner, user);
      assert.equal(fetchedPhoto.owner_uuid, user.uuid);

      let newOwner = SQLUser.build({ first_name: "Moris" });

      assert.equal(newOwner.first_name, "Moris");

      fetchedPhoto.owner = newOwner;

      assert.deepEqual(fetchedPhoto.owner, newOwner);
      assert.equal(fetchedPhoto.owner_uuid, null);

      let updatedPhoto = await SQLPhoto.update(fetchedPhoto);

      assert.deepEqual(fetchedPhoto.owner, newOwner);
      assert.propEqual(updatedPhoto.owner, null);
      assert.equal(updatedPhoto.owner_uuid, null);
    });

    test("fetched model can remove the relationship before update", async function (assert) {
      let { SQLPhoto, SQLUser } = setupSQLModels();

      let user = await SQLUser.insert({ first_name: "Izel" });
      let photo = await SQLPhoto.insert({ name: "Dinner photo", owner_uuid: user.uuid });

      assert.equal(user.first_name, "Izel");
      assert.notOk(photo.isNew);
      assert.propEqual(photo.owner, user);

      let fetchedPhoto = await SQLPhoto.find(photo.uuid);

      assert.notOk(fetchedPhoto.isNew);
      assert.propEqual(fetchedPhoto.owner, user);
      assert.equal(fetchedPhoto.owner_uuid, user.uuid);

      fetchedPhoto.owner = null;

      assert.equal(fetchedPhoto.owner, null);
      assert.equal(fetchedPhoto.owner_uuid, null);

      let updatedPhoto = await SQLPhoto.update(fetchedPhoto);

      assert.propEqual(fetchedPhoto, updatedPhoto);
      assert.equal(fetchedPhoto.owner, null);
      assert.equal(updatedPhoto.owner, null);
      assert.equal(updatedPhoto.owner_uuid, null);
    });

    test("fetched model can remove the relationship before delete", async function (assert) {
      let { SQLPhoto, SQLUser } = setupSQLModels();

      let user = await SQLUser.insert({ first_name: "Izel" });
      let photo = await SQLPhoto.insert({ name: "Dinner photo", owner_uuid: user.uuid });

      assert.equal(user.first_name, "Izel");
      assert.notOk(photo.isNew);
      assert.propEqual(photo.owner, user);

      let fetchedPhoto = await SQLPhoto.find(photo.uuid);

      assert.notOk(fetchedPhoto.isNew);
      assert.propEqual(fetchedPhoto.owner, user);
      assert.equal(fetchedPhoto.owner_uuid, user.uuid);

      fetchedPhoto.owner = null;

      assert.equal(fetchedPhoto.owner, null);
      assert.equal(fetchedPhoto.owner_uuid, null);

      let deletedPhoto = await SQLPhoto.delete(fetchedPhoto);

      assert.notPropEqual(fetchedPhoto, deletedPhoto);
      assert.equal(fetchedPhoto.owner, null);
      assert.propEqual(deletedPhoto.owner, user);
      assert.equal(deletedPhoto.owner_uuid, user.uuid);
    });

    test("a model can create, update, delete with correct changing relationships without GET in one flow", async function (assert) {
      let { SQLPhoto, SQLUser } = setupSQLModels();

      let firstUser = await SQLUser.insert({ first_name: "Izel" });
      let secondUser = await SQLUser.insert({ first_name: "Moris" });
      let photo = SQLPhoto.build({ name: "Dinner photo", owner: secondUser });

      assert.ok(photo.isNew);
      assert.propEqual(photo.owner, secondUser);
      assert.equal(photo.owner_uuid, secondUser.uuid);

      photo.owner = firstUser;

      assert.propEqual(photo.owner, firstUser);
      assert.equal(photo.owner_uuid, firstUser.uuid);

      let insertedPhoto = await SQLPhoto.insert(photo);

      assert.propEqual(insertedPhoto.owner, firstUser);
      assert.propEqual(photo.owner, insertedPhoto.owner);

      insertedPhoto.owner = secondUser;

      assert.propEqual(insertedPhoto.owner, secondUser);
      assert.equal(insertedPhoto.owner_uuid, secondUser.uuid);

      let updatedPhoto = await SQLPhoto.update(insertedPhoto);

      assert.propEqual(updatedPhoto.owner, secondUser);
      assert.propEqual(insertedPhoto.owner, secondUser);

      updatedPhoto.owner = null;

      assert.equal(updatedPhoto.owner, null);
      assert.equal(updatedPhoto.owner_uuid, null);

      let deletedPhoto = await SQLPhoto.delete(updatedPhoto);

      assert.equal(updatedPhoto.owner, null);
      assert.propEqual(deletedPhoto.owner, secondUser);
      assert.equal(deletedPhoto.owner_uuid, secondUser.uuid);
    });

    test("a model can create, update, delete with correct changing relationships with GET/cache in one flow", async function (assert) {
      let { SQLPhoto, SQLUser } = setupSQLModels();

      await SQLUser.insertAll([
        {
          uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
          first_name: "Izel",
        },
        {
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          first_name: "Moris",
        },
      ]);

      let firstUser = await SQLUser.find("77653ad3-47e4-4ec2-b49f-57ea36a627e7");
      let secondUser = await SQLUser.find("d351963d-e725-4092-a37c-1ca1823b57d3");
      let photo = SQLPhoto.build({ name: "Dinner photo", owner: secondUser });

      assert.ok(photo.isNew);
      assert.propEqual(photo.owner, secondUser);
      assert.equal(photo.owner_uuid, secondUser.uuid);

      photo.owner = firstUser;

      assert.propEqual(photo.owner, firstUser);
      assert.equal(photo.owner_uuid, firstUser.uuid);

      let insertedPhoto = await SQLPhoto.insert(photo);

      assert.propEqual(insertedPhoto.owner, firstUser);
      assert.propEqual(photo.owner, insertedPhoto.owner);

      insertedPhoto.owner = secondUser;

      assert.propEqual(insertedPhoto.owner, secondUser);
      assert.equal(insertedPhoto.owner_uuid, secondUser.uuid);

      let updatedPhoto = await SQLPhoto.update(insertedPhoto);

      assert.propEqual(updatedPhoto.owner, secondUser);
      assert.propEqual(insertedPhoto.owner, secondUser);

      updatedPhoto.owner = null;

      assert.equal(updatedPhoto.owner, null);
      assert.equal(updatedPhoto.owner_uuid, null);

      let deletedPhoto = await SQLPhoto.delete(updatedPhoto);

      assert.equal(updatedPhoto.owner, null);
      assert.propEqual(deletedPhoto.owner, secondUser);
      assert.equal(deletedPhoto.owner_uuid, secondUser.uuid); // NOTE: RESTAdapter isn't like this it serves the provided model relationship reference with .null primaryKey if its null
    });

    test("a model can fetch its not loaded relationship", async function (assert) {
      let { SQLPhoto, SQLUser } = setupSQLModels();

      let firstUser = await SQLUser.insert({ first_name: "Izel" });
      let secondUser = await SQLUser.insert({ first_name: "Moris" });
      let photo = SQLPhoto.build({ name: "Dinner photo", owner_uuid: secondUser.uuid });

      assert.deepEqual(photo.owner, secondUser);
      assert.equal(photo.owner_uuid, secondUser.uuid);
    });

    test("a models relationship promise reference turns to null when relationship gets destroyed either way", async function (assert) {
      let { SQLPhoto, SQLUser } = setupSQLModels();

      let firstUser = await SQLUser.insert({ first_name: "Izel" });
      let secondUser = await SQLUser.insert({ first_name: "Moris" });
      let photo = SQLPhoto.build({ name: "Dinner photo", owner_uuid: secondUser.uuid });

      assert.deepEqual(photo.owner, secondUser);

      photo.owner_uuid = null;

      assert.equal(photo.owner, null);
    });

    test("a models empty relationship reference turns to promise and can fetch when changed", async function (assert) {
      let { SQLPhoto, SQLUser } = setupSQLModels();

      let firstUser = await SQLUser.insert({ first_name: "Izel" });
      let secondUser = await SQLUser.insert({ first_name: "Moris" });
      let photo = SQLPhoto.build({ name: "Dinner photo" });

      assert.equal(photo.owner, null);
      assert.equal(photo.owner_uuid, null);

      photo.owner_uuid = secondUser.uuid;

      assert.deepEqual(photo.owner, secondUser);
      assert.equal(photo.owner_uuid, secondUser.uuid);
    });

    test("deleting a related model should delete the models relationship references", async function (assert) {
      let { SQLPhoto, SQLUser } = setupSQLModels();

      let user = await SQLUser.insert({
        uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
        first_name: "Izel",
      });
      let photo = SQLPhoto.build({ name: "Dinner photo", owner: user });

      assert.deepEqual(photo.owner, user);
      assert.equal(photo.owner_uuid, user.uuid);

      await SQLUser.delete(user);

      assert.deepEqual(photo.owner, null);
      assert.equal(photo.owner_uuid, null);
    });

    test("a models empty relationship reference can turn to promise, incorrectly fetched(with server error), than can be retried to fetch correctly", async function (assert) {
      assert.expect(11);

      let { SQLPhoto, SQLUser } = setupSQLModels();

      let photo = SQLPhoto.build({
        name: "Dinner photo",
        owner_uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
      });
      let ownerPromise = photo.owner;
      try {
        await ownerPromise;
      } catch (error) {
        assert.ok(error instanceof NotFoundError);
        assert.equal(
          error.message,
          `sql_user table record with uuid:374c7f4a-85d6-429a-bf2a-0719525f5f29 not found`
        );
      }

      let insertedUser = await SQLUser.insert({
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        first_name: "Izel",
        last_name: "Nakri",
      });

      assert.propContains(insertedUser, {
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        first_name: "Izel",
        last_name: "Nakri",
      });
      assert.propEqual(photo.owner, insertedUser);
      assert.equal(photo.owner_uuid, "374c7f4a-85d6-429a-bf2a-0719525f5f29");
      assert.deepEqual(photo.errors, []);

      let foundUser = await photo.owner;

      assert.propEqual(insertedUser, foundUser);

      let reloadPromise = ownerPromise.reload();

      assert.ok(reloadPromise instanceof RelationshipPromise);

      let result = await reloadPromise; // TODO: this fails make it pass!! LazyPromise .catch() immediately gets called

      assert.deepEqual(result, SQLUser.peek("374c7f4a-85d6-429a-bf2a-0719525f5f29"));
      assert.equal(photo.owner.first_name, "Izel");
      assert.equal(photo.owner_uuid, "374c7f4a-85d6-429a-bf2a-0719525f5f29"); // TODO
    });
  }
);
