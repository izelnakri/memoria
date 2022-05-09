import Model, {
  PrimaryGeneratedColumn,
  RelationshipDB,
  Column,
  RuntimeError,
  Serializer,
  UnauthorizedError,
  NotFoundError,
  DB
} from "@memoria/model";
import { module, test, skip } from "qunitx";
import setupMemoria from "../../helpers/setup-memoria.js";
import setupSQLModels from "../../helpers/models-with-relations/sql/id/index.js";

module(
  "@memoria/adapters | SQLAdapter | Relationships | @belongsTo API for ID(integer)",
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
      assert.equal(photo.owner_id, user.id);

      let insertedPhoto = await SQLPhoto.insert(photo);

      assert.ok(user.isNew);
      assert.notOk(photo.isNew);
      assert.notOk(insertedPhoto.isNew);

      assert.deepEqual(photo.owner, user);
      assert.deepEqual(insertedPhoto.owner, user);
      assert.equal(insertedPhoto.owner_id, user.id);
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
      let { SQLPhoto, SQLUser } = setupSQLModels();

      let user = await SQLUser.insert({ first_name: "Izel" });
      let photo = await SQLPhoto.insert({ name: "Dinner photo", owner_id: user.id });

      assert.equal(user.first_name, "Izel");
      assert.notOk(photo.isNew);

      assert.deepEqual(photo.owner, user);
      assert.equal(photo.owner_id, user.id);

      let fetchedPhoto = await SQLPhoto.find(photo.id);

      assert.notOk(fetchedPhoto.isNew);
      assert.deepEqual(fetchedPhoto.owner, user);
      assert.equal(fetchedPhoto.owner_id, user.id);

      let newOwner = SQLUser.build({ first_name: "Moris" });

      assert.equal(newOwner.first_name, "Moris");

      fetchedPhoto.owner = newOwner;

      assert.equal(fetchedPhoto.owner, newOwner);
      assert.equal(fetchedPhoto.owner_id, null);

      let updatedPhoto = await SQLPhoto.update(fetchedPhoto);

      assert.deepEqual(fetchedPhoto, updatedPhoto);
      assert.equal(fetchedPhoto.owner, newOwner);
      assert.equal(updatedPhoto.owner, newOwner);
      assert.equal(updatedPhoto.owner_id, null);
    });

    test("fetched model can remove the relationship before update", async function (assert) {
      let { SQLPhoto, SQLUser } = setupSQLModels();

      let user = await SQLUser.insert({ first_name: "Izel" });
      let photo = await SQLPhoto.insert({ name: "Dinner photo", owner_id: user.id });

      assert.equal(user.first_name, "Izel");
      assert.notOk(photo.isNew);
      assert.deepEqual(photo.owner, user);

      let fetchedPhoto = await SQLPhoto.find(photo.id);

      assert.notOk(fetchedPhoto.isNew);
      assert.deepEqual(fetchedPhoto.owner, user);
      assert.equal(fetchedPhoto.owner_id, user.id);

      fetchedPhoto.owner = null;

      assert.equal(fetchedPhoto.owner, null);
      assert.equal(fetchedPhoto.owner_id, null);

      let updatedPhoto = await SQLPhoto.update(fetchedPhoto);

      assert.deepEqual(fetchedPhoto, updatedPhoto);
      assert.equal(fetchedPhoto.owner, null);
      assert.equal(updatedPhoto.owner, null);
      assert.equal(updatedPhoto.owner_id, null);
    });

    test("fetched model can remove the relationship before delete", async function (assert) {
      let { SQLPhoto, SQLUser } = setupSQLModels();

      let user = await SQLUser.insert({ first_name: "Izel" });
      let photo = await SQLPhoto.insert({ name: "Dinner photo", owner_id: user.id });

      assert.equal(user.first_name, "Izel");
      assert.notOk(photo.isNew);
      assert.deepEqual(photo.owner, user);

      let fetchedPhoto = await SQLPhoto.find(photo.id);

      assert.notOk(fetchedPhoto.isNew);
      assert.deepEqual(fetchedPhoto.owner, user);
      assert.equal(fetchedPhoto.owner_id, user.id);

      fetchedPhoto.owner = null;

      assert.equal(fetchedPhoto.owner, null);
      assert.equal(fetchedPhoto.owner_id, null);

      let deletedPhoto = await SQLPhoto.delete(fetchedPhoto); // NOTE: it is true because sql server returns owner_id: 1

      assert.deepEqual(Object.assign(fetchedPhoto.toJSON(), { owner_id: user.id }), deletedPhoto.toJSON());
      assert.equal(fetchedPhoto.owner, null);
      assert.deepEqual(deletedPhoto.owner, user);
      assert.equal(deletedPhoto.owner_id, user.id);
    });

    test("a model can create, update, delete with correct changing relationships without SELECT in one flow", async function (assert) {
      let { SQLPhoto, SQLUser } = setupSQLModels();

      let firstUser = await SQLUser.insert({ first_name: "Izel" });
      let secondUser = await SQLUser.insert({ first_name: "Moris" });
      let photo = SQLPhoto.build({ name: "Dinner photo", owner: secondUser });

      assert.ok(photo.isNew);
      assert.equal(photo.owner, secondUser);
      assert.equal(photo.owner_id, secondUser.id);

      photo.owner = firstUser;

      assert.equal(photo.owner, firstUser);
      assert.equal(photo.owner_id, firstUser.id);

      let insertedPhoto = await SQLPhoto.insert(photo);

      assert.equal(insertedPhoto.owner, firstUser);
      assert.equal(photo.owner, insertedPhoto.owner);

      insertedPhoto.owner = secondUser;

      assert.equal(insertedPhoto.owner, secondUser);
      assert.equal(insertedPhoto.owner_id, secondUser.id);

      let updatedPhoto = await SQLPhoto.update(insertedPhoto);

      assert.deepEqual(updatedPhoto.owner, secondUser);
      assert.equal(updatedPhoto.owner_id, secondUser.id);
      assert.deepEqual(insertedPhoto.owner, secondUser);

      updatedPhoto.owner = null;

      assert.equal(updatedPhoto.owner, null);
      assert.equal(updatedPhoto.owner_id, null);

      let deletedPhoto = await SQLPhoto.delete(updatedPhoto);

      assert.equal(updatedPhoto.owner, null);
      assert.equal(deletedPhoto.owner_id, null);
      assert.equal(deletedPhoto.owner, null);
    });

    test("reflexive side test: a model can be built, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
      // when there is hasOne the reflection cache should print warning! two models can have the same belongs_to in a table but should there be check for hasOne reflection(?)
      let { SQLGroup, SQLPhoto } = setupSQLModels();

      let firstPhoto = await SQLPhoto.insert({ name: "First photo" }); // insert generates 2 instanceCaches
      let secondPhoto = await SQLPhoto.insert({ name: "Second photo" });
      let group = SQLGroup.build({ name: "Dinner group", photo: secondPhoto });

      assert.ok(group.isNew);
      assert.deepEqual(group.photo, secondPhoto);
      assert.equal(secondPhoto.group_id, group.id);

      firstPhoto.group = group; // TODO: this should trigger a logical warning(!!) setting group to firstPhoto but secondPhoto already has group as well(?) clean that first(?)

      assert.deepEqual(firstPhoto.group, group);
      assert.equal(firstPhoto.group_id, group.id);
      assert.deepEqual(secondPhoto.group, group);
      assert.equal(secondPhoto.group_id, group.id);
      assert.deepEqual(group.photo, firstPhoto);

      let insertedGroup = await SQLGroup.insert(group); // NOTE: there has to be 2 instances but there is 3

      assert.deepEqual(insertedGroup.photo, firstPhoto);
      assert.equal(insertedGroup.photo, group.photo);
      assert.deepEqual(group.photo, firstPhoto);

      assert.deepEqual(firstPhoto.group, insertedGroup);
      assert.equal(firstPhoto.group_id, insertedGroup.id);
      assert.deepEqual(secondPhoto.group, insertedGroup);
      assert.equal(secondPhoto.group_id, insertedGroup.id);

      secondPhoto.group = insertedGroup;

      assert.equal(secondPhoto.group, insertedGroup);
      assert.equal(secondPhoto.group_id, insertedGroup.id);
      assert.deepEqual(insertedGroup.photo, secondPhoto);
      assert.deepEqual(group.photo, firstPhoto);
      assert.deepEqual(firstPhoto.group, insertedGroup);
      assert.equal(firstPhoto.group_id, insertedGroup.id);

      let updatedGroup = await SQLGroup.update(insertedGroup);

      assert.deepEqual(insertedGroup.photo, secondPhoto);
      assert.deepEqual(updatedGroup.photo, secondPhoto);
      assert.deepEqual(group.photo, firstPhoto);

      assert.equal(secondPhoto.group, updatedGroup);
      assert.equal(secondPhoto.group_id, updatedGroup.id);
      assert.equal(firstPhoto.group, updatedGroup);
      assert.equal(firstPhoto.group_id, updatedGroup.id);

      secondPhoto.group = null;

      assert.notEqual(updatedGroup.photo, secondPhoto);
      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_id, null);

      assert.deepEqual(insertedGroup.photo, secondPhoto);
      assert.deepEqual(group.photo, firstPhoto);

      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_id, null);

      assert.equal(firstPhoto.group, updatedGroup);
      assert.equal(firstPhoto.group_id, group.id);

      let deletedGroup = await SQLGroup.delete(updatedGroup);

      assert.notEqual(updatedGroup.photo, secondPhoto);
      assert.notEqual(deletedGroup.photo, secondPhoto);
      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_id, null);
      assert.equal(firstPhoto.group, null);
      assert.equal(firstPhoto.group_id, null);
    });

    test("a model can create, update, delete with correct changing relationships with GET/cache in one flow", async function (assert) {
      let { SQLPhoto, SQLUser } = setupSQLModels();

      await SQLUser.insertAll([
        {
          id: 1,
          first_name: "Izel",
        },
        {
          id: 2,
          first_name: "Moris",
        },
      ]);

      let firstUser = await SQLUser.find(1);
      let secondUser = await SQLUser.find(2);
      let photo = SQLPhoto.build({ name: "Dinner photo", owner: secondUser });

      assert.ok(photo.isNew);
      assert.equal(photo.owner, secondUser);
      assert.equal(photo.owner_id, secondUser.id);

      photo.owner = firstUser;

      assert.equal(photo.owner, firstUser);
      assert.equal(photo.owner_id, firstUser.id);

      let insertedPhoto = await SQLPhoto.insert(photo);

      assert.equal(insertedPhoto.owner, firstUser);
      assert.equal(photo.owner, insertedPhoto.owner);

      insertedPhoto.owner = secondUser;

      assert.equal(insertedPhoto.owner, secondUser);
      assert.equal(insertedPhoto.owner_id, secondUser.id);

      let updatedPhoto = await SQLPhoto.update(insertedPhoto);

      assert.equal(updatedPhoto.owner, secondUser);
      assert.equal(insertedPhoto.owner, secondUser);

      updatedPhoto.owner = null;

      assert.equal(updatedPhoto.owner, null);
      assert.equal(updatedPhoto.owner_id, null);

      let deletedPhoto = await SQLPhoto.delete(updatedPhoto);

      assert.equal(updatedPhoto.owner, null);
      assert.equal(deletedPhoto.owner_id, null);
      assert.equal(deletedPhoto.owner, null);
    });

    test("a model can fetch its not loaded relationship", async function (assert) {
      let { SQLPhoto, SQLUser } = setupSQLModels();

      let firstUser = await SQLUser.insert({ first_name: "Izel" });
      let secondUser = await SQLUser.insert({ first_name: "Moris" });
      let photo = SQLPhoto.build({ name: "Dinner photo", owner_id: secondUser.id });

      assert.deepEqual(photo.owner, secondUser);
      assert.equal(photo.owner_id, secondUser.id);
    });

    test("a models relationship promise reference turns to null when relationship gets destroyed either way", async function (assert) {
      let { SQLPhoto, SQLUser } = setupSQLModels();

      let firstUser = await SQLUser.insert({ first_name: "Izel" });
      let secondUser = await SQLUser.insert({ first_name: "Moris" });
      let photo = SQLPhoto.build({ name: "Dinner photo", owner_id: secondUser.id });

      assert.deepEqual(photo.owner, secondUser);

      photo.owner_id = null;

      assert.equal(photo.owner, null);
    });

    test("a models empty relationship reference turns to promise and can fetch when changed", async function (assert) {
      let { SQLPhoto, SQLUser } = setupSQLModels();

      let firstUser = await SQLUser.insert({ first_name: "Izel" });
      let secondUser = await SQLUser.insert({ first_name: "Moris" });
      let photo = SQLPhoto.build({ name: "Dinner photo" });

      assert.equal(photo.owner, null);
      assert.equal(photo.owner_id, null);

      photo.owner_id = secondUser.id;

      assert.deepEqual(photo.owner, secondUser);
      assert.equal(photo.owner_id, secondUser.id);
    });

    test("deleting a related model should delete the models relationship references", async function (assert) {
      let { SQLPhoto, SQLUser } = setupSQLModels();

      let user = await SQLUser.insert({ id: 22, first_name: "Izel" });
      let photo = SQLPhoto.build({ name: "Dinner photo", owner: user });

      assert.equal(photo.owner, user);
      assert.equal(photo.owner_id, user.id);

      await SQLUser.delete(user);

      assert.deepEqual(photo.owner, null);
      assert.equal(photo.owner_id, null);
    });

    test("a models empty relationship reference can turn to promise, incorrectly fetched(with server error), than can be retried to fetch correctly", async function (assert) {
      assert.expect(11);

      let { SQLPhoto, SQLUser } = setupSQLModels();

      let photo = SQLPhoto.build({ name: "Dinner photo", owner_id: 44 });
      let ownerPromise = photo.owner;
      try {
        await ownerPromise;
      } catch (error) {
        assert.ok(error instanceof NotFoundError);
        assert.equal(error.message, `sql_user table record with id:44 not found`);
      }

      let insertedUser = await SQLUser.insert({ id: 44, first_name: "Izel", last_name: "Nakri" });

      assert.propContains(insertedUser, { id: 44, first_name: "Izel", last_name: "Nakri" });
      assert.deepEqual(photo.owner, insertedUser);
      assert.equal(photo.owner_id, 44);
      assert.deepEqual(photo.errors, []);

      let foundUser = await photo.owner;

      assert.deepEqual(insertedUser, foundUser);

      let reloadPromise = ownerPromise.reload();

      assert.ok(reloadPromise instanceof RelationshipPromise);

      let result = await reloadPromise;

      assert.deepEqual(result, SQLUser.peek(44));
      assert.equal(photo.owner.first_name, "Izel");
      assert.equal(photo.owner_id, 44);
    });
  }
);
