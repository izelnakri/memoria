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
  "@memoria/adapters | RESTAdapter | Relationships | @belongsTo API for ID(integer) pointing to HasOne",
  function (hooks) {
    setupMemoria(hooks);

    // TODO: also add embed tests to the test cases correctly
    test("new model can be built from scratch and it sends the right data to the server during post", async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let group = RESTGroup.build({ name: "Some group" });
      let photo = RESTPhoto.build({ name: "Dinner photo", group });

      assert.strictEqual(photo.group, group);
      assert.equal(photo.group_id, group.id);

      let insertedPhoto = await RESTPhoto.insert(photo);

      assert.strictEqual(photo.group, group);
      assert.strictEqual(insertedPhoto.group, group);
      assert.equal(insertedPhoto.group_id, group.id);

      let insertedGroup = await RESTGroup.insert(group);

      assert.strictEqual(photo.group, insertedGroup);
      assert.strictEqual(insertedPhoto.group, insertedGroup);
    });

    test("new model can have relationship set afterwards and it sends the right data to the server during post", async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let group = RESTGroup.build({ name: "Some group" });
      let photo = RESTPhoto.build({ name: "Dinner photo" });
      let secondPhoto = RESTPhoto.build({ name: "Second photo" });

      assert.equal(photo.group, null);
      assert.equal(secondPhoto.group, null);

      let insertedPhoto = await RESTPhoto.insert(photo);

      assert.equal(photo.group, null);
      assert.equal(insertedPhoto.group, null);

      secondPhoto.group = group;

      let secondInsertedPhoto = await RESTPhoto.insert(secondPhoto);

      assert.strictEqual(secondInsertedPhoto.group, group);
      assert.equal(secondInsertedPhoto.group_id, group.id);
      assert.strictEqual(secondPhoto.group, group);
      assert.equal(secondPhoto.group_id, group.id);
    });

    test("fetched model can request the relationship(without embed) and change the relationship before update", async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let group = await RESTGroup.insert({ name: "Some group" });
      let photo = await RESTPhoto.insert({ name: "Dinner photo", group_id: group.id });

      assert.deepEqual(photo.group, group);
      assert.notStrictEqual(photo.group, group);
      assert.equal(photo.group_id, group.id);

      let fetchedPhoto = await RESTPhoto.find(photo.id);

      assert.deepEqual(fetchedPhoto.group, group);
      assert.notStrictEqual(fetchedPhoto.group, group);
      assert.equal(fetchedPhoto.group_id, group.id);

      let newGroup = RESTGroup.build({ name: "Another group" });

      assert.equal(newGroup.name, "Another group");

      fetchedPhoto.group = newGroup;

      assert.strictEqual(fetchedPhoto.group, newGroup);
      assert.equal(fetchedPhoto.group_id, null);

      let updatedPhoto = await RESTPhoto.update(fetchedPhoto);

      assert.strictEqual(fetchedPhoto.group, newGroup);
      assert.strictEqual(updatedPhoto.group, newGroup);
      assert.equal(updatedPhoto.group_id, null);
    });

    test("fetched model can remove the relationship before update", async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let group = await RESTGroup.insert({ name: "Some group" });
      let photo = await RESTPhoto.insert({ name: "Dinner photo", group_id: group.id });

      assert.deepEqual(photo.group, group);
      assert.notStrictEqual(photo.group, group);

      let fetchedPhoto = await RESTPhoto.find(photo.id);

      assert.notOk(fetchedPhoto.isNew);
      assert.deepEqual(fetchedPhoto.group, group);
      assert.notStrictEqual(fetchedPhoto.group, group);
      assert.equal(fetchedPhoto.group_id, group.id);

      fetchedPhoto.group = null;

      assert.equal(fetchedPhoto.group, null);
      assert.equal(fetchedPhoto.group_id, null);

      let updatedPhoto = await RESTPhoto.update(fetchedPhoto);

      assert.equal(fetchedPhoto.group, null);
      assert.equal(updatedPhoto.group, null);
      assert.equal(updatedPhoto.group_id, null);
    });

    test("fetched model can remove the relationship before delete", async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let group = await RESTGroup.insert({ name: "Some group" });
      let photo = await RESTPhoto.insert({ name: "Dinner photo", group_id: group.id });

      assert.deepEqual(photo.group, group);
      assert.notStrictEqual(photo.group, group);

      let fetchedPhoto = await RESTPhoto.find(photo.id);

      assert.deepEqual(fetchedPhoto.group, group);
      assert.notStrictEqual(fetchedPhoto.group, group);
      assert.equal(fetchedPhoto.group_id, group.id);

      fetchedPhoto.group = null;

      assert.equal(fetchedPhoto.group, null);
      assert.equal(fetchedPhoto.group_id, null);

      let deletedPhoto = await RESTPhoto.delete(fetchedPhoto);

      assert.equal(fetchedPhoto.group, null);
      assert.equal(deletedPhoto.group, null);
      assert.equal(deletedPhoto.group_id, null);
    });

    // TODO: add this test case
    // test('when related models reflective relationships are completely cleared it deosnt clear the foreign key, just the relationship of the model', async function (assert) {

    // });

    // when there is hasOne the reflection cache should print warning! two models can have the same belongs_to in a table but should there be check for hasOne reflection(?)
    test("a model can create, update, delete with correct changing relationships without GET in one flow", async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let firstPhoto = await RESTPhoto.insert({ name: "First photo" });
      let secondPhoto = await RESTPhoto.insert({ name: "Second photo" });
      let group = RESTGroup.build({ name: "Dinner group", photo: secondPhoto });

      assert.strictEqual(group.photo, secondPhoto);
      assert.equal(secondPhoto.group_id, group.id);

      firstPhoto.group = group; // TODO: this should trigger a logical warning(!!) setting group to firstPhoto but secondPhoto already has group as well(?) clean that first(?)

      assert.strictEqual(firstPhoto.group, group);
      assert.equal(firstPhoto.group_id, group.id);
      assert.strictEqual(secondPhoto.group, group);
      assert.equal(secondPhoto.group_id, group.id);
      assert.strictEqual(group.photo, firstPhoto);

      let insertedGroup = await RESTGroup.insert(group);

      assert.strictEqual(insertedGroup.photo, firstPhoto);
      assert.strictEqual(group.photo, firstPhoto);

      assert.strictEqual(firstPhoto.group, insertedGroup);
      assert.equal(firstPhoto.group_id, insertedGroup.id);
      assert.strictEqual(secondPhoto.group, insertedGroup);
      assert.equal(secondPhoto.group_id, insertedGroup.id);

      secondPhoto.group = insertedGroup;

      assert.strictEqual(secondPhoto.group, insertedGroup);
      assert.equal(secondPhoto.group_id, insertedGroup.id);
      assert.strictEqual(insertedGroup.photo, secondPhoto);
      assert.strictEqual(group.photo, firstPhoto);
      assert.strictEqual(firstPhoto.group, insertedGroup);
      assert.equal(firstPhoto.group_id, insertedGroup.id);

      let updatedGroup = await RESTGroup.update(insertedGroup);

      assert.strictEqual(updatedGroup.photo, secondPhoto);
      assert.strictEqual(insertedGroup.photo, secondPhoto);
      assert.strictEqual(group.photo, firstPhoto);

      assert.strictEqual(secondPhoto.group, updatedGroup);
      assert.equal(secondPhoto.group_id, updatedGroup.id);
      assert.strictEqual(firstPhoto.group, updatedGroup);
      assert.equal(firstPhoto.group_id, updatedGroup.id);

      secondPhoto.group = null;

      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_id, null);
      assert.strictEqual(updatedGroup.photo, firstPhoto);

      assert.strictEqual(insertedGroup.photo, firstPhoto);
      assert.strictEqual(group.photo, firstPhoto);

      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_id, null);

      assert.strictEqual(firstPhoto.group, updatedGroup);
      assert.equal(firstPhoto.group_id, updatedGroup.id);

      let deletedGroup = await RESTGroup.delete(updatedGroup);

      assert.equal(updatedGroup.photo, null);
      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_id, null);
      assert.equal(firstPhoto.group, null);
      assert.equal(firstPhoto.group_id, null);
    });

    test("a model can create, update, delete with correct changing relationships with GET/cache in one flow", async function (assert) {
      let { Server, RESTPhoto, RESTGroup, MemoryGroup } = setupRESTModels();
      this.Server = Server;

      await MemoryGroup.insertAll([
        {
          id: 1,
          name: "Some group",
        },
        {
          id: 2,
          name: "Another group",
        },
      ]);

      let firstGroup = await RESTGroup.find(1);
      let secondGroup = await RESTGroup.find(2);
      let photo = RESTPhoto.build({ name: "Dinner photo", group: secondGroup });

      assert.strictEqual(photo.group, secondGroup);
      assert.equal(photo.group_id, secondGroup.id);

      photo.group = firstGroup;

      assert.strictEqual(photo.group, firstGroup);
      assert.equal(photo.group_id, firstGroup.id);

      let insertedPhoto = await RESTPhoto.insert(photo);

      assert.strictEqual(insertedPhoto.group, firstGroup);
      assert.strictEqual(photo.group, firstGroup);

      insertedPhoto.group = secondGroup;

      assert.strictEqual(insertedPhoto.group, secondGroup);
      assert.equal(insertedPhoto.group_id, secondGroup.id);

      let updatedPhoto = await RESTPhoto.update(insertedPhoto);

      assert.strictEqual(updatedPhoto.group, secondGroup);
      assert.strictEqual(insertedPhoto.group, secondGroup);

      updatedPhoto.group = null;

      assert.equal(updatedPhoto.group, null);
      assert.equal(updatedPhoto.group_id, null);

      let deletedPhoto = await RESTPhoto.delete(updatedPhoto);

      assert.equal(updatedPhoto.group, null);
      assert.propEqual(deletedPhoto.group, null);
      assert.equal(deletedPhoto.group_id, null);
    });

    test("a model can fetch its not loaded relationship", async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let firstGroup = await RESTGroup.insert({ name: "Some group" });
      let secondGroup = await RESTGroup.insert({ name: "Another group" });
      let photo = RESTPhoto.build({ name: "Dinner photo", group_id: secondGroup.id });

      assert.deepEqual(photo.group, secondGroup);
      assert.notStrictEqual(photo.group, secondGroup);
      assert.equal(photo.group_id, secondGroup.id);
    });

    test("a models relationship promise reference turns to null when relationship gets destroyed either way", async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let firstGroup = await RESTGroup.insert({ name: "Some group" });
      let secondGroup = await RESTGroup.insert({ name: "Another group" });
      let photo = RESTPhoto.build({ name: "Dinner photo", group_id: secondGroup.id });

      assert.deepEqual(photo.group, secondGroup);
      assert.notStrictEqual(photo.group, secondGroup);

      photo.group_id = null;

      assert.equal(photo.group, null);
    });

    test("a models empty relationship reference turns to promise and can fetch when changed", async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let firstGroup = await RESTGroup.insert({ name: "Some group" });
      let secondGroup = await RESTGroup.insert({ name: "Another group" });
      let photo = RESTPhoto.build({ name: "Dinner photo" });

      assert.equal(photo.group, null);
      assert.equal(photo.group_id, null);

      photo.group_id = secondGroup.id;

      assert.deepEqual(photo.group, secondGroup);
      assert.notStrictEqual(photo.group, secondGroup);
      assert.equal(photo.group_id, secondGroup.id);
    });

    test("deleting a related model should delete the models relationship references", async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let group = await RESTGroup.insert({ id: 22, name: "Some group" });
      let photo = RESTPhoto.build({ name: "Dinner photo", group });

      assert.strictEqual(photo.group, group);
      assert.equal(photo.group_id, group.id);

      await RESTGroup.delete(group);

      assert.equal(photo.group, null);
      assert.equal(photo.group_id, null);
    });

    test("a models empty relationship reference can turn to promise, incorrectly fetched(with server error), than can be retried to fetch correctly", async function (assert) {
      assert.expect(13);

      let { Server, RESTPhoto, RESTGroup, MemoryGroup } = setupRESTModels();
      this.Server = Server;

      let photo = RESTPhoto.build({ name: "Dinner photo", group_id: 44 });

      this.Server.get("/groups/:id", async ({ params }) => {
        return ServerResponse(401, { message: "Not authorized" });
      });

      try {
        await photo.group;
      } catch (error) {
        assert.ok(error instanceof UnauthorizedError);
        assert.equal(
          error.message,
          `Server responds with unauthorized access to GET ${HTTP.host}/groups/44`
        );
      }

      assert.ok(photo.group instanceof RelationshipPromise);
      assert.equal(photo.group_id, 44);
      assert.deepEqual(photo.errors, []);

      this.Server.get("/groups/:id", async ({ params }) => {
        return ServerResponse(404, { message: "Not found this record" });
      });

      try {
        await photo.group;
      } catch (error) {
        assert.ok(error instanceof NotFoundError);
        assert.equal(
          error.message,
          `Server responded with not found for GET ${HTTP.host}/groups/44`
        );
      }

      assert.ok(photo.group instanceof RelationshipPromise);
      assert.equal(photo.group_id, 44);
      assert.deepEqual(photo.errors, []);

      await MemoryGroup.insert({ id: 44, name: "Some group" });

      this.Server.get("/groups/:id", async ({ params }) => {
        let group = await MemoryGroup.find(params.id);

        return { group: MemoryGroup.serializer(group) };
      });

      let result = await photo.group.reload();

      assert.deepEqual(result, RESTGroup.peek(44));
      assert.equal(photo.group.name, "Some group");
      assert.equal(photo.group_id, 44);
    });
  }
);
