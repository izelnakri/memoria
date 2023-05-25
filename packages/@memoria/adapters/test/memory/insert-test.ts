import { module, test } from "qunitx";
import { InstanceDB, InsertError, RuntimeError, RelationshipDB } from "@memoria/model";
import setupMemoria from "../helpers/setup-memoria.js";
import wait from "@memoria/model/test/helpers/wait.js";
import FIXTURES from "../helpers/fixtures/mix/index.js";
import generateModels from "../helpers/models-with-relations/memory/mix/index.js";
import generateIDModels from "../helpers/models-with-relations/memory/id/index.js";

const { PHOTOS, PHOTO_COMMENTS } = FIXTURES;

module("@memoria/adapters | MemoryAdapter | $Model.insert()", function (hooks) {
  setupMemoria(hooks);

  module("Primary key tests", function () {
    test("$Model.insert() will insert an empty model and auto-generate primaryKeys", async function (assert) {
      const { MemoryPhoto, MemoryPhotoComment } = generateModels();

      let initialPhotos = await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));

      assert.propEqual(
        initialPhotos,
        PHOTOS.map((photo) => MemoryPhoto.build(photo))
      );
      assert.ok(
        initialPhotos.every((photo) => !photo.isNew && photo.isPersisted && !photo.isDirty && !photo.isDeleted)
      );

      let initialPhotoComments = await Promise.all(
        PHOTO_COMMENTS.map((photoComment) => MemoryPhotoComment.insert(photoComment))
      );

      assert.ok(
        initialPhotoComments.every(
          (comment) => !comment.isNew && comment.isPersisted && !comment.isDirty && !comment.isDeleted
        )
      );

      assert.deepEqual(
        (await MemoryPhoto.findAll()).map((photo) => photo.id),
        [1, 2, 3]
      );

      await MemoryPhoto.insert();

      assert.deepEqual(
        (await MemoryPhoto.findAll()).map((photo) => photo.id),
        [1, 2, 3, 4]
      );

      await MemoryPhoto.insert();

      assert.equal(await MemoryPhoto.count(), 5);
      assert.propEqual(
        await MemoryPhoto.findAll(),
        [
          ...PHOTOS,
          {
            id: 4,
            is_public: true,
            name: "Photo default name",
            href: null,
            owner_id: null,
            group_uuid: null,
          },
          {
            id: 5,
            is_public: true,
            name: "Photo default name",
            href: null,
            owner_id: null,
            group_uuid: null,
          },
        ].map((photo) => MemoryPhoto.build(photo))
      );

      const initialCommentUUIDs = (await MemoryPhotoComment.findAll()).map((photoComment) => photoComment.uuid);

      assert.deepEqual(initialCommentUUIDs, [
        "499ec646-493f-4eea-b92e-e383d94182f4",
        "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
        "d351963d-e725-4092-a37c-1ca1823b57d3",
        "374c7f4a-85d6-429a-bf2a-0719525f5f29",
      ]);

      await MemoryPhotoComment.insert();

      const allPhotoComments = await MemoryPhotoComment.findAll();
      const lastPhotoComment = allPhotoComments[allPhotoComments.length - 1];

      assert.equal(await MemoryPhotoComment.count(), 5);
      assert.ok(allPhotoComments[4].uuid, "inserted comment has a unique uuid");
    });

    test("$Model.insert(attributes) will throw if overriden primaryKey already exists", async function (assert) {
      const { MemoryPhoto, MemoryPhotoComment } = generateModels();

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => MemoryPhotoComment.insert(photoComment)));

      try {
        await MemoryPhoto.insert({ id: 1 });
      } catch (error) {
        assert.ok(error instanceof InsertError);
      }
      try {
        await MemoryPhotoComment.insert({ uuid: "d351963d-e725-4092-a37c-1ca1823b57d3" });
      } catch (error) {
        assert.ok(error instanceof InsertError);
      }
    });

    test("$Model.insert(attributes) will throw if overriden primaryKey is wrong type", async function (assert) {
      const { MemoryPhoto, MemoryPhotoComment } = generateModels();

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => MemoryPhotoComment.insert(photoComment)));

      try {
        await MemoryPhoto.insert({ id: "99" });
      } catch (error) {
        assert.ok(error instanceof RuntimeError);
      }
      try {
        await MemoryPhotoComment.insert({ uuid: 1 });
      } catch (error) {
        assert.ok(error instanceof RuntimeError);
      }
    });
  });

  module("Attribute tests", function () {
    test("$Model.insert(attributes) will insert a model with overriden default attributes", async function (assert) {
      const { MemoryPhoto, MemoryPhotoComment } = generateModels();

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => MemoryPhotoComment.insert(photoComment)));

      await MemoryPhoto.insert({ id: 99, href: "/izel.html", is_public: false });

      let model = await MemoryPhoto.insert({ name: "Baby photo", href: "/baby.jpg" });
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
        owner_id: null,
        group_uuid: null,
      });
      assert.deepEqual(model.revisionHistory, [
        {
          id: 100,
          name: "Baby photo",
          href: "/baby.jpg",
          is_public: true,
          owner_id: null,
          group_uuid: null,
        },
      ]);

      assert.equal(await MemoryPhoto.count(), 5);
      assert.propEqual(
        await MemoryPhoto.findAll(),
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
        ].map((photo) => MemoryPhoto.build(photo))
      );

      const initialCommentUUIDs = (await MemoryPhotoComment.findAll()).map((comment) => comment.uuid);
      const commentOne = await MemoryPhotoComment.insert({
        uuid: "6e1aed96-9ef7-4685-981d-db004c568zzz",
        inserted_at: new Date("2015-10-25T20:54:04.447Z"),
        updated_at: new Date("2015-10-25T20:54:04.447Z"),
        content: null,
        user_id: null,
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
        photo_id: null,
        user_id: null,
      });
      assert.deepEqual(commentOne.revisionHistory, [
        {
          inserted_at: new Date("2015-10-25T20:54:04.447Z"),
          updated_at: new Date("2015-10-25T20:54:04.447Z"),
          is_important: true,
          uuid: "6e1aed96-9ef7-4685-981d-db004c568zzz",
          group_uuid: null,
          content: null,
          photo_id: null,
          user_id: null,
        },
      ]);

      const commentTwo = await MemoryPhotoComment.insert({
        uuid: "6401f27c-49aa-4da7-9835-08f6f669e29f",
        is_important: false,
        content: null,
        user_id: null,
      });

      assert.equal(await MemoryPhotoComment.count(), 6);

      const allComments = await MemoryPhotoComment.findAll();
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
      assert.equal(commentOne.photo_id, undefined);
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
      const { MemoryPhoto, MemoryPhotoComment } = generateModels();

      await Promise.all([MemoryPhoto, MemoryPhotoComment].map((model) => model.resetCache()));
      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => MemoryPhotoComment.insert(photoComment)));

      try {
        await MemoryPhoto.insert({
          published_at: new Date("2017-10-10").toJSON(),
          description: "Some description",
        });
      } catch (error) {
        assert.ok(error.message.includes('is not a valid attribute for a MemoryPhoto partial! Provided'));
      }
      try {
        await MemoryPhoto.insert({ description: "Some description" });
      } catch (error) {
        assert.ok(error.message.includes('is not a valid attribute for a MemoryPhoto partial! Provided'));
      }
      try {
        await MemoryPhoto.insert({ location: "Istanbul", is_public: false });
      } catch (error) {
        assert.ok(error.message.includes('is not a valid attribute for a MemoryPhoto partial! Provided'));
      }

      try {
        await MemoryPhotoComment.insert({ updated_at: new Date("2017-01-10").toJSON(), like_count: 22 });
      } catch (error) {
        assert.ok(error.message.includes('is not a valid attribute for a MemoryPhotoComment partial! Provided'));
      }
      try {
        await MemoryPhotoComment.insert({ reply_id: 1 });
      } catch (error) {
        assert.ok(error.message.includes('is not a valid attribute for a MemoryPhotoComment partial! Provided'));
      }

      assert.deepEqual(Array.from(MemoryPhoto.columnNames), [
        "id",
        "name",
        "href",
        "is_public",
        "owner_id",
        "group_uuid",
      ]);
      assert.deepEqual(Array.from(MemoryPhotoComment.columnNames), [
        "uuid",
        "content",
        "is_important",
        "inserted_at",
        "updated_at",
        "group_uuid",
        "user_id",
        "photo_id",
      ]);
      assert.propEqual(
        await MemoryPhoto.findAll(),
        [
          ...PHOTOS
        ].map((photo) => MemoryPhoto.build(photo))
      );
    });
  });

  module("Reference tests", function () {
    test("$Model.insert($model) returns the actual object", async function (assert) {
      const { MemoryPhoto } = generateModels();

      let photo = MemoryPhoto.build({ name: "some name" });

      assert.propEqual(
        photo,
        MemoryPhoto.build({
          href: null,
          id: null,
          is_public: null,
          name: "some name",
        })
      );

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
      assert.propEqual(
        photo,
        MemoryPhoto.build({
          href: null,
          id: 1,
          is_public: null,
          name: "some name",
        })
      );
      assert.deepEqual(MemoryPhoto.peek(insertedPhoto.id), insertedPhoto);
      assert.equal(InstanceDB.getReferences(photo).size, 5);
      assert.deepEqual(InstanceDB.getReferences(photo), InstanceDB.getReferences(insertedPhoto));

      insertedPhoto.name = "testing store just holds a copy";

      assert.equal(insertedPhoto.name, "testing store just holds a copy");
      assert.equal(photo.name, insertedPhoto.name);
      assert.notPropEqual(MemoryPhoto.peek(photo.id), insertedPhoto);
    });

    test("$Model.insert($model) copies relationships but not for stored instance, also update references", async function (assert) {
      const { MemoryGroup, MemoryUser, MemoryPhoto } = generateModels();

      let izel = await MemoryUser.insert({ first_name: "Izel", last_name: "Nakri" });
      let groupPhoto = MemoryPhoto.build();
      let group = MemoryGroup.build({ name: "Hacker Log", owner: izel, photo: groupPhoto }); // TODO: add here also hasMany in the future and reflections

      assert.strictEqual(group.owner, izel);
      assert.strictEqual(group.photo, groupPhoto);
      assert.strictEqual(groupPhoto.group, group);

      let insertedGroup = await MemoryGroup.insert(group);

      assert.strictEqual(insertedGroup, group);
      assert.strictEqual(insertedGroup.owner, izel);

      assert.strictEqual(insertedGroup.photo, groupPhoto);

      assert.strictEqual(groupPhoto.group, insertedGroup);
      assert.equal(InstanceDB.getReferences(group).size, 2);

      let cachedReference = MemoryGroup.Cache.get(insertedGroup.uuid);

      assert.equal(RelationshipDB.has(cachedReference, "owner"), false);
      assert.equal(RelationshipDB.has(cachedReference, "photo"), false);

      InstanceDB.getReferences(group).forEach((groupReference) => {
        if (groupReference !== cachedReference) {
          assert.strictEqual(groupReference.owner, izel);
          assert.strictEqual(insertedGroup.photo, groupPhoto);
        }
      });

      let somePeekedModel = await MemoryGroup.peek(group.uuid);

      assert.strictEqual(groupPhoto.group, insertedGroup);

      let newBuiltReference = MemoryGroup.build({
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

      assert.strictEqual(groupPhoto.group, newBuiltReference);

      let peekedGroup = await MemoryGroup.peek(group.uuid);

      assert.notStrictEqual(peekedGroup, insertedGroup);
      assert.notStrictEqual(peekedGroup, group);
      assert.equal(InstanceDB.getReferences(group).size, 5);

      assert.strictEqual(groupPhoto.group, newBuiltReference);

      let fetchedGroup = await MemoryGroup.find(group.uuid);

      assert.notStrictEqual(fetchedGroup, insertedGroup);
      assert.notStrictEqual(fetchedGroup, group);
      assert.notStrictEqual(fetchedGroup, peekedGroup);
      assert.equal(InstanceDB.getReferences(group).size, 6);

      InstanceDB.getReferences(group).forEach((reference) => {
        if (![cachedReference].includes(reference)) {
          assert.strictEqual(reference.owner, izel);
        }
      });

      assert.strictEqual(groupPhoto.group, fetchedGroup);
    });

    test("$Model.insert($model) resets null set hasOne relationships after insert", async function (assert) {
      const { MemoryGroup, MemoryPhoto } = generateIDModels();

      let groupPhoto = await MemoryPhoto.insert({ name: "Some photo", group_id: 1 });
      let group = MemoryGroup.build({ name: "Hacker Log" });

      assert.strictEqual(await group.photo, null);

      let insertedGroup = await MemoryGroup.insert(group);

      assert.deepEqual(group.photo.toJSON(), groupPhoto.toJSON());
      assert.deepEqual(insertedGroup.photo.toJSON(), groupPhoto.toJSON());
    });
  });

  module("Cache timeout tests", function () {
    test("$Model.insert(data, { cacheDuration: 0 }) can immediately evict the cache", async function (assert) {
      const { MemoryPhoto } = generateModels();

      await MemoryPhoto.insert(PHOTOS[0]);

      assert.propEqual(await MemoryPhoto.findAll(), [
        MemoryPhoto.build({
          href: "ski-trip.jpeg",
          id: 1,
          name: "Ski trip",
          is_public: false,
        }),
      ]);

      let photo = await MemoryPhoto.insert(PHOTOS[1], { cacheDuration: 0 });

      assert.deepEqual(photo, MemoryPhoto.build({ ...PHOTOS[1], comments: [] }));
      assert.propEqual(await MemoryPhoto.findAll(), [
        MemoryPhoto.build({
          href: "ski-trip.jpeg",
          id: 1,
          name: "Ski trip",
          is_public: false,
        }),
      ]);

      let secondPhoto = await MemoryPhoto.insert(PHOTOS[1]);

      assert.deepEqual(secondPhoto, MemoryPhoto.build(PHOTOS[1]));
      assert.deepEqual(await MemoryPhoto.findAll(), [
        MemoryPhoto.build({
          href: "ski-trip.jpeg",
          id: 1,
          name: "Ski trip",
          is_public: false,
        }),
        secondPhoto,
      ]);
    });

    test("$Model.insert(json. { cacheDuration: $cacheTimeout }) can cache with different cache timeouts", async function (assert) {
      const { MemoryPhoto } = generateModels();

      await MemoryPhoto.insert(PHOTOS[0]);

      assert.propEqual(await MemoryPhoto.findAll(), [
        MemoryPhoto.build({
          href: "ski-trip.jpeg",
          id: 1,
          name: "Ski trip",
          is_public: false,
        }),
      ]);

      let photoOne = await MemoryPhoto.insert(PHOTOS[1], { cacheDuration: 10 });
      let photoTwo = await MemoryPhoto.insert(PHOTOS[2], { cacheDuration: 70 });

      assert.propEqual(photoOne, MemoryPhoto.build(PHOTOS[1]));
      assert.propEqual(photoTwo, MemoryPhoto.build(PHOTOS[2]));
      assert.propEqual(await MemoryPhoto.findAll(), [
        MemoryPhoto.build({
          href: "ski-trip.jpeg",
          id: 1,
          name: "Ski trip",
          is_public: false,
        }),
        photoOne,
        photoTwo,
      ]);

      await wait(10);

      assert.propEqual(await MemoryPhoto.findAll(), [
        MemoryPhoto.build({
          href: "ski-trip.jpeg",
          id: 1,
          name: "Ski trip",
          is_public: false,
        }),
        photoTwo,
      ]);

      let lastPhoto = await MemoryPhoto.insert(PHOTOS[1]);

      assert.propEqual(lastPhoto, MemoryPhoto.build(PHOTOS[1]));

      await wait(70);

      assert.deepEqual((await MemoryPhoto.findAll()).map((x) => x.toJSON()), [
        MemoryPhoto.build({
          href: "ski-trip.jpeg",
          id: 1,
          name: "Ski trip",
          is_public: false,
        }).toJSON(),
        photoOne.toJSON(),
      ]);
    });
  });
});
