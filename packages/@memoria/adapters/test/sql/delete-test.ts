import Model, {
  DB,
  PrimaryGeneratedColumn,
  Column,
  DeleteError,
  RuntimeError,
} from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";
import SQLAdapter from "../helpers/sql-adapter.js";
import generateModels from "../helpers/models-with-relations/sql/mix/index.js";
import FIXTURES from "../helpers/fixtures/mix/index.js"

const { PHOTOS, PHOTO_COMMENTS } = FIXTURES;

module("@memoria/adapters | SQLAdapter | $Model.delete()", function (hooks) {
  setupMemoria(hooks);

  module('Primary key tests', function () {
    test("$Model.delete(model) throws when the model primaryKey doesnt exist in the database", async function (assert) {
      const { SQLPhoto, SQLPhotoComment } = generateModels();
      await DB.resetRecords();

      try {
        await SQLPhoto.delete({ id: 1 });
      } catch (error) {
        assert.ok(error instanceof DeleteError);
      }
      try {
        await SQLPhotoComment.delete({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5111" });
      } catch (error) {
        assert.ok(error instanceof DeleteError);
      }

      await Promise.all(PHOTOS.map((photo) => SQLPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => SQLPhotoComment.insert(photoComment)));

      await SQLPhoto.delete({ id: 1 });

      try {
        await SQLPhoto.delete({ id: 1 });
      } catch (error) {
        assert.ok(error instanceof DeleteError);
      }
      try {
        await SQLPhotoComment.delete({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5111" });
      } catch (error) {
        assert.ok(error instanceof DeleteError);
      }
    });

    test("$Model.delete() throws when called without a parameter", async function (assert) {
      const { SQLPhoto, SQLPhotoComment } = generateModels();
      await DB.resetRecords();

      await Promise.all(PHOTOS.map((photo) => SQLPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => SQLPhotoComment.insert(photoComment)));

      try {
        await SQLPhoto.delete();
      } catch (error) {
        assert.ok(error instanceof RuntimeError);
      }
      try {
        await SQLPhotoComment.delete();
      } catch (error) {
        assert.ok(error instanceof RuntimeError);
      }
    });
  });

  module('Attribute tests', function () {
    test("$Model.delete() can delete existing items", async function (assert) {
      const { SQLPhoto, SQLPhotoComment } = generateModels();
      await DB.resetRecords();

      await Promise.all(PHOTOS.map((photo) => SQLPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => SQLPhotoComment.insert(photoComment)));

      let deletedPhoto = await SQLPhoto.delete({ id: 2 });
      assert.propEqual(deletedPhoto, SQLPhoto.build({
        id: 2,
        name: "Family photo",
        href: "family-photo.jpeg",
        is_public: true,
      }));
      assert.notOk(deletedPhoto.isNew);
      assert.ok(deletedPhoto.isPersisted);
      assert.ok(deletedPhoto.isDeleted);
      assert.notOk(deletedPhoto.isDirty);
      assert.deepEqual(deletedPhoto.changes, {});
      assert.deepEqual(deletedPhoto.revision, {
        id: 2,
        name: "Family photo",
        href: "family-photo.jpeg",
        is_public: true,
        group_uuid: null,
        owner_id: null
      });
      assert.deepEqual(deletedPhoto.revisionHistory, [
        {
          id: 2,
          name: "Family photo",
          href: "family-photo.jpeg",
          is_public: true,
          group_uuid: null,
          owner_id: null
        },
      ]);

      let deletedComment = await SQLPhotoComment.delete({
        uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
      });
      assert.propEqual(deletedComment, SQLPhotoComment.build({
        uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
        content: "What a nice photo!",
        is_important: true,
        inserted_at: deletedComment.inserted_at,
        updated_at: deletedComment.updated_at,
        photo_id: 1,
        user_id: 1,
      }));
      assert.ok(!deletedComment.isNew && !deletedComment.isDirty && deletedComment.isDeleted);

      await SQLPhotoComment.delete({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29" });

      assert.propEqual(await SQLPhoto.findAll(), [
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
      assert.propEqual(await SQLPhotoComment.findAll(), [
        SQLPhotoComment.build({
          uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
          content: "I agree",
          is_important: true,
          inserted_at: deletedComment.inserted_at,
          updated_at: deletedComment.updated_at,
          photo_id: 1,
          user_id: 2,
        }),
        SQLPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          inserted_at: deletedComment.inserted_at,
          updated_at: deletedComment.updated_at,
          photo_id: 1,
          user_id: 1,
        }),
      ]);
    });
  });
});

// NOTE: $Model.delete(primaryKey) feature ?
