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
  "@memoria/adapters | RESTAdapter | Relationships | @belongsTo API for UUID(string) pointing to HasOne",
  function (hooks) {
    setupMemoria(hooks);

    // TODO: also add embed tests to the test cases correctly
    test("new model can be built from scratch and it sends the right data to the server during post", async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let group = RESTGroup.build({ name: "Some group" });
      let photo = RESTPhoto.build({ name: "Dinner photo", group });

      assert.strictEqual(photo.group, group);
      assert.equal(photo.group_uuid, group.uuid);

      let insertedPhoto = await RESTPhoto.insert(photo);

      assert.strictEqual(photo.group, group);
      assert.equal(photo.group_uuid, group.uuid);
      assert.strictEqual(insertedPhoto.group, group);
      assert.equal(insertedPhoto.group_uuid, group.uuid);
      assert.ok(insertedPhoto.group.isNew);

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
      assert.equal(secondInsertedPhoto.group_uuid, group.uuid);
      assert.strictEqual(secondPhoto.group, group);
      assert.equal(secondPhoto.group_uuid, group.uuid);
    });

    test("fetched model can request the relationship(without embed) and change the relationship before update", async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let group = await RESTGroup.insert({ name: "Some group" });
      let photo = await RESTPhoto.insert({ name: "Dinner photo", group_uuid: group.uuid });

      assert.deepEqual(photo.group, group);
      assert.notStrictEqual(photo.group, group);
      assert.equal(photo.group_uuid, group.uuid);

      let fetchedPhoto = await RESTPhoto.find(photo.uuid);

      assert.deepEqual(fetchedPhoto.group, group);
      assert.notStrictEqual(fetchedPhoto.group, group);
      assert.equal(fetchedPhoto.group_uuid, group.uuid);

      let newGroup = RESTGroup.build({ first_name: "Moris" });

      fetchedPhoto.group = newGroup;

      assert.strictEqual(fetchedPhoto.group, newGroup);
      assert.equal(fetchedPhoto.group_uuid, null);

      let updatedPhoto = await RESTPhoto.update(fetchedPhoto);

      assert.strictEqual(fetchedPhoto.group, newGroup);
      assert.strictEqual(updatedPhoto.group, newGroup);
      assert.equal(updatedPhoto.group_uuid, null);
    });

    test("fetched model can remove the relationship before update", async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let group = await RESTGroup.insert({ name: "Some group" });
      let photo = await RESTPhoto.insert({ name: "Dinner photo", group_uuid: group.uuid });

      assert.deepEqual(photo.group, group);
      assert.notStrictEqual(photo.group, group);

      let fetchedPhoto = await RESTPhoto.find(photo.uuid);

      assert.deepEqual(fetchedPhoto.group, group);
      assert.notStrictEqual(fetchedPhoto.group, group);
      assert.equal(fetchedPhoto.group_uuid, group.uuid);

      fetchedPhoto.group = null;

      assert.equal(fetchedPhoto.group, null);
      assert.equal(fetchedPhoto.group_uuid, null);

      let updatedPhoto = await RESTPhoto.update(fetchedPhoto);

      assert.equal(fetchedPhoto.group, null);
      assert.equal(updatedPhoto.group, null);
      assert.equal(updatedPhoto.group_uuid, null);
    });

    test("fetched model can remove the relationship before delete", async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let group = await RESTGroup.insert({ name: "Some group" });
      let photo = await RESTPhoto.insert({ name: "Dinner photo", group_uuid: group.uuid });

      assert.deepEqual(photo.group, group);
      assert.notStrictEqual(photo.group, group);

      let fetchedPhoto = await RESTPhoto.find(photo.uuid);

      assert.deepEqual(fetchedPhoto.group, group);
      assert.notStrictEqual(fetchedPhoto.group, group);
      assert.equal(fetchedPhoto.group_uuid, group.uuid);

      fetchedPhoto.group = null;

      assert.equal(fetchedPhoto.group, null);
      assert.equal(fetchedPhoto.group_uuid, null);

      let deletedPhoto = await RESTPhoto.delete(fetchedPhoto);

      assert.equal(fetchedPhoto.group, null);
      assert.equal(deletedPhoto.group, null);
      assert.equal(deletedPhoto.group_uuid, null);
    });

    test('when related models reflective relationships are completely cleared it doesnt clear the foreign key, just the relationship(previous pointers) of and to the model', async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let group = await RESTGroup.insert({ name: "Some group" });
      let secondGroup = RESTGroup.build({ name: "Another group" });
      let thirdGroup = RESTGroup.build({ uuid: "499ec646-493f-4eea-b92e-e383d94182f4", name: "Third group" });
      let photo = await RESTPhoto.insert({ name: "Dinner photo", group_uuid: group.uuid });

      assert.equal(photo.group_uuid, group.uuid);
      assert.deepEqual(photo.group, group);

      group.photo = null;

      assert.equal(photo.group_uuid, group.uuid);
      assert.deepEqual(photo.group.toJSON(), group.toJSON());

      secondGroup.photo = photo;

      assert.equal(photo.group_uuid, null);
      assert.strictEqual(photo.group, secondGroup);

      secondGroup.photo = null;

      assert.equal(photo.group_uuid, null);
      assert.equal(photo.group, null);

      thirdGroup.photo = photo;

      assert.equal(photo.group_uuid, thirdGroup.uuid);
      assert.deepEqual(photo.group, thirdGroup);

      thirdGroup.photo = null;

      assert.equal(photo.group_uuid, thirdGroup.uuid);
      assert.ok(photo.group instanceof RelationshipPromise);
      assert.equal(await photo.group, null);

      let insertedThirdGroup = await RESTGroup.insert(thirdGroup);

      assert.deepEqual(photo.group, thirdGroup);
      assert.deepEqual(photo.group, insertedThirdGroup);
      assert.strictEqual(photo.group.photo, photo);
    });

    test("a model can create, update, delete with correct changing relationships without GET in one flow", async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let firstGroup = await RESTGroup.insert({ name: "Some group" });
      let secondGroup = await RESTGroup.insert({ first_name: "Moris" });
      let photo = RESTPhoto.build({ name: "Dinner photo", group: secondGroup });

      assert.strictEqual(photo.group, secondGroup);
      assert.equal(photo.group_uuid, secondGroup.uuid);

      photo.group = firstGroup;

      assert.strictEqual(photo.group, firstGroup);
      assert.equal(photo.group_uuid, firstGroup.uuid);

      let insertedPhoto = await RESTPhoto.insert(photo);

      assert.strictEqual(insertedPhoto.group, firstGroup);
      assert.equal(insertedPhoto.group_uuid, firstGroup.uuid);
      assert.strictEqual(photo.group, firstGroup);
      assert.equal(photo.group_uuid, firstGroup.uuid);

      insertedPhoto.group = secondGroup;

      assert.strictEqual(insertedPhoto.group, secondGroup);
      assert.equal(insertedPhoto.group_uuid, secondGroup.uuid);

      let updatedPhoto = await RESTPhoto.update(insertedPhoto);

      assert.strictEqual(updatedPhoto.group, secondGroup);
      assert.equal(updatedPhoto.group_uuid, secondGroup.uuid);
      assert.strictEqual(insertedPhoto.group, secondGroup);

      updatedPhoto.group = null;

      assert.equal(updatedPhoto.group, null);
      assert.equal(updatedPhoto.group_uuid, null);

      let deletedPhoto = await RESTPhoto.delete(updatedPhoto);

      assert.equal(updatedPhoto.group, null);
      assert.equal(deletedPhoto.group, null);
      assert.equal(deletedPhoto.group_uuid, null);
    });

    test("reflexive side test: a model can be built, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
      // when there is hasOne the reflection cache should print warning! two models can have the same belongs_to in a table but should there be check for hasOne reflection(?)
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let firstPhoto = await RESTPhoto.insert({ name: "First photo" });
      let secondPhoto = await RESTPhoto.insert({ name: "Second photo" });
      let group = RESTGroup.build({ name: "Dinner group", photo: secondPhoto });

      assert.strictEqual(group.photo, secondPhoto);
      assert.equal(secondPhoto.group_uuid, group.uuid);

      firstPhoto.group = group; // TODO: this should trigger a logical warning(!!) setting group to firstPhoto but secondPhoto already has group as well(?) clean that first(?)

      assert.strictEqual(firstPhoto.group, group);
      assert.equal(firstPhoto.group_uuid, group.uuid);
      assert.strictEqual(secondPhoto.group, group);
      assert.equal(secondPhoto.group_uuid, group.uuid);
      assert.strictEqual(group.photo, firstPhoto);

      let insertedGroup = await RESTGroup.insert(group);

      assert.strictEqual(insertedGroup.photo, firstPhoto);
      assert.strictEqual(group.photo, firstPhoto);

      assert.strictEqual(firstPhoto.group, insertedGroup);
      assert.equal(firstPhoto.group_uuid, insertedGroup.uuid);
      assert.strictEqual(secondPhoto.group, insertedGroup);
      assert.equal(secondPhoto.group_uuid, insertedGroup.uuid);

      secondPhoto.group = insertedGroup;

      assert.strictEqual(secondPhoto.group, insertedGroup);
      assert.equal(secondPhoto.group_uuid, insertedGroup.uuid);
      assert.strictEqual(insertedGroup.photo, secondPhoto);

      assert.strictEqual(group.photo, firstPhoto);
      assert.strictEqual(firstPhoto.group, insertedGroup);
      assert.equal(firstPhoto.group_uuid, insertedGroup.uuid);

      let updatedGroup = await RESTGroup.update(insertedGroup);

      assert.strictEqual(insertedGroup.photo, secondPhoto);
      assert.strictEqual(updatedGroup.photo, secondPhoto);
      assert.strictEqual(group.photo, firstPhoto);

      assert.strictEqual(secondPhoto.group, updatedGroup);
      assert.equal(secondPhoto.group_uuid, updatedGroup.uuid);
      assert.strictEqual(firstPhoto.group, updatedGroup);
      assert.equal(firstPhoto.group_uuid, updatedGroup.uuid);

      secondPhoto.group = null;

      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_uuid, null);
      assert.strictEqual(updatedGroup.photo, firstPhoto);

      assert.strictEqual(firstPhoto.group, updatedGroup);
      assert.equal(firstPhoto.group_uuid, updatedGroup.uuid);
      assert.strictEqual(insertedGroup.photo, firstPhoto);
      assert.strictEqual(group.photo, firstPhoto);

      let deletedGroup = await RESTGroup.delete(updatedGroup);

      assert.equal(updatedGroup.photo, null);
      assert.equal(await deletedGroup.photo, null);
      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_uuid, null);
      assert.equal(firstPhoto.group, null);
      assert.equal(firstPhoto.group_uuid, null);
    });

    test("a model can create, update, delete with correct changing relationships with GET/cache in one flow", async function (assert) {
      let { Server, RESTPhoto, RESTGroup, MemoryGroup } = setupRESTModels();
      this.Server = Server;

      await MemoryGroup.insertAll([
        {
          uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
          name: "Some group",
        },
        {
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          first_name: "Another Group",
        },
      ]);

      let firstGroup = await RESTGroup.find("77653ad3-47e4-4ec2-b49f-57ea36a627e7");
      let secondGroup = await RESTGroup.find("d351963d-e725-4092-a37c-1ca1823b57d3");
      let photo = RESTPhoto.build({ name: "Dinner photo", group: secondGroup });

      assert.strictEqual(photo.group, secondGroup);
      assert.equal(photo.group_uuid, secondGroup.uuid);

      photo.group = firstGroup;

      assert.strictEqual(photo.group, firstGroup);
      assert.equal(photo.group_uuid, firstGroup.uuid);

      let insertedPhoto = await RESTPhoto.insert(photo);

      assert.strictEqual(insertedPhoto.group, firstGroup);
      assert.strictEqual(photo.group, firstGroup);

      insertedPhoto.group = secondGroup;

      assert.strictEqual(insertedPhoto.group, secondGroup);
      assert.equal(insertedPhoto.group_uuid, secondGroup.uuid);

      let updatedPhoto = await RESTPhoto.update(insertedPhoto);

      assert.strictEqual(updatedPhoto.group, secondGroup);
      assert.strictEqual(insertedPhoto.group, secondGroup);

      updatedPhoto.group = null;

      assert.equal(updatedPhoto.group, null);
      assert.equal(updatedPhoto.group_uuid, null);

      let deletedPhoto = await RESTPhoto.delete(updatedPhoto);

      assert.equal(updatedPhoto.group, null);
      assert.propEqual(deletedPhoto.group, null);
      assert.equal(deletedPhoto.group_uuid, null);
    });

    test("a model can fetch its not loaded relationship", async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let firstGroup = await RESTGroup.insert({ name: "Some group" });
      let secondGroup = await RESTGroup.insert({ first_name: "Moris" });
      let photo = RESTPhoto.build({ name: "Dinner photo", group_uuid: secondGroup.uuid });

      assert.deepEqual(photo.group, secondGroup);
      assert.notStrictEqual(photo.group, secondGroup);
      assert.equal(photo.group_uuid, secondGroup.uuid);
    });

    test("a models relationship promise reference turns to null when relationship gets destroyed either way", async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let firstGroup = await RESTGroup.insert({ name: "Some group" });
      let secondGroup = await RESTGroup.insert({ first_name: "Moris" });
      let photo = RESTPhoto.build({ name: "Dinner photo", group_uuid: secondGroup.uuid });

      assert.deepEqual(photo.group, secondGroup);
      assert.notStrictEqual(photo.group, secondGroup);

      photo.group_uuid = null;

      assert.equal(photo.group, null);
    });

    test("a models empty relationship reference turns to promise and can fetch when changed", async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let firstGroup = await RESTGroup.insert({ name: "Some group" });
      let secondGroup = await RESTGroup.insert({ first_name: "Moris" });
      let photo = RESTPhoto.build({ name: "Dinner photo" });

      assert.equal(photo.group, null);
      assert.equal(photo.group_uuid, null);

      photo.group_uuid = secondGroup.uuid;

      assert.deepEqual(photo.group, secondGroup);
      assert.notStrictEqual(photo.group, secondGroup);
      assert.equal(photo.group_uuid, secondGroup.uuid);
    });

    test("deleting a related model should delete the models relationship references", async function (assert) {
      let { Server, RESTPhoto, RESTGroup } = setupRESTModels();
      this.Server = Server;

      let group = await RESTGroup.insert({
        uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
        name: "Some group",
      });
      let photo = RESTPhoto.build({ name: "Dinner photo", group });

      assert.strictEqual(photo.group, group);
      assert.equal(photo.group_uuid, group.uuid);

      await RESTGroup.delete(group);

      assert.deepEqual(photo.group, null);
      assert.equal(photo.group_uuid, null);
    });

    test("a models empty relationship reference can turn to promise, incorrectly fetched(with server error), than can be retried to fetch correctly", async function (assert) {
      assert.expect(13);

      let { Server, RESTPhoto, RESTGroup, MemoryGroup } = setupRESTModels();
      this.Server = Server;

      let photo = RESTPhoto.build({
        name: "Dinner photo",
        group_uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
      });

      this.Server.get("/groups/:uuid", async ({ params }) => {
        return ServerResponse(401, { message: "Not authorized" });
      });

      try {
        await photo.group;
      } catch (error) {
        assert.ok(error instanceof UnauthorizedError);
        assert.ok(
          error.message.includes(
            `Server responds with unauthorized access to GET ${HTTP.host}/groups/`
          )
        );
      }

      assert.ok(photo.group instanceof RelationshipPromise);
      assert.equal(photo.group_uuid, "374c7f4a-85d6-429a-bf2a-0719525f5f29");
      assert.deepEqual(photo.errors, []);

      this.Server.get("/groups/:uuid", async ({ params }) => {
        return ServerResponse(404, { message: "Not found this record" });
      });

      try {
        await photo.group;
      } catch (error) {
        assert.ok(error instanceof NotFoundError);
        assert.ok(
          error.message.includes(`Server responded with not found for GET ${HTTP.host}/groups`)
        );
      }

      assert.ok(photo.group instanceof RelationshipPromise);
      assert.equal(photo.group_uuid, "374c7f4a-85d6-429a-bf2a-0719525f5f29");
      assert.deepEqual(photo.errors, []);

      await MemoryGroup.insert({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29", name: "Some group" });

      this.Server.get("/groups/:uuid", async ({ params }) => {
        let group = await MemoryGroup.find(params.uuid);

        return { group: MemoryGroup.serializer(group) };
      });

      let result = await photo.group.reload();

      assert.deepEqual(result, RESTGroup.peek("374c7f4a-85d6-429a-bf2a-0719525f5f29"));
      assert.equal(photo.group.name, "Some group");
      assert.equal(photo.group_uuid, "374c7f4a-85d6-429a-bf2a-0719525f5f29");
    });
  }
);
