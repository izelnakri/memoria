import Memoria from "@memoria/server";
import { RESTAdapter, MemoryAdapter } from "@memoria/adapters";
import Model, {
  Changeset,
  DB,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  UpdateError,
  InstanceDB,
  RelationshipDB
} from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";
import FIXTURES from "../helpers/fixtures/mix/index.js";
import generateModels from "../helpers/models-with-relations/rest/mix/index.js";

const { PHOTOS, PHOTO_COMMENTS } = FIXTURES;

module("@memoria/adapters | RESTAdapter | $Model.update()", function (hooks) {
  setupMemoria(hooks);

  module('Success cases', function () {
    test("$Model.update(attributes) can update models", async function (assert) {
      const { RESTPhoto, RESTPhotoComment, Server } = generateModels();
      this.Server = Server;

      await Promise.all(PHOTOS.map((photo) => RESTPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => RESTPhotoComment.insert(photoComment)));

      let firstComment = await RESTPhotoComment.findBy({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29" });
      assert.matchJson(firstComment, {
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        inserted_at: String,
        updated_at: String,
        is_important: true,
        content: "Interesting indeed",
        photo_id: 2,
        user_id: 1
      });
      assert.ok(firstComment.inserted_at instanceof Date);
      assert.ok(firstComment.updated_at instanceof Date);
      assert.notOk(firstComment.isNew);
      assert.ok(firstComment.isPersisted);
      assert.notOk(firstComment.isDeleted);
      assert.notOk(firstComment.isDirty);
      assert.deepEqual(firstComment.changes, {});

      let photo = await RESTPhoto.find(1);
      assert.propEqual(photo, RESTPhoto.build({
        id: 1,
        name: "Ski trip",
        href: "ski-trip.jpeg",
        is_public: false,
      }));

      let firstPhoto = await RESTPhoto.update({
        id: 1,
        name: "S trip",
        href: "ski-trip.jpeg",
        is_public: false,
      });
      assert.propEqual(firstPhoto, RESTPhoto.build({
        id: 1,
        name: "S trip",
        href: "ski-trip.jpeg",
        is_public: false,
      }));
      assert.propEqual(firstPhoto, Object.assign(await RESTPhoto.find(1), { name: "S trip" }));
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
        owner_id: null
      });
      assert.deepEqual(firstPhoto.revisionHistory, [
        {
          id: 1,
          name: "Ski trip",
          href: "ski-trip.jpeg",
          is_public: false,
          group_uuid: null,
          owner_id: null
        },
        {
          id: 1,
          name: "S trip",
          href: "ski-trip.jpeg",
          is_public: false,
          group_uuid: null,
          owner_id: null
        },
      ]);

      let secondPhoto = await RESTPhoto.update({ id: 2, href: "family-photo-2.jpeg", is_public: false });
      assert.ok(
        !secondPhoto.isNew &&
          !secondPhoto.isDirty &&
          secondPhoto.isPersisted &&
          !secondPhoto.isDeleted
      );
      assert.propEqual(secondPhoto, RESTPhoto.build({
        id: 2,
        name: "Family photo",
        href: "family-photo-2.jpeg",
        is_public: false,
      }));
      assert.propEqual(secondPhoto, await RESTPhoto.find(2));

      let comment = await RESTPhotoComment.update({
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
        user_id: 1
      });
      assert.ok(comment.inserted_at instanceof Date);
      assert.ok(comment.updated_at instanceof Date);
      assert.propEqual(firstComment.inserted_at, comment.inserted_at);
      assert.propEqual(firstComment.updated_at, comment.updated_at);
      assert.propEqual(
        comment,
        await RESTPhotoComment.findBy({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29" })
      );
    });

    test("$Model.update(attributes) does not throw an exception when a model gets updated with an unknown $Model.attribute", async function (assert) {
      const { RESTPhoto, RESTPhotoComment, Server } = generateModels();
      this.Server = Server;

      await Promise.all(PHOTOS.map((photo) => RESTPhoto.insert(photo)));
      await Promise.all(
        PHOTO_COMMENTS.map((photoComment) => RESTPhotoComment.insert(photoComment))
      );

      let photo = await RESTPhoto.update({ id: 1, name: "ME", is_verified: false });

      assert.matchJson(photo, {
        id: 1,
        name: "ME",
        href: "ski-trip.jpeg",
        is_public: false,
        group_uuid: null,
        owner_id: null
      });

      let photoComment = await RESTPhotoComment.update({
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
        user_id: 1
      });
    });
  });

  module('Error cases', function () {
    test("$Model.update(attributes) throws an exception when updating a nonexistent model", async function (assert) {
      const { RESTPhoto, RESTPhotoComment, Server } = generateModels();
      this.Server = Server;

      await Promise.all(PHOTOS.map((photo) => RESTPhoto.insert(photo)));
      await Promise.all(
        PHOTO_COMMENTS.map((photoComment) => RESTPhotoComment.insert(photoComment))
      );

      try {
        await RESTPhoto.update({ id: 99, href: "family-photo-2.jpeg" });
      } catch (error) {
        assert.ok(error instanceof UpdateError);
      }

      try {
        await RESTPhotoComment.update({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5666", content: "Nice" });
      } catch (error) {
        assert.ok(error instanceof UpdateError);
      }
    });
  });

  module('Reference tests', function () {
    test("$Model.update($model) creates a copied object in store and returns another copied object instead of the actual object", async function (assert) {
      const { RESTPhoto, Server } = generateModels();
      this.Server = Server;

      let insertedPhoto = await RESTPhoto.insert({
        id: 2, name: "Something", href: "/something.jpg", is_public: false
      });

      assert.equal(InstanceDB.getReferences(insertedPhoto).size, 2);

      assert.propEqual(insertedPhoto, RESTPhoto.build({
        id: 2, name: "Something", href: "/something.jpg", is_public: false
      }));

      assert.equal(InstanceDB.getReferences(insertedPhoto).size, 3);

      let updatedPhoto = await RESTPhoto.update({ id: 2, name: "Another", href: "/another.jpg" });

      assert.notEqual(insertedPhoto, updatedPhoto);
      assert.equal(InstanceDB.getReferences(updatedPhoto).size, 4);
      assert.propEqual(updatedPhoto, RESTPhoto.build({
        id: 2,
        name: "Another",
        href: "/another.jpg",
        is_public: false,
      }));

      assert.deepEqual(RESTPhoto.peek(updatedPhoto.id), updatedPhoto);
      assert.equal(InstanceDB.getReferences(updatedPhoto).size, 6);
      assert.equal(InstanceDB.getReferences(insertedPhoto), InstanceDB.getReferences(updatedPhoto));

      updatedPhoto.name = "testing store just holds a copy";

      assert.equal(updatedPhoto.name, "testing store just holds a copy");
      assert.notPropEqual(RESTPhoto.peek(updatedPhoto.id), updatedPhoto);
    });

    test("$Model.update($model) copies relationships but not for stored instance, also update references", async function (assert) {
      const { RESTGroup, RESTUser, RESTPhoto, Server } = generateModels();
      this.Server = Server;

      let izel = RESTUser.build({ first_name: "Izel", last_name: "Nakri" });
      let groupPhoto = RESTPhoto.build();
      let group = RESTGroup.build({ name: "Hacker Log", owner: izel, photo: groupPhoto }); // TODO: add here also hasMany in the future and reflections

      assert.equal(group.owner, izel);
      assert.equal(group.photo, groupPhoto);

      let insertedGroup = await RESTGroup.insert(group);

      assert.notEqual(insertedGroup, group);
      assert.equal(insertedGroup.photo, groupPhoto);
      assert.equal(insertedGroup.owner, izel);
      assert.equal(groupPhoto.group, insertedGroup);
      assert.equal(InstanceDB.getReferences(group).size, 3);

      let cachedReference = RESTGroup.Cache.get(insertedGroup.uuid);
      assert.equal(RelationshipDB.has(cachedReference, 'owner'), false);
      assert.equal(RelationshipDB.has(cachedReference, 'photo'), false);

      InstanceDB.getReferences(group).forEach((reference) => {
        if (reference !== cachedReference) {
          assert.equal(reference.owner, izel);
          assert.equal(reference.photo, groupPhoto);
        }
      });

      assert.equal(groupPhoto.group, insertedGroup);

      InstanceDB.getReferences(group).forEach((reference) => {
        if (![cachedReference].includes(reference)) {
          assert.equal(reference.owner, izel);
          assert.equal(reference.photo, groupPhoto);
        }
      });

      insertedGroup.name = 'Changed Hacker Log';

      assert.equal(insertedGroup.name, 'Changed Hacker Log');

      let updatedGroup = await RESTGroup.update(insertedGroup);

      assert.notEqual(updatedGroup, group);
      assert.notEqual(updatedGroup, insertedGroup);
      assert.equal(updatedGroup.owner, izel);
      assert.equal(updatedGroup.photo, groupPhoto);
      assert.equal(groupPhoto.group, updatedGroup);
      assert.equal(InstanceDB.getReferences(group).size, 4);

      let lastCachedReference = RESTGroup.Cache.get(updatedGroup.uuid);
      assert.equal(RelationshipDB.has(lastCachedReference, 'owner'), false);
      assert.equal(RelationshipDB.has(lastCachedReference, 'photo'), false);

      assert.deepEqual(updatedGroup, RESTGroup.build({
        uuid: group.uuid,
        name: "Changed Hacker Log",
        owner: izel,
        photo: groupPhoto
      }));

      assert.equal(InstanceDB.getReferences(group).size, 5);

      let peekedGroup = await RESTGroup.peek(group.uuid);

      assert.notEqual(peekedGroup, insertedGroup);
      assert.notEqual(peekedGroup, group);
      assert.notEqual(peekedGroup, updatedGroup);
      assert.equal(peekedGroup.name, 'Changed Hacker Log');
      assert.equal(InstanceDB.getReferences(group).size, 6);

      let fetchedGroup = await RESTGroup.find(group.uuid);

      assert.notEqual(fetchedGroup, insertedGroup);
      assert.notEqual(fetchedGroup, group);
      assert.notEqual(fetchedGroup, peekedGroup);
      assert.equal(fetchedGroup.name, 'Changed Hacker Log');
      assert.equal(InstanceDB.getReferences(group).size, 7);

      InstanceDB.getReferences(group).forEach((reference) => {
        if (![peekedGroup, cachedReference, fetchedGroup].includes(reference)) {
          assert.equal(reference.owner, izel);
          assert.equal(reference.photo, groupPhoto);
        }
      });

      assert.equal(groupPhoto.group, fetchedGroup);
    });
  });
});
