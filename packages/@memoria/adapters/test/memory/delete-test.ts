import { module, test } from "qunitx";
import { DeleteError, RuntimeError, InstanceDB, RelationshipDB } from "@memoria/model";
import setupMemoria from "../helpers/setup-memoria.js";
import FIXTURES from "../helpers/fixtures/mix/index.js";
import generateModels from "../helpers/models-with-relations/memory/mix/index.js";

const { PHOTOS, PHOTO_COMMENTS } = FIXTURES;

module("@memoria/adapters | MemoryAdapter | $Model.delete()", function (hooks) {
  setupMemoria(hooks);

  module("Primary key tests", function () {
    test("$Model.delete(model) throws when the model primaryKey doesnt exist in the database", async function (assert) {
      const { MemoryPhoto, MemoryPhotoComment } = generateModels();

      try {
        await MemoryPhoto.delete({ id: 1 });
      } catch (error) {
        assert.ok(error instanceof DeleteError);
      }
      try {
        await MemoryPhotoComment.delete({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5111" });
      } catch (error) {
        assert.ok(error instanceof DeleteError);
      }

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => MemoryPhotoComment.insert(photoComment)));

      await MemoryPhoto.delete({ id: 1 });

      try {
        await MemoryPhoto.delete({ id: 1 });
      } catch (error) {
        assert.ok(error instanceof DeleteError);
      }
      try {
        await MemoryPhotoComment.delete({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5111" });
      } catch (error) {
        assert.ok(error instanceof DeleteError);
      }
    });

    test("$Model.delete() throws when called without a parameter", async function (assert) {
      const { MemoryPhoto, MemoryPhotoComment } = generateModels();

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => MemoryPhotoComment.insert(photoComment)));

      try {
        await MemoryPhoto.delete();
      } catch (error) {
        assert.ok(error instanceof RuntimeError);
      }
      try {
        await MemoryPhotoComment.delete();
      } catch (error) {
        assert.ok(error instanceof RuntimeError);
      }
    });
  });

  module("Attribute tests", function () {
    test("$Model.delete() can delete existing items", async function (assert) {
      const { MemoryPhoto, MemoryPhotoComment } = generateModels();

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => MemoryPhotoComment.insert(photoComment)));

      let deletedPhoto = await MemoryPhoto.delete({ id: 2 });

      assert.propEqual(
        deletedPhoto,
        MemoryPhoto.build({
          id: 2,
          name: "Family photo",
          href: "family-photo.jpeg",
          is_public: true,
        })
      );
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
        owner_id: null,
      });
      assert.deepEqual(deletedPhoto.revisionHistory, [
        {
          id: 2,
          name: "Family photo",
          href: "family-photo.jpeg",
          is_public: true,
          group_uuid: null,
          owner_id: null,
        },
      ]);

      const deletedComment = await MemoryPhotoComment.delete({
        uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
      });

      assert.propEqual(
        deletedComment,
        MemoryPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          inserted_at: deletedComment.inserted_at,
          updated_at: deletedComment.updated_at,
          photo_id: null,
          user_id: null,
        })
      );
      assert.ok(!deletedComment.isNew && !deletedComment.isDirty && deletedComment.isDeleted);

      await MemoryPhotoComment.delete({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29" });

      assert.propEqual(await MemoryPhoto.findAll(), [
        MemoryPhoto.build({
          id: 1,
          name: "Ski trip",
          href: "ski-trip.jpeg",
          is_public: false,
        }),
        MemoryPhoto.build({
          id: 3,
          name: "Selfie",
          href: "selfie.jpeg",
          is_public: false,
        }),
      ]);
      assert.propEqual(await MemoryPhotoComment.findAll(), [
        MemoryPhotoComment.build({
          uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
          content: "I agree",
          photo_id: 1,
          user_id: 2,
          is_important: true,
          inserted_at: deletedComment.inserted_at,
          updated_at: deletedComment.updated_at,
        }),
        MemoryPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          photo_id: 1,
          user_id: 1,
          is_important: true,
          inserted_at: deletedComment.inserted_at,
          updated_at: deletedComment.updated_at,
        }),
      ]);
    });
  });

  module("Reference tests", function () {
    test("$Model.delete($model) returns the actual object", async function (assert) {
      const { MemoryPhoto } = generateModels();

      let photo = MemoryPhoto.build({ name: "some name" });

      assert.equal(InstanceDB.getReferences(photo).size, 1);

      let insertedPhoto = await MemoryPhoto.insert(photo);

      assert.strictEqual(insertedPhoto, photo);
      assert.propEqual(
        insertedPhoto,
        MemoryPhoto.build({
          href: null,
          id: 1,
          is_public: null,
          name: "some name",
        })
      );
      assert.equal(InstanceDB.getReferences(photo).size, 3);
      assert.deepEqual(InstanceDB.getReferences(photo), InstanceDB.getReferences(insertedPhoto));

      let deletedPhoto = await MemoryPhoto.delete(insertedPhoto); // NOTE: this should make all same instances isPersisted = false in the future(?)

      assert.notStrictEqual(deletedPhoto, insertedPhoto);

      assert.equal(InstanceDB.getReferences(photo).size, 0);
      assert.deepEqual(InstanceDB.getReferences(photo), InstanceDB.getReferences(deletedPhoto));

      deletedPhoto.name = "testing the instance is just a copy";

      assert.equal(deletedPhoto.name, "testing the instance is just a copy");
      assert.notEqual(photo.name, deletedPhoto.name);
      assert.notOk(MemoryPhoto.peek(photo.id));
    });

    test("$Model.delete($model) removes relationships for all references", async function (assert) {
      const { MemoryGroup, MemoryUser, MemoryPhoto } = generateModels();

      let izel = MemoryUser.build({ first_name: "Izel", last_name: "Nakri" });
      let groupPhoto = MemoryPhoto.build();
      let group = MemoryGroup.build({ name: "Hacker Log", owner: izel, photo: groupPhoto }); // TODO: add here also hasMany in the future and reflections

      let insertedUser = await MemoryUser.insert(izel);

      assert.ok(izel.id);
      assert.deepEqual(izel, insertedUser);
      assert.strictEqual(group.owner, insertedUser);
      assert.equal(group.owner_id, izel.id);
      assert.strictEqual(group.photo, groupPhoto);

      let insertedGroup = await MemoryGroup.insert(group);

      assert.strictEqual(insertedGroup, group);
      assert.strictEqual(insertedGroup.photo, groupPhoto);
      assert.equal(insertedGroup.owner_id, insertedUser.id);
      assert.strictEqual(groupPhoto.group, insertedGroup);
      assert.equal(groupPhoto.group_id, insertedGroup.id);
      assert.equal(InstanceDB.getReferences(group).size, 2);

      let cachedReference = MemoryGroup.Cache.get(insertedGroup.uuid);
      assert.equal(RelationshipDB.has(cachedReference, "owner"), false);
      assert.equal(RelationshipDB.has(cachedReference, "photo"), false);

      InstanceDB.getReferences(group).forEach((reference) => {
        if (reference !== cachedReference) {
          assert.strictEqual(reference.owner, insertedUser);
          assert.strictEqual(reference.photo, groupPhoto);
        }
      });

      let deletedGroup = await MemoryGroup.delete(group);

      assert.notStrictEqual(deletedGroup, group);
      assert.notStrictEqual(deletedGroup, insertedGroup);
      assert.equal(InstanceDB.getReferences(group).size, 0);
      assert.equal(InstanceDB.getReferences(deletedGroup).size, 0);

      assert.deepEqual(
        deletedGroup,
        MemoryGroup.build({
          uuid: group.uuid,
          name: "Hacker Log",
          owner: null,
          photo: null,
        })
      );
      assert.deepEqual(
        insertedGroup,
        MemoryGroup.build({
          uuid: group.uuid,
          name: "Hacker Log",
          owner: null,
          photo: null,
        })
      );
      assert.equal(groupPhoto.group, null);
      assert.equal(groupPhoto.group_id, null);
    });
  });
});

// NOTE: $Model.delete(primaryKey) feature ?
