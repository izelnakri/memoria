import Model, {
  DB,
  PrimaryGeneratedColumn,
  Column,
  DeleteError,
  RuntimeError,
  InstanceDB,
  RelationshipDB
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
        photo_id: null,
        user_id: null,
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

  module('Reference tests', function () {
    test("$Model.delete($model) creates a copied object in store and returns another copied object instead of the actual object", async function (assert) {
      const { SQLPhoto } = generateModels();
      await DB.resetRecords();

      let photo = SQLPhoto.build({ name: "some name" });

      assert.equal(InstanceDB.getReferences(photo).size, 1);

      let insertedPhoto = await SQLPhoto.insert(photo);

      assert.notEqual(insertedPhoto, photo);
      assert.propEqual(insertedPhoto, SQLPhoto.build({
        href: null,
        id: 1,
        is_public: null,
        name: "some name",
      }));
      assert.equal(InstanceDB.getReferences(photo).size, 4);
      assert.equal(InstanceDB.getReferences(photo), InstanceDB.getReferences(insertedPhoto));

      let deletedPhoto = await SQLPhoto.delete(insertedPhoto); // NOTE: this should make all same instances isPersisted = false in the future(?)

      assert.notEqual(deletedPhoto, insertedPhoto);
      assert.equal(InstanceDB.getReferences(photo).size, 0);
      assert.equal(InstanceDB.getReferences(photo), InstanceDB.getReferences(deletedPhoto));

      deletedPhoto.name = "testing the instance is just a copy";

      assert.equal(deletedPhoto.name, "testing the instance is just a copy");
      assert.notEqual(photo.name, deletedPhoto.name);
      assert.notOk(SQLPhoto.peek(photo.id));
    });

    test("$Model.delete($model) removes relationships for all references", async function (assert) {
      const { SQLGroup, SQLUser, SQLPhoto } = generateModels();
      await DB.resetRecords();

      let izel = SQLUser.build({ first_name: "Izel", last_name: "Nakri" });
      let groupPhoto = SQLPhoto.build();
      let group = SQLGroup.build({ name: "Hacker Log", owner: izel, photo: groupPhoto }); // TODO: add here also hasMany in the future and reflections

      let insertedUser = await SQLUser.insert(izel);

      assert.ok(izel.id);
      assert.deepEqual(izel, insertedUser);
      assert.equal(group.owner, insertedUser);
      assert.equal(group.owner_id, izel.id);
      assert.equal(group.photo, groupPhoto);

      let insertedGroup = await SQLGroup.insert(group);

      assert.notEqual(insertedGroup, group);
      assert.equal(insertedGroup.photo, groupPhoto);
      assert.equal(insertedGroup.owner_id, insertedUser.id);
      assert.equal(groupPhoto.group, insertedGroup);
      assert.equal(groupPhoto.group_id, insertedGroup.id);
      assert.equal(InstanceDB.getReferences(group).size, 3);

      let cachedReference = SQLGroup.Cache.get(insertedGroup.uuid);
      assert.equal(RelationshipDB.has(cachedReference, 'owner'), false);
      assert.equal(RelationshipDB.has(cachedReference, 'photo'), false);

      InstanceDB.getReferences(group).forEach((reference) => {
        if (reference !== cachedReference) {
          assert.equal(reference.owner, insertedUser);
          assert.equal(reference.photo, groupPhoto);
        }
      });

      let deletedGroup = await SQLGroup.delete(group);

      assert.notEqual(deletedGroup, group);
      assert.notEqual(deletedGroup, insertedGroup);
      assert.equal(InstanceDB.getReferences(group).size, 0);
      assert.equal(InstanceDB.getReferences(deletedGroup).size, 0);

      assert.deepEqual(deletedGroup, SQLGroup.build({
        uuid: group.uuid,
        name: "Hacker Log",
        owner: null,
        photo: null
      }));
      assert.deepEqual(insertedGroup, SQLGroup.build({
        uuid: group.uuid,
        name: "Hacker Log",
        owner: null,
        photo: null
      }));
      assert.equal(groupPhoto.group, null);
      assert.equal(groupPhoto.group_id, null);
    });
  });
});

// NOTE: $Model.delete(primaryKey) feature ?
