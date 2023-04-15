import { DB, UpdateError, InstanceDB, RelationshipDB } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";
import generateModels from "../helpers/models-with-relations/sql/mix/index.js";
import generateIDModels from "../helpers/models-with-relations/sql/id/index.js";
import FIXTURES from "../helpers/fixtures/mix/index.js";

const { PHOTOS, PHOTO_COMMENTS } = FIXTURES;

module("@memoria/adapters | SQLAdapter | $Model.update()", function (hooks) {
  setupMemoria(hooks);

  module("Success cases", function () {
    test("$Model.update(attributes) can update models", async function (assert) {
      const { SQLPhoto, SQLPhotoComment } = generateModels();
      await DB.resetRecords();

      await Promise.all(PHOTOS.map((photo) => SQLPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => SQLPhotoComment.insert(photoComment)));

      let firstComment = await SQLPhotoComment.findBy({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29" });
      assert.matchJson(firstComment, {
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        inserted_at: String,
        updated_at: String,
        is_important: true,
        content: "Interesting indeed",
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

      let photo = await SQLPhoto.find(1);
      assert.propEqual(
        photo,
        SQLPhoto.build({
          id: 1,
          name: "Ski trip",
          href: "ski-trip.jpeg",
          is_public: false,
        })
      );

      let firstPhoto = await SQLPhoto.update({
        id: 1,
        name: "S trip",
        href: "ski-trip.jpeg",
        is_public: false,
      });
      assert.propEqual(
        firstPhoto,
        SQLPhoto.build({
          id: 1,
          name: "S trip",
          href: "ski-trip.jpeg",
          is_public: false,
        })
      );
      assert.propEqual(firstPhoto, Object.assign(await SQLPhoto.find(1), { name: "S trip" }));
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

      let secondPhoto = await SQLPhoto.update({ id: 2, href: "family-photo-2.jpeg", is_public: false });
      assert.ok(!secondPhoto.isNew && !secondPhoto.isDirty && secondPhoto.isPersisted && !secondPhoto.isDeleted);
      assert.propEqual(
        secondPhoto,
        SQLPhoto.build({
          id: 2,
          name: "Family photo",
          href: "family-photo-2.jpeg",
          is_public: false,
        })
      );
      assert.propEqual(secondPhoto, await SQLPhoto.find(2));

      let comment = await SQLPhotoComment.update({
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        content: "Cool",
      });
      assert.ok(!comment.isNew && !comment.isDirty && comment.isPersisted && !comment.isDeleted);
      assert.matchJson(comment, {
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        inserted_at: String,
        updated_at: String,
        is_important: true,
        content: "Cool",
        photo_id: 2,
        user_id: 1,
      });
      assert.ok(comment.inserted_at instanceof Date);
      assert.ok(comment.updated_at instanceof Date);
      assert.propEqual(comment, await SQLPhotoComment.findBy({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29" }));

      assert.propEqual(firstComment.inserted_at, comment.inserted_at);
      assert.propEqual(firstComment.updated_at, comment.updated_at);
    });

    test("$Model.update(attributes) does not throw an exception when a model gets updated with an unknown $Model.attribute", async function (assert) {
      const { SQLPhoto, SQLPhotoComment } = generateModels();
      await DB.resetRecords();

      await Promise.all(PHOTOS.map((photo) => SQLPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => SQLPhotoComment.insert(photoComment)));

      let photo = await SQLPhoto.update({ id: 1, name: "ME", is_verified: false });

      assert.matchJson(photo, {
        id: 1,
        name: "ME",
        href: "ski-trip.jpeg",
        is_public: false,
        group_uuid: null,
        owner_id: null,
      });

      let photoComment = await SQLPhotoComment.update({
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        location: "Amsterdam",
      });

      assert.matchJson(photoComment, {
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        inserted_at: String,
        updated_at: String,
        is_important: true,
        content: "Interesting indeed",
        photo_id: 2,
        user_id: 1,
      });
    });
  });

  module("Error cases", function () {
    test("$Model.update(attributes) throws an exception when updating a nonexistent model", async function (assert) {
      const { SQLPhoto, SQLPhotoComment } = generateModels();
      await DB.resetRecords();

      await Promise.all(PHOTOS.map((photo) => SQLPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => SQLPhotoComment.insert(photoComment)));

      try {
        await SQLPhoto.update({ id: 99, href: "family-photo-2.jpeg" });
      } catch (error) {
        assert.ok(error instanceof UpdateError);
      }

      try {
        await SQLPhotoComment.update({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5666", content: "Nice" });
      } catch (error) {
        assert.ok(error instanceof UpdateError);
      }
    });
  });

  module("Reference tests", function () {
    test("$Model.update($model) creates a copied object in store and returns another copied object instead of the actual object", async function (assert) {
      const { SQLPhoto } = generateModels();
      await DB.resetRecords();

      let insertedPhoto = await SQLPhoto.insert({
        id: 2,
        name: "Something",
        href: "/something.jpg",
        is_public: false,
      });

      assert.equal(InstanceDB.getReferences(insertedPhoto).size, 2);

      assert.propEqual(
        insertedPhoto,
        SQLPhoto.build({
          id: 2,
          name: "Something",
          href: "/something.jpg",
          is_public: false,
        })
      );

      assert.equal(InstanceDB.getReferences(insertedPhoto).size, 3);

      let updatedPhoto = await SQLPhoto.update({ id: 2, name: "Another", href: "/another.jpg" });

      assert.notStrictEqual(insertedPhoto, updatedPhoto);
      assert.equal(InstanceDB.getReferences(updatedPhoto).size, 4);
      assert.propEqual(
        updatedPhoto,
        SQLPhoto.build({
          id: 2,
          name: "Another",
          href: "/another.jpg",
          is_public: false,
        })
      );

      assert.deepEqual(SQLPhoto.peek(updatedPhoto.id), updatedPhoto);
      assert.equal(InstanceDB.getReferences(updatedPhoto).size, 6);
      assert.equal(InstanceDB.getReferences(insertedPhoto), InstanceDB.getReferences(updatedPhoto));

      updatedPhoto.name = "testing store just holds a copy";

      assert.equal(updatedPhoto.name, "testing store just holds a copy");
      assert.notPropEqual(SQLPhoto.peek(updatedPhoto.id), updatedPhoto);
    });

    test("$Model.update($model) copies relationships but not for stored instance, also update references", async function (assert) {
      const { SQLGroup, SQLUser, SQLPhoto } = generateModels();
      await DB.resetRecords();

      let izel = SQLUser.build({ first_name: "Izel", last_name: "Nakri" });
      let groupPhoto = SQLPhoto.build();
      let group = SQLGroup.build({ name: "Hacker Log", owner: izel, photo: groupPhoto }); // TODO: add here also hasMany in the future and reflections

      assert.strictEqual(group.owner, izel);
      assert.strictEqual(group.photo, groupPhoto);

      let insertedGroup = await SQLGroup.insert(group);

      assert.strictEqual(insertedGroup, group);
      assert.strictEqual(insertedGroup.photo, groupPhoto);
      assert.strictEqual(insertedGroup.owner, izel);
      assert.strictEqual(groupPhoto.group, insertedGroup);
      assert.equal(InstanceDB.getReferences(group).size, 2);

      let cachedReference = SQLGroup.Cache.get(insertedGroup.uuid);
      assert.equal(RelationshipDB.has(cachedReference, "owner"), false);
      assert.equal(RelationshipDB.has(cachedReference, "photo"), false);

      InstanceDB.getReferences(group).forEach((reference) => {
        if (reference !== cachedReference) {
          assert.equal(reference.owner, izel);
          assert.equal(reference.photo, groupPhoto);
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

      let updatedGroup = await SQLGroup.update(insertedGroup);

      assert.strictEqual(updatedGroup, group);
      assert.strictEqual(updatedGroup, insertedGroup);
      assert.strictEqual(updatedGroup.owner, izel);
      assert.strictEqual(updatedGroup.photo, groupPhoto);
      assert.strictEqual(groupPhoto.group, updatedGroup);
      assert.equal(InstanceDB.getReferences(group).size, 2);

      let lastCachedReference = SQLGroup.Cache.get(updatedGroup.uuid);
      assert.equal(RelationshipDB.has(lastCachedReference, "owner"), false);
      assert.equal(RelationshipDB.has(lastCachedReference, "photo"), false);

      assert.deepEqual(
        updatedGroup,
        SQLGroup.build({
          uuid: group.uuid,
          name: "Changed Hacker Log",
          owner: izel,
          photo: groupPhoto,
        })
      );

      assert.equal(InstanceDB.getReferences(group).size, 3);

      let peekedGroup = await SQLGroup.peek(group.uuid);

      assert.notEqual(peekedGroup, insertedGroup);
      assert.notEqual(peekedGroup, group);
      assert.notEqual(peekedGroup, updatedGroup);
      assert.equal(peekedGroup.name, "Changed Hacker Log");
      assert.equal(InstanceDB.getReferences(group).size, 4);

      let fetchedGroup = await SQLGroup.find(group.uuid);

      assert.notStrictEqual(peekedGroup, insertedGroup);
      assert.notStrictEqual(peekedGroup, group);
      assert.notStrictEqual(peekedGroup, updatedGroup);
      assert.equal(peekedGroup.name, "Changed Hacker Log");
      assert.equal(InstanceDB.getReferences(group).size, 5);

      InstanceDB.getReferences(group).forEach((reference) => {
        if (![peekedGroup, cachedReference, fetchedGroup].includes(reference)) {
          assert.strictEqual(reference.owner, izel);
        }
      });

      assert.strictEqual(groupPhoto.group, fetchedGroup);
    });

    test("$Model.update($model) resets null set hasOne relationships after insert", async function (assert) {
      const { SQLGroup, SQLPhoto } = generateIDModels();

      let group = SQLGroup.build({ name: "Hacker Log" });

      assert.equal(await group.photo, null);

      let insertedGroup = await SQLGroup.insert(group);
      let groupPhoto = await SQLPhoto.insert({ name: "Some photo", group_id: 1 });
      let updatedGroup = await SQLGroup.update(group);

      assert.deepEqual(group.photo.toJSON(), groupPhoto.toJSON());
      assert.deepEqual(insertedGroup.photo.toJSON(), groupPhoto.toJSON());
      assert.deepEqual(updatedGroup.photo.toJSON(), groupPhoto.toJSON());
    });
  });
});
