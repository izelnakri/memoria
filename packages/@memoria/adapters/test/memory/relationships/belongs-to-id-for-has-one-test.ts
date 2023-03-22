import { module, test, skip } from "qunitx";
import { RelationshipPromise } from "@memoria/model";
import setupMemoria from "../../helpers/setup-memoria.js";
import generateModels from "../../helpers/models-with-relations/memory/id/index.js";

// 12 tests:
// 5 categories: New model after build assignments, Fetched model assignments, reflective assignments, full lifecycle(fetched + build), relationship fetch

// new model(with and without relationship), fetched(with and without relationship), peeked(with and without relationship)
module(
  "@memoria/adapters | MemoryAdapter | Relationships | @belongsTo API for ID(integer) pointing to HasOne",
  function (hooks) {
    setupMemoria(hooks);

    module("Relationship fetch tests", function () {
      test("a model can fetch its not loaded relationship", async function (assert) {
        let { MemoryPhoto, MemoryGroup } = generateModels();

        let firstGroup = await MemoryGroup.insert({ name: "Some group" });
        let secondGroup = await MemoryGroup.insert({ name: "Another group" });
        let photo = MemoryPhoto.build({ name: "Dinner photo", group_id: secondGroup.id });

        assert.strictEqual(photo.group, secondGroup);
        assert.equal(photo.group_id, secondGroup.id);
      });

      test("a models relationship promise reference turns to null when relationship foreign key sets to null", async function (assert) {
        let { MemoryPhoto, MemoryGroup } = generateModels();

        let firstGroup = await MemoryGroup.insert({ name: "Some group" });
        let secondGroup = await MemoryGroup.insert({ name: "Another group" });
        let photo = MemoryPhoto.build({ name: "Dinner photo", group_id: secondGroup.id });

        assert.strictEqual(photo.group, secondGroup);

        photo.group_id = null;

        assert.equal(photo.group, null);
      });

      test("a models empty relationship reference turns to promise and can fetch when changed", async function (assert) {
        let { MemoryPhoto, MemoryGroup } = generateModels();

        let firstGroup = await MemoryGroup.insert({ name: "Some group" });
        let secondGroup = await MemoryGroup.insert({ name: "Another group" });
        let photo = MemoryPhoto.build({ name: "Dinner photo" });

        assert.equal(photo.group, null);
        assert.equal(photo.group_id, null);

        photo.group_id = secondGroup.id;

        assert.strictEqual(photo.group, secondGroup);
        assert.equal(photo.group_id, secondGroup.id);
      });
    });

    // module("Basic embed and serializer tests for relationship assignments and commits", function () {
    // });

    module("Basic relationship assignment then commit tests", function () {
      test("New model can be built from scratch and it sends the right data to the server during post", async function (assert) {
        let { MemoryPhoto, MemoryGroup } = generateModels();

        let group = MemoryGroup.build({ name: "Some group" });
        let photo = MemoryPhoto.build({ name: "Dinner photo", group });

        assert.strictEqual(photo.group, group);
        assert.equal(photo.group_id, group.id);

        let insertedPhoto = await MemoryPhoto.insert(photo);

        assert.strictEqual(photo.group, group);
        assert.equal(insertedPhoto.group_id, group.id);

        assert.strictEqual(await insertedPhoto.group, null);

        let insertedGroup = await MemoryGroup.insert(group);

        assert.strictEqual(photo.group, insertedGroup);
        assert.strictEqual(insertedPhoto.group, insertedGroup);

        assert.strictEqual(insertedPhoto.group, insertedGroup);
        assert.notStrictEqual(group, insertedGroup);
      });

      test("New model can have relationship set afterwards and it sends the right data to the server during post", async function (assert) {
        let { MemoryPhoto, MemoryGroup } = generateModels();

        let group = MemoryGroup.build({ name: "Some group" });
        let photo = MemoryPhoto.build({ name: "Dinner photo" });
        let secondPhoto = MemoryPhoto.build({ name: "Second photo" });

        assert.equal(photo.group, null);
        assert.equal(secondPhoto.group, null);

        let insertedPhoto = await MemoryPhoto.insert(photo);

        assert.equal(photo.group, null);
        assert.equal(insertedPhoto.group, null);

        secondPhoto.group = group;

        let secondInsertedPhoto = await MemoryPhoto.insert(secondPhoto);

        assert.strictEqual(secondPhoto.group, group);
        assert.equal(secondPhoto.group_id, group.id);

        assert.equal(secondInsertedPhoto.group_id, null);
        assert.equal(secondInsertedPhoto.group, null);
      });

      test("fetched model can request the relationship(without embed) and change the relationship before update", async function (assert) {
        let { MemoryPhoto, MemoryGroup } = generateModels();

        let group = await MemoryGroup.insert({ name: "Some group" });
        let photo = await MemoryPhoto.insert({ name: "Dinner photo", group });

        assert.strictEqual(photo.group, group);
        assert.equal(photo.group_id, group.id);

        let fetchedPhoto = await MemoryPhoto.find(photo.id);

        assert.strictEqual(fetchedPhoto.group, group);
        assert.equal(fetchedPhoto.group_id, group.id);

        let newGroup = MemoryGroup.build({ name: "Another group" });

        fetchedPhoto.group = newGroup;

        assert.strictEqual(fetchedPhoto.group, newGroup);
        assert.equal(fetchedPhoto.group_id, null);
        assert.strictEqual(photo.group, group);
        assert.equal(photo.group_id, group.id);

        let updatedPhoto = await MemoryPhoto.update(fetchedPhoto);

        assert.strictEqual(fetchedPhoto.group, newGroup);
        assert.strictEqual(updatedPhoto.group, newGroup);
        assert.equal(updatedPhoto.group_id, null);
      });

      test("fetched model can remove the relationship before update", async function (assert) {
        let { MemoryPhoto, MemoryGroup } = generateModels();

        let group = await MemoryGroup.insert({ name: "Some group" });
        let photo = await MemoryPhoto.insert({ name: "Dinner photo", group_id: group.id });

        assert.strictEqual(photo.group, group);

        let fetchedPhoto = await MemoryPhoto.find(photo.id);

        assert.strictEqual(fetchedPhoto.group, group);
        assert.equal(fetchedPhoto.group_id, group.id);

        fetchedPhoto.group = null;

        assert.equal(fetchedPhoto.group, null);
        assert.equal(fetchedPhoto.group_id, null);

        let updatedPhoto = await MemoryPhoto.update(fetchedPhoto);

        assert.equal(fetchedPhoto.group, null);
        assert.equal(updatedPhoto.group, null);
        assert.equal(updatedPhoto.group_id, null);
      });

      test("fetched model can remove the relationship before delete", async function (assert) {
        let { MemoryPhoto, MemoryGroup } = generateModels();

        let group = await MemoryGroup.insert({ name: "Some group" });
        let photo = await MemoryPhoto.insert({ name: "Dinner photo", group_id: group.id });

        assert.strictEqual(photo.group, group);

        let fetchedPhoto = await MemoryPhoto.find(photo.id);

        assert.strictEqual(fetchedPhoto.group, group);
        assert.equal(fetchedPhoto.group_id, group.id);

        fetchedPhoto.group = null;

        assert.equal(fetchedPhoto.group, null);
        assert.equal(fetchedPhoto.group_id, null);

        let deletedPhoto = await MemoryPhoto.delete(fetchedPhoto);

        assert.propEqual(fetchedPhoto, deletedPhoto);
        assert.equal(fetchedPhoto.group, null);
        assert.equal(deletedPhoto.group, null);
        assert.equal(deletedPhoto.group_id, null);
      });
    });

    module("Reflective relationship mutations then commit tests", function () {
      test("when related models reflective relationships are completely cleared it doesnt clear the foreign key, just the relationship(previous pointers) of and to the model", async function (assert) {
        let { MemoryPhoto, MemoryGroup } = generateModels();

        let group = await MemoryGroup.insert({ name: "Some group" });
        let secondGroup = MemoryGroup.build({ name: "Another group" });
        let thirdGroup = MemoryGroup.build({ id: 3, name: "Third group" });
        let photo = await MemoryPhoto.insert({ name: "Dinner photo", group_id: group.id });

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
        assert.strictEqual(photo.group, thirdGroup);

        thirdGroup.photo = null;

        assert.equal(photo.group_id, thirdGroup.id);
        assert.ok(photo.group instanceof RelationshipPromise);
        assert.equal(await photo.group, null);

        let insertedThirdGroup = await MemoryGroup.insert(thirdGroup); // TODO: new instance should not inherit null relationship, when it is insert return or update return, delete return

        assert.equal(photo.group_id, thirdGroup.id);
        assert.strictEqual(photo.group, insertedThirdGroup);

        assert.strictEqual(photo.group.photo, photo); // TODO: but there is a photo in the db, why is it null??
      });
    });

    module("Relationship mutations and commit tests on models full lifecycle", function () {
      test("reflexive side test: a model can be built, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
        let { MemoryGroup, MemoryPhoto } = generateModels();

        let firstPhoto = await MemoryPhoto.insert({ name: "First photo" });
        let secondPhoto = await MemoryPhoto.insert({ name: "Second photo" });
        let group = MemoryGroup.build({ name: "Dinner group", photo: secondPhoto });

        assert.strictEqual(group.photo, secondPhoto);
        assert.equal(secondPhoto.group_id, null);

        firstPhoto.group = group; // TODO: this should trigger a logical warning(!!) setting group to firstPhoto but secondPhoto already has group as well(?) clean that first(?)

        assert.equal(firstPhoto.group_id, null);
        assert.equal(firstPhoto.group, group);

        assert.strictEqual(secondPhoto.group, group);
        assert.equal(secondPhoto.group_id, null);
        assert.strictEqual(group.photo, firstPhoto);

        let insertedGroup = await MemoryGroup.insert(group);

        assert.strictEqual(insertedGroup.photo, secondPhoto);
        assert.strictEqual(group.photo, firstPhoto);

        assert.strictEqual(firstPhoto.group, insertedGroup);
        assert.equal(firstPhoto.group_id, insertedGroup.id);
        assert.strictEqual(secondPhoto.group, insertedGroup);
        assert.equal(secondPhoto.group_id, insertedGroup.id);

        secondPhoto.group = insertedGroup;

        assert.strictEqual(insertedGroup.photo, secondPhoto);
        assert.strictEqual(group.photo, firstPhoto);
        assert.strictEqual(secondPhoto.group, insertedGroup);
        assert.equal(secondPhoto.group_id, insertedGroup.id);
        assert.strictEqual(firstPhoto.group, insertedGroup);
        assert.equal(firstPhoto.group_id, insertedGroup.id);

        assert.strictEqual(firstPhoto.group, insertedGroup);

        let updatedGroup = await MemoryGroup.update(insertedGroup);

        assert.strictEqual(insertedGroup.photo, secondPhoto);
        assert.strictEqual(updatedGroup.photo, secondPhoto);
        assert.strictEqual(group.photo, firstPhoto);

        assert.strictEqual(secondPhoto.group, updatedGroup);
        assert.equal(secondPhoto.group_id, updatedGroup.id);

        updatedGroup.photo = secondPhoto;

        assert.strictEqual(firstPhoto.group, updatedGroup);
        assert.equal(firstPhoto.group_id, updatedGroup.id);

        secondPhoto.group = null; // NOTE: Where does this come from?

        assert.equal(firstPhoto.group_id, updatedGroup.id);
        assert.equal(secondPhoto.group_id, null);
        assert.equal(secondPhoto.group, null);
        assert.equal(secondPhoto.group_id, null);

        assert.strictEqual(updatedGroup.photo, firstPhoto);
        assert.strictEqual(firstPhoto.group, updatedGroup);

        assert.strictEqual(insertedGroup.photo, firstPhoto); // TODO: this needs to work
        assert.strictEqual(group.photo, firstPhoto);

        let deletedGroup = await MemoryGroup.delete(updatedGroup);

        assert.equal(updatedGroup.photo, null); // NOTE: this is not null, but removed stuff

        assert.equal(deletedGroup.photo, null);
        assert.equal(secondPhoto.group, null);
        assert.equal(secondPhoto.group_id, null);
        assert.equal(firstPhoto.group, null);
        assert.equal(firstPhoto.group_id, null);
      });

      test("a model can be built, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
        let { MemoryPhoto, MemoryGroup } = generateModels();

        let firstGroup = await MemoryGroup.insert({ name: "Some group" });
        let secondGroup = await MemoryGroup.insert({ name: "Some group" });
        let photo = MemoryPhoto.build({ name: "Dinner photo", group: secondGroup });

        assert.strictEqual(photo.group, secondGroup);
        assert.equal(photo.group_id, secondGroup.id);

        photo.group = firstGroup;

        assert.strictEqual(photo.group, firstGroup);
        assert.equal(photo.group_id, firstGroup.id);

        let insertedPhoto = await MemoryPhoto.insert(photo);

        assert.equal(insertedPhoto.group_id, 1);
        assert.strictEqual(insertedPhoto.group, firstGroup);
        assert.strictEqual(photo.group, insertedPhoto.group);

        insertedPhoto.group = secondGroup;

        assert.strictEqual(insertedPhoto.group, secondGroup);
        assert.equal(insertedPhoto.group_id, secondGroup.id);

        let updatedPhoto = await MemoryPhoto.update(insertedPhoto);

        assert.strictEqual(updatedPhoto.group, secondGroup);
        assert.strictEqual(insertedPhoto.group, secondGroup);

        updatedPhoto.group = null;

        assert.equal(updatedPhoto.group, null);
        assert.equal(updatedPhoto.group_id, null);

        let deletedPhoto = await MemoryPhoto.delete(updatedPhoto);

        assert.equal(updatedPhoto.group, null);
        assert.equal(deletedPhoto.group, null);
        assert.equal(deletedPhoto.group_id, null);
      });

      test("a model can be fetched, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
        let { MemoryPhoto, MemoryGroup } = generateModels();

        MemoryGroup.cache([
          {
            id: 1,
            name: "Some group",
          },
          {
            id: 2,
            name: "Another group",
          },
        ]);

        let firstGroup = await MemoryGroup.find(1);
        let secondGroup = await MemoryGroup.find(2);
        let photo = MemoryPhoto.build({ name: "Dinner photo", group: secondGroup });

        assert.strictEqual(photo.group, secondGroup);
        assert.equal(photo.group_id, secondGroup.id);

        photo.group = firstGroup;

        assert.strictEqual(photo.group, firstGroup);
        assert.equal(photo.group_id, firstGroup.id);

        let insertedPhoto = await MemoryPhoto.insert(photo);

        assert.strictEqual(insertedPhoto.group, firstGroup);
        assert.strictEqual(photo.group, insertedPhoto.group);

        insertedPhoto.group = secondGroup;

        assert.strictEqual(insertedPhoto.group, secondGroup);
        assert.equal(insertedPhoto.group_id, secondGroup.id);

        let updatedPhoto = await MemoryPhoto.update(insertedPhoto);

        assert.strictEqual(updatedPhoto.group, secondGroup);
        assert.strictEqual(insertedPhoto.group, secondGroup);

        updatedPhoto.group = null;

        assert.equal(updatedPhoto.group, null);
        assert.equal(updatedPhoto.group_id, null);

        let deletedPhoto = await MemoryPhoto.delete(updatedPhoto);

        assert.equal(updatedPhoto.group, null);
        assert.equal(deletedPhoto.group, null);
        assert.equal(deletedPhoto.group_id, null);
      });
    });
  }
);
