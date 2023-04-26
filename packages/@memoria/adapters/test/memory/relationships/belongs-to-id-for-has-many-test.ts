// ChatGPT: Build me test cases & implementation below on this file based on the previous tests & files:
import { module, test } from "qunitx";
import { RelationshipPromise } from "@memoria/model";
import setupMemoria from "../../helpers/setup-memoria.js";
import generateModels from "../../helpers/models-with-relations/memory/id/index.js";

// Groups from HasOne will be User here and same logic as HasOne
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

        let result = await userPhotosPromise;

        assert.hasMany(result, [firstPhoto, secondPhoto, thirdPhoto]);
        assert.hasMany(await firstUser.photos, []);

        [firstPhoto, secondPhoto, thirdPhoto].forEach((photo) => {
          assert.strictEqual(photo.owner, secondUser);
        });

        assert.strictEqual(builtPhoto.owner, secondUser);
        assert.hasMany(secondUser.photos, [firstPhoto, secondPhoto, thirdPhoto, builtPhoto]);
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

        assert.hasMany(await secondUser.photos, [secondPhoto]);
        assert.strictEqual(firstPhoto.owner, null);
        assert.strictEqual(thirdPhoto.owner, null);

        await MemoryPhoto.update({ id: secondPhoto.id, owner_id: null });

        assert.hasMany(secondUser.photos, []);
        assert.hasMany(await firstUser.photos, []);
        assert.strictEqual(secondPhoto.owner, null);
        assert.hasMany(secondUser.photos, []);
        assert.strictEqual(builtPhoto.owner, secondUser);
        assert.hasMany(secondUser.photos, [builtPhoto]);
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
        assert.hasMany(await secondUser.photos, [firstPhoto]);
        assert.strictEqual(builtPhoto.owner, secondUser);
        assert.hasMany(await secondUser.photos, [firstPhoto, builtPhoto]);

        secondUser.photos = undefined;

        assert.equal(builtPhoto.owner_id, null);
        assert.strictEqual(builtPhoto.owner, null);

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
        assert.hasMany(await secondUser.photos, [secondPhoto, thirdPhoto]);

        builtPhoto.owner_id = secondUser.id; // TODO: this should remove the null relationship

        assert.strictEqual(builtPhoto.owner, secondUser);
        assert.hasMany(secondUser.photos, [secondPhoto, thirdPhoto, builtPhoto]);
      });

      test("Models empty relationship reference can turn to promise and then can be retried to fetch correctly", async function (assert) {
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
        assert.hasMany(await secondUser.photos, [firstPhoto]);
        assert.strictEqual(builtPhoto.owner, secondUser);
        assert.hasMany(await secondUser.photos, [firstPhoto, builtPhoto]);

        secondUser.photos = undefined;

        assert.equal(builtPhoto.owner_id, null);
        assert.strictEqual(builtPhoto.owner, null);

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
        assert.hasMany(await secondUserPhotosReloadPromise, [secondPhoto, thirdPhoto]);

        builtPhoto.owner_id = secondUser.id;

        assert.strictEqual(builtPhoto.owner, secondUser);
        assert.hasMany(secondUser.photos, [secondPhoto, thirdPhoto, builtPhoto]);
      });
    });

    module("Basic relationship assignment then commit tests", function () {
      test("New model can be built from scratch and it sends the right data to the server during post", async function (assert) {
        let { MemoryPhoto, MemoryUser } = generateModels();

        let user = MemoryUser.build({ first_name: "Izel" });
        let firstPhoto = MemoryPhoto.build({ name: "Dinner photo", owner: user });
        let secondPhoto = MemoryPhoto.build({ name: "Group photo", owner: user });

        assert.strictEqual(firstPhoto.owner, user);
        assert.equal(firstPhoto.owner_id, user.id);
        assert.strictEqual(secondPhoto.owner, user);
        assert.equal(secondPhoto.owner_id, user.id);
        assert.ok(user.photos instanceof RelationshipPromise);
        assert.hasMany(await user.photos, [firstPhoto, secondPhoto]);

        let insertedPhoto = await MemoryPhoto.insert(firstPhoto);

        assert.strictEqual(firstPhoto.owner, user);
        assert.equal(insertedPhoto.owner_id, null);
        assert.strictEqual(insertedPhoto.owner, user);
        assert.hasMany(await user.photos, [insertedPhoto, secondPhoto]);

        let insertedUser = await MemoryUser.insert(user);

        assert.strictEqual(user, insertedUser);

        assert.strictEqual(user, insertedUser);
        assert.strictEqual(firstPhoto.owner, insertedUser);
        assert.strictEqual(insertedPhoto.owner, insertedUser);
        assert.equal(insertedPhoto.owner_id, insertedUser.id);
        assert.equal(secondPhoto.owner_id, insertedUser.id);
        assert.hasMany(insertedUser.photos, [insertedPhoto, secondPhoto]);
      });

    // module("Reflective relationship mutations then commit tests", function () {
    // });

    // module("Relationship mutations and commit tests on models full lifecycle", function () {
    // });
    }); // NOTE: they are all good keep them just check last one
  }
);
