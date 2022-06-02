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
import setupRESTModels from "../../helpers/models-with-relations/rest/uuid/index.js";

module(
  "@memoria/adapters | RESTAdapter | Relationships | @belongsTo API for UUID(string)",
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
      assert.equal(photo.owner_uuid, user.uuid);

      let insertedPhoto = await RESTPhoto.insert(photo);

      assert.ok(user.isNew);
      assert.notOk(photo.isNew);
      assert.notOk(insertedPhoto.isNew);

      assert.deepEqual(photo.owner, user);
      assert.deepEqual(insertedPhoto.owner, user);
      assert.equal(insertedPhoto.owner_uuid, user.uuid);
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
      assert.equal(secondInsertedPhoto.owner_uuid, user.uuid);
      assert.deepEqual(secondPhoto.owner, user);
      assert.equal(secondPhoto.owner_uuid, user.uuid);
    });

    test("fetched model can request the relationship(without embed) and change the relationship before update", async function (assert) {
      let { Server, RESTPhoto, RESTUser } = setupRESTModels();
      this.Server = Server;

      let user = await RESTUser.insert({ first_name: "Izel" });
      let photo = await RESTPhoto.insert({ name: "Dinner photo", owner_uuid: user.uuid });

      assert.equal(user.first_name, "Izel");
      assert.notOk(photo.isNew);
      assert.propEqual(photo.owner, user);
      assert.equal(photo.owner_uuid, user.uuid);

      let fetchedPhoto = await RESTPhoto.find(photo.uuid);

      assert.notOk(fetchedPhoto.isNew);
      assert.propEqual(fetchedPhoto.owner, user);
      assert.equal(fetchedPhoto.owner_uuid, user.uuid);

      let newOwner = RESTUser.build({ first_name: "Moris" });

      assert.equal(newOwner.first_name, "Moris");

      fetchedPhoto.owner = newOwner;

      assert.deepEqual(fetchedPhoto.owner, newOwner);
      assert.equal(fetchedPhoto.owner_uuid, null);

      let updatedPhoto = await RESTPhoto.update(fetchedPhoto);

      assert.deepEqual(fetchedPhoto, updatedPhoto);
      assert.deepEqual(fetchedPhoto.owner, newOwner);
      assert.deepEqual(updatedPhoto.owner, newOwner);
      assert.equal(updatedPhoto.owner_uuid, null);
    });

    test("fetched model can remove the relationship before update", async function (assert) {
      let { Server, RESTPhoto, RESTUser } = setupRESTModels();
      this.Server = Server;

      let user = await RESTUser.insert({ first_name: "Izel" });
      let photo = await RESTPhoto.insert({ name: "Dinner photo", owner_uuid: user.uuid });

      assert.equal(user.first_name, "Izel");
      assert.notOk(photo.isNew);
      assert.propEqual(photo.owner, user);

      let fetchedPhoto = await RESTPhoto.find(photo.uuid);

      assert.notOk(fetchedPhoto.isNew);
      assert.propEqual(fetchedPhoto.owner, user);
      assert.equal(fetchedPhoto.owner_uuid, user.uuid);

      fetchedPhoto.owner = null;

      assert.equal(fetchedPhoto.owner, null);
      assert.equal(fetchedPhoto.owner_uuid, null);

      let updatedPhoto = await RESTPhoto.update(fetchedPhoto);

      assert.propEqual(fetchedPhoto, updatedPhoto);
      assert.equal(fetchedPhoto.owner, null);
      assert.equal(updatedPhoto.owner, null);
      assert.equal(updatedPhoto.owner_uuid, null);
    });

    test("fetched model can remove the relationship before delete", async function (assert) {
      let { Server, RESTPhoto, RESTUser } = setupRESTModels();
      this.Server = Server;

      let user = await RESTUser.insert({ first_name: "Izel" });
      let photo = await RESTPhoto.insert({ name: "Dinner photo", owner_uuid: user.uuid });

      assert.equal(user.first_name, "Izel");
      assert.notOk(photo.isNew);
      assert.propEqual(photo.owner, user);

      let fetchedPhoto = await RESTPhoto.find(photo.uuid);

      assert.notOk(fetchedPhoto.isNew);
      assert.propEqual(fetchedPhoto.owner, user);
      assert.equal(fetchedPhoto.owner_uuid, user.uuid);

      fetchedPhoto.owner = null;

      assert.equal(fetchedPhoto.owner, null);
      assert.equal(fetchedPhoto.owner_uuid, null);

      let deletedPhoto = await RESTPhoto.delete(fetchedPhoto);

      assert.propEqual(fetchedPhoto, deletedPhoto);
      assert.equal(fetchedPhoto.owner, null);
      assert.equal(deletedPhoto.owner, null);
      assert.equal(deletedPhoto.owner_uuid, null);
    });

    test("a model can create, update, delete with correct changing relationships without GET in one flow", async function (assert) {
      let { Server, RESTPhoto, RESTUser } = setupRESTModels();
      this.Server = Server;

      let firstUser = await RESTUser.insert({ first_name: "Izel" });
      let secondUser = await RESTUser.insert({ first_name: "Moris" });
      let photo = RESTPhoto.build({ name: "Dinner photo", owner: secondUser });

      assert.ok(photo.isNew);
      assert.propEqual(photo.owner, secondUser);
      assert.equal(photo.owner_uuid, secondUser.uuid);

      photo.owner = firstUser;

      assert.propEqual(photo.owner, firstUser);
      assert.equal(photo.owner_uuid, firstUser.uuid);

      let insertedPhoto = await RESTPhoto.insert(photo);

      assert.propEqual(insertedPhoto.owner, firstUser);
      assert.propEqual(photo.owner, insertedPhoto.owner);

      insertedPhoto.owner = secondUser;

      assert.propEqual(insertedPhoto.owner, secondUser);
      assert.equal(insertedPhoto.owner_uuid, secondUser.uuid);

      let updatedPhoto = await RESTPhoto.update(insertedPhoto);

      assert.deepEqual(updatedPhoto.owner, secondUser);
      assert.deepEqual(insertedPhoto.owner, secondUser);

      updatedPhoto.owner = null;

      assert.equal(updatedPhoto.owner, null);
      assert.equal(updatedPhoto.owner_uuid, null);

      let deletedPhoto = await RESTPhoto.delete(updatedPhoto);

      assert.equal(updatedPhoto.owner, null);
      assert.equal(deletedPhoto.owner, null);
      assert.equal(deletedPhoto.owner_uuid, null);
    });

    test("reflexive side test: a model can be built, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
      // when there is hasOne the reflection cache should print warning! two models can have the same belongs_to in a table but should there be check for hasOne reflection(?)
      let { Server, RESTPhoto, RESTUser, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let firstPhoto = await RESTPhoto.insert({ name: "First photo" });
      let secondPhoto = await RESTPhoto.insert({ name: "Second photo" });
      let group = RESTGroup.build({ name: "Dinner group", photo: secondPhoto });

      assert.ok(group.isNew);
      assert.deepEqual(group.photo, secondPhoto);
      assert.equal(secondPhoto.group_uuid, group.uuid);

      firstPhoto.group = group; // TODO: this should trigger a logical warning(!!) setting group to firstPhoto but secondPhoto already has group as well(?) clean that first(?)

      assert.deepEqual(firstPhoto.group, group);
      assert.equal(firstPhoto.group_uuid, group.uuid);
      assert.deepEqual(secondPhoto.group, group);
      assert.equal(secondPhoto.group_uuid, group.uuid);
      assert.deepEqual(group.photo, firstPhoto);

      let insertedGroup = await RESTGroup.insert(group);

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

      let updatedGroup = await RESTGroup.update(insertedGroup);

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

      let deletedGroup = await RESTGroup.delete(updatedGroup);

      assert.equal(updatedGroup.photo, null);
      assert.equal(await deletedGroup.photo, null);
      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_uuid, null);
      assert.equal(firstPhoto.group, null);
      assert.equal(firstPhoto.group_uuid, null);
    });

    test("a model can create, update, delete with correct changing relationships with GET/cache in one flow", async function (assert) {
      let { Server, RESTPhoto, RESTUser, MemoryUser } = setupRESTModels();
      this.Server = Server;

      await MemoryUser.insertAll([
        {
          uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
          first_name: "Izel",
        },
        {
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          first_name: "Moris",
        },
      ]);

      let firstUser = await RESTUser.find("77653ad3-47e4-4ec2-b49f-57ea36a627e7");
      let secondUser = await RESTUser.find("d351963d-e725-4092-a37c-1ca1823b57d3");
      let photo = RESTPhoto.build({ name: "Dinner photo", owner: secondUser });

      assert.ok(photo.isNew);
      assert.propEqual(photo.owner, secondUser);
      assert.equal(photo.owner_uuid, secondUser.uuid);

      photo.owner = firstUser;

      assert.propEqual(photo.owner, firstUser);
      assert.equal(photo.owner_uuid, firstUser.uuid);

      let insertedPhoto = await RESTPhoto.insert(photo);

      assert.propEqual(insertedPhoto.owner, firstUser);
      assert.propEqual(photo.owner, insertedPhoto.owner);

      insertedPhoto.owner = secondUser;

      assert.propEqual(insertedPhoto.owner, secondUser);
      assert.equal(insertedPhoto.owner_uuid, secondUser.uuid);

      let updatedPhoto = await RESTPhoto.update(insertedPhoto);

      assert.propEqual(updatedPhoto.owner, secondUser);
      assert.propEqual(insertedPhoto.owner, secondUser);

      updatedPhoto.owner = null;

      assert.equal(updatedPhoto.owner, null);
      assert.equal(updatedPhoto.owner_uuid, null);

      let deletedPhoto = await RESTPhoto.delete(updatedPhoto);

      assert.equal(updatedPhoto.owner, null);
      assert.propEqual(deletedPhoto.owner, null);
      assert.equal(deletedPhoto.owner_uuid, null);
    });

    test("a model can fetch its not loaded relationship", async function (assert) {
      let { Server, RESTPhoto, RESTUser } = setupRESTModels();
      this.Server = Server;

      let firstUser = await RESTUser.insert({ first_name: "Izel" });
      let secondUser = await RESTUser.insert({ first_name: "Moris" });
      let photo = RESTPhoto.build({ name: "Dinner photo", owner_uuid: secondUser.uuid });

      assert.deepEqual(photo.owner, secondUser);
      assert.equal(photo.owner_uuid, secondUser.uuid);
    });

    test("a models relationship promise reference turns to null when relationship gets destroyed either way", async function (assert) {
      let { Server, RESTPhoto, RESTUser } = setupRESTModels();
      this.Server = Server;

      let firstUser = await RESTUser.insert({ first_name: "Izel" });
      let secondUser = await RESTUser.insert({ first_name: "Moris" });
      let photo = RESTPhoto.build({ name: "Dinner photo", owner_uuid: secondUser.uuid });

      assert.deepEqual(photo.owner, secondUser);

      photo.owner_uuid = null;

      assert.equal(photo.owner, null);
    });

    test("a models empty relationship reference turns to promise and can fetch when changed", async function (assert) {
      let { Server, RESTPhoto, RESTUser } = setupRESTModels();
      this.Server = Server;

      let firstUser = await RESTUser.insert({ first_name: "Izel" });
      let secondUser = await RESTUser.insert({ first_name: "Moris" });
      let photo = RESTPhoto.build({ name: "Dinner photo" });

      assert.equal(photo.owner, null);
      assert.equal(photo.owner_uuid, null);

      photo.owner_uuid = secondUser.uuid;

      assert.deepEqual(photo.owner, secondUser);
      assert.equal(photo.owner_uuid, secondUser.uuid);
    });

    test("deleting a related model should delete the models relationship references", async function (assert) {
      let { Server, RESTPhoto, RESTUser } = setupRESTModels();
      this.Server = Server;

      let user = await RESTUser.insert({
        uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
        first_name: "Izel",
      });
      let photo = RESTPhoto.build({ name: "Dinner photo", owner: user });

      assert.deepEqual(photo.owner, user);
      assert.equal(photo.owner_uuid, user.uuid);

      await RESTUser.delete(user);

      assert.deepEqual(photo.owner, null);
      assert.equal(photo.owner_uuid, null);
    });

    test("a models empty relationship reference can turn to promise, incorrectly fetched(with server error), than can be retried to fetch correctly", async function (assert) {
      assert.expect(13);

      let { Server, RESTPhoto, RESTUser, MemoryUser } = setupRESTModels();
      this.Server = Server;

      let photo = RESTPhoto.build({
        name: "Dinner photo",
        owner_uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
      });

      this.Server.get("/users/:uuid", async ({ params }) => {
        return ServerResponse(401, { message: "Not authorized" });
      });

      try {
        await photo.owner;
      } catch (error) {
        assert.ok(error instanceof UnauthorizedError);
        assert.ok(
          error.message.includes(
            `Server responds with unauthorized access to GET ${HTTP.host}/users/`
          )
        );
      }

      assert.ok(photo.owner instanceof RelationshipPromise);
      assert.equal(photo.owner_uuid, "374c7f4a-85d6-429a-bf2a-0719525f5f29");
      assert.deepEqual(photo.errors, []);

      this.Server.get("/users/:uuid", async ({ params }) => {
        return ServerResponse(404, { message: "Not found this record" });
      });

      try {
        await photo.owner;
      } catch (error) {
        assert.ok(error instanceof NotFoundError);
        assert.ok(
          error.message.includes(`Server responded with not found for GET ${HTTP.host}/users`)
        );
      }

      assert.ok(photo.owner instanceof RelationshipPromise);
      assert.equal(photo.owner_uuid, "374c7f4a-85d6-429a-bf2a-0719525f5f29");
      assert.deepEqual(photo.errors, []);

      await MemoryUser.insert({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29", first_name: "Izel" });

      this.Server.get("/users/:uuid", async ({ params }) => {
        let user = await MemoryUser.find(params.uuid);

        return { user: MemoryUser.serializer(user) };
      });

      let result = await photo.owner.reload();

      assert.deepEqual(result, RESTUser.peek("374c7f4a-85d6-429a-bf2a-0719525f5f29"));
      assert.equal(photo.owner.first_name, "Izel");
      assert.equal(photo.owner_uuid, "374c7f4a-85d6-429a-bf2a-0719525f5f29");
    });
  }
);
