import Model, { DB, Column, PrimaryGeneratedColumn, RuntimeError } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";
import SQLAdapter from "../helpers/sql-adapter.js";
import generateModels from "../helpers/models-with-relations/sql/mix/index.js";
import FIXTURES from "../helpers/fixtures/mix/index.js"

const { PHOTOS, PHOTO_COMMENTS } = FIXTURES;

module("@memoria/adapters | SQLAdapter | Peek API", function (hooks) {
  setupMemoria(hooks);

  hooks.beforeEach(async function() {
    await DB.resetRecords();
  });

  module('$Model.peek() tests', function() {
    test("$Model.peek() throws without a number id or ids", async function (assert) {
      const { SQLPhoto, SQLPhotoComment } = generateModels();
      await DB.resetRecords();

      await Promise.all(PHOTOS.map((photo) => SQLPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => SQLPhotoComment.insert(photoComment)));

      const array = [null, undefined, "", "1", true, {}];

      await Promise.all(
        array.map(async (param) => {
          try {
            SQLPhoto.peek(param);
          } catch (error) {
            assert.ok(error instanceof RuntimeError);
          }
          try {
            SQLPhotoComment.peek(param);
          } catch (error) {
            assert.ok(error instanceof RuntimeError);
          }
        })
      );
    });

    test("$Model.peek(id) works for different models", async function (assert) {
      const { SQLPhoto } = generateModels();
      await DB.resetRecords();

      await Promise.all(PHOTOS.map((photo) => SQLPhoto.insert(photo)));

      assert.propEqual(SQLPhoto.peek(1), SQLPhoto.build({
        id: 1,
        name: "Ski trip",
        href: "ski-trip.jpeg",
        is_public: false,
      }));
      assert.propEqual(SQLPhoto.peek(3), SQLPhoto.build({
        id: 3,
        name: "Selfie",
        href: "selfie.jpeg",
        is_public: false,
      }));
    });

    test("$Model.peek(id) gets a new instance each time", async function (assert) {
      const { SQLPhoto } = generateModels();
      await DB.resetRecords();

      await Promise.all(PHOTOS.map((photo) => SQLPhoto.insert(photo)));

      let firstModel = SQLPhoto.peek(1);
      assert.propEqual(firstModel, SQLPhoto.build({
        id: 1,
        name: "Ski trip",
        href: "ski-trip.jpeg",
        is_public: false,
      }));
      assert.deepEqual([firstModel.isNew, firstModel.isPersisted], [false, true]);

      let secondModel = SQLPhoto.peek(1);
      assert.notEqual(firstModel, secondModel);
      assert.deepEqual([secondModel.isNew, secondModel.isPersisted], [false, true]);

      secondModel.name = 'Some name';

      let thirdModel = SQLPhoto.peek(1);
      assert.propEqual(thirdModel, SQLPhoto.build({
        id: 1,
        name: "Ski trip",
        href: "ski-trip.jpeg",
        is_public: false,
      }));
      assert.propEqual(secondModel, SQLPhoto.build({
        id: 1,
        name: "Some name",
        href: "ski-trip.jpeg",
        is_public: false,
      }));
      assert.notEqual(secondModel, thirdModel);
      assert.deepEqual([thirdModel.isNew, thirdModel.isPersisted], [false, true]);
    });

    test("$Model.peek(ids) works for multiple ids", async function (assert) {
      const { SQLPhoto } = generateModels();
      await DB.resetRecords();

      await Promise.all(PHOTOS.map((photo) => SQLPhoto.insert(photo)));

      assert.propEqual(SQLPhoto.peek([1, 3]), [
        SQLPhoto.build({ id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false }),
        SQLPhoto.build({ id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false })
      ]);
      assert.propEqual(SQLPhoto.peek([2, 3]), [
        SQLPhoto.build({ id: 2, name: "Family photo", href: "family-photo.jpeg", is_public: true }),
        SQLPhoto.build({ id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false })
      ]);
    });

    test("$Model.peek(ids) get a new instances each time", async function (assert) {
      const { SQLPhoto } = generateModels();
      await DB.resetRecords();

      await Promise.all(PHOTOS.map((photo) => SQLPhoto.insert(photo)));

      let firstModels = SQLPhoto.peek([1, 3]);
      assert.deepEqual(firstModels, [
        SQLPhoto.build({ id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false }),
        SQLPhoto.build({ id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false })
      ]);
      assert.deepEqual([firstModels[0].isNew, firstModels[0].isPersisted], [false, true]);
      assert.deepEqual([firstModels[1].isNew, firstModels[1].isPersisted], [false, true]);

      let secondModels = SQLPhoto.peek([1, 3]);
      assert.notEqual(firstModels, secondModels);
      assert.propEqual(secondModels, [
        SQLPhoto.build({ id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false }),
        SQLPhoto.build({ id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false })
      ]);
      assert.deepEqual([secondModels[0].isNew, secondModels[0].isPersisted], [false, true]);
      assert.deepEqual([secondModels[1].isNew, secondModels[1].isPersisted], [false, true]);

      secondModels[0].name = 'Some name';

      let thirdModels = SQLPhoto.peek([1, 3]);
      assert.deepEqual(secondModels, [
        SQLPhoto.build({ id: 1, name: "Some name", href: "ski-trip.jpeg", is_public: false }),
        SQLPhoto.build({ id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false })
      ]);
      assert.deepEqual(thirdModels, [
        SQLPhoto.build({ id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false }),
        SQLPhoto.build({ id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false })
      ]);
      assert.notDeepEqual(secondModels, thirdModels);
      assert.deepEqual([thirdModels[0].isNew, thirdModels[0].isPersisted], [false, true]);
      assert.deepEqual([thirdModels[1].isNew, thirdModels[1].isPersisted], [false, true]);
    });
  });

  module('$Model.peekBy() tests', function() {
    test("$Model.peekBy(attributes) returns a single model for the options", async function (assert) {
      const { SQLPhoto, SQLPhotoComment } = generateModels();
      await DB.resetRecords();

      const firstPhoto = SQLPhoto.build({ id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false });

      await Promise.all(PHOTOS.map((photo) => SQLPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => SQLPhotoComment.insert(photoComment)));

      assert.propEqual(SQLPhoto.peekBy({ is_public: false }), firstPhoto);
      assert.propEqual(SQLPhoto.peekBy(firstPhoto), firstPhoto);
      assert.propEqual(SQLPhoto.peekBy({ name: "Family photo", href: "family-photo.jpeg" }), SQLPhoto.build({
        id: 2,
        name: "Family photo",
        href: "family-photo.jpeg",
        is_public: true,
      }));
      assert.propEqual(SQLPhotoComment.peekBy({ uuid: "d351963d-e725-4092-a37c-1ca1823b57d3" }), SQLPhotoComment.build({
        uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
        content: "I was kidding",
        is_important: true,
        inserted_at: "2015-10-25T20:54:04.447Z",
        updated_at: "2015-10-25T20:54:04.447Z",
        updated_at: "2015-10-25T20:54:04.447Z",
        photo_id: 1,
        user_id: 1,
      }));
    });

    test("$Model.peekBy(attributes) returns a new instance from the actual cache each time", async function (assert) {
      const { SQLPhoto } = generateModels();
      await DB.resetRecords();

      const firstPhoto = SQLPhoto.build({
        id: 1,
        name: "Ski trip",
        href: "ski-trip.jpeg",
        is_public: false,
        owner_id: null,
        group_uuid: null
      });

      await Promise.all(PHOTOS.map((photo) => SQLPhoto.insert(photo)));

      let firstResponse = SQLPhoto.peekBy({ name: "Ski trip" });
      assert.propContains(firstResponse, firstPhoto);
      assert.deepEqual([firstResponse.isNew, firstResponse.isPersisted], [false, true]);

      let secondResponse = SQLPhoto.peekBy({ name: "Ski trip" });
      assert.notEqual(firstResponse, secondResponse);
      assert.propContains(secondResponse, firstPhoto);
      assert.deepEqual([secondResponse.isNew, secondResponse.isPersisted], [false, true]);

      secondResponse.name = 'Some unique name';

      assert.equal(SQLPhoto.peekBy({ name: "Some unique name" }), null);

      let thirdResponse = SQLPhoto.peekBy({ name: "Ski trip" });
      assert.notEqual(thirdResponse, firstPhoto);
      assert.propContains(thirdResponse, firstPhoto);
      assert.propContains(thirdResponse, firstResponse);
      assert.deepEqual([thirdResponse.isNew, thirdResponse.isPersisted], [false, true]);
    });
  });

  module('$Model.peekAll() tests', function() {
    test("$Model.peekAll() without parameters returns all the models in the database", async function (assert) {
      const { SQLPhoto, SQLPhotoComment } = generateModels();
      await DB.resetRecords();

      await Promise.all(PHOTOS.map((photo) => SQLPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => SQLPhotoComment.insert(photoComment)));

      assert.propEqual(SQLPhoto.peekAll().sort((x, y) => x.id - y.id), [
        SQLPhoto.build({
          id: 1,
          name: "Ski trip",
          href: "ski-trip.jpeg",
          is_public: false,
        }),
        SQLPhoto.build({
          id: 2,
          name: "Family photo",
          href: "family-photo.jpeg",
          is_public: true,
        }),
        SQLPhoto.build({
          id: 3,
          name: "Selfie",
          href: "selfie.jpeg",
          is_public: false,
        }),
      ]);
      assert.propEqual(SQLPhotoComment.peekAll().sort((a, b) => (a.uuid > b.uuid ? 1 : -1)), [
        SQLPhotoComment.build({
          uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
          content: "Interesting indeed",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 2,
          user_id: 1,
        }),
        SQLPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        SQLPhotoComment.build({
          uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
          content: "I agree",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 2,
        }),
        SQLPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
      ]);
    });

    test("$Model.peekAll(attributes) returns right models in the database", async function (assert) {
      const { SQLPhoto, SQLPhotoComment } = generateModels();
      await DB.resetRecords();

      await Promise.all(PHOTOS.map((photo) => SQLPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => SQLPhotoComment.insert(photoComment)));

      assert.propEqual(SQLPhoto.peekAll({ is_public: false }), [
        SQLPhoto.build({
          id: 1,
          name: "Ski trip",
          href: "ski-trip.jpeg",
          is_public: false,
        }),
        SQLPhoto.build({
          id: 3,
          name: "Selfie",
          href: "selfie.jpeg",
          is_public: false,
        }),
      ]);
      assert.propEqual(SQLPhotoComment.peekAll({ photo_id: 1, user_id: 1 }), [
        SQLPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        SQLPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
      ]);
      assert.propEqual(SQLPhotoComment.peekAll({ user_id: 1 }), [
        SQLPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        SQLPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        SQLPhotoComment.build({
          uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
          content: "Interesting indeed",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 2,
          user_id: 1,
        }),
      ]);
    });

    test("$Model.peekAll(attributes) returns a new instance from the actual cache each time", async function (assert) {
      const { SQLPhotoComment } = generateModels();
      await DB.resetRecords();

      await Promise.all(PHOTO_COMMENTS.map((photo) => SQLPhotoComment.insert(photo)));

      let firstModels = SQLPhotoComment.peekAll({ photo_id: 1, user_id: 1 })
        .sort((a, b) => (a.uuid > b.uuid ? 1 : -1));
      assert.propEqual(firstModels, [
        SQLPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        SQLPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
      ]);
      assert.deepEqual([firstModels[0].isNew, firstModels[0].isPersisted], [false, true]);
      assert.deepEqual([firstModels[1].isNew, firstModels[1].isPersisted], [false, true]);

      let secondModels = SQLPhotoComment.peekAll({ photo_id: 1, user_id: 1 })
        .sort((a, b) => (a.uuid > b.uuid ? 1 : -1));
      assert.notEqual(firstModels, secondModels);
      assert.propEqual(secondModels, [
        SQLPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        SQLPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        })
      ]);
      assert.deepEqual([secondModels[0].isNew, secondModels[0].isPersisted], [false, true]);
      assert.deepEqual([secondModels[1].isNew, secondModels[1].isPersisted], [false, true]);

      secondModels[0].content = 'Whatever';

      let thirdModels = SQLPhotoComment.peekAll({ photo_id: 1, user_id: 1 })
        .sort((a, b) => (a.uuid > b.uuid ? 1 : -1));
      assert.propEqual(secondModels, [
        SQLPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "Whatever",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        SQLPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        })
      ]);
      assert.propEqual(thirdModels, [
        SQLPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        SQLPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        })
      ]);
      assert.notPropEqual(secondModels, thirdModels);
      assert.deepEqual([thirdModels[0].isNew, thirdModels[0].isPersisted], [false, true]);
      assert.deepEqual([thirdModels[1].isNew, thirdModels[1].isPersisted], [false, true]);
    });
  });
});
