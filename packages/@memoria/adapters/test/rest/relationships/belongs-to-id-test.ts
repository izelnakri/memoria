import Model, {
  PrimaryGeneratedColumn,
  Column,
  RuntimeError,
  Serializer,
  UnauthorizedError,
  NotFoundError,
  RelationshipPromise,
} from "@memoria/model";
import { HTTP } from "@memoria/adapters";
import ServerResponse from "@memoria/response";
import { module, test, skip } from "qunitx";
import setupMemoria from "../../helpers/setup-memoria.js";
import setupRESTModels from "../../helpers/models-with-relations/rest/id/index.js";

module(
  "@memoria/adapters | RESTAdapter | Relationships | @belongsTo API for ID(integer)",
  function (hooks) {
    setupMemoria(hooks);

    // TODO: also add embed tests to the test cases correctly
    test("new model can be built from scratch and it sends the right data to the server during post", async function (assert) {
      let { Server, RESTPhoto, RESTUser } = setupRESTModels();
      this.Server = Server;

      let user = RESTUser.build({ first_name: "Izel" });
      let photo = RESTPhoto.build({ name: "Dinner photo", owner: user });

      assert.ok(user instanceof RESTUser);
      assert.ok(user.isNew);
      assert.ok(photo.isNew);
      assert.deepEqual(photo.owner, user);
      assert.equal(photo.owner_id, user.id);

      let insertedPhoto = await RESTPhoto.insert(photo);

      assert.ok(user.isNew);
      assert.notOk(photo.isNew);
      assert.notOk(insertedPhoto.isNew);

      assert.deepEqual(photo.owner, user);
      assert.deepEqual(insertedPhoto.owner, user);
      assert.equal(insertedPhoto.owner_id, user.id);
      assert.ok(insertedPhoto.owner.isNew, true);

      let insertedUser = await RESTUser.insert(user);

      assert.notOk(user.isNew);
      assert.notOk(insertedUser.isNew);
      assert.notOk(insertedPhoto.owner.isNew);

      assert.deepEqual(photo.owner, user);
      assert.deepEqual(insertedPhoto.owner, user);
      assert.deepEqual(insertedPhoto.owner, insertedUser);

      assert.ok(user !== insertedUser);
    });

    test("new model can have relationship set afterwards and it sends the right data to the server during post", async function (assert) {
      let { Server, RESTPhoto, RESTUser } = setupRESTModels();
      this.Server = Server;

      let user = RESTUser.build({ first_name: "Izel" });
      let photo = RESTPhoto.build({ name: "Dinner photo" });
      let secondPhoto = RESTPhoto.build({ name: "Second photo" });

      assert.equal(photo.owner, null);
      assert.equal(secondPhoto.owner, null);
      assert.ok(photo.isNew);
      assert.ok(secondPhoto.isNew);

      let insertedPhoto = await RESTPhoto.insert(photo);

      assert.notOk(photo.isNew);
      assert.notOk(insertedPhoto.isNew);
      assert.ok(insertedPhoto !== photo);
      assert.equal(photo.owner, null);
      assert.equal(insertedPhoto.owner, null);

      secondPhoto.owner = user;

      let secondInsertedPhoto = await RESTPhoto.insert(secondPhoto);

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
      let { Server, RESTPhoto, RESTUser } = setupRESTModels();
      this.Server = Server;

      let user = await RESTUser.insert({ first_name: "Izel" });
      let photo = await RESTPhoto.insert({ name: "Dinner photo", owner_id: user.id });

      assert.equal(user.first_name, "Izel");
      assert.notOk(photo.isNew);
      assert.propEqual(photo.owner, user);
      assert.equal(photo.owner_id, user.id);

      let fetchedPhoto = await RESTPhoto.find(photo.id);

      assert.notOk(fetchedPhoto.isNew);
      assert.propEqual(fetchedPhoto.owner, user);
      assert.equal(fetchedPhoto.owner_id, user.id);

      let newOwner = RESTUser.build({ first_name: "Moris" });

      assert.equal(newOwner.first_name, "Moris");

      fetchedPhoto.owner = newOwner;

      assert.deepEqual(fetchedPhoto.owner, newOwner);
      assert.equal(fetchedPhoto.owner_id, null);

      let updatedPhoto = await RESTPhoto.update(fetchedPhoto);

      assert.deepEqual(fetchedPhoto, updatedPhoto);
      assert.deepEqual(fetchedPhoto.owner, newOwner);
      assert.deepEqual(updatedPhoto.owner, newOwner);
      assert.equal(updatedPhoto.owner_id, null);
    });

    test("fetched model can remove the relationship before update", async function (assert) {
      let { Server, RESTPhoto, RESTUser } = setupRESTModels();
      this.Server = Server;

      let user = await RESTUser.insert({ first_name: "Izel" });
      let photo = await RESTPhoto.insert({ name: "Dinner photo", owner_id: user.id });

      assert.equal(user.first_name, "Izel");
      assert.notOk(photo.isNew);
      assert.propEqual(photo.owner, user);

      let fetchedPhoto = await RESTPhoto.find(photo.id);

      assert.notOk(fetchedPhoto.isNew);
      assert.propEqual(fetchedPhoto.owner, user);
      assert.equal(fetchedPhoto.owner_id, user.id);

      fetchedPhoto.owner = null;

      assert.equal(fetchedPhoto.owner, null);
      assert.equal(fetchedPhoto.owner_id, null);

      let updatedPhoto = await RESTPhoto.update(fetchedPhoto);

      assert.propEqual(fetchedPhoto, updatedPhoto);
      assert.equal(fetchedPhoto.owner, null);
      assert.equal(updatedPhoto.owner, null);
      assert.equal(updatedPhoto.owner_id, null);
    });

    test("fetched model can remove the relationship before delete", async function (assert) {
      let { Server, RESTPhoto, RESTUser } = setupRESTModels();
      this.Server = Server;

      let user = await RESTUser.insert({ first_name: "Izel" });
      let photo = await RESTPhoto.insert({ name: "Dinner photo", owner_id: user.id });

      assert.equal(user.first_name, "Izel");
      assert.notOk(photo.isNew);
      assert.propEqual(photo.owner, user);

      let fetchedPhoto = await RESTPhoto.find(photo.id);

      assert.notOk(fetchedPhoto.isNew);
      assert.propEqual(fetchedPhoto.owner, user);
      assert.equal(fetchedPhoto.owner_id, user.id);

      fetchedPhoto.owner = null;

      assert.equal(fetchedPhoto.owner, null);
      assert.equal(fetchedPhoto.owner_id, null);

      let deletedPhoto = await RESTPhoto.delete(fetchedPhoto);

      assert.propEqual(fetchedPhoto, deletedPhoto);
      assert.equal(fetchedPhoto.owner, null);
      assert.equal(deletedPhoto.owner, null);
      assert.equal(deletedPhoto.owner_id, null);
    });

    test("a model can create, update, delete with correct changing relationships without GET in one flow", async function (assert) {
      let { Server, RESTPhoto, RESTUser } = setupRESTModels();
      this.Server = Server;

      let firstUser = await RESTUser.insert({ first_name: "Izel" });
      let secondUser = await RESTUser.insert({ first_name: "Moris" });
      let photo = RESTPhoto.build({ name: "Dinner photo", owner: secondUser });

      assert.ok(photo.isNew);
      assert.propEqual(photo.owner, secondUser);
      assert.equal(photo.owner_id, secondUser.id);

      photo.owner = firstUser;

      assert.propEqual(photo.owner, firstUser);
      assert.equal(photo.owner_id, firstUser.id);

      let insertedPhoto = await RESTPhoto.insert(photo);

      assert.propEqual(insertedPhoto.owner, firstUser);
      assert.propEqual(photo.owner, insertedPhoto.owner);

      insertedPhoto.owner = secondUser;

      assert.propEqual(insertedPhoto.owner, secondUser);
      assert.equal(insertedPhoto.owner_id, secondUser.id);

      let updatedPhoto = await RESTPhoto.update(insertedPhoto);

      assert.deepEqual(updatedPhoto.owner, secondUser);
      assert.deepEqual(insertedPhoto.owner, secondUser);

      updatedPhoto.owner = null;

      assert.equal(updatedPhoto.owner, null);
      assert.equal(updatedPhoto.owner_id, null);

      let deletedPhoto = await RESTPhoto.delete(updatedPhoto);

      assert.equal(updatedPhoto.owner, null);
      assert.equal(deletedPhoto.owner, null);
      assert.equal(deletedPhoto.owner_id, null);
    });

    // TODO: insert() generates 3 instances when instance is provided, make it 2
    test("reflexive side test: a model can be built, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
      // when there is hasOne the reflection cache should print warning! two models can have the same belongs_to in a table but should there be check for hasOne reflection(?)
      let { Server, RESTPhoto, RESTUser, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let firstPhoto = await RESTPhoto.insert({ name: "First photo" });
      let secondPhoto = await RESTPhoto.insert({ name: "Second photo" });
      let group = RESTGroup.build({ name: "Dinner group", photo: secondPhoto });

      assert.ok(group.isNew);
      assert.deepEqual(group.photo, secondPhoto);
      assert.equal(secondPhoto.group_id, group.id);

      firstPhoto.group = group; // TODO: this should trigger a logical warning(!!) setting group to firstPhoto but secondPhoto already has group as well(?) clean that first(?)

      assert.deepEqual(firstPhoto.group, group);
      assert.equal(firstPhoto.group_id, group.id);
      assert.deepEqual(secondPhoto.group, group);
      assert.equal(secondPhoto.group_id, group.id);
      assert.deepEqual(group.photo, firstPhoto);

      let insertedGroup = await RESTGroup.insert(group);

      assert.deepEqual(insertedGroup.photo, firstPhoto);
      assert.equal(group.photo, insertedGroup.photo);
      assert.deepEqual(group.photo, firstPhoto);

      assert.deepEqual(firstPhoto.group, insertedGroup);
      assert.equal(firstPhoto.group_id, insertedGroup.id);
      assert.equal(secondPhoto.group, insertedGroup);
      assert.equal(secondPhoto.group_id, insertedGroup.id);

      secondPhoto.group = insertedGroup;

      assert.deepEqual(secondPhoto.group, insertedGroup);
      assert.equal(secondPhoto.group_id, insertedGroup.id);
      assert.deepEqual(insertedGroup.photo, secondPhoto);
      assert.deepEqual(group.photo, firstPhoto);
      assert.deepEqual(firstPhoto.group, insertedGroup);
      assert.equal(firstPhoto.group_id, insertedGroup.id);

      let updatedGroup = await RESTGroup.update(insertedGroup);

      assert.deepEqual(insertedGroup.photo, secondPhoto);
      assert.deepEqual(updatedGroup.photo, secondPhoto);
      assert.deepEqual(group.photo, firstPhoto);

      assert.equal(secondPhoto.group, updatedGroup);
      assert.equal(secondPhoto.group_id, updatedGroup.id);
      assert.deepEqual(firstPhoto.group, updatedGroup);
      assert.equal(firstPhoto.group_id, updatedGroup.id);

      secondPhoto.group = null;

      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_id, null);
      assert.notEqual(updatedGroup.photo, secondPhoto); // TODO: assert.equal(updatedGroup.photo, secondPhoto);  // assert.notEqual(await updatedGroup.photo, secondPhoto); // TODO: then it should be firstPhoto but not because cached foreignKey value isn't it.

      assert.notEqual(insertedGroup.photo, secondPhoto); // TODO: assert.equal(insertedGroup.photo, secondPhoto);  // assert.notEqual(await updatedGroup.photo, secondPhoto); // TODO: then it should be firstPhoto but not because cached foreignKey value isn't it.
      assert.deepEqual(group.photo, firstPhoto);

      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_id, null);

      assert.equal(firstPhoto.group, updatedGroup);
      assert.equal(firstPhoto.group_id, updatedGroup.id);

      let deletedGroup = await RESTGroup.delete(updatedGroup);

      assert.equal(updatedGroup.photo, null);
      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_id, null);
      assert.equal(firstPhoto.group, null);
      assert.equal(firstPhoto.group_id, null);
    });

    test("a model can create, update, delete with correct changing relationships with GET/cache in one flow", async function (assert) {
      let { Server, RESTPhoto, RESTUser, MemoryUser } = setupRESTModels();
      this.Server = Server;

      await MemoryUser.insertAll([
        {
          id: 1,
          first_name: "Izel",
        },
        {
          id: 2,
          first_name: "Moris",
        },
      ]);

      let firstUser = await RESTUser.find(1);
      let secondUser = await RESTUser.find(2);
      let photo = RESTPhoto.build({ name: "Dinner photo", owner: secondUser });

      assert.ok(photo.isNew);
      assert.propEqual(photo.owner, secondUser);
      assert.equal(photo.owner_id, secondUser.id);

      photo.owner = firstUser;

      assert.propEqual(photo.owner, firstUser);
      assert.equal(photo.owner_id, firstUser.id);

      let insertedPhoto = await RESTPhoto.insert(photo);

      assert.propEqual(insertedPhoto.owner, firstUser);
      assert.propEqual(photo.owner, insertedPhoto.owner);

      insertedPhoto.owner = secondUser;

      assert.propEqual(insertedPhoto.owner, secondUser);
      assert.equal(insertedPhoto.owner_id, secondUser.id);

      let updatedPhoto = await RESTPhoto.update(insertedPhoto);

      assert.propEqual(updatedPhoto.owner, secondUser);
      assert.propEqual(insertedPhoto.owner, secondUser);

      updatedPhoto.owner = null;

      assert.equal(updatedPhoto.owner, null);
      assert.equal(updatedPhoto.owner_id, null);

      let deletedPhoto = await RESTPhoto.delete(updatedPhoto);

      assert.equal(updatedPhoto.owner, null);
      assert.propEqual(deletedPhoto.owner, null);
      assert.equal(deletedPhoto.owner_id, null);
    });

    test("a model can fetch its not loaded relationship", async function (assert) {
      let { Server, RESTPhoto, RESTUser } = setupRESTModels();
      this.Server = Server;

      let firstUser = await RESTUser.insert({ first_name: "Izel" });
      let secondUser = await RESTUser.insert({ first_name: "Moris" });
      let photo = RESTPhoto.build({ name: "Dinner photo", owner_id: secondUser.id });

      assert.deepEqual(photo.owner, secondUser);
      assert.equal(photo.owner_id, secondUser.id);
    });

    test("a models relationship promise reference turns to null when relationship gets destroyed either way", async function (assert) {
      let { Server, RESTPhoto, RESTUser } = setupRESTModels();
      this.Server = Server;

      let firstUser = await RESTUser.insert({ first_name: "Izel" });
      let secondUser = await RESTUser.insert({ first_name: "Moris" });
      let photo = RESTPhoto.build({ name: "Dinner photo", owner_id: secondUser.id });

      assert.deepEqual(photo.owner, secondUser);

      photo.owner_id = null;

      assert.equal(photo.owner, null);
    });

    test("a models empty relationship reference turns to promise and can fetch when changed", async function (assert) {
      let { Server, RESTPhoto, RESTUser } = setupRESTModels();
      this.Server = Server;

      let firstUser = await RESTUser.insert({ first_name: "Izel" });
      let secondUser = await RESTUser.insert({ first_name: "Moris" });
      let photo = RESTPhoto.build({ name: "Dinner photo" });

      assert.equal(photo.owner, null);
      assert.equal(photo.owner_id, null);

      photo.owner_id = secondUser.id;

      assert.deepEqual(photo.owner, secondUser);
      assert.equal(photo.owner_id, secondUser.id);
    });

    test("deleting a related model should delete the models relationship references", async function (assert) {
      let { Server, RESTPhoto, RESTUser } = setupRESTModels();
      this.Server = Server;

      let user = await RESTUser.insert({ id: 22, first_name: "Izel" });
      let photo = RESTPhoto.build({ name: "Dinner photo", owner: user });

      assert.deepEqual(photo.owner, user);
      assert.equal(photo.owner_id, user.id);

      await RESTUser.delete(user);

      assert.deepEqual(photo.owner, null);
      assert.equal(photo.owner_id, null);
    });

    test("a models empty relationship reference can turn to promise, incorrectly fetched(with server error), than can be retried to fetch correctly", async function (assert) {
      assert.expect(13);

      let { Server, RESTPhoto, RESTUser, MemoryUser } = setupRESTModels();
      this.Server = Server;

      let photo = RESTPhoto.build({ name: "Dinner photo", owner_id: 44 });

      this.Server.get("/users/:id", async ({ params }) => {
        return ServerResponse(401, { message: "Not authorized" });
      });

      try {
        await photo.owner;
      } catch (error) {
        assert.ok(error instanceof UnauthorizedError);
        assert.equal(
          error.message,
          `Server responds with unauthorized access to GET ${HTTP.host}/users/44`
        );
      }

      assert.ok(photo.owner instanceof RelationshipPromise);
      assert.equal(photo.owner_id, 44);
      assert.deepEqual(photo.errors, []);

      this.Server.get("/users/:id", async ({ params }) => {
        return ServerResponse(404, { message: "Not found this record" });
      });

      try {
        await photo.owner;
      } catch (error) {
        assert.ok(error instanceof NotFoundError);
        assert.equal(
          error.message,
          `Server responded with not found for GET ${HTTP.host}/users/44`
        );
      }

      assert.ok(photo.owner instanceof RelationshipPromise);
      assert.equal(photo.owner_id, 44);
      assert.deepEqual(photo.errors, []);

      await MemoryUser.insert({ id: 44, first_name: "Izel" });

      this.Server.get("/users/:id", async ({ params }) => {
        let user = await MemoryUser.find(params.id);

        return { user: MemoryUser.serializer(user) };
      });

      let result = await photo.owner.reload();

      assert.deepEqual(result, RESTUser.peek(44));
      assert.equal(photo.owner.first_name, "Izel");
      assert.equal(photo.owner_id, 44);
    });
  }
);
