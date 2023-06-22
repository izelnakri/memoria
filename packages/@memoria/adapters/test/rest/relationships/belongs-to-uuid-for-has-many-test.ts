import { module, test } from "qunitx";
import { RelationshipPromise, RelationshipDB, InstanceDB, UnauthorizedError, NotFoundError } from "@memoria/model";
import { HTTP } from "@memoria/adapters";
import ServerResponse from "@memoria/response";
import setupMemoria from "../../helpers/setup-memoria.js";
import setupRESTModels from "../../helpers/models-with-relations/rest/uuid/index.js";

const FIRST_TARGET_UUID = "374c7f4a-85d6-429a-bf2a-0719525f5f21";
const SECOND_TARGET_UUID = "374c7f4a-85d6-429a-bf2a-0719525f5f22";

module(
  "@memoria/adapters | RESTAdapter | Relationships | @belongsTo API for UUID(string) pointing to HasMany",
  function (hooks) {
    setupMemoria(hooks);

    module("Relationship fetch tests", function () {
      test("Model can fetch its not loaded relationship", async function (assert) {
        let { Server, RESTPhoto, RESTUser } = setupRESTModels();
        this.Server = Server;

        let firstUser = await RESTUser.insert({
          first_name: "Izel",
        });
        let secondUser = await RESTUser.insert({
          first_name: "John",
        });
        let [firstPhoto, secondPhoto, thirdPhoto] = await Promise.all([
          RESTPhoto.insert({
            name: "First photo",
            owner_uuid: secondUser.uuid,
          }),
          RESTPhoto.insert({
            name: "Second photo",
            owner_uuid: secondUser.uuid,
          }),
          RESTPhoto.insert({
            name: "Third photo",
            owner_uuid: secondUser.uuid,
          }),
        ]);
        let builtPhoto = RESTPhoto.build({ name: "Fourth photo", owner_uuid: secondUser.uuid });
        let userPhotosPromise = secondUser.photos;

        assert.ok(userPhotosPromise instanceof RelationshipPromise);
        assert.hasMany(await userPhotosPromise, [firstPhoto, secondPhoto, thirdPhoto]); // TODO: this should have the builtPhoto as well in future!
        assert.strictHasMany(await firstUser.photos, []);

        // [firstPhoto, secondPhoto, thirdPhoto].forEach((photo) => {
        //   assert.strictEqual(photo.owner, secondUser);
        // });

        // assert.equal(builtPhoto.owner_uuid, secondUser.uuid);
        // assert.strictEqual(builtPhoto.owner, secondUser);
        // assert.hasMany(secondUser.photos, [firstPhoto, secondPhoto, thirdPhoto, builtPhoto]);
      });

      test("Models relationship can remove from array when relationships foreign keys set to null", async function (assert) {
        let { Server, RESTPhoto, RESTUser } = setupRESTModels();
        this.Server = Server;

        let firstUser = await RESTUser.insert({ first_name: "Izel" });
        let secondUser = await RESTUser.insert({ first_name: "John" });
        let [firstPhoto, secondPhoto, thirdPhoto] = await Promise.all([
          RESTPhoto.insert({
            name: "First photo",
            owner_uuid: secondUser.uuid,
          }),
          RESTPhoto.insert({
            name: "Second photo",
            owner_uuid: secondUser.uuid,
          }),
          RESTPhoto.insert({
            name: "Third photo",
            owner_uuid: secondUser.uuid,
          }),
        ]);
        let builtPhoto = RESTPhoto.build({ name: "Fourth photo", owner_uuid: secondUser.uuid });

        await Promise.all([
          RESTPhoto.update({ uuid: firstPhoto.uuid, owner_uuid: null }),
          RESTPhoto.update({ uuid: thirdPhoto.uuid, owner_uuid: null }),
        ]);

        assert.hasMany(await secondUser.photos, [secondPhoto]);
        assert.strictEqual(firstPhoto.owner, null);
        assert.strictEqual(thirdPhoto.owner, null);

        await RESTPhoto.update({ uuid: secondPhoto.uuid, owner_uuid: null });

        assert.strictHasMany(secondUser.photos, []);
        assert.strictHasMany(await firstUser.photos, []);
        assert.strictEqual(secondPhoto.owner, null);
        assert.strictHasMany(secondUser.photos, []);
        assert.strictEqual(builtPhoto.owner, secondUser);
        assert.strictHasMany(secondUser.photos, [builtPhoto]);
      });

      test("Models empty relationship reference can be deleted and fetched when changed", async function (assert) {
        let { Server, RESTPhoto, RESTUser } = setupRESTModels();
        this.Server = Server;

        let firstUser = await RESTUser.insert({ first_name: "Izel" });
        let secondUser = await RESTUser.insert({ first_name: "John" });
        let [firstPhoto] = await Promise.all([
          RESTPhoto.insert({
            name: "First photo",
            owner_uuid: secondUser.uuid,
          }),
        ]);

        let builtPhoto = RESTPhoto.build({ name: "Fourth photo", owner_uuid: secondUser.uuid });

        assert.ok(secondUser.photos instanceof RelationshipPromise);
        assert.hasMany(await secondUser.photos, [firstPhoto]);
        assert.strictEqual(builtPhoto.owner, secondUser);
        assert.hasMany(await secondUser.photos, [firstPhoto, builtPhoto]);

        secondUser.photos = undefined;

        assert.equal(builtPhoto.owner_uuid, secondUser.uuid);
        assert.equal(RelationshipDB.has(builtPhoto, "owner"), false);
        assert.ok(secondUser.photos instanceof RelationshipPromise);

        RESTPhoto.update({ uuid: firstPhoto.uuid, owner_uuid: null });

        let secondPhoto = await RESTPhoto.insert({
          name: "Second photo",
          owner_uuid: secondUser.uuid,
        });
        let thirdPhoto = await RESTPhoto.insert({
          name: "Third photo",
          owner_uuid: secondUser.uuid,
        });

        assert.ok(secondUser.photos instanceof RelationshipPromise);
        assert.hasMany(await secondUser.photos, [secondPhoto, thirdPhoto]);
        assert.equal(RelationshipDB.has(builtPhoto, "owner"), false);
        assert.strictEqual(builtPhoto.owner, secondUser);
        assert.hasMany(await secondUser.photos, [secondPhoto, thirdPhoto, builtPhoto]);

        builtPhoto.owner_uuid = firstUser.uuid;

        assert.hasMany(secondUser.photos, [secondPhoto, thirdPhoto]);
        assert.equal(builtPhoto.owner_uuid, firstUser.uuid);
        assert.ok(firstUser.photos instanceof RelationshipPromise);
        assert.strictHasMany(await firstUser.photos, []);
        assert.equal(RelationshipDB.has(builtPhoto, "owner"), false);
        assert.strictEqual(builtPhoto.owner, firstUser);
        assert.equal(RelationshipDB.has(builtPhoto, "owner"), true);
        assert.strictHasMany(firstUser.photos, [builtPhoto]);
        assert.hasMany(secondUser.photos, [secondPhoto, thirdPhoto]);
      });

      test("Models empty relationship reference can turn to promise and then can be retried with reload to fetch correctly", async function (assert) {
        let { Server, RESTPhoto, RESTUser } = setupRESTModels();
        this.Server = Server;

        let firstUser = await RESTUser.insert({ first_name: "Izel" });
        let secondUser = await RESTUser.insert({ first_name: "John" });
        let [firstPhoto] = await Promise.all([
          RESTPhoto.insert({
            name: "First photo",
            owner_uuid: secondUser.uuid,
          }),
        ]);

        let builtPhoto = RESTPhoto.build({ name: "Fourth photo", owner_uuid: secondUser.uuid });

        assert.ok(secondUser.photos instanceof RelationshipPromise);
        assert.hasMany(await secondUser.photos, [firstPhoto]);
        assert.strictEqual(builtPhoto.owner, secondUser);
        assert.hasMany(secondUser.photos, [firstPhoto, builtPhoto]);

        secondUser.photos = undefined;

        assert.equal(builtPhoto.owner_uuid, secondUser.uuid);
        assert.ok(secondUser.photos instanceof RelationshipPromise);
        assert.hasMany(await secondUser.photos, [firstPhoto]);
        assert.equal(RelationshipDB.has(builtPhoto, "owner"), false);
        assert.strictEqual(builtPhoto.owner, secondUser);
        assert.equal(RelationshipDB.has(builtPhoto, "owner"), true);
        assert.hasMany(secondUser.photos, [firstPhoto, builtPhoto]);

        await RESTPhoto.update({ uuid: firstPhoto.uuid, owner_uuid: null });

        let secondUserPhotosPromise = secondUser.photos;
        let secondPhoto = await RESTPhoto.insert({
          name: "Second photo",
          owner_uuid: secondUser.uuid,
        });
        let thirdPhoto = await RESTPhoto.insert({
          name: "Third photo",
          owner_uuid: secondUser.uuid,
        });
        let secondUserPhotosReloadPromise = secondUserPhotosPromise.reload();

        assert.ok(secondUserPhotosReloadPromise instanceof RelationshipPromise);
        assert.hasMany(await secondUserPhotosReloadPromise, [secondPhoto, thirdPhoto]);
        assert.hasMany(secondUser.photos, [secondPhoto, thirdPhoto]);

        builtPhoto.owner_uuid = secondUser.uuid;

        assert.strictEqual(builtPhoto.owner, secondUser);
        assert.hasMany(secondUser.photos, [secondPhoto, thirdPhoto, builtPhoto]);
      });
    });

    module("Basic relationship assignment then commit tests", function () {
      test("New model can be built from scratch and it sends the right data to the server during post", async function (assert) {
        let { Server, RESTPhoto, RESTUser } = setupRESTModels();
        this.Server = Server;

        let user = RESTUser.build({ first_name: "Izel" });
        let firstPhoto = RESTPhoto.build({ name: "Dinner photo", owner: user });
        let secondPhoto = RESTPhoto.build({ name: "user photo", owner: user });

        assert.strictEqual(firstPhoto.owner, user);
        assert.equal(firstPhoto.owner_uuid, user.uuid);
        assert.strictEqual(secondPhoto.owner, user);
        assert.equal(secondPhoto.owner_uuid, user.uuid);
        assert.ok(user.photos instanceof RelationshipPromise);

        assert.strictHasMany(await user.photos, []);
        assert.strictEqual(firstPhoto.owner, user);
        assert.strictEqual(secondPhoto.owner, user);
        assert.strictHasMany(await user.photos, [firstPhoto, secondPhoto]);

        let insertedPhoto = await RESTPhoto.insert(firstPhoto);

        assert.strictEqual(firstPhoto.owner, user);
        assert.equal(insertedPhoto.owner_uuid, null);
        assert.strictEqual(insertedPhoto.owner, user);
        assert.strictHasMany(await user.photos, [insertedPhoto, secondPhoto]);

        let insertedUser = await RESTUser.insert(user);

        assert.strictEqual(user, insertedUser);
        assert.strictEqual(firstPhoto.owner, insertedUser);
        assert.strictEqual(insertedPhoto.owner, insertedUser);
        assert.equal(insertedPhoto.owner_uuid, insertedUser.uuid);
        assert.equal(secondPhoto.owner_uuid, insertedUser.uuid);
        assert.strictHasMany(insertedUser.photos, [insertedPhoto, secondPhoto]);
      });

      test("New model can have relationship set afterwards and it sends the right data to the server during post", async function (assert) {
        let { Server, RESTPhoto, RESTUser } = setupRESTModels();
        this.Server = Server;

        let user = await RESTUser.insert({ first_name: "Izel" });
        let firstPhoto = RESTPhoto.build({ name: "Dinner photo", owner_uuid: user.uuid });
        let secondPhoto = RESTPhoto.build({ name: "Second photo" });

        assert.equal(firstPhoto.user, null);
        assert.equal(secondPhoto.user, null);
        assert.ok(user.photos instanceof RelationshipPromise);

        let insertedPhoto = await RESTPhoto.insert(firstPhoto);

        assert.strictEqual(firstPhoto, insertedPhoto);
        assert.equal(firstPhoto.user, null);
        assert.equal(insertedPhoto.user, null);
        assert.ok(user.photos instanceof RelationshipPromise);
        assert.hasMany(await user.photos, [insertedPhoto]);

        secondPhoto.owner_uuid = user.uuid;

        let secondInsertedPhoto = await RESTPhoto.insert(secondPhoto);

        assert.hasMany(user.photos, [insertedPhoto, secondInsertedPhoto]);
        assert.strictEqual(secondInsertedPhoto, secondPhoto);
        assert.strictEqual(secondInsertedPhoto.owner, user);
        assert.equal(secondInsertedPhoto.owner_uuid, user.uuid);

        firstPhoto.owner_uuid = user.uuid;

        assert.hasMany(user.photos, [insertedPhoto, secondInsertedPhoto]);
        assert.strictEqual(firstPhoto.owner, user);
        assert.hasMany(user.photos, [insertedPhoto, secondInsertedPhoto]);
      });

      test("Fetched model can request the relationship(without embed) and change the relationship before update", async function (assert) {
        let { Server, RESTPhoto, RESTUser } = setupRESTModels();
        this.Server = Server;

        let user = await RESTUser.insert({ first_name: "Izel" });
        let photo = await RESTPhoto.insert({ name: "Dinner photo", owner: user });
        let secondPhoto = RESTPhoto.build({ name: "Second photo" });

        assert.strictEqual(photo.owner, user);
        assert.equal(photo.owner_uuid, user.uuid);
        assert.ok(user.photos instanceof RelationshipPromise);
        assert.hasMany(await user.photos, [photo]);

        let lastFirstPhoto = user.photos[0];
        let fetchedPhoto = await RESTPhoto.find(photo.uuid);

        assert.strictEqual(fetchedPhoto.owner, user);
        assert.equal(fetchedPhoto.owner_uuid, user.uuid);
        assert.strictHasMany(user.photos, [fetchedPhoto]);

        let newUser = RESTUser.build({ first_name: "Brendan" });

        fetchedPhoto.owner = newUser;

        assert.strictEqual(fetchedPhoto.owner, newUser);
        assert.equal(fetchedPhoto.owner_uuid, newUser.uuid);
        assert.strictHasMany(user.photos, [lastFirstPhoto]);

        assert.ok(newUser.photos instanceof RelationshipPromise);
        assert.hasMany(await newUser.photos, []);
        assert.strictHasMany(user.photos, [lastFirstPhoto]);

        let updatedPhoto = await RESTPhoto.update(fetchedPhoto);

        assert.strictEqual(fetchedPhoto, updatedPhoto);
        assert.strictEqual(updatedPhoto.owner, newUser);
        assert.equal(updatedPhoto.owner_uuid, newUser.uuid);
        assert.strictHasMany(newUser.photos, [updatedPhoto]);
        assert.strictHasMany(user.photos, []);
      });

      test("Fetched model can remove the relationship before update", async function (assert) {
        let { Server, RESTPhoto, RESTUser } = setupRESTModels();
        this.Server = Server;

        let user = await RESTUser.insert({ first_name: "Izel" });
        let photo = await RESTPhoto.insert({ name: "Dinner photo", owner_uuid: user.uuid });

        assert.strictEqual(photo.owner, user);

        let fetchedPhoto = await RESTPhoto.find(photo.uuid);

        assert.notStrictEqual(fetchedPhoto, photo);
        assert.strictEqual(fetchedPhoto.owner, user);
        assert.equal(fetchedPhoto.owner_uuid, user.uuid);
        assert.strictEqual(photo.owner, user);
        assert.equal(photo.owner_uuid, user.uuid);
        assert.ok(user.photos instanceof RelationshipPromise);
        assert.equal(InstanceDB.getReferences(photo).size, 3);
        assert.hasMany(await user.photos, [fetchedPhoto]); // NOTE: This generates one extra instance due to peekAll(), but it is actually fetchedPhoto(?)

        let lastFetchedPhoto = user.photos[0];

        assert.notStrictEqual(lastFetchedPhoto, fetchedPhoto);
        assert.equal(InstanceDB.getReferences(photo).size, 4);

        fetchedPhoto.owner_uuid = null;

        assert.equal(fetchedPhoto.owner, null);
        assert.equal(fetchedPhoto.owner_uuid, null);

        assert.equal(InstanceDB.getReferences(photo).size, 4);
        assert.strictHasMany(user.photos, [lastFetchedPhoto]); // NOTE: make this strict
        assert.equal(InstanceDB.getReferences(photo).size, 4);

        let updatedPhoto = await RESTPhoto.update(fetchedPhoto);

        assert.strictEqual(updatedPhoto, fetchedPhoto);
        assert.equal(updatedPhoto.user, null);
        assert.equal(updatedPhoto.user_uuid, null);
        assert.strictHasMany(user.photos, []); // NOTE: make this strict
      });

      test("Fetched model can remove the relationship before delete", async function (assert) {
        let { Server, RESTPhoto, RESTUser } = setupRESTModels();
        this.Server = Server;

        let user = await RESTUser.insert({ first_name: "Izel" });
        let photo = await RESTPhoto.insert({ name: "Dinner photo", owner_uuid: user.uuid });

        assert.strictEqual(photo.owner, user);

        let fetchedPhoto = await RESTPhoto.find(photo.uuid);

        assert.strictEqual(fetchedPhoto.owner, user);
        assert.equal(fetchedPhoto.owner_uuid, user.uuid);
        assert.ok(user.photos instanceof RelationshipPromise);
        assert.hasMany(await user.photos, [fetchedPhoto]);

        fetchedPhoto.owner_uuid = null;

        assert.equal(fetchedPhoto.owner, null);
        assert.equal(fetchedPhoto.owner_uuid, null);
        assert.hasMany(user.photos, [photo]); // NOTE: make this strict

        let deletedPhoto = await RESTPhoto.delete(fetchedPhoto);

        assert.deepEqual(deletedPhoto.toJSON(), fetchedPhoto.toJSON());
        assert.equal(deletedPhoto.owner, null);
        assert.equal(deletedPhoto.owner_uuid, null);
        assert.equal(fetchedPhoto.owner, null);
        assert.equal(fetchedPhoto.owner_uuid, null);
        assert.strictHasMany(user.photos, []);
      });

      test("Fallback behavior for fkey mutations clear the HasManyArray when there is cached & persisted but no instances of the reference with fkey pointing to it", async function (assert) {
        let { Server, RESTPhoto, RESTUser } = setupRESTModels();
        this.Server = Server;

        let user = await RESTUser.insert({ first_name: "Izel" });
        let photo = await RESTPhoto.insert({ name: "Dinner photo", owner_uuid: user.uuid });

        assert.strictEqual(photo.owner, user);

        let fetchedPhoto = await RESTPhoto.find(photo.uuid);

        assert.strictEqual(fetchedPhoto.owner, user);
        assert.equal(fetchedPhoto.owner_uuid, user.uuid);
        assert.ok(user.photos instanceof RelationshipPromise);
        assert.hasMany(await user.photos, [fetchedPhoto]);

        let lastFetchedPhoto = user.photos[0];

        lastFetchedPhoto.owner_uuid = null;

        assert.equal(lastFetchedPhoto.owner, null);
        assert.equal(lastFetchedPhoto.owner_uuid, null);
        assert.strictHasMany(user.photos, [fetchedPhoto]);

        fetchedPhoto.owner_uuid = null;

        assert.equal(photo.owner, user);
        assert.equal(photo.owner_uuid, user.uuid);
        assert.strictHasMany(user.photos, [photo]);
      });
    });

    module(
      "Reverse side mutations: Changing relationship across different relationship instance assignments then commit tests",
      function () {
        test("When related models reflective relationships are completely cleared it doesnt clear the foreign key, just the relationship(previous pointers) of and to the model", async function (assert) {
          let { Server, RESTPhoto, RESTUser } = setupRESTModels();
          this.Server = Server;

          let user = await RESTUser.insert({ first_name: "Izel" });
          let secondUser = await RESTUser.insert({ first_name: "John" });
          let thirdUser = RESTUser.build({ uuid: FIRST_TARGET_UUID, name: "Third user" });

          let photo = await RESTPhoto.insert({ name: "Dinner photo", owner_uuid: user.uuid });

          assert.equal(photo.owner_uuid, user.uuid);
          assert.strictEqual(photo.owner, user);
          assert.hasMany(await user.photos, [photo]);

          let lastFetchedPhoto = user.photos[0];

          user.photos = [];

          assert.strictHasMany(user.photos, []);
          assert.equal(lastFetchedPhoto.owner_uuid, user.uuid);
          assert.notStrictEqual(lastFetchedPhoto.owner, user);
          assert.deepEqual(lastFetchedPhoto.owner.toJSON(), RESTUser.Cache.get(user.uuid).toJSON());
          assert.strictHasMany(user.photos, []);

          secondUser.photos = [lastFetchedPhoto];

          assert.strictHasMany(secondUser.photos, [lastFetchedPhoto]);
          assert.strictEqual(lastFetchedPhoto.owner, secondUser);
          assert.equal(lastFetchedPhoto.owner_uuid, secondUser.uuid);
          assert.strictHasMany(user.photos, []);

          secondUser.photos.clear();

          assert.strictHasMany(secondUser.photos, []);
          assert.strictHasMany(user.photos, []);
          assert.equal(lastFetchedPhoto.owner_uuid, secondUser.uuid);
          assert.notStrictEqual(lastFetchedPhoto.owner, secondUser);
          assert.deepEqual(lastFetchedPhoto.owner.toJSON(), secondUser.toJSON());

          thirdUser.photos = [lastFetchedPhoto];

          assert.strictHasMany(thirdUser.photos, [lastFetchedPhoto]);
          assert.strictEqual(lastFetchedPhoto.owner, thirdUser);
          assert.equal(lastFetchedPhoto.owner_uuid, thirdUser.uuid);
          assert.strictHasMany(user.photos, []);
          assert.strictHasMany(secondUser.photos, []);

          thirdUser.photos.clear();

          assert.strictHasMany(thirdUser.photos, []);
          assert.strictHasMany(secondUser.photos, []);
          assert.strictHasMany(user.photos, []);
          assert.equal(lastFetchedPhoto.owner_uuid, thirdUser.uuid);
          assert.ok(lastFetchedPhoto.owner instanceof RelationshipPromise);
          assert.equal(await lastFetchedPhoto.owner, null);

          let insertedThirdUser = await RESTUser.insert(thirdUser);

          assert.equal(lastFetchedPhoto.owner_uuid, insertedThirdUser.uuid);
          assert.strictEqual(lastFetchedPhoto.owner, insertedThirdUser);
          assert.hasMany(await lastFetchedPhoto.owner.photos, [lastFetchedPhoto]);
        });
      }
    );

    module(
      "CRUD: Relationship mutations and commit tests on models full lifecycle: Mutations on all sides",
      function () {
        test("Model can be built, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
          let { Server, RESTUser, RESTPhoto } = setupRESTModels();
          this.Server = Server;

          let firstPhoto = await RESTPhoto.insert({ name: "First photo" });
          let secondPhoto = await RESTPhoto.insert({ name: "Second photo" });
          let user = RESTUser.build({ first_name: "Izels", photos: [secondPhoto] });

          assert.strictHasMany(user.photos, [secondPhoto]);
          assert.equal(secondPhoto.owner_uuid, null);

          firstPhoto.owner = user; // NOTE: this should trigger a logical warning(!!) setting user to firstPhoto but secondPhoto already has user as well(?) clean that first(?)

          assert.strictEqual(firstPhoto.owner, user);
          assert.equal(firstPhoto.owner_uuid, null);
          assert.equal(secondPhoto.owner, user);
          assert.equal(secondPhoto.owner_uuid, null);
          assert.strictHasMany(user.photos, [secondPhoto, firstPhoto]);

          let insertedUser = await RESTUser.insert(user);

          assert.strictEqual(user, insertedUser);
          assert.strictHasMany(insertedUser.photos, [secondPhoto, firstPhoto]);
          assert.strictEqual(firstPhoto.owner, insertedUser);
          assert.equal(firstPhoto.owner_uuid, insertedUser.uuid);
          assert.strictEqual(secondPhoto.owner, insertedUser);
          assert.equal(secondPhoto.owner_uuid, insertedUser.uuid);

          secondPhoto.owner_uuid = insertedUser.uuid;

          assert.strictHasMany(insertedUser.photos, [secondPhoto, firstPhoto]);

          let updatedUser = await RESTUser.update(insertedUser);

          assert.strictEqual(insertedUser, updatedUser);
          assert.strictHasMany(updatedUser.photos, [secondPhoto, firstPhoto]);
          assert.strictEqual(firstPhoto.owner, updatedUser);
          assert.equal(firstPhoto.owner_uuid, updatedUser.uuid);
          assert.strictEqual(secondPhoto.owner, updatedUser);
          assert.equal(secondPhoto.owner_uuid, updatedUser.uuid);

          updatedUser.photos = [secondPhoto];

          assert.strictHasMany(updatedUser.photos, [secondPhoto]);
          assert.equal(RelationshipDB.has(firstPhoto, "owner"), false);
          assert.notStrictEqual(firstPhoto.owner, updatedUser);
          assert.deepEqual(firstPhoto.owner.toJSON(), updatedUser.toJSON());
          assert.equal(firstPhoto.owner_uuid, updatedUser.uuid);
          assert.equal(RelationshipDB.has(firstPhoto.owner, "photos"), false);

          assert.strictEqual(secondPhoto.owner, updatedUser);
          assert.equal(secondPhoto.owner_uuid, updatedUser.uuid);
          assert.equal(RelationshipDB.has(firstPhoto.owner, "photos"), false);

          assert.strictHasMany(updatedUser.photos, [secondPhoto]);

          secondPhoto.owner = null; // NOTE: Where does this come from?

          assert.equal(RelationshipDB.has(firstPhoto.owner, "photos"), false);
          assert.notStrictEqual(firstPhoto.owner, updatedUser);
          assert.deepEqual(firstPhoto.owner.toJSON(), updatedUser.toJSON());
          assert.equal(firstPhoto.owner_uuid, updatedUser.uuid);
          assert.equal(secondPhoto.owner, null);
          assert.equal(secondPhoto.owner_uuid, null);

          assert.strictHasMany(user.photos, []);
          assert.strictHasMany(updatedUser.photos, []);
          assert.strictHasMany(insertedUser.photos, []);

          let deletedUser = await RESTUser.delete(updatedUser);

          assert.deepEqual(updatedUser.photos, []); // NOTE: this is not null, but removed stuff
          assert.deepEqual(deletedUser.photos, []);
          assert.equal(secondPhoto.owner, null);
          assert.equal(secondPhoto.owner_uuid, null);
          assert.equal(firstPhoto.owner, null);
          assert.equal(firstPhoto.owner_uuid, null);
        });

        test("Reverse relationship can be built, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
          let { Server, RESTPhoto, RESTUser } = setupRESTModels();
          this.Server = Server;

          let firstUser = await RESTUser.insert({ first_name: "Izel" });
          let secondUser = await RESTUser.insert({ first_name: "John" });
          let photo = RESTPhoto.build({ name: "Dinner photo", owner: secondUser });

          assert.strictEqual(photo.owner, secondUser);
          assert.equal(photo.owner_uuid, secondUser.uuid);

          photo.owner_uuid = firstUser.uuid;

          assert.strictEqual(photo.owner, firstUser);
          assert.equal(photo.owner_uuid, firstUser.uuid);
          assert.hasMany(await firstUser.photos, []);
          assert.ok(secondUser.photos instanceof RelationshipPromise);

          let insertedPhoto = await RESTPhoto.insert(photo);

          assert.strictEqual(photo, insertedPhoto);
          assert.strictEqual(insertedPhoto.owner, firstUser);
          assert.equal(insertedPhoto.owner_uuid, firstUser.uuid);
          assert.strictHasMany(firstUser.photos, [insertedPhoto]);
          assert.ok(secondUser.photos instanceof RelationshipPromise);

          insertedPhoto.owner_uuid = secondUser.uuid;

          assert.strictEqual(insertedPhoto.owner, secondUser);
          assert.equal(insertedPhoto.owner_uuid, secondUser.uuid);
          assert.hasMany(await secondUser.photos, []);
          assert.hasMany(firstUser.photos, []);

          let updatedPhoto = await RESTPhoto.update(insertedPhoto);

          assert.strictEqual(insertedPhoto, updatedPhoto);
          assert.strictEqual(updatedPhoto.owner, secondUser);
          assert.strictEqual(updatedPhoto.owner_uuid, secondUser.uuid);
          assert.strictHasMany(secondUser.photos, [updatedPhoto]);
          assert.hasMany(firstUser.photos, []);

          updatedPhoto.owner_uuid = null;

          assert.equal(updatedPhoto.owner, null);
          assert.equal(updatedPhoto.owner_uuid, null);
          assert.hasMany(secondUser.photos, []);
          assert.hasMany(firstUser.photos, []);

          let deletedPhoto = await RESTPhoto.delete(updatedPhoto);

          assert.equal(updatedPhoto.owner, null);
          assert.equal(deletedPhoto.owner, null);
          assert.equal(deletedPhoto.owner_uuid, null);
          assert.hasMany(secondUser.photos, []);
        });

        test("Model can be fetched, created, updated, deleted with correct changing relationships in one flow", async function (assert) {
          let { Server, MemoryUser, RESTPhoto, RESTUser } = setupRESTModels();
          this.Server = Server;

          MemoryUser.cache([
            {
              uuid: FIRST_TARGET_UUID,
              first_name: "Izel",
            },
            {
              uuid: SECOND_TARGET_UUID,
              first_name: "John",
            },
          ]);

          let firstUser = await RESTUser.find(FIRST_TARGET_UUID);
          let secondUser = await RESTUser.find(SECOND_TARGET_UUID);
          let photo = RESTPhoto.build({ name: "Dinner photo", owner: secondUser });

          assert.strictEqual(photo.owner, secondUser);
          assert.equal(photo.owner_uuid, secondUser.uuid);
          assert.hasMany(await secondUser.photos, []);

          photo.owner_uuid = firstUser.uuid;

          assert.strictEqual(photo.owner, firstUser);
          assert.equal(photo.owner_uuid, firstUser.uuid);
          assert.hasMany(await firstUser.photos, []);
          assert.hasMany(secondUser.photos, []);

          let insertedPhoto = await RESTPhoto.insert(photo);

          assert.strictEqual(photo, insertedPhoto);
          assert.strictEqual(insertedPhoto.owner, firstUser);
          assert.equal(insertedPhoto.owner_uuid, firstUser.uuid);
          assert.strictHasMany(firstUser.photos, [insertedPhoto]);
          assert.hasMany(secondUser.photos, []);

          insertedPhoto.owner_uuid = secondUser.uuid;

          assert.notStrictEqual(insertedPhoto.owner, firstUser);
          assert.equal(insertedPhoto.owner_uuid, secondUser.uuid);
          assert.hasMany(secondUser.photos, []);
          assert.hasMany(firstUser.photos, []);

          let updatedPhoto = await RESTPhoto.update(insertedPhoto);

          assert.strictEqual(insertedPhoto, updatedPhoto);
          assert.strictEqual(updatedPhoto.owner, secondUser);
          assert.strictHasMany(secondUser.photos, [updatedPhoto]);
          assert.hasMany(firstUser.photos, []);

          updatedPhoto.owner_uuid = null;

          assert.equal(updatedPhoto.owner, null);
          assert.equal(updatedPhoto.owner_uuid, null);
          assert.hasMany(secondUser.photos, []);
          assert.hasMany(firstUser.photos, []);

          let deletedPhoto = await RESTPhoto.delete(updatedPhoto);

          assert.equal(updatedPhoto.owner, null);
          assert.equal(deletedPhoto.owner, null);
          assert.equal(deletedPhoto.owner_uuid, null);
          assert.equal(secondUser.photo, null);
        });

        test("Deleting a related model should delete the models relationship references", async function (assert) {
          let { Server, RESTPhoto, RESTUser } = setupRESTModels();
          this.Server = Server;

          let photo = await RESTPhoto.insert({ uuid: FIRST_TARGET_UUID, name: "Dinner photo" });
          let user = RESTUser.build({ first_name: "Izel", photos: [photo] });

          assert.equal(photo.owner_uuid, user.uuid);
          assert.strictHasMany(user.photos, [photo]);

          await RESTPhoto.delete(photo);

          assert.hasMany(user.photos, []);
          assert.equal(photo.owner_uuid, null);
        });

        test("Models empty relationship reference can turn to promise, incorrectly fetched(with server error), than can be retried to fetch correctly", async function (assert) {
          assert.expect(11);

          let { Server, RESTUser, RESTPhoto, MemoryPhoto } = setupRESTModels();
          this.Server = Server;

          let user = RESTUser.build({ uuid: FIRST_TARGET_UUID, first_name: "Izel" });

          this.Server.get("/photos", async ({ params }) => {
            return ServerResponse(401, { message: "Not authorized" });
          });

          try {
            await user.photos;
          } catch (error) {
            assert.ok(error instanceof UnauthorizedError);
            assert.equal(
              error.message,
              `Server responds with unauthorized access to GET ${HTTP.host}/photos?owner_uuid=${FIRST_TARGET_UUID}`
            );
          }

          assert.ok(user.photos instanceof RelationshipPromise);
          assert.deepEqual(user.errors, []);

          this.Server.get("/photos", async ({ params }) => {
            return ServerResponse(404, { message: "Not found this record" });
          });

          try {
            await user.photos;
          } catch (error) {
            assert.ok(error instanceof NotFoundError);
            assert.equal(
              error.message,
              `Server responded with not found for GET ${HTTP.host}/photos?owner_uuid=${FIRST_TARGET_UUID}`
            );
          }

          assert.ok(user.photos instanceof RelationshipPromise);
          assert.deepEqual(user.errors, []);

          await MemoryPhoto.insert({ uuid: SECOND_TARGET_UUID, name: "Dinner photo", owner_uuid: user.uuid });

          this.Server.get("/photos", async ({ queryParams }) => {
            let photos = await MemoryPhoto.findAll(queryParams);

            return { photos: MemoryPhoto.serializer(photos) };
          });

          let result = await user.photos.reload();

          assert.deepEqual(
            result.map((photo) => photo.toJSON()),
            [RESTPhoto.peek(SECOND_TARGET_UUID).toJSON()]
          );
          assert.equal(user.photos[0].name, "Dinner photo");
          assert.equal(user.photos[0].owner_uuid, user.uuid);
        });
      }
    );
  }
);
