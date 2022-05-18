import Model, {
  DB,
  Column,
  CreateDateColumn,
  InstanceDB,
  PrimaryGeneratedColumn,
  InsertError,
  RuntimeError,
  RelationshipDB
} from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";
import SQLAdapter from "../helpers/sql-adapter.js";
import generateModels from "../helpers/models-with-relations/sql/mix/index.js";
import FIXTURES from "../helpers/fixtures/mix/index.js"

const { PHOTOS, PHOTO_COMMENTS } = FIXTURES;

module("@memoria/adapters | SQLAdapter | $Model.insert()", function (hooks) {
  setupMemoria(hooks);

  module('Primary key tests', function () {
    test("$Model.insert() will insert an empty model and auto-generate primaryKeys", async function (assert) {
      const { SQLPhoto, SQLPhotoComment } = generateModels();
      await DB.resetRecords();

      let initialPhotos = await Promise.all(PHOTOS.map((photo) => SQLPhoto.insert(photo)));

      assert.propEqual(initialPhotos, PHOTOS.map((photo) => SQLPhoto.build(photo)));

      assert.ok(
        initialPhotos.every(
          (photo) => !photo.isNew && photo.isPersisted && !photo.isDirty && !photo.isDeleted
        )
      );

      let initialPhotoComments = await Promise.all(
        PHOTO_COMMENTS.map((photoComment) => SQLPhotoComment.insert(photoComment))
      );

      assert.ok(
        initialPhotoComments.every(
          (comment) => !comment.isNew && comment.isPersisted && !comment.isDirty && !comment.isDeleted
        )
      );
      assert.deepEqual(
        (await SQLPhoto.findAll()).map((photo) => photo.id),
        [1, 2, 3]
      );

      await SQLPhoto.insert();

      assert.deepEqual(
        (await SQLPhoto.findAll()).map((photo) => photo.id),
        [1, 2, 3, 4]
      );

      await SQLPhoto.insert();

      assert.equal(await SQLPhoto.count(), 5);
      assert.propEqual(await SQLPhoto.findAll(), [
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
      ].map((photo) => SQLPhoto.build(photo)));

      const initialCommentUUIDs = (await SQLPhotoComment.findAll()).map((photoComment) => photoComment.uuid);

      assert.deepEqual(initialCommentUUIDs, [
        "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        "499ec646-493f-4eea-b92e-e383d94182f4",
        "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
        "d351963d-e725-4092-a37c-1ca1823b57d3",
      ]);

      await SQLPhotoComment.insert();

      const allPhotoComments = await SQLPhotoComment.findAll();
      const lastPhotoComment = allPhotoComments[allPhotoComments.length - 1];

      assert.equal(await SQLPhotoComment.count(), 5);
      assert.ok(allPhotoComments[4].uuid, "inserted comment has a unique uuid");
    });

    test("$Model.insert(attributes) will throw if overriden primaryKey already exists", async function (assert) {
      const { SQLPhoto, SQLPhotoComment } = generateModels();
      await DB.resetRecords();

      await Promise.all(PHOTOS.map((photo) => SQLPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => SQLPhotoComment.insert(photoComment)));

      try {
        await SQLPhoto.insert({ id: 1 });
      } catch (error) {
        assert.ok(error instanceof InsertError);
      }
      try {
        await SQLPhotoComment.insert({ uuid: "d351963d-e725-4092-a37c-1ca1823b57d3" });
      } catch (error) {
        assert.ok(error instanceof InsertError);
      }
    });

    test("$Model.insert(attributes) will throw if overriden primaryKey is wrong type", async function (assert) {
      const { SQLPhoto, SQLPhotoComment } = generateModels();
      await DB.resetRecords();

      await Promise.all(PHOTOS.map((photo) => SQLPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => SQLPhotoComment.insert(photoComment)));

      try {
        await SQLPhoto.insert({ id: "99" });
      } catch (error) {
        assert.ok(error instanceof RuntimeError);
      }
      try {
        await SQLPhotoComment.insert({ uuid: 1 });
      } catch (error) {
        assert.ok(error instanceof RuntimeError);
      }
    });
  });

  module('Attribute tests', function () {
    test("$Model.insert(attributes) will insert a model with overriden attributes", async function (assert) {
      const { SQLPhoto, SQLPhotoComment } = generateModels();
      await DB.resetRecords();

      await Promise.all(PHOTOS.map((photo) => SQLPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => SQLPhotoComment.insert(photoComment)));

      await SQLPhoto.insert({ id: 99, href: "/izel.html", is_public: false });

      let model = await SQLPhoto.insert({ name: "Baby photo", href: "/baby.jpg" });
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
        group_uuid: null
      });
      assert.deepEqual(model.revisionHistory, [
        {
          id: 100,
          name: "Baby photo",
          href: "/baby.jpg",
          is_public: true,
          owner_id: null,
          group_uuid: null
        },
      ]);

      assert.equal(await SQLPhoto.count(), 5);
      assert.propEqual(await SQLPhoto.findAll(), [
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
      ].map((photo) => SQLPhoto.build(photo)));

      const initialCommentUUIDs = (await SQLPhotoComment.findAll()).map((comment) => comment.uuid);
      const commentOne = await SQLPhotoComment.insert({
        uuid: "63538a3b-911b-430f-bcf4-4f60d41fca27",
        inserted_at: new Date("2015-10-25T20:54:04.447Z"),
        photo_id: 1,
      });
      assert.notOk(commentOne.isNew);
      assert.ok(commentOne.isPersisted);
      assert.notOk(commentOne.isDeleted);
      assert.notOk(commentOne.isDirty);
      assert.deepEqual(commentOne.changes, {});
      assert.deepEqual(commentOne.revision, {
        inserted_at: new Date("2015-10-25T20:54:04.447Z"),
        content: null,
        is_important: true,
        photo_id: 1,
        user_id: null,
        uuid: "63538a3b-911b-430f-bcf4-4f60d41fca27",
      });
      assert.deepEqual(commentOne.revisionHistory, [
        {
          inserted_at: new Date("2015-10-25T20:54:04.447Z"),
          content: null,
          is_important: true,
          photo_id: 1,
          user_id: null,
          uuid: "63538a3b-911b-430f-bcf4-4f60d41fca27",
        },
      ]);
      const commentTwo = await SQLPhotoComment.insert({
        uuid: "6401f27c-49aa-4da7-9835-08f6f669e29f",
        is_important: false,
      });

      assert.equal(await SQLPhotoComment.count(), 6);

      const allComments = await SQLPhotoComment.findAll();
      const lastInsertedComments = allComments.filter((comment) => !initialCommentUUIDs.includes(comment.uuid));

      assert.matchJson(
        allComments.find((comment) => comment.uuid === commentOne.uuid),
        JSON.parse(JSON.stringify(commentOne)),
        "first comment insert in the database"
      );
      assert.matchJson(
        allComments.find((comment) => comment.uuid === commentTwo.uuid),
        JSON.parse(JSON.stringify(commentTwo)),
        "first comment insert in the database"
      );

      assert.deepEqual(commentOne.inserted_at, new Date("2015-10-25T20:54:04.447Z"));
      assert.equal(commentOne.photo_id, 1);
      assert.equal(commentOne.is_important, true);
      assert.equal(commentTwo.uuid, "6401f27c-49aa-4da7-9835-08f6f669e29f");
      assert.ok(new Date() - commentTwo.inserted_at < 10000);
      assert.equal(commentTwo.photo_id, null);
      assert.equal(commentTwo.is_important, false);
      assert.equal(lastInsertedComments.length, 2);
    });

    test("$Model.insert(attributes) cannot add new values to $Model.attributes when new attributes are discovered", async function (assert) {
      const { SQLPhoto, SQLPhotoComment } = generateModels();
      await DB.resetRecords();

      await Promise.all([SQLPhoto, SQLPhotoComment].map((model) => model.resetCache()));
      await Promise.all(PHOTOS.map((photo) => SQLPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => SQLPhotoComment.insert(photoComment)));

      await SQLPhoto.insert({
        published_at: new Date("2017-10-10").toJSON(),
        description: "Some description",
      });
      await SQLPhoto.insert({ location: "Istanbul", is_public: false });
      await SQLPhotoComment.insert({ updated_at: new Date("2017-01-10").toJSON(), like_count: 22 });
      await SQLPhotoComment.insert({ reply_id: 1 });

      assert.deepEqual(Array.from(SQLPhoto.columnNames), ["id", "name", "href", "is_public", "owner_id", "group_uuid"]);
      assert.deepEqual(Array.from(SQLPhotoComment.columnNames), [
        "uuid",
        "content",
        "is_important",
        "inserted_at",
        "user_id",
        "photo_id",
      ]);
      assert.propEqual(await SQLPhoto.findAll(), [
        ...PHOTOS,
        {
          id: 4,
          is_public: true,
          name: "Photo default name",
          href: null,
        },
        {
          id: 5,
          is_public: false,
          name: "Photo default name",
          href: null,
        },
      ].map((photo) => SQLPhoto.build(photo)));
    });
  });

  module('Reference tests', function () {
    test("$Model.insert($model) creates a copied object in store and returns another copied object instead of the actual object", async function (assert) {
      const { SQLPhoto } = generateModels();
      await DB.resetRecords();

      let photo = SQLPhoto.build({ name: "some name" });
      assert.propEqual(photo, SQLPhoto.build({
        href: null,
        id: null,
        is_public: null,
        name: "some name",
      }));

      assert.equal(InstanceDB.getReferences(photo).size, 1);

      let insertedPhoto = await SQLPhoto.insert(photo);

      assert.notEqual(insertedPhoto, photo);
      assert.propEqual(insertedPhoto, SQLPhoto.build({
        href: null,
        id: 1,
        is_public: null,
        name: "some name",
      }));
      assert.propEqual(photo, SQLPhoto.build({
        href: null,
        id: 1,
        is_public: null,
        name: "some name",
      }));
      assert.propEqual(SQLPhoto.peek(insertedPhoto.id), insertedPhoto);
      assert.equal(InstanceDB.getReferences(photo).size, 6);
      assert.equal(InstanceDB.getReferences(photo), InstanceDB.getReferences(insertedPhoto));

      insertedPhoto.name = "testing store just holds a copy";

      assert.equal(insertedPhoto.name, "testing store just holds a copy");
      assert.notEqual(photo.name, insertedPhoto.name);
      assert.notPropEqual(SQLPhoto.peek(photo.id), insertedPhoto);
    });

    test("$Model.insert($model) copies relationships but not for stored instance, also update references", async function (assert) {
      const { SQLGroup, SQLUser, SQLPhoto } = generateModels();
      await DB.resetRecords();

      let izel = SQLUser.build({ first_name: "Izel", last_name: "Nakri" });
      let groupPhoto = SQLPhoto.build();
      let group = SQLGroup.build({ name: "Hacker Log", owner: izel, photo: groupPhoto }); // TODO: add here also hasMany in the future and reflections

      assert.equal(group.owner, izel);
      assert.equal(group.photo, groupPhoto);

      let insertedGroup = await SQLGroup.insert(group);
      let existingGroupReferences = InstanceDB.getReferences(group);

      assert.notEqual(insertedGroup, group);
      assert.equal(insertedGroup.photo, groupPhoto);
      assert.equal(groupPhoto.group, insertedGroup);
      assert.equal(existingGroupReferences.size, 3);

      let cachedReference = SQLGroup.Cache.get(insertedGroup.uuid);
      assert.equal(RelationshipDB.has(cachedReference, 'owner'), false);
      assert.equal(RelationshipDB.has(cachedReference, 'photo'), false);

      InstanceDB.getReferences(group).forEach((reference) => {
        if (reference !== cachedReference) {
          assert.equal(reference.owner, izel);
          assert.equal(reference.photo, groupPhoto);
        }
      });

      let somePeekedModel = await SQLGroup.peek(group.uuid);

      assert.equal(groupPhoto.group, insertedGroup);

      let newBuiltReference = SQLGroup.build({
        uuid: group.uuid,
        name: "Hacker Log",
        owner: izel,
        photo: groupPhoto
      });

      assert.deepEqual(insertedGroup, newBuiltReference);
      assert.equal(insertedGroup.owner, izel);
      assert.equal(insertedGroup.photo, groupPhoto);

      assert.equal(InstanceDB.getReferences(group).size, 5);
      assert.equal(RelationshipDB.has(cachedReference, 'owner'), false);
      assert.equal(RelationshipDB.has(cachedReference, 'photo'), false);

      InstanceDB.getReferences(group).forEach((reference) => {
        if (![somePeekedModel, cachedReference].includes(reference)) {
          assert.equal(reference.owner, izel);
          assert.equal(reference.photo, groupPhoto);
        }
      });

      assert.notEqual(groupPhoto.group, insertedGroup);

      let peekedGroup = await SQLGroup.peek(group.uuid);

      assert.notEqual(peekedGroup, insertedGroup);
      assert.notEqual(peekedGroup, group);
      assert.equal(InstanceDB.getReferences(group).size, 6);
      assert.equal(groupPhoto.group, newBuiltReference);

      let fetchedGroup = await SQLGroup.find(group.uuid);

      assert.notEqual(fetchedGroup, insertedGroup);
      assert.notEqual(fetchedGroup, group);
      assert.notEqual(fetchedGroup, peekedGroup);
      assert.equal(InstanceDB.getReferences(group).size, 7);

      InstanceDB.getReferences(group).forEach((reference) => {
        if (![somePeekedModel, peekedGroup, cachedReference, fetchedGroup].includes(reference)) {
          assert.equal(reference.owner, izel);
          assert.equal(reference.photo, groupPhoto);
        }
      });

      assert.equal(groupPhoto.group, fetchedGroup);
    });
  });
});
