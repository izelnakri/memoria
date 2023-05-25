import { module, test } from "qunitx";
import { InstanceDB, InsertError, RuntimeError, RelationshipDB } from "@memoria/model";
import setupMemoria from "../helpers/setup-memoria.js";
import FIXTURES from "../helpers/fixtures/mix/index.js";
import generateModels from "../helpers/models-with-relations/rest/mix/index.js";
import generateIDModels from "../helpers/models-with-relations/rest/id/index.js";

const { PHOTOS, PHOTO_COMMENTS } = FIXTURES;

module("@memoria/adapters | RESTAdapter | $Model.insert()", function (hooks) {
  setupMemoria(hooks);

  module("Primary key tests", function () {
    test("$Model.insert() will insert an empty model and auto-generate primaryKeys", async function (assert) {
      const { RESTPhoto, RESTPhotoComment, Server } = generateModels();
      this.Server = Server;

      let initialPhotos = await Promise.all(PHOTOS.map((photo) => RESTPhoto.insert(photo)));

      assert.deepEqual(
        initialPhotos,
        PHOTOS.map((photo) => RESTPhoto.build(photo))
      );
      assert.ok(
        initialPhotos.every((photo) => !photo.isNew && !photo.isDirty && photo.isPersisted && !photo.isDeleted)
      );

      let initialPhotoComments = await Promise.all(
        PHOTO_COMMENTS.map((photoComment) => RESTPhotoComment.insert(photoComment))
      );

      assert.ok(
        initialPhotoComments.every(
          (comment) => !comment.isNew && !comment.isDirty && comment.isPersisted && !comment.isDeleted
        )
      );

      assert.deepEqual(
        (await RESTPhoto.findAll()).map((photo) => photo.id),
        [1, 2, 3]
      );

      await RESTPhoto.insert();

      assert.deepEqual(
        (await RESTPhoto.findAll()).map((photo) => photo.id),
        [1, 2, 3, 4]
      );

      await RESTPhoto.insert();

      assert.equal(await RESTPhoto.count(), 5);
      assert.deepEqual(
        await RESTPhoto.findAll(),
        [
          ...PHOTOS,
          {
            id: 4,
            is_public: true,
            name: "Photo default name",
            href: null,
          },
          {
            id: 5,
            is_public: true,
            name: "Photo default name",
            href: null,
          },
        ].map((photo) => RESTPhoto.build(photo))
      );

      const initialCommentUUIDs = (await RESTPhotoComment.findAll()).map((photoComment) => photoComment.uuid);

      assert.deepEqual(initialCommentUUIDs, [
        "499ec646-493f-4eea-b92e-e383d94182f4",
        "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
        "d351963d-e725-4092-a37c-1ca1823b57d3",
        "374c7f4a-85d6-429a-bf2a-0719525f5f29",
      ]);

      await RESTPhotoComment.insert();

      const allPhotoComments = await RESTPhotoComment.findAll();
      const lastPhotoComment = allPhotoComments[allPhotoComments.length - 1];

      assert.equal(await RESTPhotoComment.count(), 5);
      assert.ok(allPhotoComments[4].uuid, "inserted comment has a unique uuid");
    });

    test("$Model.insert(attributes) will throw if overriden primaryKey already exists", async function (assert) {
      const { RESTPhoto, RESTPhotoComment, Server } = generateModels();
      this.Server = Server;

      await Promise.all(PHOTOS.map((photo) => RESTPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => RESTPhotoComment.insert(photoComment)));

      try {
        await RESTPhoto.insert({ id: 1 });
      } catch (changeset) {
        assert.ok(changeset instanceof InsertError);
        assert.propContains(changeset.errors[0], {
          attribute: "id",
          id: 1,
          message: "already exists",
          modelName: "RESTPhoto",
          name: "ModelError",
        });
      }
      try {
        await RESTPhotoComment.insert({ uuid: "d351963d-e725-4092-a37c-1ca1823b57d3" });
      } catch (changeset) {
        assert.ok(changeset instanceof InsertError);
        assert.propContains(changeset.errors[0], {
          attribute: "uuid",
          id: "d351963d-e725-4092-a37c-1ca1823b57d3",
          message: "already exists",
          modelName: "RESTPhotoComment",
          name: "ModelError",
        });
      }
    });

    test("$Model.insert(attributes) will throw if overriden primaryKey is wrong type", async function (assert) {
      const { RESTPhoto, RESTPhotoComment, Server } = generateModels();
      this.Server = Server;

      await Promise.all(PHOTOS.map((photo) => RESTPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => RESTPhotoComment.insert(photoComment)));

      try {
        await RESTPhoto.insert({ id: "99" });
      } catch (changeset) {
        assert.ok(changeset instanceof RuntimeError);
      }
      try {
        await RESTPhotoComment.insert({ uuid: 1 });
      } catch (changeset) {
        assert.ok(changeset instanceof RuntimeError);
      }
    });
  });

  module("Attribute tests", function () {
    test("$Model.insert(attributes) will insert a model with overriden attributes", async function (assert) {
      const { RESTPhoto, RESTPhotoComment, Server } = generateModels();
      this.Server = Server;

      await Promise.all(PHOTOS.map((photo) => RESTPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => RESTPhotoComment.insert(photoComment)));

      await RESTPhoto.insert({ id: 99, href: "/izel.html", is_public: false });
      let model = await RESTPhoto.insert({ name: "Baby photo", href: "/baby.jpg" });
      assert.notOk(model.isNew);
      assert.ok(model.isPersisted);
      assert.notOk(model.isDeleted);
      assert.notOk(model.isDirty);
      assert.deepEqual(model.changes, {});
      assert.deepEqual(model.revision, {
        id: 100,
        name: "Baby photo",
        href: "/baby.jpg",
        is_public: true,
        group_uuid: null,
        owner_id: null,
      });
      assert.deepEqual(model.revisionHistory, [
        {
          id: 100,
          name: "Baby photo",
          href: "/baby.jpg",
          is_public: true,
          group_uuid: null,
          owner_id: null,
        },
      ]);

      assert.equal(await RESTPhoto.count(), 5);
      assert.deepEqual(
        await RESTPhoto.findAll(),
        [
          ...PHOTOS,
          {
            id: 99,
            is_public: false,
            name: "Photo default name",
            href: "/izel.html",
          },
          {
            id: 100,
            is_public: true,
            name: "Baby photo",
            href: "/baby.jpg",
          },
        ].map((photo) => RESTPhoto.build(photo))
      );

      const initialCommentUUIDs = (await RESTPhotoComment.findAll()).map((comment) => comment.uuid);
      const commentOne = await RESTPhotoComment.insert({
        uuid: "6e1aed96-9ef7-4685-981d-db004c568zzz",
        inserted_at: new Date("2015-10-25T20:54:04.447Z"),
        updated_at: new Date("2015-10-25T20:54:04.447Z"),
        photo_id: 1,
      });
      assert.notOk(commentOne.isNew);
      assert.ok(commentOne.isPersisted);
      assert.notOk(commentOne.isDeleted);
      assert.notOk(commentOne.isDirty);
      assert.deepEqual(commentOne.changes, {});
      assert.deepEqual(commentOne.revision, {
        content: null,
        inserted_at: new Date("2015-10-25T20:54:04.447Z"),
        updated_at: new Date("2015-10-25T20:54:04.447Z"),
        is_important: true,
        uuid: "6e1aed96-9ef7-4685-981d-db004c568zzz",
        group_uuid: null,
        photo_id: 1,
        user_id: null,
      });
      assert.deepEqual(commentOne.revisionHistory, [
        {
          content: null,
          inserted_at: new Date("2015-10-25T20:54:04.447Z"),
          updated_at: new Date("2015-10-25T20:54:04.447Z"),
          is_important: true,
          uuid: "6e1aed96-9ef7-4685-981d-db004c568zzz",
          group_uuid: null,
          photo_id: 1,
          user_id: null,
        },
      ]);
      const commentTwo = await RESTPhotoComment.insert({
        uuid: "6401f27c-49aa-4da7-9835-08f6f669e29f",
        is_important: false,
      });

      assert.equal(await RESTPhotoComment.count(), 6);

      const allComments = await RESTPhotoComment.findAll();
      const lastInsertedComments = allComments.slice(4, allComments.length);

      assert.ok(
        allComments.find((comment) => comment.uuid === commentOne.uuid),
        "first comment insert in the database"
      );
      assert.ok(
        allComments.find((comment) => comment.uuid === commentTwo.uuid),
        "second comment insert in the database"
      );

      assert.deepEqual(commentOne.inserted_at, new Date("2015-10-25T20:54:04.447Z"));
      assert.deepEqual(commentOne.updated_at, new Date("2015-10-25T20:54:04.447Z"));
      assert.equal(commentOne.photo_id, 1);
      assert.equal(commentOne.is_important, true);
      assert.equal(commentTwo.uuid, "6401f27c-49aa-4da7-9835-08f6f669e29f");
      assert.ok(new Date() - commentTwo.inserted_at < 10000);
      assert.ok(new Date() - commentTwo.updated_at < 10000);
      assert.equal(commentTwo.photo_id, null);
      assert.equal(commentTwo.is_important, false);

      lastInsertedComments.forEach((comment) => {
        assert.ok(!initialCommentUUIDs.includes(comment.uuid), "inserted comment uuid is unique");
      });
    });

    test("$Model.insert(attributes) cannot add new values to $Model.attributes when new attributes are discovered", async function (assert) {
      const { RESTPhoto, RESTPhotoComment, Server } = generateModels();
      this.Server = Server;

      await Promise.all([RESTPhoto, RESTPhotoComment].map((model) => model.resetCache()));
      await Promise.all(PHOTOS.map((photo) => RESTPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => RESTPhotoComment.insert(photoComment)));

      try {
        await RESTPhoto.insert({
          published_at: new Date("2017-10-10").toJSON(),
          description: "Some description",
        });
      } catch (error) {
        assert.ok(error.message.includes('is not a valid attribute for a RESTPhoto partial! Provided'));
      }
      try {
        await RESTPhoto.insert({ location: "Istanbul", is_public: false });
      } catch (error) {
        assert.ok(error.message.includes('is not a valid attribute for a RESTPhoto partial! Provided'));
      }

      try {
        await RESTPhotoComment.insert({ updated_at: new Date("2017-01-10").toJSON(), like_count: 22 });
      } catch (error) {
        assert.ok(error.message.includes('is not a valid attribute for a RESTPhotoComment partial! Provided'));
      }
      try {
        await RESTPhotoComment.insert({ reply_id: 1 });
      } catch (error) {
        assert.ok(error.message.includes('is not a valid attribute for a RESTPhotoComment partial! Provided'));
      }

      assert.deepEqual(Array.from(RESTPhoto.columnNames), [
        "id",
        "name",
        "href",
        "is_public",
        "owner_id",
        "group_uuid",
      ]);
      assert.deepEqual(Array.from(RESTPhotoComment.columnNames), [
        "uuid",
        "content",
        "is_important",
        "inserted_at",
        "updated_at",
        "group_uuid",
        "user_id",
        "photo_id",
      ]);
      assert.deepEqual(
        await RESTPhoto.findAll(),
        [
          ...PHOTOS,
        ].map((photo) => RESTPhoto.build(photo))
      );
    });
  });

  module("Reference tests", function () {
    test("$Model.insert($model) returns the actual object", async function (assert) {
      const { RESTPhoto, Server } = generateModels();
      this.Server = Server;

      let photo = RESTPhoto.build({ name: "some name" });

      assert.deepEqual(
        photo,
        RESTPhoto.build({
          href: null,
          id: null,
          is_public: null,
          name: "some name",
        })
      );

      assert.equal(InstanceDB.getReferences(photo).size, 1);

      let insertedPhoto = await RESTPhoto.insert(photo);

      assert.strictEqual(insertedPhoto, photo);
      assert.deepEqual(
        insertedPhoto,
        RESTPhoto.build({
          href: null,
          id: 1,
          is_public: null,
          name: "some name",
        })
      );
      assert.deepEqual(
        photo,
        RESTPhoto.build({
          href: null,
          id: 1,
          is_public: null,
          name: "some name",
        })
      );
      assert.deepEqual(RESTPhoto.peek(insertedPhoto.id), insertedPhoto);
      assert.equal(InstanceDB.getReferences(photo).size, 5);
      assert.equal(InstanceDB.getReferences(photo), InstanceDB.getReferences(insertedPhoto));

      insertedPhoto.name = "testing store just holds a copy";

      assert.equal(insertedPhoto.name, "testing store just holds a copy");
      assert.equal(photo.name, insertedPhoto.name);
      assert.notPropEqual(RESTPhoto.peek(photo.id), insertedPhoto);
    });

    test("$Model.insert($model) copies relationships but not for stored instance, also update references", async function (assert) {
      const { RESTGroup, RESTUser, RESTPhoto, Server } = generateModels();
      this.Server = Server;

      let izel = RESTUser.build({ first_name: "Izel", last_name: "Nakri" });
      let groupPhoto = RESTPhoto.build();
      let group = RESTGroup.build({ name: "Hacker Log", owner: izel, photo: groupPhoto }); // TODO: add here also hasMany in the future and reflections

      assert.strictEqual(group.owner, izel);
      assert.strictEqual(group.photo, groupPhoto);
      assert.strictEqual(groupPhoto.group, group);

      let insertedGroup = await RESTGroup.insert(group);
      let existingGroupReferences = InstanceDB.getReferences(group);

      assert.strictEqual(insertedGroup.photo, groupPhoto);
      assert.strictEqual(groupPhoto.group, insertedGroup);
      assert.equal(existingGroupReferences.size, 2);

      let cachedReference = RESTGroup.Cache.get(insertedGroup.uuid);
      assert.equal(RelationshipDB.has(cachedReference, "owner"), false);
      assert.equal(RelationshipDB.has(cachedReference, "photo"), false);

      InstanceDB.getReferences(group).forEach((reference) => {
        if (reference !== cachedReference) {
          assert.strictEqual(reference.owner, izel);
        }
      });

      let somePeekedModel = await RESTGroup.peek(group.uuid);

      assert.strictEqual(groupPhoto.group, insertedGroup);

      let newBuiltReference = RESTGroup.build({
        uuid: group.uuid,
        name: "Hacker Log",
        owner: izel,
        photo: groupPhoto,
      });

      assert.deepEqual(insertedGroup, newBuiltReference);
      assert.strictEqual(insertedGroup.owner, izel);
      assert.strictEqual(insertedGroup.photo, groupPhoto);

      assert.equal(InstanceDB.getReferences(group).size, 4);
      assert.equal(RelationshipDB.has(cachedReference, "owner"), false);
      assert.equal(RelationshipDB.has(cachedReference, "photo"), false);

      InstanceDB.getReferences(group).forEach((reference) => {
        if (![somePeekedModel, cachedReference].includes(reference)) {
          assert.strictEqual(reference.owner, izel);
          assert.strictEqual(reference.photo, groupPhoto);
        }
      });

      assert.notStrictEqual(groupPhoto.group, insertedGroup);

      let peekedGroup = await RESTGroup.peek(group.uuid);

      assert.notStrictEqual(peekedGroup, insertedGroup);
      assert.notStrictEqual(peekedGroup, group);
      assert.equal(InstanceDB.getReferences(group).size, 5);
      assert.strictEqual(groupPhoto.group, newBuiltReference);

      let fetchedGroup = await RESTGroup.find(group.uuid);

      assert.notStrictEqual(fetchedGroup, insertedGroup);
      assert.notStrictEqual(fetchedGroup, group);
      assert.notStrictEqual(fetchedGroup, peekedGroup);
      assert.equal(InstanceDB.getReferences(group).size, 6);

      InstanceDB.getReferences(group).forEach((reference) => {
        if (![somePeekedModel, peekedGroup, cachedReference, fetchedGroup].includes(reference)) {
          assert.strictEqual(reference.owner, izel);
          assert.strictEqual(reference.photo, groupPhoto);
        }
      });

      assert.strictEqual(groupPhoto.group, fetchedGroup);
    });

    test("$Model.insert($model) resets null set hasOne relationships after insert", async function (assert) {
      const { RESTGroup, RESTUser, RESTPhoto, Server } = generateIDModels();
      this.Server = Server;

      let groupPhoto = await RESTPhoto.insert({ name: "Some photo", group_id: 1 });
      let group = RESTGroup.build({ name: "Hacker Log" });

      assert.equal(await group.photo, null);

      let insertedGroup = await RESTGroup.insert(group);

      assert.deepEqual(group.photo.toJSON(), groupPhoto.toJSON());
      assert.deepEqual(insertedGroup.photo.toJSON(), groupPhoto.toJSON());
    });
  });
});
