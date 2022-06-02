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
      assert.equal(photo.owner_uuid, user.uuid);

      let insertedPhoto = await SQLPhoto.insert(photo);

      assert.ok(user.isNew);
      assert.notOk(photo.isNew);
      assert.notOk(insertedPhoto.isNew);

      assert.deepEqual(photo.owner, user);
      assert.deepEqual(insertedPhoto.owner, user);
      assert.equal(insertedPhoto.owner_uuid, user.uuid);
      assert.ok(insertedPhoto.owner.isNew, true);

      let insertedUser = await SQLUser.insert(user);

      assert.notOk(user.isNew);
      assert.notOk(insertedUser.isNew);
      assert.notOk(insertedPhoto.owner.isNew);

      assert.deepEqual(photo.owner, user);
      assert.deepEqual(insertedPhoto.owner, user);
      assert.deepEqual(insertedPhoto.owner, insertedUser);

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

      assert.equal(secondPhoto.owner, user);
      assert.ok(secondInsertedPhoto !== secondPhoto);
      assert.notOk(secondPhoto.isNew);
      assert.notOk(secondInsertedPhoto.isNew);
      assert.ok(secondPhoto !== secondInsertedPhoto);
      assert.deepEqual(secondInsertedPhoto.owner, user);
      assert.equal(secondInsertedPhoto.owner_uuid, user.uuid);
      assert.equal(secondPhoto.owner_uuid, user.uuid);
    });

    test("fetched model can request the relationship(without embed) and change the relationship before update", async function (assert) {
      let { SQLPhoto, SQLUser } = setupSQLModels();

      let user = await SQLUser.insert({ first_name: "Izel" });
      let photo = await SQLPhoto.insert({ name: "Dinner photo", owner_uuid: user.uuid });

      assert.equal(user.first_name, "Izel");
      assert.notOk(photo.isNew);
      assert.equal(photo.owner_uuid, user.uuid);
      assert.deepEqual(photo.owner, user);

      let fetchedPhoto = await SQLPhoto.find(photo.uuid);

      assert.notOk(fetchedPhoto.isNew);
      assert.deepEqual(fetchedPhoto.owner, user);
      assert.equal(fetchedPhoto.owner_uuid, user.uuid);

      let newOwner = SQLUser.build({ first_name: "Moris" });

      assert.equal(newOwner.first_name, "Moris");

      fetchedPhoto.owner = newOwner;

      assert.equal(fetchedPhoto.owner, newOwner);
      assert.equal(fetchedPhoto.owner_uuid, null);

      let updatedPhoto = await SQLPhoto.update(fetchedPhoto);

      assert.deepEqual(updatedPhoto, fetchedPhoto);
      assert.equal(fetchedPhoto.owner, newOwner);
      assert.equal(updatedPhoto.owner, newOwner);
      assert.equal(updatedPhoto.owner_uuid, null);
    });

    test("fetched model can remove the relationship before delete", async function (assert) {
      let { SQLPhoto, SQLUser } = setupSQLModels();

      let user = await SQLUser.insert({ first_name: "Izel" });
      let photo = await SQLPhoto.insert({ name: "Dinner photo", owner_uuid: user.uuid });

      assert.equal(user.first_name, "Izel");
      assert.notOk(photo.isNew);
      assert.deepEqual(photo.owner, user);

      let fetchedPhoto = await SQLPhoto.find(photo.uuid);

      assert.notOk(fetchedPhoto.isNew);
      assert.deepEqual(fetchedPhoto.owner, user);
      assert.equal(fetchedPhoto.owner_uuid, user.uuid);

      fetchedPhoto.owner = null;

      assert.equal(fetchedPhoto.owner, null);
      assert.equal(fetchedPhoto.owner_uuid, null);

      let deletedPhoto = await SQLPhoto.delete(fetchedPhoto);

      assert.deepEqual(fetchedPhoto.toJSON(), deletedPhoto.toJSON());
      assert.equal(fetchedPhoto.owner, null);
      assert.equal(deletedPhoto.owner_uuid, null);
      assert.equal(deletedPhoto.owner, null);
    });

    test("a model can create, update, delete with correct changing relationships without GET in one flow", async function (assert) {
      let { SQLPhoto, SQLUser } = setupSQLModels();

      let firstUser = await SQLUser.insert({ first_name: "Izel" });
      let secondUser = await SQLUser.insert({ first_name: "Moris" });
      let photo = SQLPhoto.build({ name: "Dinner photo", owner: secondUser });

      assert.ok(photo.isNew);
      assert.equal(photo.owner, secondUser);
      assert.equal(photo.owner_uuid, secondUser.uuid);

      photo.owner = firstUser;

      assert.equal(photo.owner, firstUser);
      assert.equal(photo.owner_uuid, firstUser.uuid);

      let insertedPhoto = await SQLPhoto.insert(photo);

      assert.deepEqual(insertedPhoto.owner, firstUser);
      assert.deepEqual(photo.owner, insertedPhoto.owner);

      insertedPhoto.owner = secondUser;

      assert.equal(insertedPhoto.owner, secondUser);
      assert.equal(insertedPhoto.owner_uuid, secondUser.uuid);

      let updatedPhoto = await SQLPhoto.update(insertedPhoto);

      assert.deepEqual(updatedPhoto.owner, secondUser);
      assert.deepEqual(insertedPhoto.owner, secondUser);

      updatedPhoto.owner = null;

      assert.equal(updatedPhoto.owner, null);
      assert.equal(updatedPhoto.owner_uuid, null);

      let deletedPhoto = await SQLPhoto.delete(updatedPhoto);

      assert.equal(updatedPhoto.owner, null);
      assert.equal(deletedPhoto.owner_uuid, null);
      assert.equal(deletedPhoto.owner, null);
    });

    test("reflexive side test: a model can be built, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
      // when there is hasOne the reflection cache should print warning! two models can have the same belongs_to in a table but should there be check for hasOne reflection(?)
      let { SQLGroup, SQLPhoto } = setupSQLModels();

      let firstPhoto = await SQLPhoto.insert({ name: "First photo" });
      let secondPhoto = await SQLPhoto.insert({ name: "Second photo" });
      let group = SQLGroup.build({ name: "Dinner group", photo: secondPhoto });

      assert.ok(group.isNew);
      assert.equal(group.photo, secondPhoto);
      assert.equal(secondPhoto.group_uuid, group.uuid);

      firstPhoto.group = group; // TODO: this should trigger a logical warning(!!) setting group to firstPhoto but secondPhoto already has group as well(?) clean that first(?)

      assert.equal(firstPhoto.group, group);
      assert.equal(firstPhoto.group_uuid, group.uuid);
      assert.equal(secondPhoto.group, group);
      assert.equal(secondPhoto.group_uuid, group.uuid);
      assert.equal(group.photo, firstPhoto);

      let insertedGroup = await SQLGroup.insert(group);

      assert.deepEqual(insertedGroup.photo, firstPhoto);
      assert.equal(group.photo, insertedGroup.photo);
      assert.equal(group.photo, firstPhoto);

      assert.deepEqual(firstPhoto.group, insertedGroup);
      assert.equal(firstPhoto.group_uuid, insertedGroup.uuid);
      assert.equal(secondPhoto.group, insertedGroup);
      assert.equal(secondPhoto.group_uuid, insertedGroup.uuid);

      secondPhoto.group = insertedGroup;

      assert.equal(secondPhoto.group, insertedGroup);
      assert.equal(secondPhoto.group_uuid, insertedGroup.uuid);
      assert.equal(insertedGroup.photo, secondPhoto);
      assert.deepEqual(group.photo, firstPhoto);
      assert.deepEqual(firstPhoto.group, insertedGroup);
      assert.equal(firstPhoto.group_uuid, insertedGroup.uuid);

      let updatedGroup = await SQLGroup.update(insertedGroup);

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
      assert.strictEqual(updatedGroup.photo, firstPhoto);

      assert.deepEqual(firstPhoto.group, updatedGroup);
      assert.equal(firstPhoto.group_uuid, updatedGroup.uuid);
      assert.strictEqual(insertedGroup.photo, firstPhoto);
      assert.deepEqual(group.photo, firstPhoto);

      let deletedGroup = await SQLGroup.delete(updatedGroup);

      assert.equal(updatedGroup.photo, null);
      assert.equal(await deletedGroup.photo, null);
      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_uuid, null);
      assert.equal(firstPhoto.group, null);
      assert.equal(firstPhoto.group_uuid, null);
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
      assert.equal(photo.owner, secondUser);
      assert.equal(photo.owner_uuid, secondUser.uuid);

      photo.owner = firstUser;

      assert.equal(photo.owner, firstUser);
      assert.equal(photo.owner_uuid, firstUser.uuid);

      let insertedPhoto = await SQLPhoto.insert(photo);

      assert.deepEqual(insertedPhoto.owner, firstUser);
      assert.deepEqual(photo.owner, insertedPhoto.owner);

      insertedPhoto.owner = secondUser;

      assert.equal(insertedPhoto.owner, secondUser);
      assert.equal(insertedPhoto.owner_uuid, secondUser.uuid);

      let updatedPhoto = await SQLPhoto.update(insertedPhoto);

      assert.deepEqual(updatedPhoto.owner, secondUser);
      assert.equal(insertedPhoto.owner, secondUser);

      updatedPhoto.owner = null;

      assert.equal(updatedPhoto.owner, null);
      assert.equal(updatedPhoto.owner_uuid, null);

      let deletedPhoto = await SQLPhoto.delete(updatedPhoto);

      assert.equal(updatedPhoto.owner, null);
      assert.equal(deletedPhoto.owner_uuid, null);
      assert.equal(deletedPhoto.owner, null);
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

      assert.equal(photo.owner, user);
      assert.equal(photo.owner_uuid, user.uuid);

      await SQLUser.delete(user);

      assert.equal(photo.owner, null);
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
      assert.deepEqual(photo.owner, insertedUser);
      assert.equal(photo.owner_uuid, "374c7f4a-85d6-429a-bf2a-0719525f5f29");
      assert.deepEqual(photo.errors, []);

      let foundUser = await photo.owner;

      assert.deepEqual(foundUser, insertedUser);

      let reloadPromise = ownerPromise.reload();

      assert.ok(reloadPromise instanceof RelationshipPromise);

      let result = await reloadPromise;

      assert.deepEqual(result, SQLUser.peek("374c7f4a-85d6-429a-bf2a-0719525f5f29"));
      assert.equal(photo.owner.first_name, "Izel");
      assert.equal(photo.owner_uuid, "374c7f4a-85d6-429a-bf2a-0719525f5f29");
    });
  }
);
