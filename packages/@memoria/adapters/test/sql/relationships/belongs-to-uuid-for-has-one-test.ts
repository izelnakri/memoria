import Model, {
  Schema,
  PrimaryGeneratedColumn,
  RelationshipDB,
  Column,
  RuntimeError,
  Serializer,
  UnauthorizedError,
  // NotFoundError,
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
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let group = SQLGroup.build({ name: "Some group" });
      let photo = SQLPhoto.build({ name: "Dinner photo", group });

      assert.ok(photo.group === group);
      assert.equal(photo.group_uuid, group.uuid);

      let insertedPhoto = await SQLPhoto.insert(photo);

      assert.ok(photo.group === group);
      assert.ok(insertedPhoto.group === group);
      assert.equal(insertedPhoto.group_uuid, group.uuid);

      let insertedGroup = await SQLGroup.insert(group);

      assert.ok(photo.group === insertedGroup);
      assert.ok(insertedPhoto.group === insertedGroup);
    });

    test("new model can have relationship set afterwards and it sends the right data to the server during post", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let group = SQLGroup.build({ name: "Some group" });
      let photo = SQLPhoto.build({ name: "Dinner photo" });
      let secondPhoto = SQLPhoto.build({ name: "Second photo" });

      assert.equal(photo.group, null);
      assert.equal(secondPhoto.group, null);

      let insertedPhoto = await SQLPhoto.insert(photo);

      assert.equal(photo.group, null);
      assert.equal(insertedPhoto.group, null);

      secondPhoto.group = group;

      let secondInsertedPhoto = await SQLPhoto.insert(secondPhoto);

      assert.ok(secondPhoto.group === group);
      assert.equal(secondPhoto.group_uuid, group.uuid);
      assert.ok(secondInsertedPhoto.group === group);
      assert.equal(secondInsertedPhoto.group_uuid, group.uuid);
    });

    test("fetched model can request the relationship(without embed) and change the relationship before update", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let group = await SQLGroup.insert({ name: "Some group" });
      let photo = await SQLPhoto.insert({ name: "Dinner photo", group_uuid: group.uuid });

      assert.deepEqual(photo.group, group);
      assert.equal(photo.group_uuid, group.uuid);

      let fetchedPhoto = await SQLPhoto.find(photo.uuid);

      assert.deepEqual(fetchedPhoto.group, group);
      assert.equal(fetchedPhoto.group_uuid, group.uuid);

      let newGroup = SQLGroup.build({ name: "Another group" });

      assert.equal(newGroup.name, "Another group");

      fetchedPhoto.group = newGroup;

      assert.ok(fetchedPhoto.group === newGroup);
      assert.equal(fetchedPhoto.group_uuid, null);

      let updatedPhoto = await SQLPhoto.update(fetchedPhoto);

      assert.ok(updatedPhoto.group === newGroup);
      assert.ok(fetchedPhoto.group === newGroup);
      assert.equal(updatedPhoto.group_uuid, null);
    });

    test("fetched model can remove the relationship before delete", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let group = await SQLGroup.insert({ name: "Some group" });
      let photo = await SQLPhoto.insert({ name: "Dinner photo", group_uuid: group.uuid });

      assert.deepEqual(photo.group, group);

      let fetchedPhoto = await SQLPhoto.find(photo.uuid);

      assert.deepEqual(fetchedPhoto.group, group);
      assert.equal(fetchedPhoto.group_uuid, group.uuid);

      fetchedPhoto.group = null;

      assert.equal(fetchedPhoto.group, null);
      assert.equal(fetchedPhoto.group_uuid, null);

      let deletedPhoto = await SQLPhoto.delete(fetchedPhoto);

      assert.equal(fetchedPhoto.group, null);
      assert.equal(fetchedPhoto.group_uuid, null);
      assert.equal(deletedPhoto.group_uuid, null);
      assert.equal(deletedPhoto.group, null);
    });

    test('when related models reflective relationships are completely cleared it doesnt clear the foreign key, just the relationship(previous pointers) of and to the model', async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let group = await SQLGroup.insert({ name: "Some group" });
      let secondGroup = SQLGroup.build({ name: "Another group" });
      let thirdGroup = SQLGroup.build({ uuid: "d351963d-e725-4092-a37c-1ca1823b57d9", name: "Third group" });
      let photo = await SQLPhoto.insert({ name: "Dinner photo", group_uuid: group.uuid });

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

      let insertedThirdGroup = await SQLGroup.insert(thirdGroup);

      assert.deepEqual(photo.group, thirdGroup);
      assert.deepEqual(photo.group, insertedThirdGroup);
      assert.strictEqual(photo.group.photo, photo);
    });

    test("a model can create, update, delete with correct changing relationships without GET in one flow", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let firstGroup = await SQLGroup.insert({ name: "Some group" });
      let secondGroup = await SQLGroup.insert({ name: "Another group" });
      let photo = SQLPhoto.build({ name: "Dinner photo", group: secondGroup });

      assert.ok(photo.group === secondGroup);
      assert.equal(photo.group_uuid, secondGroup.uuid);

      photo.group = firstGroup;

      assert.ok(photo.group === firstGroup);
      assert.equal(photo.group_uuid, firstGroup.uuid);

      let insertedPhoto = await SQLPhoto.insert(photo);

      assert.ok(insertedPhoto.group === firstGroup);
      assert.ok(photo.group === firstGroup);

      insertedPhoto.group = secondGroup;

      assert.ok(insertedPhoto.group === secondGroup);
      assert.equal(insertedPhoto.group_uuid, secondGroup.uuid);

      let updatedPhoto = await SQLPhoto.update(insertedPhoto);

      assert.ok(updatedPhoto.group === secondGroup);
      assert.ok(insertedPhoto.group === secondGroup);

      updatedPhoto.group = null;

      assert.equal(updatedPhoto.group, null);
      assert.equal(updatedPhoto.group_uuid, null);

      let deletedPhoto = await SQLPhoto.delete(updatedPhoto);

      assert.equal(updatedPhoto.group, null);
      assert.equal(deletedPhoto.group_uuid, null);
      assert.equal(deletedPhoto.group, null);
    });

    test("reflexive side test: a model can be built, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
      // when there is hasOne the reflection cache should print warning! two models can have the same belongs_to in a table but should there be check for hasOne reflection(?)
      let { SQLGroup, SQLPhoto } = setupSQLModels();

      let firstPhoto = await SQLPhoto.insert({ name: "First photo" });
      let secondPhoto = await SQLPhoto.insert({ name: "Second photo" });
      let group = SQLGroup.build({ name: "Dinner group", photo: secondPhoto });

      assert.ok(group.photo === secondPhoto);
      assert.equal(secondPhoto.group_uuid, group.uuid);

      firstPhoto.group = group; // TODO: this should trigger a logical warning(!!) setting group to firstPhoto but secondPhoto already has group as well(?) clean that first(?)

      assert.ok(firstPhoto.group === group);
      assert.equal(firstPhoto.group_uuid, group.uuid);
      assert.ok(group.photo === firstPhoto);
      assert.ok(secondPhoto.group === group);
      assert.equal(secondPhoto.group_uuid, group.uuid);

      let insertedGroup = await SQLGroup.insert(group);

      assert.ok(insertedGroup.photo === firstPhoto);
      assert.ok(group.photo === firstPhoto);

      assert.ok(firstPhoto.group === insertedGroup);
      assert.equal(firstPhoto.group_uuid, insertedGroup.uuid);
      assert.ok(secondPhoto.group === insertedGroup);
      assert.equal(secondPhoto.group_uuid, insertedGroup.uuid);

      secondPhoto.group = insertedGroup;

      assert.ok(secondPhoto.group === insertedGroup);
      assert.equal(secondPhoto.group_uuid, insertedGroup.uuid);
      assert.ok(insertedGroup.photo === secondPhoto);
      assert.ok(group.photo === firstPhoto);
      assert.ok(firstPhoto.group === insertedGroup);
      assert.equal(firstPhoto.group_uuid, insertedGroup.uuid);

      let updatedGroup = await SQLGroup.update(insertedGroup);

      assert.ok(insertedGroup.photo === secondPhoto);
      assert.ok(updatedGroup.photo === secondPhoto);
      assert.ok(group.photo === firstPhoto);

      assert.ok(secondPhoto.group === updatedGroup);
      assert.equal(secondPhoto.group_uuid, updatedGroup.uuid);
      assert.ok(firstPhoto.group === updatedGroup);
      assert.equal(firstPhoto.group_uuid, updatedGroup.uuid);

      secondPhoto.group = null;

      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_uuid, null);
      assert.ok(updatedGroup.photo === firstPhoto);

      assert.ok(firstPhoto.group === updatedGroup);
      assert.equal(firstPhoto.group_uuid, updatedGroup.uuid);
      assert.ok(insertedGroup.photo === firstPhoto);
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
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      await SQLGroup.insertAll([
        {
          uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
          name: "Some group",
        },
        {
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          name: "Another name",
        },
      ]);

      let firstGroup = await SQLGroup.find("77653ad3-47e4-4ec2-b49f-57ea36a627e7");
      let secondGroup = await SQLGroup.find("d351963d-e725-4092-a37c-1ca1823b57d3");
      let photo = SQLPhoto.build({ name: "Dinner photo", group: secondGroup });

      assert.ok(photo.group === secondGroup);
      assert.equal(photo.group_uuid, secondGroup.uuid);

      photo.group = firstGroup;

      assert.ok(photo.group === firstGroup);
      assert.equal(photo.group_uuid, firstGroup.uuid);

      let insertedPhoto = await SQLPhoto.insert(photo);

      assert.ok(insertedPhoto.group === firstGroup);
      assert.ok(photo.group === firstGroup);

      insertedPhoto.group = secondGroup;

      assert.ok(insertedPhoto.group === secondGroup);
      assert.equal(insertedPhoto.group_uuid, secondGroup.uuid);

      let updatedPhoto = await SQLPhoto.update(insertedPhoto);

      assert.ok(updatedPhoto.group === secondGroup);
      assert.ok(insertedPhoto.group === secondGroup);

      updatedPhoto.group = null;

      assert.equal(updatedPhoto.group, null);
      assert.equal(updatedPhoto.group_uuid, null);

      let deletedPhoto = await SQLPhoto.delete(updatedPhoto);

      assert.equal(updatedPhoto.group, null);
      assert.equal(deletedPhoto.group_uuid, null);
      assert.equal(deletedPhoto.group, null);
    });

    test("a model can fetch its not loaded relationship", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let firstGroup = await SQLGroup.insert({ name: "Some group" });
      let secondGroup = await SQLGroup.insert({ name: "Another group" });
      let photo = SQLPhoto.build({ name: "Dinner photo", group_uuid: secondGroup.uuid });

      assert.deepEqual(photo.group, secondGroup);
      assert.equal(photo.group_uuid, secondGroup.uuid);
    });

    test("a models relationship promise reference turns to null when relationship gets destroyed either way", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let firstGroup = await SQLGroup.insert({ name: "Some group" });
      let secondGroup = await SQLGroup.insert({ name: "Another group" });
      let photo = SQLPhoto.build({ name: "Dinner photo", group_uuid: secondGroup.uuid });

      assert.deepEqual(photo.group, secondGroup);

      photo.group_uuid = null;

      assert.equal(photo.group, null);
    });

    test("a models empty relationship reference turns to promise and can fetch when changed", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let firstGroup = await SQLGroup.insert({ name: "Some group" });
      let secondGroup = await SQLGroup.insert({ name: "Another group" });
      let photo = SQLPhoto.build({ name: "Dinner photo" });

      assert.equal(photo.group, null);
      assert.equal(photo.group_uuid, null);

      photo.group_uuid = secondGroup.uuid;

      assert.deepEqual(photo.group, secondGroup);
      assert.equal(photo.group_uuid, secondGroup.uuid);
    });

    test("deleting a related model should delete the models relationship references", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let group = await SQLGroup.insert({
        uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
        name: "Some group",
      });
      let photo = SQLPhoto.build({ name: "Dinner photo", group: group });

      assert.ok(photo.group === group);
      assert.equal(photo.group_uuid, group.uuid);

      await SQLGroup.delete(group);

      assert.equal(photo.group, null);
      assert.equal(photo.group_uuid, null);
    });

    test("a models empty relationship reference can turn to promise, incorrectly fetched(with server error), than can be retried to fetch correctly", async function (assert) {
      assert.expect(9);

      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let photo = SQLPhoto.build({
        name: "Dinner photo",
        group_uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
      });
      let groupPromise = photo.group;
      try {
        await groupPromise;
      } catch (error) {
        // TODO: it doesnt throw currently
        // assert.ok(error instanceof NotFoundError);
        // assert.equal(
        //   error.message,
        //   `sql_group table record with uuid:374c7f4a-85d6-429a-bf2a-0719525f5f29 not found`
        // );
      }

      let insertedGroup = await SQLGroup.insert({
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        name: "Some group",
      });

      assert.propContains(insertedGroup, {
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        name: "Some group",
      });
      assert.deepEqual(photo.group, insertedGroup);
      assert.equal(photo.group_uuid, "374c7f4a-85d6-429a-bf2a-0719525f5f29");
      assert.deepEqual(photo.errors, []);

      let foundgroup = await photo.group;

      assert.deepEqual(foundgroup, insertedGroup);

      let reloadPromise = groupPromise.reload();

      assert.ok(reloadPromise instanceof RelationshipPromise);

      let result = await reloadPromise;

      assert.deepEqual(result, SQLGroup.peek("374c7f4a-85d6-429a-bf2a-0719525f5f29"));
      assert.equal(photo.group.name, "Some group");
      assert.equal(photo.group_uuid, "374c7f4a-85d6-429a-bf2a-0719525f5f29");
    });
  }
);
