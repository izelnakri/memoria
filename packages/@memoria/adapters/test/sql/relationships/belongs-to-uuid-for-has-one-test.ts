import { RelationshipPromise } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../../helpers/setup-memoria.js";
import setupSQLModels from "../../helpers/models-with-relations/sql/uuid/index.js";

const FIRST_TARGET_UUID = "374c7f4a-85d6-429a-bf2a-0719525f5f21";

module("@memoria/adapters | SQLAdapter | Relationships | @belongsTo API for UUID(string)", function (hooks) {
  setupMemoria(hooks);

  module("Relationship fetch tests", function () {
    test("Model can fetch its not loaded relationship", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let firstGroup = await SQLGroup.insert({ name: "Some group" });
      let secondGroup = await SQLGroup.insert({ name: "Another group" });
      let photo = SQLPhoto.build({ name: "Dinner photo", group_uuid: secondGroup.uuid });

      assert.strictEqual(photo.group, secondGroup);
      assert.equal(photo.group_uuid, secondGroup.uuid);
    });

    test("Models relationship promise reference turns to null when relationship foreign key sets to null", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let firstGroup = await SQLGroup.insert({ name: "Some group" });
      let secondGroup = await SQLGroup.insert({ name: "Another group" });
      let photo = SQLPhoto.build({ name: "Dinner photo", group_uuid: secondGroup.uuid });

      assert.strictEqual(photo.group, secondGroup);

      photo.group_uuid = null;

      assert.equal(photo.group, null);
    });

    test("Models empty relationship reference turns to promise and can fetch when changed", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let firstGroup = await SQLGroup.insert({ name: "Some group" });
      let secondGroup = await SQLGroup.insert({ name: "Another group" });
      let photo = SQLPhoto.build({ name: "Dinner photo" });

      assert.equal(photo.group, null);
      assert.equal(photo.group_uuid, null);

      photo.group_uuid = secondGroup.uuid;

      assert.strictEqual(photo.group, secondGroup);
      assert.equal(photo.group_uuid, secondGroup.uuid);
    });

    test("Models empty relationship reference can turn to promise, when relationship not existing, then can be retried to fetch correctly", async function (assert) {
      assert.expect(14);

      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let photo = SQLPhoto.build({ name: "Dinner photo", group_uuid: FIRST_TARGET_UUID });
      let groupLookupPromise = photo.group;
      try {
        let result = await groupLookupPromise;

        assert.equal(result, null);
      } catch (error) {
        assert.ok(false);
        // TODO: it doesnt throw currently
        // assert.ok(error instanceof NotFoundError);
        // assert.equal(error.message, `sql_group table record with id:44 not found`);
      }

      let insertedGroup = await SQLGroup.insert({ uuid: FIRST_TARGET_UUID, name: "Some group" });

      assert.propContains(insertedGroup, { uuid: FIRST_TARGET_UUID, name: "Some group" });
      assert.strictEqual(photo.group, insertedGroup);
      assert.equal(photo.group_uuid, FIRST_TARGET_UUID);
      assert.deepEqual(photo.errors, []);

      let foundGroup = await photo.group;

      assert.strictEqual(insertedGroup, foundGroup);

      let groupLookupReloadPromise = groupLookupPromise.reload();

      assert.ok(groupLookupPromise instanceof RelationshipPromise);

      let group = await groupLookupReloadPromise;

      assert.deepEqual(group, SQLGroup.peek(FIRST_TARGET_UUID));
      assert.notStrictEqual(group, insertedGroup);
      assert.equal(photo.group.name, "Some group");
      assert.equal(photo.group_uuid, FIRST_TARGET_UUID);

      let finalGroup = await group.reload();
      assert.notStrictEqual(finalGroup, insertedGroup);
      assert.notStrictEqual(finalGroup, group);
      assert.deepEqual(finalGroup, SQLGroup.peek(FIRST_TARGET_UUID));
    });
  });

  module("Basic relationship assignment then commit tests", function () {
    test("New model can be built from scratch and it sends the right data to the server during post", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let group = SQLGroup.build({ name: "Some group" });
      let photo = SQLPhoto.build({ name: "Dinner photo", group });

      assert.strictEqual(photo.group, group);
      assert.equal(photo.group_uuid, group.uuid);

      let insertedPhoto = await SQLPhoto.insert(photo);

      assert.strictEqual(photo.group, group);
      assert.equal(insertedPhoto.group_uuid, null);
      assert.strictEqual(insertedPhoto.group, group);

      let insertedGroup = await SQLGroup.insert(group);

      assert.strictEqual(photo.group, insertedGroup);
      assert.strictEqual(insertedPhoto.group, insertedGroup);
      assert.strictEqual(group, insertedGroup);
      assert.strictEqual(group.photo, insertedPhoto);
    });

    test("New model can have relationship set afterwards and it sends the right data to the server during post", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let group = await SQLGroup.insert({ name: "Some group" });
      let photo = SQLPhoto.build({ name: "Dinner photo" });
      let secondPhoto = SQLPhoto.build({ name: "Second photo" });

      assert.equal(photo.group, null);
      assert.equal(secondPhoto.group, null);

      let insertedPhoto = await SQLPhoto.insert(photo);

      assert.equal(photo.group, null);
      assert.equal(insertedPhoto.group, null);

      secondPhoto.group_uuid = group.uuid;

      let secondInsertedPhoto = await SQLPhoto.insert(secondPhoto);

      assert.strictEqual(secondInsertedPhoto.group, group);
      assert.equal(secondInsertedPhoto.group_uuid, group.uuid);
      assert.strictEqual(secondPhoto.group, group);
      assert.equal(secondPhoto.group_uuid, group.uuid);
      assert.strictEqual(group.photo, secondInsertedPhoto);
    });

    test("Fetched model can request the relationship(without embed) and change the relationship before update", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let group = await SQLGroup.insert({ name: "Some group" });
      let photo = await SQLPhoto.insert({ name: "Dinner photo", group_uuid: group.uuid });

      assert.strictEqual(photo.group, group);
      assert.equal(photo.group_uuid, group.uuid);

      let fetchedPhoto = await SQLPhoto.find(photo.uuid);

      assert.strictEqual(fetchedPhoto.group, group);
      assert.equal(fetchedPhoto.group_uuid, group.uuid);

      let newGroup = SQLGroup.build({ name: "Another group" });

      fetchedPhoto.group = newGroup;

      assert.strictEqual(fetchedPhoto.group, newGroup);
      assert.equal(fetchedPhoto.group_uuid, null);
      assert.strictEqual(newGroup.photo, fetchedPhoto);
      assert.strictEqual(photo.group, group);
      assert.equal(photo.group_uuid, group.uuid);

      let updatedPhoto = await SQLPhoto.update(fetchedPhoto);

      assert.strictEqual(fetchedPhoto, updatedPhoto);
      assert.strictEqual(updatedPhoto.group, newGroup);
      assert.equal(updatedPhoto.group_uuid, newGroup.uuid);
      assert.strictEqual(newGroup.photo, updatedPhoto);
    });

    test("Fetched model can remove the relationship before update", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let group = await SQLGroup.insert({ name: "Some group" });
      let photo = await SQLPhoto.insert({ name: "Dinner photo", group_uuid: group.uuid });

      assert.strictEqual(photo.group, group);

      let fetchedPhoto = await SQLPhoto.find(photo.uuid);

      assert.strictEqual(fetchedPhoto.group, group);
      assert.equal(fetchedPhoto.group_uuid, group.uuid);
      assert.strictEqual(group.photo, fetchedPhoto);

      fetchedPhoto.group_uuid = null;

      assert.equal(fetchedPhoto.group, null);
      assert.equal(fetchedPhoto.group_uuid, null);
      assert.notStrictEqual(group.photo, fetchedPhoto);
      assert.deepEqual(group.photo.toJSON(), SQLPhoto.Cache.get(fetchedPhoto.uuid).toJSON());

      let updatedPhoto = await SQLPhoto.update(fetchedPhoto);

      assert.strictEqual(updatedPhoto, fetchedPhoto);
      assert.equal(updatedPhoto.group, null);
      assert.equal(updatedPhoto.group_uuid, null);
      assert.equal(await group.photo, null);
    });

    test("Fetched model can remove the relationship before delete", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let group = await SQLGroup.insert({ name: "Some group" });
      let photo = await SQLPhoto.insert({ name: "Dinner photo", group_uuid: group.uuid });

      assert.strictEqual(photo.group, group);

      let fetchedPhoto = await SQLPhoto.find(photo.uuid);

      assert.strictEqual(fetchedPhoto.group, group);
      assert.equal(fetchedPhoto.group_uuid, group.uuid);
      assert.strictEqual(group.photo, fetchedPhoto);

      fetchedPhoto.group_uuid = null;

      assert.equal(fetchedPhoto.group, null);
      assert.equal(fetchedPhoto.group_uuid, null);
      assert.notStrictEqual(group.photo, fetchedPhoto);
      assert.deepEqual(group.photo.toJSON(), SQLPhoto.Cache.get(fetchedPhoto.uuid).toJSON());

      let deletedPhoto = await SQLPhoto.delete(fetchedPhoto);

      assert.deepEqual(deletedPhoto, fetchedPhoto);
      assert.equal(deletedPhoto.group, null);
      assert.equal(deletedPhoto.group_uuid, null);
      assert.equal(fetchedPhoto.group, null);
      assert.equal(await group.photo, null);
    });
  });

  module(
    "Reverse side mutations: Changing relationship across different relationship instance assignments then commit tests",
    function () {
      test("When related models reflective relationships are completely cleared it doesnt clear the foreign key, just the relationship(previous pointers) of and to the model", async function (assert) {
        let { SQLPhoto, SQLGroup } = setupSQLModels();

        let group = await SQLGroup.insert({ name: "Some group" });
        let secondGroup = await SQLGroup.insert({ name: "Another group" });
        let thirdGroup = SQLGroup.build({ uuid: "499ec646-493f-4eea-b92e-e383d94182f4", name: "Third group" });

        let photo = await SQLPhoto.insert({ name: "Dinner photo", group_uuid: group.uuid });

        assert.equal(photo.group_uuid, group.uuid);
        assert.strictEqual(photo.group, group);

        group.photo = null;

        assert.equal(group.photo, null);
        assert.equal(photo.group_uuid, group.uuid);
        assert.notStrictEqual(photo.group, group);
        assert.deepEqual(photo.group.toJSON(), SQLGroup.Cache.get(group.uuid).toJSON());

        secondGroup.photo = photo;

        assert.strictEqual(secondGroup.photo, photo);
        assert.strictEqual(photo.group, secondGroup);
        assert.equal(photo.group_uuid, secondGroup.uuid);
        assert.equal(group.photo, null);

        secondGroup.photo = null;

        assert.equal(secondGroup.photo, null);
        assert.equal(group.photo, null);
        assert.equal(photo.group_uuid, secondGroup.uuid);
        assert.notStrictEqual(photo.group, secondGroup);
        assert.deepEqual(photo.group.toJSON(), secondGroup.toJSON());

        thirdGroup.photo = photo;

        assert.strictEqual(thirdGroup.photo, photo);
        assert.strictEqual(photo.group, thirdGroup);
        assert.equal(photo.group_uuid, thirdGroup.uuid);
        assert.equal(group.photo, null);
        assert.equal(secondGroup.photo, null);

        thirdGroup.photo = null;

        assert.equal(thirdGroup.photo, null);
        assert.equal(secondGroup.photo, null);
        assert.equal(group.photo, null);
        assert.equal(photo.group_uuid, thirdGroup.uuid);
        assert.ok(photo.group instanceof RelationshipPromise);
        assert.equal(await photo.group, null); // NOTE: because thirdGroup has never been persisted

        let insertedThirdGroup = await SQLGroup.insert(thirdGroup);

        assert.equal(photo.group_uuid, insertedThirdGroup.uuid);
        assert.strictEqual(photo.group, insertedThirdGroup);
        assert.strictEqual(photo.group.photo, photo);
      });
    }
  );

  module("CRUD: Relationship mutations and commit tests on models full lifecycle: Mutations on all sides", function () {
    test("Model can be built, created, updated, deleted with correct changing relationships without SELECT in one flow", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let firstPhoto = await SQLPhoto.insert({ name: "First photo" });
      let secondPhoto = await SQLPhoto.insert({ name: "Second photo" });
      let group = SQLGroup.build({ name: "Dinner group", photo: secondPhoto });

      assert.strictEqual(group.photo, secondPhoto);
      assert.equal(secondPhoto.group_uuid, null);

      firstPhoto.group = group; // NOTE: this should trigger a logical warning(!!) setting group to firstPhoto but secondPhoto already has group as well(?) clean that first(?)

      assert.strictEqual(firstPhoto.group, group);
      assert.equal(firstPhoto.group_uuid, group.uuid);
      assert.equal(secondPhoto.group, group);
      assert.equal(secondPhoto.group_uuid, null);
      assert.strictEqual(group.photo, firstPhoto);

      let insertedGroup = await SQLGroup.insert(group);

      assert.strictEqual(group, insertedGroup);
      assert.strictEqual(insertedGroup.photo, secondPhoto);
      assert.strictEqual(group.photo, secondPhoto); // NOTE: this is like a logical mismatch because before it was firstPhoto

      assert.strictEqual(firstPhoto.group, insertedGroup);
      assert.equal(firstPhoto.group_uuid, insertedGroup.uuid);
      assert.strictEqual(secondPhoto.group, insertedGroup);
      assert.equal(secondPhoto.group_uuid, insertedGroup.uuid);

      secondPhoto.group_uuid = insertedGroup.uuid;

      assert.strictEqual(insertedGroup.photo, secondPhoto);
      assert.strictEqual(group.photo, secondPhoto);
      assert.strictEqual(secondPhoto.group, insertedGroup);
      assert.equal(secondPhoto.group_uuid, insertedGroup.uuid);
      assert.strictEqual(firstPhoto.group, insertedGroup);
      assert.equal(firstPhoto.group_uuid, insertedGroup.uuid);

      let updatedGroup = await SQLGroup.update(insertedGroup);

      assert.strictEqual(firstPhoto.group, updatedGroup);
      assert.equal(firstPhoto.group_uuid, updatedGroup.uuid);
      assert.strictEqual(insertedGroup.photo, secondPhoto);
      assert.strictEqual(updatedGroup.photo, secondPhoto);
      assert.strictEqual(group.photo, secondPhoto);
      assert.strictEqual(secondPhoto.group, updatedGroup);
      assert.equal(secondPhoto.group_uuid, updatedGroup.uuid);

      updatedGroup.photo = secondPhoto;

      assert.strictEqual(firstPhoto.group, updatedGroup);
      assert.equal(firstPhoto.group_uuid, updatedGroup.uuid);
      assert.strictEqual(secondPhoto.group, updatedGroup);
      assert.equal(secondPhoto.group_uuid, updatedGroup.uuid);
      assert.strictEqual(updatedGroup.photo, secondPhoto);

      secondPhoto.group = null; // NOTE: Where does this come from?

      assert.equal(firstPhoto.group_uuid, updatedGroup.uuid);
      assert.strictEqual(firstPhoto.group, updatedGroup);
      assert.equal(secondPhoto.group_uuid, null);
      assert.equal(secondPhoto.group, null);

      assert.strictEqual(group.photo, firstPhoto);
      assert.strictEqual(updatedGroup.photo, firstPhoto);
      assert.strictEqual(firstPhoto.group, updatedGroup);
      assert.strictEqual(insertedGroup.photo, firstPhoto);

      let deletedGroup = await SQLGroup.delete(updatedGroup);

      assert.equal(updatedGroup.photo, null); // NOTE: this is not null, but removed stuff
      assert.equal(deletedGroup.photo, null);
      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_uuid, null);
      assert.equal(firstPhoto.group, null);
      assert.equal(firstPhoto.group_uuid, null);
    });

    test("Reverse relationship can be built, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let firstGroup = await SQLGroup.insert({ name: "Some group" });
      let secondGroup = await SQLGroup.insert({ name: "Some group" });
      let photo = SQLPhoto.build({ name: "Dinner photo", group: secondGroup });

      assert.strictEqual(photo.group, secondGroup);
      assert.equal(photo.group_uuid, secondGroup.uuid);

      photo.group_uuid = firstGroup.uuid;

      assert.strictEqual(photo.group, firstGroup);
      assert.equal(photo.group_uuid, firstGroup.uuid);
      assert.strictEqual(firstGroup.photo, photo);
      assert.ok(secondGroup.photo instanceof RelationshipPromise);

      let insertedPhoto = await SQLPhoto.insert(photo);

      assert.strictEqual(photo, insertedPhoto);
      assert.strictEqual(insertedPhoto.group, firstGroup);
      assert.equal(insertedPhoto.group_uuid, firstGroup.uuid);
      assert.strictEqual(firstGroup.photo, insertedPhoto);
      assert.ok(secondGroup.photo instanceof RelationshipPromise);

      insertedPhoto.group_uuid = secondGroup.uuid;

      assert.strictEqual(insertedPhoto.group, secondGroup);
      assert.equal(insertedPhoto.group_uuid, secondGroup.uuid);
      assert.strictEqual(secondGroup.photo, insertedPhoto);
      assert.notStrictEqual(firstGroup.photo, insertedPhoto);
      assert.deepEqual(firstGroup.photo.toJSON(), SQLPhoto.Cache.get(photo.uuid).toJSON());

      let updatedPhoto = await SQLPhoto.update(insertedPhoto); // TODO: This clears firstGroup.photo as it should be(?)

      assert.strictEqual(insertedPhoto, updatedPhoto);
      assert.strictEqual(updatedPhoto.group, secondGroup);
      assert.strictEqual(updatedPhoto.group_uuid, secondGroup.uuid);
      assert.strictEqual(secondGroup.photo, updatedPhoto);
      assert.ok(firstGroup.photo instanceof RelationshipPromise);

      updatedPhoto.group_uuid = null;

      assert.equal(updatedPhoto.group, null);
      assert.equal(updatedPhoto.group_uuid, null);
      assert.notStrictEqual(secondGroup.photo, updatedPhoto);
      assert.deepEqual(secondGroup.photo.toJSON(), SQLPhoto.Cache.get(photo.uuid).toJSON());
      assert.ok(firstGroup.photo instanceof RelationshipPromise);

      let deletedPhoto = await SQLPhoto.delete(updatedPhoto);

      assert.equal(updatedPhoto.group, null);
      assert.equal(deletedPhoto.group, null);
      assert.equal(deletedPhoto.group_uuid, null);
      assert.equal(secondGroup.photo, null); // TODO: instead of null it should be a RelationshipPromise
    });

    test("Model can be fetched, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      await SQLGroup.insertAll([
        {
          uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
          name: "Some group",
        },
        {
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          name: "Another Group",
        },
      ]);

      let firstGroup = await SQLGroup.find("77653ad3-47e4-4ec2-b49f-57ea36a627e7");
      let secondGroup = await SQLGroup.find("d351963d-e725-4092-a37c-1ca1823b57d3");
      let photo = SQLPhoto.build({ name: "Dinner photo", group: secondGroup });

      assert.strictEqual(photo.group, secondGroup);
      assert.equal(photo.group_uuid, secondGroup.uuid);
      assert.strictEqual(secondGroup.photo, photo);

      photo.group_uuid = firstGroup.uuid;

      assert.strictEqual(photo.group, firstGroup);
      assert.equal(photo.group_uuid, firstGroup.uuid);
      assert.strictEqual(firstGroup.photo, photo);
      assert.ok(secondGroup.photo instanceof RelationshipPromise);

      let insertedPhoto = await SQLPhoto.insert(photo);

      assert.strictEqual(photo, insertedPhoto);
      assert.strictEqual(insertedPhoto.group, firstGroup);
      assert.equal(insertedPhoto.group_uuid, firstGroup.uuid);
      assert.strictEqual(firstGroup.photo, insertedPhoto);
      assert.ok(secondGroup.photo instanceof RelationshipPromise);

      insertedPhoto.group_uuid = secondGroup.uuid;

      assert.strictEqual(insertedPhoto.group, secondGroup);
      assert.equal(insertedPhoto.group_uuid, secondGroup.uuid);
      assert.strictEqual(secondGroup.photo, insertedPhoto);
      assert.notStrictEqual(firstGroup.photo, insertedPhoto);
      assert.deepEqual(firstGroup.photo.toJSON(), SQLPhoto.Cache.get(photo.uuid).toJSON());

      let updatedPhoto = await SQLPhoto.update(insertedPhoto);

      assert.strictEqual(insertedPhoto, updatedPhoto);
      assert.strictEqual(updatedPhoto.group, secondGroup);
      assert.strictEqual(secondGroup.photo, updatedPhoto);
      assert.ok(firstGroup.photo instanceof RelationshipPromise);

      updatedPhoto.group_uuid = null;

      assert.equal(updatedPhoto.group, null);
      assert.equal(updatedPhoto.group_uuid, null);
      assert.notStrictEqual(secondGroup.photo, insertedPhoto);
      assert.deepEqual(secondGroup.photo.toJSON(), SQLPhoto.Cache.get(photo.uuid).toJSON());
      assert.ok(firstGroup.photo instanceof RelationshipPromise);

      let deletedPhoto = await SQLPhoto.delete(updatedPhoto);

      assert.equal(updatedPhoto.group, null);
      assert.equal(deletedPhoto.group, null);
      assert.equal(deletedPhoto.group_uuid, null);
      assert.equal(secondGroup.photo, null);
    });

    test("Deleting a related model should delete the models relationship references", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let group = await SQLGroup.insert({
        uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
        name: "Some group",
      });
      let photo = SQLPhoto.build({ name: "Dinner photo", group });

      assert.strictEqual(photo.group, group);
      assert.equal(photo.group_uuid, group.uuid);

      await SQLGroup.delete(group);

      assert.deepEqual(photo.group, null);
      assert.equal(photo.group_uuid, null);
    });
  });
});
