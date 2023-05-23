// ChatGPT: Build me test cases & implementation below on this file based on the previous tests & files:
// NOTE: Maybe in future test quality upgrade: add one extra photo to the tests, make intermediary built instances, check their upgrade on fetch
import { module, test } from "qunitx";
import { RelationshipPromise, RelationshipDB, InstanceDB } from "@memoria/model";
import setupMemoria from "../../helpers/setup-memoria.js";
import generateModels from "../../helpers/models-with-relations/memory/id/index.js";

module(
  "@memoria/adapters | MemoryAdapter | Relationships | @belongsTo API for ID(integer) pointing to HasMany",
  function (hooks) {
    setupMemoria(hooks);

    module("Relationship fetch tests", function () {
      test("Model can fetch its not loaded relationship", async function (assert) {
        let { MemoryPhoto, MemoryUser } = generateModels();

        let firstUser = await MemoryUser.insert({
          first_name: "Izel",
        });
        let secondUser = await MemoryUser.insert({
          first_name: "John",
        });
        let [firstPhoto, secondPhoto, thirdPhoto] = await Promise.all([
          MemoryPhoto.insert({
            name: "First photo",
            owner_id: secondUser.id,
          }),
          MemoryPhoto.insert({
            name: "Second photo",
            owner_id: secondUser.id,
          }),
          MemoryPhoto.insert({
            name: "Third photo",
            owner_id: secondUser.id,
          }),
        ]);
        let builtPhoto = MemoryPhoto.build({ name: "Fourth photo", owner_id: secondUser.id });
        let userPhotosPromise = secondUser.photos;

        assert.ok(userPhotosPromise instanceof RelationshipPromise);
        assert.strictHasMany(await userPhotosPromise, [firstPhoto, secondPhoto, thirdPhoto]); // TODO: this should have the builtPhoto as well!
        assert.strictHasMany(await firstUser.photos, []);

        [firstPhoto, secondPhoto, thirdPhoto].forEach((photo) => {
          assert.strictEqual(photo.owner, secondUser);
        });

        assert.equal(builtPhoto.owner_id, secondUser.id);
        assert.strictEqual(builtPhoto.owner, secondUser);
        assert.strictHasMany(secondUser.photos, [firstPhoto, secondPhoto, thirdPhoto, builtPhoto]);
      });

      test("Models relationship can remove from array when relationships foreign keys set to null", async function (assert) {
        let { MemoryPhoto, MemoryUser } = generateModels();

        let firstUser = await MemoryUser.insert({ first_name: "Izel" });
        let secondUser = await MemoryUser.insert({ first_name: "John" });
        let [firstPhoto, secondPhoto, thirdPhoto] = await Promise.all([
          MemoryPhoto.insert({
            name: "First photo",
            owner_id: secondUser.id,
          }),
          MemoryPhoto.insert({
            name: "Second photo",
            owner_id: secondUser.id,
          }),
          MemoryPhoto.insert({
            name: "Third photo",
            owner_id: secondUser.id,
          }),
        ]);
        let builtPhoto = MemoryPhoto.build({ name: "Fourth photo", owner_id: secondUser.id });

        await Promise.all([
          MemoryPhoto.update({ id: firstPhoto.id, owner_id: null }),
          MemoryPhoto.update({ id: thirdPhoto.id, owner_id: null }),
        ]);

        assert.strictHasMany(await secondUser.photos, [secondPhoto]);
        assert.strictEqual(firstPhoto.owner, null);
        assert.strictEqual(thirdPhoto.owner, null);

        await MemoryPhoto.update({ id: secondPhoto.id, owner_id: null });

        assert.strictHasMany(secondUser.photos, []);
        assert.strictHasMany(await firstUser.photos, []);
        assert.strictEqual(secondPhoto.owner, null);
        assert.strictHasMany(secondUser.photos, []);
        assert.strictEqual(builtPhoto.owner, secondUser);
        assert.strictHasMany(secondUser.photos, [builtPhoto]);
      });

      test("Models empty relationship reference can be deleted and fetched when changed", async function (assert) {
        let { MemoryPhoto, MemoryUser } = generateModels();

        let firstUser = await MemoryUser.insert({ first_name: "Izel" });
        let secondUser = await MemoryUser.insert({ first_name: "John" });
        let [firstPhoto] = await Promise.all([
          MemoryPhoto.insert({
            name: "First photo",
            owner_id: secondUser.id,
          }),
        ]);

        let builtPhoto = MemoryPhoto.build({ name: "Fourth photo", owner_id: secondUser.id });

        assert.ok(secondUser.photos instanceof RelationshipPromise);
        assert.strictHasMany(await secondUser.photos, [firstPhoto]);
        assert.strictEqual(builtPhoto.owner, secondUser);
        assert.strictHasMany(await secondUser.photos, [firstPhoto, builtPhoto]);

        secondUser.photos = undefined;

        assert.equal(builtPhoto.owner_id, secondUser.id);
        assert.equal(RelationshipDB.has(builtPhoto, "owner"), false);
        assert.ok(secondUser.photos instanceof RelationshipPromise);

        MemoryPhoto.update({ id: firstPhoto.id, owner_id: null });

        let secondPhoto = await MemoryPhoto.insert({
          name: "Second photo",
          owner_id: secondUser.id,
        });
        let thirdPhoto = await MemoryPhoto.insert({
          name: "Third photo",
          owner_id: secondUser.id,
        });

        assert.ok(secondUser.photos instanceof RelationshipPromise);
        assert.strictHasMany(await secondUser.photos, [secondPhoto, thirdPhoto]);
        assert.equal(RelationshipDB.has(builtPhoto, "owner"), false);
        assert.strictEqual(builtPhoto.owner, secondUser);
        assert.strictHasMany(await secondUser.photos, [secondPhoto, thirdPhoto, builtPhoto]);

        builtPhoto.owner_id = firstUser.id;

        assert.strictHasMany(secondUser.photos, [secondPhoto, thirdPhoto]);
        assert.equal(builtPhoto.owner_id, firstUser.id);
        assert.ok(firstUser.photos instanceof RelationshipPromise);
        assert.strictHasMany(await firstUser.photos, []);
        assert.equal(RelationshipDB.has(builtPhoto, "owner"), false);
        assert.strictEqual(builtPhoto.owner, firstUser);
        assert.equal(RelationshipDB.has(builtPhoto, "owner"), true);
        assert.strictHasMany(firstUser.photos, [builtPhoto]);
        assert.strictHasMany(secondUser.photos, [secondPhoto, thirdPhoto]);
      });

      test("Models empty relationship reference can turn to promise and then can be retried with reload to fetch correctly", async function (assert) {
        let { MemoryPhoto, MemoryUser } = generateModels();

        let firstUser = await MemoryUser.insert({ first_name: "Izel" });
        let secondUser = await MemoryUser.insert({ first_name: "John" });
        let [firstPhoto] = await Promise.all([
          MemoryPhoto.insert({
            name: "First photo",
            owner_id: secondUser.id,
          }),
        ]);

        let builtPhoto = MemoryPhoto.build({ name: "Fourth photo", owner_id: secondUser.id });

        assert.ok(secondUser.photos instanceof RelationshipPromise);
        assert.strictHasMany(await secondUser.photos, [firstPhoto]);
        assert.strictEqual(builtPhoto.owner, secondUser);
        assert.strictHasMany(await secondUser.photos, [firstPhoto, builtPhoto]);

        secondUser.photos = undefined;

        assert.equal(builtPhoto.owner_id, secondUser.id);
        assert.ok(secondUser.photos instanceof RelationshipPromise);
        assert.strictHasMany(await secondUser.photos, [firstPhoto]);
        assert.equal(RelationshipDB.has(builtPhoto, "owner"), false);
        assert.strictEqual(builtPhoto.owner, secondUser);
        assert.equal(RelationshipDB.has(builtPhoto, "owner"), true);
        assert.strictHasMany(secondUser.photos, [firstPhoto, builtPhoto]);

        MemoryPhoto.update({ id: firstPhoto.id, owner_id: null });

        let secondUserPhotosPromise = secondUser.photos;
        let secondPhoto = await MemoryPhoto.insert({
          name: "Second photo",
          owner_id: secondUser.id,
        });
        let thirdPhoto = await MemoryPhoto.insert({
          name: "Third photo",
          owner_id: secondUser.id,
        });
        let secondUserPhotosReloadPromise = secondUserPhotosPromise.reload();

        assert.ok(secondUserPhotosReloadPromise instanceof RelationshipPromise);
        assert.strictHasMany(await secondUserPhotosReloadPromise, [secondPhoto, thirdPhoto, builtPhoto]);

        builtPhoto.owner_id = secondUser.id;

        assert.strictEqual(builtPhoto.owner, secondUser);
        assert.strictHasMany(secondUser.photos, [secondPhoto, thirdPhoto, builtPhoto]);
      });
    });

    module("Basic relationship assignment then commit tests", function () {
      test("New model can be built from scratch and it sends the right data to the server during post", async function (assert) {
        let { MemoryPhoto, MemoryUser } = generateModels();

        let user = MemoryUser.build({ first_name: "Izel" });
        let firstPhoto = MemoryPhoto.build({ name: "Dinner photo", owner: user });
        let secondPhoto = MemoryPhoto.build({ name: "user photo", owner: user });

        assert.strictEqual(firstPhoto.owner, user);
        assert.equal(firstPhoto.owner_id, user.id);
        assert.strictEqual(secondPhoto.owner, user);
        assert.equal(secondPhoto.owner_id, user.id);
        assert.ok(user.photos instanceof RelationshipPromise);

        assert.strictHasMany(await user.photos, [firstPhoto, secondPhoto]);

        let insertedPhoto = await MemoryPhoto.insert(firstPhoto);

        assert.strictEqual(firstPhoto.owner, user);
        assert.equal(insertedPhoto.owner_id, null);
        assert.strictEqual(insertedPhoto.owner, user);
        assert.strictHasMany(await user.photos, [insertedPhoto, secondPhoto]);

        let insertedUser = await MemoryUser.insert(user);

        assert.strictEqual(user, insertedUser);

        assert.strictEqual(user, insertedUser);
        assert.strictEqual(firstPhoto.owner, insertedUser);
        assert.strictEqual(insertedPhoto.owner, insertedUser);
        assert.equal(insertedPhoto.owner_id, insertedUser.id);
        assert.equal(secondPhoto.owner_id, insertedUser.id);
        assert.strictHasMany(insertedUser.photos, [insertedPhoto, secondPhoto]);
      });

      test("New model can have relationship set afterwards and it sends the right data to the server during post", async function (assert) {
        let { MemoryPhoto, MemoryUser } = generateModels();

        let user = await MemoryUser.insert({ first_name: "Izel" });
        let firstPhoto = MemoryPhoto.build({ name: "Dinner photo", owner_id: user.id });
        let secondPhoto = MemoryPhoto.build({ name: "Second photo" });

        assert.equal(firstPhoto.user, null);
        assert.equal(secondPhoto.user, null);
        assert.ok(user.photos instanceof RelationshipPromise);

        let insertedPhoto = await MemoryPhoto.insert(firstPhoto);

        assert.strictEqual(firstPhoto, insertedPhoto);
        assert.equal(firstPhoto.user, null);
        assert.equal(insertedPhoto.user, null);
        assert.ok(user.photos instanceof RelationshipPromise);
        assert.strictHasMany(await user.photos, [insertedPhoto]);

        secondPhoto.owner_id = user.id;

        let secondInsertedPhoto = await MemoryPhoto.insert(secondPhoto);

        assert.strictHasMany(user.photos, [insertedPhoto, secondInsertedPhoto]);
        assert.strictEqual(secondInsertedPhoto, secondPhoto);
        assert.strictEqual(secondInsertedPhoto.owner, user);
        assert.equal(secondInsertedPhoto.owner_id, user.id);

        firstPhoto.owner_id = user.id;

        assert.strictHasMany(user.photos, [insertedPhoto, secondInsertedPhoto]);
        assert.strictEqual(firstPhoto.owner, user);
        assert.strictHasMany(user.photos, [insertedPhoto, secondInsertedPhoto]);
      });

      test("Fetched model can request the relationship(without embed) and change the relationship before update", async function (assert) {
        let { MemoryPhoto, MemoryUser } = generateModels();

        let user = await MemoryUser.insert({ first_name: "Izel" });
        let photo = await MemoryPhoto.insert({ name: "Dinner photo", owner: user });
        let secondPhoto = MemoryPhoto.build({ name: "Second photo" });

        assert.strictEqual(photo.owner, user);
        assert.equal(photo.owner_id, user.id);
        assert.ok(user.photos instanceof RelationshipPromise);
        assert.strictHasMany(await user.photos, [photo]);

        let fetchedPhoto = await MemoryPhoto.find(photo.id);

        assert.strictEqual(fetchedPhoto.owner, user);
        assert.equal(fetchedPhoto.owner_id, user.id);
        assert.strictHasMany(user.photos, [fetchedPhoto]);

        let newUser = MemoryUser.build({ first_name: "Brendan" });

        fetchedPhoto.owner = newUser;

        assert.strictEqual(fetchedPhoto.owner, newUser);
        assert.equal(fetchedPhoto.owner_id, newUser.id);
        assert.strictHasMany(user.photos, []);

        assert.ok(newUser.photos instanceof RelationshipPromise);
        assert.strictHasMany(await newUser.photos, [fetchedPhoto]);
        assert.strictHasMany(user.photos, []);

        let updatedPhoto = await MemoryPhoto.update(fetchedPhoto);

        assert.strictEqual(fetchedPhoto, updatedPhoto);
        assert.strictEqual(updatedPhoto.owner, newUser);
        assert.equal(updatedPhoto.owner_id, newUser.id);
        assert.strictHasMany(newUser.photos, [updatedPhoto]);
        assert.strictHasMany(user.photos, []);
      });

      test("Fetched model can remove the relationship before update", async function (assert) {
        let { MemoryPhoto, MemoryUser } = generateModels();

        let user = await MemoryUser.insert({ name: "Some user" });
        let photo = await MemoryPhoto.insert({ name: "Dinner photo", owner_id: user.id });

        assert.strictEqual(photo.owner, user);

        let fetchedPhoto = await MemoryPhoto.find(photo.id);

        assert.notStrictEqual(fetchedPhoto, photo);
        assert.strictEqual(fetchedPhoto.owner, user);
        assert.equal(fetchedPhoto.owner_id, user.id);
        assert.strictEqual(photo.owner, user);
        assert.equal(photo.owner_id, user.id);
        assert.ok(user.photos instanceof RelationshipPromise);
        assert.strictHasMany(await user.photos, [fetchedPhoto]);

        fetchedPhoto.owner_id = null;

        assert.equal(fetchedPhoto.owner, null);
        assert.equal(fetchedPhoto.owner_id, null);
        assert.strictHasMany(user.photos, [photo]); // NOTE: make this strict

        let updatedPhoto = await MemoryPhoto.update(fetchedPhoto);

        assert.strictEqual(updatedPhoto, fetchedPhoto);
        assert.equal(updatedPhoto.user, null);
        assert.equal(updatedPhoto.user_id, null);
        assert.strictHasMany(user.photos, []); // NOTE: make this strict
      });

      test("Fetched model can remove the relationship before delete", async function (assert) {
        let { MemoryPhoto, MemoryUser } = generateModels();

        let user = await MemoryUser.insert({ name: "Some user" });
        let photo = await MemoryPhoto.insert({ name: "Dinner photo", owner_id: user.id });

        assert.strictEqual(photo.owner, user);

        let fetchedPhoto = await MemoryPhoto.find(photo.id);

        assert.strictEqual(fetchedPhoto.owner, user);
        assert.equal(fetchedPhoto.owner_id, user.id);
        assert.ok(user.photos instanceof RelationshipPromise);
        assert.strictHasMany(await user.photos, [fetchedPhoto]);

        fetchedPhoto.owner_id = null;

        assert.equal(fetchedPhoto.owner, null);
        assert.equal(fetchedPhoto.owner_id, null);
        assert.strictHasMany(user.photos, [photo]); // NOTE: make this strict

        let deletedPhoto = await MemoryPhoto.delete(fetchedPhoto);

        assert.deepEqual(deletedPhoto.toJSON(), fetchedPhoto.toJSON());
        assert.equal(deletedPhoto.owner, null);
        assert.equal(deletedPhoto.owner_id, null);
        assert.equal(fetchedPhoto.owner, null);
        assert.equal(fetchedPhoto.owner_id, null);
        assert.strictHasMany(user.photos, []);
      });

      // NOTE: We could keep generating it from the cache in HasManyArray's when we clear the fkeys but we don't, because I deem it confusing
      // TODO: I need a test that this doest fallback to the second one on removal
      test("Fallback behavior for fkey mutations clear the HasManyArray when there is cached & persisted but no instances of the reference with fkey pointing to it", async function (assert) {
        let { MemoryPhoto, MemoryUser } = generateModels();

        let user = await MemoryUser.insert({ name: "Some user" });
        let photo = await MemoryPhoto.insert({ name: "Dinner photo", owner_id: user.id });

        assert.strictEqual(photo.owner, user);

        let fetchedPhoto = await MemoryPhoto.find(photo.id);

        assert.strictEqual(fetchedPhoto.owner, user);
        assert.equal(fetchedPhoto.owner_id, user.id);
        assert.ok(user.photos instanceof RelationshipPromise);
        assert.strictHasMany(await user.photos, [fetchedPhoto]);

        fetchedPhoto.owner_id = null;

        assert.equal(fetchedPhoto.owner, null);
        assert.equal(fetchedPhoto.owner_id, null);
        assert.strictHasMany(user.photos, [photo]); // NOTE: make this strict

        photo.owner_id = null;

        assert.equal(photo.owner, null);
        assert.equal(photo.owner_id, null);
        assert.hasMany(user.photos, []); // NOTE: make this strict
      });
    });

    module(
      "Reverse side mutations: Changing relationship across different relationship instance assignments then commit tests",
      function () {
        test("When related models reflective relationships are completely cleared it doesnt clear the foreign key, just the relationship(previous pointers) of and to the model", async function (assert) {
          let { MemoryPhoto, MemoryUser } = generateModels();

          let user = await MemoryUser.insert({ name: "Some user" });
          let secondUser = await MemoryUser.insert({ name: "Another user" });
          let thirdUser = MemoryUser.build({ id: 3, name: "Third user" });

          let photo = await MemoryPhoto.insert({ name: "Dinner photo", owner_id: user.id });

          assert.equal(photo.owner_id, user.id);
          assert.strictEqual(photo.owner, user);
          assert.hasMany(await user.photos, [photo]);

          user.photos = [];

          assert.strictHasMany(user.photos, []);
          assert.equal(photo.owner_id, user.id);
          assert.notStrictEqual(photo.owner, user);
          assert.deepEqual(photo.owner.toJSON(), MemoryUser.Cache.get(user.id).toJSON());
          assert.strictHasMany(user.photos, []);

          secondUser.photos = [photo];

          assert.strictHasMany(secondUser.photos, [photo]);
          assert.strictEqual(photo.owner, secondUser);
          assert.equal(photo.owner_id, secondUser.id);
          assert.strictHasMany(user.photos, []);

          secondUser.photos.clear();

          assert.strictHasMany(secondUser.photos, []);
          assert.strictHasMany(user.photos, []);
          assert.equal(photo.owner_id, secondUser.id);
          assert.notStrictEqual(photo.owner, secondUser);
          assert.deepEqual(photo.owner.toJSON(), secondUser.toJSON());

          thirdUser.photos = [photo];

          assert.strictHasMany(thirdUser.photos, [photo]);
          assert.strictEqual(photo.owner, thirdUser);
          assert.equal(photo.owner_id, thirdUser.id);
          assert.strictHasMany(user.photos, []);
          assert.strictHasMany(secondUser.photos, []);

          thirdUser.photos.clear();

          assert.strictHasMany(thirdUser.photos, []);
          assert.strictHasMany(secondUser.photos, []);
          assert.strictHasMany(user.photos, []);
          assert.equal(photo.owner_id, thirdUser.id);
          assert.ok(photo.owner instanceof RelationshipPromise);
          assert.equal(await photo.owner, null); // NOTE: because thirduser has never been persisted

          let insertedThirdUser = await MemoryUser.insert(thirdUser);

          assert.equal(photo.owner_id, insertedThirdUser.id);
          assert.strictEqual(photo.owner, insertedThirdUser);
          assert.strictHasMany(await photo.owner.photos, [photo]);
        });
      }
    );

    module(
      "CRUD: Relationship mutations and commit tests on models full lifecycle: Mutations on all sides",
      function () {
        test("Model can be built, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
          let { MemoryUser, MemoryPhoto } = generateModels();

          let firstPhoto = await MemoryPhoto.insert({ name: "First photo" });
          let secondPhoto = await MemoryPhoto.insert({ name: "Second photo" });
          let user = MemoryUser.build({ first_name: "Izels", photos: [secondPhoto] });

          assert.strictHasMany(user.photos, [secondPhoto]);
          assert.equal(secondPhoto.owner_id, null);

          firstPhoto.owner = user; // NOTE: this should trigger a logical warning(!!) setting user to firstPhoto but secondPhoto already has user as well(?) clean that first(?)

          assert.strictEqual(firstPhoto.owner, user);
          assert.equal(firstPhoto.owner_id, null);
          assert.equal(secondPhoto.owner, user);
          assert.equal(secondPhoto.owner_id, null);
          assert.strictHasMany(user.photos, [secondPhoto, firstPhoto]);

          let insertedUser = await MemoryUser.insert(user);

          assert.strictEqual(user, insertedUser);
          assert.strictHasMany(insertedUser.photos, [secondPhoto, firstPhoto]);
          assert.strictEqual(firstPhoto.owner, insertedUser);
          assert.equal(firstPhoto.owner_id, insertedUser.id);
          assert.strictEqual(secondPhoto.owner, insertedUser);
          assert.equal(secondPhoto.owner_id, insertedUser.id);

          secondPhoto.owner_id = insertedUser.id;

          assert.strictHasMany(insertedUser.photos, [secondPhoto, firstPhoto]);

          let updatedUser = await MemoryUser.update(insertedUser);

          assert.strictEqual(insertedUser, updatedUser);
          assert.strictHasMany(updatedUser.photos, [secondPhoto, firstPhoto]);
          assert.strictEqual(firstPhoto.owner, updatedUser);
          assert.equal(firstPhoto.owner_id, updatedUser.id);
          assert.strictEqual(secondPhoto.owner, updatedUser);
          assert.equal(secondPhoto.owner_id, updatedUser.id);

          updatedUser.photos = [secondPhoto];

          assert.strictHasMany(updatedUser.photos, [secondPhoto]);
          assert.equal(RelationshipDB.has(firstPhoto, "owner"), false);
          assert.notStrictEqual(firstPhoto.owner, updatedUser);
          assert.deepEqual(firstPhoto.owner.toJSON(), updatedUser.toJSON());
          assert.equal(firstPhoto.owner_id, updatedUser.id);
          assert.equal(RelationshipDB.has(firstPhoto.owner, "photos"), false);

          assert.strictEqual(secondPhoto.owner, updatedUser);
          assert.equal(secondPhoto.owner_id, updatedUser.id);
          assert.strictHasMany(updatedUser.photos, [secondPhoto]);

          secondPhoto.owner = null; // NOTE: Where does this come from?

          assert.notStrictEqual(firstPhoto.owner, updatedUser);
          assert.deepEqual(firstPhoto.owner.toJSON(), updatedUser.toJSON());
          assert.equal(firstPhoto.owner_id, updatedUser.id);
          assert.equal(secondPhoto.owner, null);
          assert.equal(secondPhoto.owner_id, null);

          assert.strictHasMany(user.photos, []);
          assert.strictHasMany(updatedUser.photos, []);
          assert.strictHasMany(insertedUser.photos, []);

          let deletedUser = await MemoryUser.delete(updatedUser);

          assert.deepEqual(updatedUser.photos, []); // NOTE: this is not null, but removed stuff
          assert.deepEqual(deletedUser.photos, []);
          assert.equal(secondPhoto.owner, null);
          assert.equal(secondPhoto.owner_id, null);
          assert.equal(firstPhoto.owner, null);
          assert.equal(firstPhoto.owner_id, null);
        });

        test("Reverse relationship can be built, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
          let { MemoryPhoto, MemoryUser } = generateModels();

          let firstUser = await MemoryUser.insert({ name: "Some group" });
          let secondUser = await MemoryUser.insert({ name: "Some group" });
          let photo = MemoryPhoto.build({ name: "Dinner photo", owner: secondUser });

          assert.strictEqual(photo.owner, secondUser);
          assert.equal(photo.owner_id, secondUser.id);

          photo.owner_id = firstUser.id;

          assert.strictEqual(photo.owner, firstUser);
          assert.equal(photo.owner_id, firstUser.id);
          assert.strictHasMany(await firstUser.photos, [photo]);
          assert.ok(secondUser.photos instanceof RelationshipPromise);

          let insertedPhoto = await MemoryPhoto.insert(photo);

          assert.strictEqual(photo, insertedPhoto);
          assert.strictEqual(insertedPhoto.owner, firstUser);
          assert.equal(insertedPhoto.owner_id, firstUser.id);
          assert.strictHasMany(firstUser.photos, [insertedPhoto]);
          assert.ok(secondUser.photos instanceof RelationshipPromise);

          insertedPhoto.owner_id = secondUser.id;

          assert.strictEqual(insertedPhoto.owner, secondUser);
          assert.equal(insertedPhoto.owner_id, secondUser.id);
          assert.strictHasMany(await secondUser.photos, [insertedPhoto]);
          assert.deepEqual(firstUser.photos, []);

          let updatedPhoto = await MemoryPhoto.update(insertedPhoto); // TODO: This clears firstUser.photos as it should be(?)

          assert.strictEqual(insertedPhoto, updatedPhoto);
          assert.strictEqual(updatedPhoto.owner, secondUser);
          assert.strictEqual(updatedPhoto.owner_id, secondUser.id);
          assert.strictHasMany(secondUser.photos, [updatedPhoto]);
          assert.deepEqual(firstUser.photos, []);

          updatedPhoto.owner_id = null;

          assert.equal(updatedPhoto.owner, null);

          assert.equal(updatedPhoto.owner_id, null);
          assert.deepEqual(secondUser.photos, []);
          assert.deepEqual(firstUser.photos, []);

          let deletedPhoto = await MemoryPhoto.delete(updatedPhoto);

          assert.equal(updatedPhoto.owner, null);
          assert.equal(deletedPhoto.owner, null);
          assert.equal(deletedPhoto.owner_id, null);
          assert.equal(secondUser.photo, null); // TODO: instead of null it should be a RelationshipPromise
        });

        test("Model can be fetched, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
          let { MemoryPhoto, MemoryUser } = generateModels();

          MemoryUser.cache([
            {
              id: 1,
              name: "Some group",
            },
            {
              id: 2,
              name: "Another group",
            },
          ]);

          let firstUser = await MemoryUser.find(1);
          let secondUser = await MemoryUser.find(2);
          let photo = MemoryPhoto.build({ name: "Dinner photo", owner: secondUser });

          assert.strictEqual(photo.owner, secondUser);
          assert.equal(photo.owner_id, secondUser.id);
          assert.strictHasMany(await secondUser.photos, [photo]);

          photo.owner_id = firstUser.id;

          assert.strictEqual(photo.owner, firstUser);
          assert.equal(photo.owner_id, firstUser.id);
          assert.strictHasMany(await firstUser.photos, [photo]);
          assert.deepEqual(secondUser.photos, []);

          let insertedPhoto = await MemoryPhoto.insert(photo);

          assert.strictEqual(photo, insertedPhoto);
          assert.strictEqual(insertedPhoto.owner, firstUser);
          assert.equal(insertedPhoto.owner_id, firstUser.id);
          assert.strictHasMany(firstUser.photos, [insertedPhoto]);
          assert.deepEqual(secondUser.photos, []);

          insertedPhoto.owner_id = secondUser.id;

          assert.notStrictEqual(insertedPhoto.owner, firstUser);
          assert.equal(insertedPhoto.owner_id, secondUser.id);
          assert.deepEqual(secondUser.photos, []);
          assert.deepEqual(firstUser.photos, []);

          let updatedPhoto = await MemoryPhoto.update(insertedPhoto);

          assert.strictEqual(insertedPhoto, updatedPhoto);
          assert.strictEqual(updatedPhoto.owner, secondUser);
          assert.strictHasMany(secondUser.photos, [updatedPhoto]);
          assert.deepEqual(firstUser.photos, []);

          updatedPhoto.owner_id = null;

          assert.equal(updatedPhoto.owner, null);
          assert.equal(updatedPhoto.owner_id, null);
          assert.deepEqual(secondUser.photos, []);
          assert.deepEqual(firstUser.photos, []);

          let deletedPhoto = await MemoryPhoto.delete(updatedPhoto);

          assert.equal(updatedPhoto.owner, null);
          assert.equal(deletedPhoto.owner, null);
          assert.equal(deletedPhoto.owner_id, null);
          assert.equal(secondUser.photo, null);
        });
      }
    );
  }
);
