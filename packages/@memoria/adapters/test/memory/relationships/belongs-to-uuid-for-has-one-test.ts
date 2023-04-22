import { module, test } from "qunitx";
import { RelationshipPromise } from "@memoria/model";
import setupMemoria from "../../helpers/setup-memoria.js";
import generateModels from "../../helpers/models-with-relations/memory/uuid/index.js";

const FIRST_TARGET_UUID = "374c7f4a-85d6-429a-bf2a-0719525f5f21";

module(
  "@memoria/adapters | MemoryAdapter | Relationships | @belongsTo API for UUID(string) pointing to HasOne",
  function (hooks) {
    setupMemoria(hooks);

    module("Relationship fetch tests", function () {
      test("Model can fetch its not loaded relationship", async function (assert) {
        let { MemoryPhoto, MemoryGroup } = generateModels();

        let firstGroup = await MemoryGroup.insert({ name: "Some group" });
        let secondGroup = await MemoryGroup.insert({ name: "Another group" });
        let photo = MemoryPhoto.build({ name: "Dinner photo", group_uuid: secondGroup.uuid });

        assert.strictEqual(photo.group, secondGroup);
        assert.equal(photo.group_uuid, secondGroup.uuid);
      });

      test("Models relationship promise reference turns to null when relationship foreign key sets to null", async function (assert) {
        let { MemoryPhoto, MemoryGroup } = generateModels();

        let firstGroup = await MemoryGroup.insert({ name: "Some group" });
        let secondGroup = await MemoryGroup.insert({ name: "Another group" });
        let photo = MemoryPhoto.build({ name: "Dinner photo", group_uuid: secondGroup.uuid });

        assert.strictEqual(photo.group, secondGroup);

        photo.group_uuid = null;

        assert.equal(photo.group, null);
      });

      test("Models empty relationship reference turns to promise and can fetch when changed", async function (assert) {
        let { MemoryPhoto, MemoryGroup } = generateModels();

        let firstGroup = await MemoryGroup.insert({ name: "Some group" });
        let secondGroup = await MemoryGroup.insert({ name: "Another group" });
        let photo = MemoryPhoto.build({ name: "Dinner photo" });

        assert.equal(photo.group, null);
        assert.equal(photo.group_uuid, null);

        photo.group_uuid = secondGroup.uuid;

        assert.strictEqual(photo.group, secondGroup);
        assert.equal(photo.group_uuid, secondGroup.uuid);
      });

      test("Models empty relationship reference can turn to promise, when relationship not existing, then can be retried to fetch correctly", async function (assert) {
        assert.expect(14);

        let { MemoryPhoto, MemoryGroup } = generateModels();

        let photo = MemoryPhoto.build({ name: "Dinner photo", group_uuid: FIRST_TARGET_UUID });
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

        let insertedGroup = await MemoryGroup.insert({ uuid: FIRST_TARGET_UUID, name: "Some group" });

        assert.propContains(insertedGroup, { uuid: FIRST_TARGET_UUID, name: "Some group" });
        assert.strictEqual(photo.group, insertedGroup);
        assert.equal(photo.group_uuid, FIRST_TARGET_UUID);
        assert.deepEqual(photo.errors, []);

        let foundGroup = await photo.group;

        assert.strictEqual(insertedGroup, foundGroup);

        let groupLookupReloadPromise = groupLookupPromise.reload();

        assert.ok(groupLookupPromise instanceof RelationshipPromise);

        let group = await groupLookupReloadPromise;

        assert.deepEqual(group, MemoryGroup.peek(FIRST_TARGET_UUID));
        assert.notStrictEqual(group, insertedGroup);
        assert.equal(photo.group.name, "Some group");
        assert.equal(photo.group_uuid, FIRST_TARGET_UUID);

        let finalGroup = await group.reload();
        assert.notStrictEqual(finalGroup, insertedGroup);
        assert.notStrictEqual(finalGroup, group);
        assert.deepEqual(finalGroup, MemoryGroup.peek(FIRST_TARGET_UUID));
      });
    });

    // TODO: also add embed + serializer tests to the test cases correctly
    // module('Basic relationship assignment tests', function () {
    // });

    module("Basic relationship assignment then commit tests", function () {
      test("New model can be built from scratch and it sends the right data to the server during post", async function (assert) {
        let { MemoryPhoto, MemoryGroup } = generateModels();

        let group = MemoryGroup.build({ name: "Some group" });
        let photo = MemoryPhoto.build({ name: "Dinner photo", group });

        assert.strictEqual(photo.group, group);
        assert.equal(photo.group_uuid, group.uuid);

        let insertedPhoto = await MemoryPhoto.insert(photo);

        assert.strictEqual(photo.group, group);
        assert.equal(insertedPhoto.group_uuid, null);
        assert.strictEqual(insertedPhoto.group, group);

        let insertedGroup = await MemoryGroup.insert(group);

        assert.strictEqual(photo.group, insertedGroup);
        assert.strictEqual(insertedPhoto.group, insertedGroup);

        assert.strictEqual(group.photo, insertedPhoto);
        assert.strictEqual(group, insertedGroup);
      });

      test("New model can have relationship set afterwards and it sends the right data to the server during post", async function (assert) {
        let { MemoryPhoto, MemoryGroup } = generateModels();

        let group = await MemoryGroup.insert({ name: "Some group" });
        let photo = MemoryPhoto.build({ name: "Dinner photo" });
        let secondPhoto = MemoryPhoto.build({ name: "Second photo" });

        assert.equal(photo.group, null);
        assert.equal(secondPhoto.group, null);

        let insertedPhoto = await MemoryPhoto.insert(photo);

        assert.equal(photo.group, null);
        assert.equal(insertedPhoto.group, null);

        secondPhoto.group_uuid = group.uuid;

        let secondInsertedPhoto = await MemoryPhoto.insert(secondPhoto);

        assert.strictEqual(secondPhoto.group, group);
        assert.equal(secondPhoto.group_uuid, group.uuid);

        assert.strictEqual(secondInsertedPhoto.group, group);
        assert.equal(secondInsertedPhoto.group_uuid, group.uuid);
      });

      test("Fetched model can request the relationship(without embed) and change the relationship before update", async function (assert) {
        let { MemoryPhoto, MemoryGroup } = generateModels();

        let group = await MemoryGroup.insert({ name: "Some group" });
        let photo = await MemoryPhoto.insert({ name: "Dinner photo", group_uuid: group.uuid });

        assert.strictEqual(photo.group, group);
        assert.equal(photo.group_uuid, group.uuid);

        let fetchedPhoto = await MemoryPhoto.find(photo.uuid);

        assert.strictEqual(fetchedPhoto.group, group);
        assert.equal(fetchedPhoto.group_uuid, group.uuid);

        let newGroup = MemoryGroup.build({ name: "Another group" });

        fetchedPhoto.group = newGroup;

        assert.strictEqual(fetchedPhoto.group, newGroup);
        assert.equal(fetchedPhoto.group_uuid, null);
        assert.strictEqual(photo.group, group);
        assert.equal(photo.group_uuid, group.uuid);

        let updatedPhoto = await MemoryPhoto.update(fetchedPhoto);

        assert.strictEqual(fetchedPhoto.group, newGroup);
        assert.equal(fetchedPhoto.group_uuid, null);
        assert.strictEqual(updatedPhoto.group, newGroup);
        assert.equal(updatedPhoto.group_uuid, null);
      });

      test("Fetched model can remove the relationship before update", async function (assert) {
        let { MemoryPhoto, MemoryGroup } = generateModels();

        let group = await MemoryGroup.insert({ name: "Some group" });
        let photo = await MemoryPhoto.insert({ name: "Dinner photo", group_uuid: group.uuid });

        assert.strictEqual(photo.group, group);

        let fetchedPhoto = await MemoryPhoto.find(photo.uuid);

        assert.strictEqual(fetchedPhoto.group, group);
        assert.equal(fetchedPhoto.group_uuid, group.uuid);

        fetchedPhoto.group_uuid = null;

        assert.equal(fetchedPhoto.group, null);
        assert.equal(fetchedPhoto.group_uuid, null);

        let updatedPhoto = await MemoryPhoto.update(fetchedPhoto);

        assert.equal(fetchedPhoto.group, null);
        assert.equal(fetchedPhoto.group_uuid, null);
        assert.equal(updatedPhoto.group, null);
        assert.equal(updatedPhoto.group_uuid, null);
      });

      test("Fetched model can remove the relationship before delete", async function (assert) {
        let { MemoryPhoto, MemoryGroup } = generateModels();

        let group = await MemoryGroup.insert({ name: "Some group" });
        let photo = await MemoryPhoto.insert({ name: "Dinner photo", group_uuid: group.uuid });

        assert.strictEqual(photo.group, group);

        let fetchedPhoto = await MemoryPhoto.find(photo.uuid);

        assert.strictEqual(fetchedPhoto.group, group);
        assert.equal(fetchedPhoto.group_uuid, group.uuid);

        fetchedPhoto.group_uuid = null;

        assert.equal(fetchedPhoto.group, null);
        assert.equal(fetchedPhoto.group_uuid, null);

        let deletedPhoto = await MemoryPhoto.delete(fetchedPhoto);

        assert.propEqual(fetchedPhoto, deletedPhoto);
        assert.equal(fetchedPhoto.group, null);
        assert.equal(deletedPhoto.group, null);
        assert.equal(deletedPhoto.group_uuid, null);
      });
    });

    module("Reflective relationship mutations then commit tests", function () {
      test("When related models reflective relationships are completely cleared it doesnt clear the foreign key, just the relationship(previous pointers) of and to the model", async function (assert) {
        let { MemoryPhoto, MemoryGroup } = generateModels();

        let group = await MemoryGroup.insert({ name: "Some group" });
        let secondGroup = MemoryGroup.build({ name: "Another group" });
        let thirdGroup = MemoryGroup.build({ uuid: "499ec646-493f-4eea-b92e-e383d94182f4", name: "Third group" });

        let photo = await MemoryPhoto.insert({ name: "Dinner photo", group_uuid: group.uuid });

        assert.equal(photo.group_uuid, group.uuid);
        assert.strictEqual(photo.group, group);

        group.photo = null;

        assert.equal(photo.group_uuid, group.uuid);
        assert.strictEqual(photo.group, group);

        secondGroup.photo = photo;

        assert.equal(photo.group_uuid, null);
        assert.strictEqual(photo.group, secondGroup);

        secondGroup.photo = null;

        assert.equal(photo.group_uuid, null);
        assert.equal(photo.group, null);

        thirdGroup.photo = photo;

        assert.equal(photo.group_uuid, thirdGroup.uuid);
        assert.strictEqual(photo.group, thirdGroup);

        thirdGroup.photo = null;

        assert.equal(photo.group_uuid, thirdGroup.uuid);
        assert.ok(photo.group instanceof RelationshipPromise);
        assert.equal(await photo.group, null);

        let insertedThirdGroup = await MemoryGroup.insert(thirdGroup);

        assert.equal(photo.group_uuid, insertedThirdGroup.uuid);
        assert.strictEqual(photo.group, insertedThirdGroup);
        assert.strictEqual(photo.group.photo, photo);
      });
    });

    module("Relationship mutations and commit tests on models full lifecycle", function () {
      test("Model can be built, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
        let { MemoryPhoto, MemoryGroup } = generateModels();

        let firstPhoto = await MemoryPhoto.insert({ name: "First photo" });
        let secondPhoto = await MemoryPhoto.insert({ name: "Second photo" });
        let group = MemoryGroup.build({ name: "Dinner group", photo: secondPhoto });

        assert.strictEqual(group.photo, secondPhoto);
        assert.equal(secondPhoto.group_uuid, null);

        firstPhoto.group = group; // NOTE: this should trigger a logical warning(!!) setting group to firstPhoto but secondPhoto already has group as well(?) clean that first(?)

        assert.equal(firstPhoto.group_uuid, null);
        assert.equal(firstPhoto.group, group);

        assert.strictEqual(secondPhoto.group, group);
        assert.equal(secondPhoto.group_uuid, null);
        assert.strictEqual(group.photo, firstPhoto);

        let insertedGroup = await MemoryGroup.insert(group);

        assert.strictEqual(insertedGroup.photo, secondPhoto);
        assert.strictEqual(group.photo, secondPhoto);

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

        assert.strictEqual(firstPhoto.group, insertedGroup);

        let updatedGroup = await MemoryGroup.update(insertedGroup);

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

        secondPhoto.group_uuid = null; // NOTE: Where does this come from?

        assert.equal(firstPhoto.group_uuid, updatedGroup.uuid);
        assert.equal(secondPhoto.group_uuid, null);
        assert.equal(secondPhoto.group, null);

        assert.strictEqual(updatedGroup.photo, firstPhoto);
        assert.strictEqual(firstPhoto.group, updatedGroup);

        assert.strictEqual(insertedGroup.photo, firstPhoto);
        assert.strictEqual(group.photo, firstPhoto);

        let deletedGroup = await MemoryGroup.delete(updatedGroup);

        assert.equal(updatedGroup.photo, null); // NOTE: this is not null, but removed stuff

        assert.equal(deletedGroup.photo, null);
        assert.equal(secondPhoto.group, null);
        assert.equal(secondPhoto.group_uuid, null);
        assert.equal(firstPhoto.group, null);
        assert.equal(firstPhoto.group_uuid, null);
      });

      test("Reflexive side test: Model can be built, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
        let { MemoryPhoto, MemoryGroup } = generateModels();

        let firstGroup = await MemoryGroup.insert({ name: "Some group" });
        let secondGroup = await MemoryGroup.insert({ name: "Some group" });
        let photo = MemoryPhoto.build({ name: "Dinner photo", group: secondGroup });

        assert.strictEqual(photo.group, secondGroup);
        assert.equal(photo.group_uuid, secondGroup.uuid);

        photo.group_uuid = firstGroup.uuid;

        assert.strictEqual(photo.group, firstGroup);
        assert.equal(photo.group_uuid, firstGroup.uuid);

        let insertedPhoto = await MemoryPhoto.insert(photo);

        assert.equal(insertedPhoto.group_uuid, firstGroup.uuid);
        assert.strictEqual(insertedPhoto.group, firstGroup);
        assert.strictEqual(photo.group, insertedPhoto.group);

        insertedPhoto.group_uuid = secondGroup.uuid;

        assert.strictEqual(insertedPhoto.group, secondGroup);
        assert.equal(insertedPhoto.group_uuid, secondGroup.uuid);

        let updatedPhoto = await MemoryPhoto.update(insertedPhoto);

        assert.strictEqual(updatedPhoto.group, secondGroup);
        assert.strictEqual(insertedPhoto.group, secondGroup);

        updatedPhoto.group_uuid = null;

        assert.equal(updatedPhoto.group, null);
        assert.equal(updatedPhoto.group_uuid, null);

        let deletedPhoto = await MemoryPhoto.delete(updatedPhoto);

        assert.equal(updatedPhoto.group, null);
        assert.equal(deletedPhoto.group, null);
        assert.equal(deletedPhoto.group_uuid, null);
      });

      test("Model can be fetched, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
        let { MemoryPhoto, MemoryGroup } = generateModels();

        MemoryGroup.cache([
          {
            uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
            name: "Some group",
          },
          {
            uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
            name: "Another group",
          },
        ]);

        let firstGroup = await MemoryGroup.find("499ec646-493f-4eea-b92e-e383d94182f4");
        let secondGroup = await MemoryGroup.find("77653ad3-47e4-4ec2-b49f-57ea36a627e7");
        let photo = MemoryPhoto.build({ name: "Dinner photo", group: secondGroup });

        assert.strictEqual(photo.group, secondGroup);
        assert.equal(photo.group_uuid, secondGroup.uuid);

        photo.group_uuid = firstGroup.uuid;

        assert.strictEqual(photo.group, firstGroup);
        assert.equal(photo.group_uuid, firstGroup.uuid);

        let insertedPhoto = await MemoryPhoto.insert(photo);

        assert.strictEqual(insertedPhoto.group, firstGroup);
        assert.strictEqual(photo.group, insertedPhoto.group);

        insertedPhoto.group_uuid = secondGroup.uuid;

        assert.strictEqual(insertedPhoto.group, secondGroup);
        assert.equal(insertedPhoto.group_uuid, secondGroup.uuid);

        let updatedPhoto = await MemoryPhoto.update(insertedPhoto);

        assert.strictEqual(updatedPhoto.group, secondGroup);
        assert.strictEqual(insertedPhoto.group, secondGroup);

        updatedPhoto.group_uuid = null;

        assert.equal(updatedPhoto.group, null);
        assert.equal(updatedPhoto.group_uuid, null);

        let deletedPhoto = await MemoryPhoto.delete(updatedPhoto);

        assert.equal(updatedPhoto.group, null);
        assert.equal(deletedPhoto.group, null);
        assert.equal(deletedPhoto.group_uuid, null);
      });
    });
  }
);
