import { module, test } from "qunitx";
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
      test("Model can fetch its not loaded relationship", async function (assert) {
        let { MemoryPhoto, MemoryGroup } = generateModels();

        let firstGroup = await MemoryGroup.insert({ name: "Some group" });
        let secondGroup = await MemoryGroup.insert({ name: "Another group" });
        let photo = MemoryPhoto.build({ name: "Dinner photo", group_id: secondGroup.id });

        assert.strictEqual(photo.group, secondGroup);
        assert.equal(photo.group_id, secondGroup.id);
      });

      test("Models relationship promise reference turns to null when relationship foreign key sets to null", async function (assert) {
        let { MemoryPhoto, MemoryGroup } = generateModels();

        let firstGroup = await MemoryGroup.insert({ name: "Some group" });
        let secondGroup = await MemoryGroup.insert({ name: "Another group" });
        let photo = MemoryPhoto.build({ name: "Dinner photo", group_id: secondGroup.id });

        assert.strictEqual(photo.group, secondGroup);

        photo.group_id = null;

        assert.equal(photo.group, null);
      });

      test("Models empty relationship reference turns to promise and can fetch when changed", async function (assert) {
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

      test("Models empty relationship reference can turn to promise, when relationship not existing, then can be retried to fetch correctly", async function (assert) {
        assert.expect(14);

        let { MemoryPhoto, MemoryGroup } = generateModels();

        let photo = MemoryPhoto.build({ name: "Dinner photo", group_id: 44 });
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

        let insertedGroup = await MemoryGroup.insert({ id: 44, name: "Some group" });

        assert.propContains(insertedGroup, { id: 44, name: "Some group" });
        assert.strictEqual(photo.group, insertedGroup);
        assert.equal(photo.group_id, 44);
        assert.deepEqual(photo.errors, []);

        let foundGroup = await photo.group;

        assert.strictEqual(insertedGroup, foundGroup);

        let groupLookupReloadPromise = groupLookupPromise.reload();

        assert.ok(groupLookupPromise instanceof RelationshipPromise);

        let group = await groupLookupReloadPromise;

        assert.deepEqual(group, MemoryGroup.peek(44));
        assert.notStrictEqual(group, insertedGroup);
        assert.equal(photo.group.name, "Some group");
        assert.equal(photo.group_id, 44);

        let finalGroup = await group.reload();
        assert.notStrictEqual(finalGroup, insertedGroup);
        assert.notStrictEqual(finalGroup, group);
        assert.deepEqual(finalGroup, MemoryGroup.peek(44));
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

        assert.strictEqual(insertedPhoto.group, group);
        assert.equal(insertedPhoto.group_id, null);
        assert.strictEqual(photo.group, group);

        let insertedGroup = await MemoryGroup.insert(group);

        assert.strictEqual(photo.group, insertedGroup);
        assert.strictEqual(insertedPhoto.group, insertedGroup);
        assert.strictEqual(group, insertedGroup);
        assert.strictEqual(group.photo, insertedPhoto);
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

        secondPhoto.group_id = group.id;

        let secondInsertedPhoto = await MemoryPhoto.insert(secondPhoto);

        assert.strictEqual(secondInsertedPhoto.group, group);
        assert.equal(secondInsertedPhoto.group_id, group.id);
        assert.strictEqual(secondPhoto.group, group);
        assert.equal(secondPhoto.group_id, group.id);
        assert.strictEqual(group.photo, secondInsertedPhoto);
      });

      test("Fetched model can request the relationship(without embed) and change the relationship before update", async function (assert) {
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
        assert.strictEqual(newGroup.photo, fetchedPhoto);
        assert.strictEqual(photo.group, group);
        assert.equal(photo.group_id, group.id);

        let updatedPhoto = await MemoryPhoto.update(fetchedPhoto);

        assert.strictEqual(fetchedPhoto, updatedPhoto);
        assert.strictEqual(updatedPhoto.group, newGroup);
        assert.equal(updatedPhoto.group_id, newGroup.id);
        assert.strictEqual(newGroup.photo, updatedPhoto);
      });

      test("Fetched model can remove the relationship before update", async function (assert) {
        let { MemoryPhoto, MemoryGroup } = generateModels();

        let group = await MemoryGroup.insert({ name: "Some group" });
        let photo = await MemoryPhoto.insert({ name: "Dinner photo", group_id: group.id });

        assert.strictEqual(photo.group, group);

        let fetchedPhoto = await MemoryPhoto.find(photo.id);

        assert.strictEqual(fetchedPhoto.group, group);
        assert.equal(fetchedPhoto.group_id, group.id);
        assert.strictEqual(group.photo, fetchedPhoto);

        fetchedPhoto.group_id = null;

        assert.equal(fetchedPhoto.group, null);
        assert.equal(fetchedPhoto.group_id, null);
        assert.notStrictEqual(group.photo, fetchedPhoto);
        assert.deepEqual(group.photo.toJSON(), MemoryPhoto.Cache.get(fetchedPhoto.id).toJSON());

        let updatedPhoto = await MemoryPhoto.update(fetchedPhoto);

        assert.strictEqual(updatedPhoto, fetchedPhoto);
        assert.equal(updatedPhoto.group, null);
        assert.equal(updatedPhoto.group_id, null);
        assert.equal(await group.photo, null);
      });

      test("Fetched model can remove the relationship before delete", async function (assert) {
        let { MemoryPhoto, MemoryGroup } = generateModels();

        let group = await MemoryGroup.insert({ name: "Some group" });
        let photo = await MemoryPhoto.insert({ name: "Dinner photo", group_id: group.id });

        assert.strictEqual(photo.group, group);

        let fetchedPhoto = await MemoryPhoto.find(photo.id);

        assert.strictEqual(fetchedPhoto.group, group);
        assert.equal(fetchedPhoto.group_id, group.id);
        assert.strictEqual(group.photo, fetchedPhoto);

        fetchedPhoto.group_id = null;

        assert.equal(fetchedPhoto.group, null);
        assert.equal(fetchedPhoto.group_id, null);
        assert.notStrictEqual(group.photo, fetchedPhoto);
        assert.deepEqual(group.photo.toJSON(), MemoryPhoto.Cache.get(fetchedPhoto.id).toJSON());

        let deletedPhoto = await MemoryPhoto.delete(fetchedPhoto);

        assert.deepEqual(deletedPhoto, fetchedPhoto);
        assert.equal(deletedPhoto.group, null);
        assert.equal(deletedPhoto.group_id, null);
        assert.equal(fetchedPhoto.group, null);
        assert.equal(await group.photo, null);
      });
    });

    module(
      "Reverse side mutations: Changing relationship across different relationship instance assignments then commit tests",
      function () {
        test("When related models reflective relationships are completely cleared it doesnt clear the foreign key, just the relationship(previous pointers) of and to the model", async function (assert) {
          let { MemoryPhoto, MemoryGroup } = generateModels();

          let group = await MemoryGroup.insert({ name: "Some group" });
          let secondGroup = await MemoryGroup.insert({ name: "Another group" });
          let thirdGroup = MemoryGroup.build({ id: 3, name: "Third group" });

          let photo = await MemoryPhoto.insert({ name: "Dinner photo", group_id: group.id });

          assert.equal(photo.group_id, group.id);
          assert.strictEqual(photo.group, group);

          group.photo = null;

          assert.equal(group.photo, null);
          assert.equal(photo.group_id, group.id);
          assert.notStrictEqual(photo.group, group);
          assert.deepEqual(photo.group.toJSON(), MemoryGroup.Cache.get(group.id).toJSON());

          secondGroup.photo = photo;

          assert.strictEqual(secondGroup.photo, photo);
          assert.strictEqual(photo.group, secondGroup);
          assert.equal(photo.group_id, secondGroup.id);
          assert.equal(group.photo, null);

          secondGroup.photo = null;

          assert.equal(secondGroup.photo, null);
          assert.equal(group.photo, null);
          assert.equal(photo.group_id, secondGroup.id);
          assert.notStrictEqual(photo.group, secondGroup);
          assert.deepEqual(photo.group.toJSON(), secondGroup.toJSON());

          thirdGroup.photo = photo;

          assert.strictEqual(thirdGroup.photo, photo);
          assert.strictEqual(photo.group, thirdGroup);
          assert.equal(photo.group_id, thirdGroup.id);
          assert.equal(group.photo, null);
          assert.equal(secondGroup.photo, null);

          thirdGroup.photo = null;

          assert.equal(thirdGroup.photo, null);
          assert.equal(secondGroup.photo, null);
          assert.equal(group.photo, null);
          assert.equal(photo.group_id, thirdGroup.id);
          assert.ok(photo.group instanceof RelationshipPromise);
          assert.equal(await photo.group, null); // NOTE: because thirdGroup has never been persisted

          let insertedThirdGroup = await MemoryGroup.insert(thirdGroup);

          assert.equal(photo.group_id, insertedThirdGroup.id);
          assert.strictEqual(photo.group, insertedThirdGroup);
          assert.strictEqual(photo.group.photo, photo);
        });
      }
    );

    module(
      "CRUD: Relationship mutations and commit tests on models full lifecycle: Mutations on all sides",
      function () {
        test("Model can be built, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
          let { MemoryGroup, MemoryPhoto } = generateModels();

          let firstPhoto = await MemoryPhoto.insert({ name: "First photo" });
          let secondPhoto = await MemoryPhoto.insert({ name: "Second photo" });
          let group = MemoryGroup.build({ name: "Dinner group", photo: secondPhoto });

          assert.strictEqual(group.photo, secondPhoto);
          assert.equal(secondPhoto.group_id, null);

          firstPhoto.group = group; // NOTE: this should trigger a logical warning(!!) setting group to firstPhoto but secondPhoto already has group as well(?) clean that first(?)

          assert.strictEqual(firstPhoto.group, group);
          assert.equal(firstPhoto.group_id, group.id);
          assert.equal(secondPhoto.group, group);
          assert.equal(secondPhoto.group_id, null);
          assert.strictEqual(group.photo, firstPhoto);

          let insertedGroup = await MemoryGroup.insert(group);

          assert.strictEqual(group, insertedGroup);
          assert.strictEqual(insertedGroup.photo, secondPhoto);
          assert.strictEqual(group.photo, secondPhoto); // NOTE: this is like a logical mismatch because before it was firstPhoto

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

          let updatedGroup = await MemoryGroup.update(insertedGroup);

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
          assert.strictEqual(secondPhoto.group, updatedGroup);
          assert.equal(secondPhoto.group_id, updatedGroup.id);
          assert.strictEqual(updatedGroup.photo, secondPhoto);

          secondPhoto.group = null; // NOTE: Where does this come from?

          assert.equal(firstPhoto.group_id, updatedGroup.id);
          assert.strictEqual(firstPhoto.group, updatedGroup);
          assert.equal(secondPhoto.group_id, null);
          assert.equal(secondPhoto.group, null);

          assert.strictEqual(group.photo, firstPhoto);
          assert.strictEqual(updatedGroup.photo, firstPhoto);
          assert.strictEqual(firstPhoto.group, updatedGroup);
          assert.strictEqual(insertedGroup.photo, firstPhoto);

          let deletedGroup = await MemoryGroup.delete(updatedGroup);

          assert.equal(updatedGroup.photo, null); // NOTE: this is not null, but removed stuff
          assert.equal(deletedGroup.photo, null);
          assert.equal(secondPhoto.group, null);
          assert.equal(secondPhoto.group_id, null);
          assert.equal(firstPhoto.group, null);
          assert.equal(firstPhoto.group_id, null);
        });

        test("Reverse relationship can be built, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
          let { MemoryPhoto, MemoryGroup } = generateModels();

          let firstGroup = await MemoryGroup.insert({ name: "Some group" });
          let secondGroup = await MemoryGroup.insert({ name: "Some group" });
          let photo = MemoryPhoto.build({ name: "Dinner photo", group: secondGroup });

          assert.strictEqual(photo.group, secondGroup);
          assert.equal(photo.group_id, secondGroup.id);

          photo.group_id = firstGroup.id;

          assert.strictEqual(photo.group, firstGroup);
          assert.equal(photo.group_id, firstGroup.id);
          assert.strictEqual(firstGroup.photo, photo);
          assert.ok(secondGroup.photo instanceof RelationshipPromise);

          let insertedPhoto = await MemoryPhoto.insert(photo);

          assert.strictEqual(photo, insertedPhoto);
          assert.strictEqual(insertedPhoto.group, firstGroup);
          assert.equal(insertedPhoto.group_id, firstGroup.id);
          assert.strictEqual(firstGroup.photo, insertedPhoto);
          assert.ok(secondGroup.photo instanceof RelationshipPromise);

          insertedPhoto.group_id = secondGroup.id;

          assert.strictEqual(insertedPhoto.group, secondGroup);
          assert.equal(insertedPhoto.group_id, secondGroup.id);
          assert.strictEqual(secondGroup.photo, insertedPhoto);
          assert.notStrictEqual(firstGroup.photo, insertedPhoto);
          assert.deepEqual(firstGroup.photo.toJSON(), MemoryPhoto.Cache.get(photo.id).toJSON());

          let updatedPhoto = await MemoryPhoto.update(insertedPhoto); // TODO: This clears firstGroup.photo as it should be(?)

          assert.strictEqual(insertedPhoto, updatedPhoto);
          assert.strictEqual(updatedPhoto.group, secondGroup);
          assert.strictEqual(updatedPhoto.group_id, secondGroup.id);
          assert.strictEqual(secondGroup.photo, updatedPhoto);
          assert.ok(firstGroup.photo instanceof RelationshipPromise);

          updatedPhoto.group_id = null;

          assert.equal(updatedPhoto.group, null);
          assert.equal(updatedPhoto.group_id, null);
          assert.notStrictEqual(secondGroup.photo, updatedPhoto);
          assert.deepEqual(secondGroup.photo.toJSON(), MemoryPhoto.Cache.get(photo.id).toJSON());
          assert.ok(firstGroup.photo instanceof RelationshipPromise);

          let deletedPhoto = await MemoryPhoto.delete(updatedPhoto);

          assert.equal(updatedPhoto.group, null);
          assert.equal(deletedPhoto.group, null);
          assert.equal(deletedPhoto.group_id, null);
          assert.equal(secondGroup.photo, null); // TODO: instead of null it should be a RelationshipPromise
        });

        test("Model can be fetched, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
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
          assert.strictEqual(secondGroup.photo, photo);

          photo.group_id = firstGroup.id;

          assert.strictEqual(photo.group, firstGroup);
          assert.equal(photo.group_id, firstGroup.id);
          assert.strictEqual(firstGroup.photo, photo);
          assert.ok(secondGroup.photo instanceof RelationshipPromise);

          let insertedPhoto = await MemoryPhoto.insert(photo);

          assert.strictEqual(photo, insertedPhoto);
          assert.strictEqual(insertedPhoto.group, firstGroup);
          assert.equal(insertedPhoto.group_id, firstGroup.id);
          assert.strictEqual(firstGroup.photo, insertedPhoto);
          assert.ok(secondGroup.photo instanceof RelationshipPromise);

          insertedPhoto.group_id = secondGroup.id;

          assert.strictEqual(insertedPhoto.group, secondGroup);
          assert.equal(insertedPhoto.group_id, secondGroup.id);
          assert.strictEqual(secondGroup.photo, insertedPhoto);
          assert.notStrictEqual(firstGroup.photo, insertedPhoto);
          assert.deepEqual(firstGroup.photo.toJSON(), MemoryPhoto.Cache.get(photo.id).toJSON());

          let updatedPhoto = await MemoryPhoto.update(insertedPhoto);

          assert.strictEqual(insertedPhoto, updatedPhoto);
          assert.strictEqual(updatedPhoto.group, secondGroup);
          assert.strictEqual(secondGroup.photo, updatedPhoto);
          assert.ok(firstGroup.photo instanceof RelationshipPromise);

          updatedPhoto.group_id = null;

          assert.equal(updatedPhoto.group, null);
          assert.equal(updatedPhoto.group_id, null);
          assert.notStrictEqual(secondGroup.photo, insertedPhoto);
          assert.deepEqual(secondGroup.photo.toJSON(), MemoryPhoto.Cache.get(photo.id).toJSON());
          assert.ok(firstGroup.photo instanceof RelationshipPromise);

          let deletedPhoto = await MemoryPhoto.delete(updatedPhoto);

          assert.equal(updatedPhoto.group, null);
          assert.equal(deletedPhoto.group, null);
          assert.equal(deletedPhoto.group_id, null);
          assert.equal(secondGroup.photo, null);
        });
      }
    );
  }
);
