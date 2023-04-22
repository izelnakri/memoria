import { RelationshipPromise } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../../helpers/setup-memoria.js";
import setupSQLModels from "../../helpers/models-with-relations/sql/id/index.js";

module("@memoria/adapters | SQLAdapter | Relationships | @belongsTo API for ID(integer)", function (hooks) {
  setupMemoria(hooks);

  module("Relationship fetch tests", function () {
    test("Model can fetch its not loaded relationship", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let firstGroup = await SQLGroup.insert({ name: "Some group" });
      let secondGroup = await SQLGroup.insert({ name: "Another group" });
      let photo = SQLPhoto.build({ name: "Dinner photo", group_id: secondGroup.id });

      assert.strictEqual(photo.group, secondGroup);
      assert.equal(photo.group_id, secondGroup.id);
    });

    test("Models relationship promise reference turns to null when relationship gets destroyed either way", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let firstGroup = await SQLGroup.insert({ name: "Some group" });
      let secondGroup = await SQLGroup.insert({ name: "Another group" });
      let photo = SQLPhoto.build({ name: "Dinner photo", group_id: secondGroup.id });

      assert.strictEqual(photo.group, secondGroup);

      photo.group_id = null;

      assert.equal(photo.group, null);
    });

    test("Models empty relationship reference turns to promise and can fetch when changed", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let firstGroup = await SQLGroup.insert({ name: "Some group" });
      let secondGroup = await SQLGroup.insert({ name: "Another group" });
      let photo = SQLPhoto.build({ name: "Dinner photo" });

      assert.equal(photo.group, null);
      assert.equal(photo.group_id, null);

      photo.group_id = secondGroup.id;

      assert.strictEqual(photo.group, secondGroup);
      assert.equal(photo.group_id, secondGroup.id);
    });

    test("Models empty relationship reference can turn to promise, when relationship not existing, then can be retried to fetch correctly", async function (assert) {
      assert.expect(10);

      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let photo = SQLPhoto.build({ name: "Dinner photo", group_id: 44 });
      let groupPromise = photo.group;
      try {
        await groupPromise;
      } catch (error) {
        // TODO: it doesnt throw currently
        // assert.ok(error instanceof NotFoundError);
        // assert.equal(error.message, `sql_group table record with id:44 not found`);
      }

      let insertedGroup = await SQLGroup.insert({ id: 44, name: "Some group" });

      assert.propContains(insertedGroup, { id: 44, name: "Some group" });
      assert.strictEqual(photo.group, insertedGroup);
      assert.equal(photo.group_id, 44);
      assert.deepEqual(photo.errors, []);

      let foundGroup = await photo.group;

      assert.strictEqual(insertedGroup, foundGroup);

      let reloadPromise = groupPromise.reload();

      assert.ok(reloadPromise instanceof RelationshipPromise);

      let result = await reloadPromise;

      assert.matchJson(result, SQLGroup.peek(44).toJSON());
      assert.notStrictEqual(result, insertedGroup); // TODO: this is very important, it should ACTUALLY make a request
      assert.equal(photo.group.name, "Some group");
      assert.equal(photo.group_id, 44);
    });
  });

  // module("Basic embed and serializer tests for relationship assignments and commits", function () {
  // });

  module("Basic relationship assignment then commit tests", function () {
    test("New model can be built from scratch and it sends the right data to the server during post", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let group = SQLGroup.build({ name: "Some group" });
      let photo = SQLPhoto.build({ name: "Dinner photo", group });

      assert.strictEqual(photo.group, group);
      assert.equal(photo.group_id, group.id);

      let insertedPhoto = await SQLPhoto.insert(photo);

      assert.strictEqual(photo.group, group);
      assert.equal(insertedPhoto.group_id, null);
      assert.strictEqual(insertedPhoto.group, group);

      let insertedGroup = await SQLGroup.insert(group);

      assert.strictEqual(photo.group, insertedGroup);
      assert.strictEqual(insertedPhoto.group, insertedGroup);

      assert.strictEqual(insertedPhoto.group, insertedGroup);
      assert.strictEqual(group, insertedGroup);
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

      secondPhoto.group_id = group.id;

      let secondInsertedPhoto = await SQLPhoto.insert(secondPhoto);

      assert.strictEqual(secondPhoto.group, group);
      assert.equal(secondPhoto.group_id, group.id);

      assert.strictEqual(secondInsertedPhoto.group, group);
      assert.equal(secondInsertedPhoto.group_id, group.id);
    });

    test("Fetched model can request the relationship(without embed) and change the relationship before update", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let group = await SQLGroup.insert({ name: "Some group" });
      let photo = await SQLPhoto.insert({ name: "Dinner photo", group_id: group.id });

      assert.strictEqual(photo.group, group);
      assert.equal(photo.group_id, group.id);

      let fetchedPhoto = await SQLPhoto.find(photo.id);

      assert.strictEqual(fetchedPhoto.group, group);
      assert.equal(fetchedPhoto.group_id, group.id);

      let newGroup = SQLGroup.build({ name: "Another group" });

      fetchedPhoto.group = newGroup;

      assert.strictEqual(fetchedPhoto.group, newGroup);
      assert.equal(fetchedPhoto.group_id, null);
      assert.strictEqual(photo.group, group);
      assert.equal(photo.group_id, group.id);

      let updatedPhoto = await SQLPhoto.update(fetchedPhoto);

      assert.strictEqual(fetchedPhoto.group, newGroup);
      assert.equal(fetchedPhoto.group_id, null);
      assert.equal(updatedPhoto.group_id, null);
      assert.strictEqual(updatedPhoto.group, newGroup);
    });

    test("Fetched model can remove the relationship before update", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let group = await SQLGroup.insert({ name: "Some group" });
      let photo = await SQLPhoto.insert({ name: "Dinner photo", group_id: group.id });

      assert.strictEqual(photo.group, group);

      let fetchedPhoto = await SQLPhoto.find(photo.id);

      assert.strictEqual(fetchedPhoto.group, group);
      assert.equal(fetchedPhoto.group_id, group.id);

      fetchedPhoto.group_id = null;

      assert.equal(fetchedPhoto.group, null);
      assert.equal(fetchedPhoto.group_id, null);

      let updatedPhoto = await SQLPhoto.update(fetchedPhoto);

      assert.equal(fetchedPhoto.group, null);
      assert.equal(updatedPhoto.group, null);
      assert.equal(updatedPhoto.group_id, null);
    });

    test("Fetched model can remove the relationship before delete", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let group = await SQLGroup.insert({ name: "Some group" });
      let photo = await SQLPhoto.insert({ name: "Dinner photo", group_id: group.id });

      assert.strictEqual(photo.group, group);

      let fetchedPhoto = await SQLPhoto.find(photo.id);

      assert.strictEqual(fetchedPhoto.group, group);
      assert.equal(fetchedPhoto.group_id, group.id);

      fetchedPhoto.group_id = null;

      assert.equal(fetchedPhoto.group, null);
      assert.equal(fetchedPhoto.group_id, null);

      let deletedPhoto = await SQLPhoto.delete(fetchedPhoto);

      assert.propEqual(fetchedPhoto, deletedPhoto);
      assert.equal(fetchedPhoto.group, null);
      assert.equal(deletedPhoto.group, null);
      assert.equal(deletedPhoto.group_id, null);
    });

    test("Deleting a related model should delete the models relationship references", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let group = await SQLGroup.insert({ id: 22, name: "Some group" });
      let photo = SQLPhoto.build({ name: "Dinner photo", group: group });

      assert.equal(photo.group, group);
      assert.equal(photo.group_id, group.id);

      await SQLGroup.delete(group);

      assert.deepEqual(photo.group, null);
      assert.equal(photo.group_id, null);
    });
  });

  module("Reflective relationship mutations then commit tests", function () {
    test("When related models reflective relationships are completely cleared it doesnt clear the foreign key, just the relationship(previous pointers) of and to the model", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let group = await SQLGroup.insert({ name: "Some group" });
      let secondGroup = SQLGroup.build({ name: "Another group" });
      let thirdGroup = SQLGroup.build({ id: 3, name: "Third group" });

      let photo = await SQLPhoto.insert({ name: "Dinner photo", group_id: group.id });

      assert.equal(photo.group_id, group.id);
      assert.strictEqual(photo.group, group);

      group.photo = null;

      assert.equal(photo.group_id, group.id);
      assert.strictEqual(photo.group, group);

      secondGroup.photo = photo;

      assert.equal(photo.group_id, null);
      assert.strictEqual(photo.group, secondGroup);

      secondGroup.photo = null;

      assert.equal(photo.group_id, null);
      assert.equal(photo.group, null);

      thirdGroup.photo = photo;

      assert.equal(photo.group_id, thirdGroup.id);
      assert.deepEqual(photo.group, thirdGroup);

      thirdGroup.photo = null;

      assert.equal(photo.group_id, thirdGroup.id);
      assert.ok(photo.group instanceof RelationshipPromise);
      assert.equal(await photo.group, null);

      let insertedThirdGroup = await SQLGroup.insert(thirdGroup);

      assert.equal(photo.group_id, insertedThirdGroup.id);
      assert.strictEqual(photo.group, insertedThirdGroup);
      assert.strictEqual(photo.group.photo, photo);
    });
  });

  module("Relationship mutations and commit tests on models full lifecycle", function () {
    test("Model can create, update, delete with correct changing relationships without SELECT in one flow", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let firstPhoto = await SQLPhoto.insert({ name: "First photo" });
      let secondPhoto = await SQLPhoto.insert({ name: "Second photo" });
      let group = SQLGroup.build({ name: "Dinner group", photo: secondPhoto });

      assert.strictEqual(group.photo, secondPhoto);
      assert.equal(secondPhoto.group_id, null);

      firstPhoto.group = group; // NOTE: this should trigger a logical warning(!!) setting group to firstPhoto but secondPhoto already has group as well(?) clean that first(?)

      assert.equal(firstPhoto.group_id, null);
      assert.equal(firstPhoto.group, group);

      assert.strictEqual(secondPhoto.group, group);
      assert.equal(secondPhoto.group_id, null);
      assert.strictEqual(group.photo, firstPhoto);

      let insertedGroup = await SQLGroup.insert(group);

      assert.strictEqual(insertedGroup.photo, secondPhoto);
      assert.strictEqual(group.photo, secondPhoto);

      assert.strictEqual(firstPhoto.group, insertedGroup);
      assert.equal(firstPhoto.group_id, insertedGroup.id);
      assert.strictEqual(secondPhoto.group, insertedGroup);
      assert.equal(secondPhoto.group_id, insertedGroup.id);

      secondPhoto.group_id = insertedGroup.id;

      assert.strictEqual(insertedGroup.photo, secondPhoto);
      assert.strictEqual(group.photo, secondPhoto);
      assert.strictEqual(secondPhoto.group, insertedGroup);
      assert.equal(secondPhoto.group_id, insertedGroup.id);
      assert.strictEqual(firstPhoto.group, insertedGroup);
      assert.equal(firstPhoto.group_id, insertedGroup.id);

      assert.strictEqual(firstPhoto.group, insertedGroup);

      let updatedGroup = await SQLGroup.update(insertedGroup);

      assert.strictEqual(firstPhoto.group, updatedGroup);
      assert.equal(firstPhoto.group_id, updatedGroup.id);
      assert.strictEqual(insertedGroup.photo, secondPhoto);
      assert.strictEqual(updatedGroup.photo, secondPhoto);
      assert.strictEqual(group.photo, secondPhoto);

      assert.strictEqual(secondPhoto.group, updatedGroup);
      assert.equal(secondPhoto.group_id, updatedGroup.id);

      updatedGroup.photo = secondPhoto;

      assert.strictEqual(firstPhoto.group, updatedGroup);
      assert.equal(firstPhoto.group_id, updatedGroup.id);

      secondPhoto.group = null; // NOTE: Where does this come from?

      assert.equal(firstPhoto.group_id, updatedGroup.id);
      assert.equal(secondPhoto.group_id, null);
      assert.equal(secondPhoto.group, null);

      assert.strictEqual(updatedGroup.photo, firstPhoto);
      assert.strictEqual(firstPhoto.group, updatedGroup);

      assert.strictEqual(insertedGroup.photo, firstPhoto);
      assert.strictEqual(group.photo, firstPhoto);

      let deletedGroup = await SQLGroup.delete(updatedGroup);

      assert.equal(updatedGroup.photo, null); // NOTE: this is not null, but removed stuff

      assert.equal(deletedGroup.photo, null);
      assert.equal(secondPhoto.group, null);
      assert.equal(secondPhoto.group_id, null);
      assert.equal(firstPhoto.group, null);
      assert.equal(firstPhoto.group_id, null);
    });

    test("Reflexive side test: a model can be built, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let firstGroup = await SQLGroup.insert({ name: "Some group" });
      let secondGroup = await SQLGroup.insert({ name: "Some group" });
      let photo = SQLPhoto.build({ name: "Dinner photo", group: secondGroup });

      assert.strictEqual(photo.group, secondGroup);
      assert.equal(photo.group_id, secondGroup.id);

      photo.group_id = firstGroup.id;

      assert.strictEqual(photo.group, firstGroup);
      assert.equal(photo.group_id, firstGroup.id);

      let insertedPhoto = await SQLPhoto.insert(photo);

      assert.equal(insertedPhoto.group_id, 1);
      assert.strictEqual(insertedPhoto.group, firstGroup);
      assert.strictEqual(photo.group, insertedPhoto.group);

      insertedPhoto.group_id = secondGroup.id;

      assert.strictEqual(insertedPhoto.group, secondGroup);
      assert.equal(insertedPhoto.group_id, secondGroup.id);

      let updatedPhoto = await SQLPhoto.update(insertedPhoto);

      assert.strictEqual(updatedPhoto.group, secondGroup);
      assert.strictEqual(insertedPhoto.group, secondGroup);

      updatedPhoto.group_id = null;

      assert.equal(updatedPhoto.group, null);
      assert.equal(updatedPhoto.group_id, null);

      let deletedPhoto = await SQLPhoto.delete(updatedPhoto);

      assert.equal(updatedPhoto.group, null);
      assert.equal(deletedPhoto.group, null);
      assert.equal(deletedPhoto.group_id, null);
    });

    test("Model can create, update, delete with correct changing relationships with GET/cache in one flow", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      await SQLGroup.insertAll([
        {
          id: 1,
          name: "Some group",
        },
        {
          id: 2,
          name: "Another group",
        },
      ]);

      let firstGroup = await SQLGroup.find(1);
      let secondGroup = await SQLGroup.find(2);
      let photo = SQLPhoto.build({ name: "Dinner photo", group: secondGroup });

      assert.strictEqual(photo.group, secondGroup);
      assert.equal(photo.group_id, secondGroup.id);

      photo.group_id = firstGroup.id;

      assert.strictEqual(photo.group, firstGroup);
      assert.equal(photo.group_id, firstGroup.id);

      let insertedPhoto = await SQLPhoto.insert(photo);

      assert.strictEqual(insertedPhoto.group, firstGroup);
      assert.strictEqual(photo.group, insertedPhoto.group);

      insertedPhoto.group_id = secondGroup.id;

      assert.strictEqual(insertedPhoto.group, secondGroup);
      assert.equal(insertedPhoto.group_id, secondGroup.id);

      let updatedPhoto = await SQLPhoto.update(insertedPhoto);

      assert.strictEqual(updatedPhoto.group, secondGroup);
      assert.strictEqual(insertedPhoto.group, secondGroup);

      updatedPhoto.group_id = null;

      assert.equal(updatedPhoto.group, null);
      assert.equal(updatedPhoto.group_id, null);

      let deletedPhoto = await SQLPhoto.delete(updatedPhoto);

      assert.equal(updatedPhoto.group, null);
      assert.equal(deletedPhoto.group, null);
      assert.equal(deletedPhoto.group_id, null);
    });

    test("Deleting a related model should delete the models relationship references", async function (assert) {
      let { SQLPhoto, SQLGroup } = setupSQLModels();

      let group = await SQLGroup.insert({ id: 22, name: "Some group" });
      let photo = SQLPhoto.build({ name: "Dinner photo", group });

      assert.strictEqual(photo.group, group);
      assert.equal(photo.group_id, group.id);

      await SQLGroup.delete(group);

      assert.equal(photo.group, null);
      assert.equal(photo.group_id, null);
    });
  });
});
