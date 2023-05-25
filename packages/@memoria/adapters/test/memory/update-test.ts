import { module, test } from "qunitx";
import { UpdateError, InstanceDB, RelationshipDB } from "@memoria/model";
import wait from "@memoria/model/test/helpers/wait.js";
import setupMemoria from "../helpers/setup-memoria.js";
import FIXTURES from "../helpers/fixtures/mix/index.js";
import generateModels from "../helpers/models-with-relations/memory/mix/index.js";
import generateIDModels from "../helpers/models-with-relations/memory/id/index.js";

const { PHOTOS, PHOTO_COMMENTS } = FIXTURES;

module("@memoria/adapters | MemoryAdapter | $Model.update()", function (hooks) {
  setupMemoria(hooks);

  module("Success cases", function () {
    test("$Model.update(attributes) can update models", async function (assert) {
      const { MemoryPhoto, MemoryPhotoComment } = generateModels();

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => MemoryPhotoComment.insert(photoComment)));

      let firstComment = await MemoryPhotoComment.findBy({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29" });
      assert.matchJson(firstComment, {
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        inserted_at: String,
        updated_at: String,
        is_important: true,
        content: "Interesting indeed",
        group_uuid: null,
        photo_id: 2,
        user_id: 1,
      });
      assert.ok(firstComment.inserted_at instanceof Date);
      assert.ok(firstComment.updated_at instanceof Date);
      assert.notOk(firstComment.isNew);
      assert.ok(firstComment.isPersisted);
      assert.notOk(firstComment.isDeleted);
      assert.notOk(firstComment.isDirty);
      assert.deepEqual(firstComment.changes, {});

      let photo = await MemoryPhoto.find(1);
      assert.propEqual(
        photo,
        MemoryPhoto.build({
          id: 1,
          name: "Ski trip",
          href: "ski-trip.jpeg",
          is_public: false,
        })
      );

      let firstPhoto = await MemoryPhoto.update({
        id: 1,
        name: "S trip",
        href: "ski-trip.jpeg",
        is_public: false,
      });
      assert.propEqual(
        firstPhoto,
        MemoryPhoto.build({
          id: 1,
          name: "S trip",
          href: "ski-trip.jpeg",
          is_public: false,
        })
      );
      assert.propEqual(firstPhoto, Object.assign(await MemoryPhoto.find(1), { name: "S trip" }));
      assert.notOk(firstPhoto.isNew);
      assert.ok(firstPhoto.isPersisted);
      assert.notOk(firstPhoto.isDeleted);
      assert.notOk(firstPhoto.isDirty);
      assert.deepEqual(firstPhoto.changes, {});
      assert.deepEqual(firstPhoto.revision, {
        id: 1,
        name: "S trip",
        href: "ski-trip.jpeg",
        is_public: false,
        group_uuid: null,
        owner_id: null,
      });
      assert.deepEqual(firstPhoto.revisionHistory, [
        {
          id: 1,
          name: "Ski trip",
          href: "ski-trip.jpeg",
          is_public: false,
          group_uuid: null,
          owner_id: null,
        },
        {
          id: 1,
          name: "S trip",
          href: "ski-trip.jpeg",
          is_public: false,
          group_uuid: null,
          owner_id: null,
        },
      ]);

      let secondPhoto = await MemoryPhoto.update({ id: 2, href: "family-photo-2.jpeg", is_public: false });
      assert.propEqual(
        secondPhoto,
        MemoryPhoto.build({
          id: 2,
          name: "Family photo",
          href: "family-photo-2.jpeg",
          is_public: false,
        })
      );
      assert.propEqual(secondPhoto, await MemoryPhoto.find(2));
      assert.ok(!secondPhoto.isNew && secondPhoto.isPersisted && !secondPhoto.isDirty && !secondPhoto.isDeleted);

      let firstCommentInitialUpdatedAt = firstComment.updated_at;

      let comment = await MemoryPhotoComment.update({
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        content: "Coolie",
      });
      assert.matchJson(comment, {
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        inserted_at: String,
        updated_at: String,
        is_important: true,
        content: "Coolie",
        group_uuid: null,
        user_id: 1,
        photo_id: 2,
      });
      assert.propEqual(
        comment,
        Object.assign(await MemoryPhotoComment.findBy({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29" }), {
          content: "Coolie",
        })
      );
      assert.notOk(comment.isNew);
      assert.ok(comment.isPersisted);
      assert.notOk(comment.isDeleted);
      assert.notOk(comment.isDirty);
      assert.deepEqual(comment.changes, {});
      assert.deepEqual(comment.revision, {
        content: "Coolie",
        inserted_at: comment.inserted_at,
        is_important: true,
        updated_at: comment.updated_at,
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        group_uuid: null,
        user_id: 1,
        photo_id: 2,
      });
      assert.deepEqual(comment.revisionHistory, [
        {
          content: "Interesting indeed",
          inserted_at: comment.inserted_at,
          is_important: true,
          updated_at: comment.inserted_at,
          uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
          group_uuid: null,
          user_id: 1,
          photo_id: 2,
        },
        {
          content: "Coolie",
          inserted_at: comment.inserted_at,
          is_important: true,
          updated_at: comment.updated_at,
          uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
          group_uuid: null,
          user_id: 1,
          photo_id: 2,
        },
      ]);
      assert.ok(comment.inserted_at instanceof Date);
      assert.ok(comment.updated_at instanceof Date);
      assert.equal(firstComment.inserted_at, comment.inserted_at);
      assert.equal(firstComment.updated_at, comment.updated_at);
      assert.notEqual(firstCommentInitialUpdatedAt, comment.updated_at);
      assert.propEqual({ ...firstComment, updated_at: comment.updated_at, content: "Coolie" }, comment);
    });

    test("$Model.update(attributes) does throw an exception when a model gets updated with an unknown attribute", async function (assert) {
      const { MemoryPhoto, MemoryPhotoComment } = generateModels();

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => MemoryPhotoComment.insert(photoComment)));

      try {
        await MemoryPhoto.update({ id: 1, name: "ME", is_verified: false });
      } catch (error) {
        assert.equal(error.message, 'is_verified is not a valid attribute for a MemoryPhoto partial! Provided { is_verified: false }');
      }

      let photo = await MemoryPhoto.update({ id: 1, name: "ME" });
      assert.matchJson(photo, {
        href: "ski-trip.jpeg",
        id: 1,
        is_public: false,
        name: "ME",
        group_uuid: null,
        owner_id: null,
      });

      try {
        await MemoryPhotoComment.update({
          uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
          location: "Amsterdam",
        });
      } catch (error) {
        assert.equal(error.message, 'location is not a valid attribute for a MemoryPhotoComment partial! Provided { location: Amsterdam }');
      }

      let photoComment = await MemoryPhotoComment.update({
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
      });
      assert.matchJson(photoComment, {
        content: "Interesting indeed",
        inserted_at: String,
        is_important: true,
        updated_at: String,
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        group_uuid: null,
        photo_id: 2,
        user_id: 1,
      });
    });
  });

  module("Error cases", function () {
    test("$Model.update(attributes) throws an exception when updating a nonexistent model", async function (assert) {
      const { MemoryPhoto, MemoryPhotoComment } = generateModels();

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => MemoryPhotoComment.insert(photoComment)));

      try {
        await MemoryPhoto.update({ id: 99, href: "family-photo-2.jpeg" });
      } catch (error) {
        assert.ok(error instanceof UpdateError);
      }

      try {
        await MemoryPhotoComment.update({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5666", content: "Nice" });
      } catch (error) {
        assert.ok(error instanceof UpdateError);
      }
    });
  });

  module("Reference tests", function () {
    test("$Model.update($model) returns the actual object", async function (assert) {
      const { MemoryPhoto } = generateModels();

      let insertedPhoto = await MemoryPhoto.insert({
        id: 2,
        name: "Something",
        href: "/something.jpg",
        is_public: false,
      });

      assert.equal(InstanceDB.getReferences(insertedPhoto).size, 2);

      assert.propEqual(
        insertedPhoto,
        MemoryPhoto.build({
          id: 2,
          name: "Something",
          href: "/something.jpg",
          is_public: false,
        })
      );

      assert.equal(InstanceDB.getReferences(insertedPhoto).size, 3);

      let updatedPhoto = await MemoryPhoto.update({ id: 2, name: "Another", href: "/another.jpg" });

      assert.notStrictEqual(insertedPhoto, updatedPhoto);
      assert.equal(InstanceDB.getReferences(updatedPhoto).size, 4);
      assert.propEqual(
        updatedPhoto,
        MemoryPhoto.build({
          id: 2,
          name: "Another",
          href: "/another.jpg",
          is_public: false,
        })
      );

      assert.deepEqual(MemoryPhoto.peek(updatedPhoto.id), updatedPhoto);
      assert.equal(InstanceDB.getReferences(updatedPhoto).size, 6);
      assert.equal(InstanceDB.getReferences(insertedPhoto), InstanceDB.getReferences(updatedPhoto));

      updatedPhoto.name = "testing store just holds a copy";

      assert.equal(updatedPhoto.name, "testing store just holds a copy");
      assert.notPropEqual(MemoryPhoto.peek(updatedPhoto.id), updatedPhoto);
    });

    test("$Model.update($model) copies relationships but not for stored instance, also update references", async function (assert) {
      const { MemoryGroup, MemoryUser, MemoryPhoto } = generateModels();

      let izel = MemoryUser.build({ first_name: "Izel", last_name: "Nakri" });
      let groupPhoto = MemoryPhoto.build();
      let group = MemoryGroup.build({ name: "Hacker Log", owner: izel, photo: groupPhoto }); // TODO: add here also hasMany in the future and reflections

      assert.strictEqual(group.owner, izel);
      assert.strictEqual(group.photo, groupPhoto);

      let insertedGroup = await MemoryGroup.insert(group);

      assert.strictEqual(insertedGroup, group);
      assert.strictEqual(insertedGroup.photo, groupPhoto);
      assert.strictEqual(insertedGroup.owner, izel);
      assert.strictEqual(groupPhoto.group, insertedGroup);
      assert.equal(InstanceDB.getReferences(group).size, 2);

      let cachedReference = MemoryGroup.Cache.get(insertedGroup.uuid);
      assert.equal(RelationshipDB.has(cachedReference, "owner"), false);
      assert.equal(RelationshipDB.has(cachedReference, "photo"), false);

      InstanceDB.getReferences(group).forEach((reference) => {
        if (reference !== cachedReference) {
          assert.strictEqual(reference.owner, izel);
          assert.strictEqual(reference.photo, groupPhoto);
        }
      });

      assert.strictEqual(groupPhoto.group, insertedGroup);

      InstanceDB.getReferences(group).forEach((reference) => {
        if (![cachedReference].includes(reference)) {
          assert.strictEqual(reference.owner, izel);
          assert.strictEqual(reference.photo, groupPhoto);
        }
      });

      insertedGroup.name = "Changed Hacker Log";

      assert.equal(insertedGroup.name, "Changed Hacker Log");

      let updatedGroup = await MemoryGroup.update(insertedGroup);

      assert.strictEqual(updatedGroup, group);
      assert.strictEqual(updatedGroup, insertedGroup);
      assert.strictEqual(updatedGroup.owner, izel);
      assert.strictEqual(updatedGroup.photo, groupPhoto);
      assert.strictEqual(groupPhoto.group, updatedGroup);
      assert.equal(InstanceDB.getReferences(group).size, 2);

      let lastCachedReference = MemoryGroup.Cache.get(updatedGroup.uuid);
      assert.equal(RelationshipDB.has(lastCachedReference, "owner"), false);
      assert.equal(RelationshipDB.has(lastCachedReference, "photo"), false);

      assert.deepEqual(
        updatedGroup,
        MemoryGroup.build({
          uuid: group.uuid,
          name: "Changed Hacker Log",
          owner: izel,
          photo: groupPhoto,
        })
      );

      assert.equal(InstanceDB.getReferences(group).size, 3);

      let peekedGroup = await MemoryGroup.peek(group.uuid);

      assert.notStrictEqual(peekedGroup, insertedGroup);
      assert.notStrictEqual(peekedGroup, group);
      assert.notStrictEqual(peekedGroup, updatedGroup);
      assert.equal(peekedGroup.name, "Changed Hacker Log");
      assert.equal(InstanceDB.getReferences(group).size, 4);

      let fetchedGroup = await MemoryGroup.find(group.uuid);

      assert.notStrictEqual(fetchedGroup, insertedGroup);
      assert.notStrictEqual(fetchedGroup, group);
      assert.notStrictEqual(fetchedGroup, peekedGroup);
      assert.equal(fetchedGroup.name, "Changed Hacker Log");
      assert.equal(InstanceDB.getReferences(group).size, 5);

      InstanceDB.getReferences(group).forEach((reference) => {
        if (![peekedGroup, cachedReference, fetchedGroup].includes(reference)) {
          assert.strictEqual(reference.owner, izel);
        }
      });

      assert.strictEqual(groupPhoto.group, fetchedGroup);
    });

    test("$Model.update($model) resets null set hasOne relationships after insert", async function (assert) {
      const { MemoryGroup, MemoryUser, MemoryPhoto } = generateIDModels();

      let group = MemoryGroup.build({ name: "Hacker Log" });

      assert.equal(await group.photo, null);

      let insertedGroup = await MemoryGroup.insert(group);
      let groupPhoto = await MemoryPhoto.insert({ name: "Some photo", group_id: 1 });
      let updatedGroup = await MemoryGroup.update(group);

      assert.deepEqual(group.photo.toJSON(), groupPhoto.toJSON());
      assert.deepEqual(insertedGroup.photo.toJSON(), groupPhoto.toJSON());
      assert.deepEqual(updatedGroup.photo.toJSON(), groupPhoto.toJSON());
    });
  });

  module("Cache timeout tests", function () {
    test("$Model.update(data, { cacheDuration: 0 }) can immediately evict the cache", async function (assert) {
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

      let photo = await MemoryPhoto.update({ id: 1, name: "ME" }, { cacheDuration: 0 });

      assert.matchJson(photo, {
        href: "ski-trip.jpeg",
        id: 1,
        is_public: false,
        name: "ME",
        group_uuid: null,
        owner_id: null,
      });
      assert.propEqual(await MemoryPhoto.findAll(), []);

      await MemoryPhoto.insert(PHOTOS[0]);

      let anotherPhoto = await MemoryPhoto.update({ id: 1, name: "ME" });

      assert.matchJson(anotherPhoto, {
        href: "ski-trip.jpeg",
        id: 1,
        is_public: false,
        name: "ME",
        group_uuid: null,
        owner_id: null,
      });
      assert.propEqual(await MemoryPhoto.findAll(), [
        MemoryPhoto.build({
          href: "ski-trip.jpeg",
          id: 1,
          is_public: false,
          name: "ME",
        }),
      ]);
    });

    test("$Model.update(json. { cacheDuration: $cacheTimeout }) can cache with different cache timeouts", async function (assert) {
      const { MemoryPhoto } = generateModels();

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));

      assert.propEqual(
        await MemoryPhoto.findAll(),
        PHOTOS.map((photo) => MemoryPhoto.build(photo))
      );

      let photoOne = await MemoryPhoto.update({ id: PHOTOS[1].id, name: "first" }, { cacheDuration: 10 });
      let photoTwo = await MemoryPhoto.update({ id: PHOTOS[2].id, name: "second" }, { cacheDuration: 70 });

      assert.propEqual(photoOne, MemoryPhoto.build({ ...PHOTOS[1], name: "first" }));
      assert.propEqual(photoTwo, MemoryPhoto.build({ ...PHOTOS[2], name: "second" }));
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

      await wait(60);

      assert.propEqual(await MemoryPhoto.findAll(), [
        MemoryPhoto.build({
          href: "ski-trip.jpeg",
          id: 1,
          name: "Ski trip",
          is_public: false,
        }),
      ]);
    });

    test("$Model.update(json. { cacheDuration: $cacheTimeout }) can override previous $cacheTimeout", async function (assert) {
      const { MemoryPhoto } = generateModels();

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));

      assert.propEqual(
        await MemoryPhoto.findAll(),
        PHOTOS.map((photo) => MemoryPhoto.build(photo))
      );

      await MemoryPhoto.update({ id: PHOTOS[1].id, name: "aa" }, { cacheDuration: 10 });
      await MemoryPhoto.update({ id: PHOTOS[1].id, name: "bb" }, { cacheDuration: 70 });
      await wait(25);

      assert.propEqual(await MemoryPhoto.findAll(), [
        MemoryPhoto.build(PHOTOS[0]),
        MemoryPhoto.build({ ...PHOTOS[1], name: "bb" }),
        MemoryPhoto.build(PHOTOS[2]),
      ]);

      await wait(150);

      assert.propEqual(await MemoryPhoto.findAll(), [MemoryPhoto.build(PHOTOS[0]), MemoryPhoto.build(PHOTOS[2])]);

      await MemoryPhoto.update({ id: PHOTOS[0].id, name: "bb" }, { cacheDuration: 150 });
      await wait(25);

      assert.propEqual(await MemoryPhoto.findAll(), [
        MemoryPhoto.build({ ...PHOTOS[0], name: "bb" }),
        MemoryPhoto.build(PHOTOS[2]),
      ]);

      await MemoryPhoto.update({ id: PHOTOS[0].id, name: "aa" }, { cacheDuration: 25 });
      await wait(25);

      assert.propEqual(await MemoryPhoto.findAll(), [MemoryPhoto.build(PHOTOS[2])]);
    });
  });
});
