import Model, { DB, Column, PrimaryGeneratedColumn, RuntimeError } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";
import SQLAdapter from "../helpers/sql-adapter.js";
import generateModels from "../helpers/models-with-relations/sql/mix/index.js";
import FIXTURES from "../helpers/fixtures/mix/index.js"

const { PHOTOS, PHOTO_COMMENTS } = FIXTURES;

module("@memoria/adapters | SQLAdapter | Query API", function (hooks) {
  setupMemoria(hooks);

  hooks.beforeEach(async function() {
    await DB.resetRecords();
  });

  module('$Model.find() tests', function() {
    test("$Model.find() throws without a number id or ids", async function (assert) {
      const { SQLPhoto, SQLPhotoComment } = generateModels();
      await DB.resetRecords();

      await Promise.all(PHOTOS.map((photo) => SQLPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => SQLPhotoComment.insert(photoComment)));

      const array = [null, undefined, "", "1", true, {}];

      await Promise.all(
        array.map(async (param) => {
          try {
            await SQLPhoto.find(param);
          } catch (error) {
            assert.ok(error instanceof RuntimeError);
          }
          try {
            await SQLPhotoComment.find(param);
          } catch (error) {
            assert.ok(error instanceof RuntimeError);
          }
        })
      );
    });

    test("$Model.find(id) works for different models", async function (assert) {
      const { SQLPhoto } = generateModels();
      await DB.resetRecords();

      await Promise.all(PHOTOS.map((photo) => SQLPhoto.insert(photo)));

      assert.propEqual(await SQLPhoto.find(1), SQLPhoto.build({
        id: 1,
        name: "Ski trip",
        href: "ski-trip.jpeg",
        is_public: false,
      }));
      assert.propEqual(await SQLPhoto.find(3), SQLPhoto.build({
        id: 3,
        name: "Selfie",
        href: "selfie.jpeg",
        is_public: false,
      }));
    });

    test("$Model.find(ids) works for multiple ids", async function (assert) {
      const { SQLPhoto } = generateModels();
      await DB.resetRecords();

      await Promise.all(PHOTOS.map((photo) => SQLPhoto.insert(photo)));

      assert.propEqual(await SQLPhoto.find([1, 3]), [
        SQLPhoto.build({ id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false }),
        SQLPhoto.build({ id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false })
      ]);
      assert.propEqual(await SQLPhoto.find([2, 3]), [
        SQLPhoto.build({ id: 2, name: "Family photo", href: "family-photo.jpeg", is_public: true }),
        SQLPhoto.build({ id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false })
      ]);
    });
  });

  module('$Model.findBy() tests', function() {
    test("$Model.findBy(attributes) returns a single model for the options", async function (assert) {
      const { SQLPhoto, SQLPhotoComment } = generateModels();
      await DB.resetRecords();

      const firstPhoto = SQLPhoto.build({ id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false });

      await Promise.all(PHOTOS.map((photo) => SQLPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => SQLPhotoComment.insert(photoComment)));

      assert.propEqual(await SQLPhoto.findBy({ is_public: false }), firstPhoto);
      assert.propEqual(await SQLPhoto.findBy(firstPhoto), firstPhoto);
      assert.propEqual(await SQLPhoto.findBy({ name: "Family photo", href: "family-photo.jpeg" }), SQLPhoto.build({
        id: 2,
        name: "Family photo",
        href: "family-photo.jpeg",
        is_public: true,
      }));
      assert.propEqual(await SQLPhotoComment.findBy({ uuid: "d351963d-e725-4092-a37c-1ca1823b57d3" }), SQLPhotoComment.build({
        uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
        content: "I was kidding",
        is_important: true,
        photo_id: 1,
        user_id: 1,
      }));
    });
  });

  module('$Model.findAll() tests', function() {
    test("$Model.findAll() without parameters returns all the models in the database", async function (assert) {
      const { SQLPhoto, SQLPhotoComment } = generateModels();
      await DB.resetRecords();

      await Promise.all(PHOTOS.map((photo) => SQLPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => SQLPhotoComment.insert(photoComment)));

      assert.propEqual(await SQLPhoto.findAll(), [
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
      assert.propEqual(await SQLPhotoComment.findAll(), [
        SQLPhotoComment.build({
          uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
          content: "Interesting indeed",
          is_important: true,
          photo_id: 2,
          user_id: 1,
        }),
        SQLPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          photo_id: 1,
          user_id: 1,
        }),
        SQLPhotoComment.build({
          uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
          content: "I agree",
          is_important: true,
          photo_id: 1,
          user_id: 2,
        }),
        SQLPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          photo_id: 1,
          user_id: 1,
        }),
      ]);
    });

    test("$Model.findAll(attributes) returns right models in the database", async function (assert) {
      const { SQLPhoto, SQLPhotoComment } = generateModels();
      await DB.resetRecords();

      await Promise.all(PHOTOS.map((photo) => SQLPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => SQLPhotoComment.insert(photoComment)));

      assert.propEqual(await SQLPhoto.findAll({ is_public: false }), [
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
      assert.propEqual(await SQLPhotoComment.findAll({ photo_id: 1, user_id: 1 }), [
        SQLPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          photo_id: 1,
          user_id: 1,
        }),
        SQLPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          photo_id: 1,
          user_id: 1,
        }),
      ]);
      assert.propEqual(await SQLPhotoComment.findAll({ user_id: 1 }), [
        SQLPhotoComment.build({
          uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
          content: "Interesting indeed",
          is_important: true,
          photo_id: 2,
          user_id: 1,
        }),
        SQLPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          photo_id: 1,
          user_id: 1,
        }),
        SQLPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          photo_id: 1,
          user_id: 1,
        }),
      ]);
    });
  });
});
