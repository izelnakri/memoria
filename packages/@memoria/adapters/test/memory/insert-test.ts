// TODO: write tests for instance difference AND relationship storage difference tests
import Model, {
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  InsertError,
  RuntimeError,
} from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";
import wait from "@memoria/model/test/helpers/wait.js";
import FIXTURES from "../helpers/fixtures/mix/index.js";
import generateModels from "../helpers/models-with-relations/memory/mix/index.js";

const { PHOTOS, PHOTO_COMMENTS } = FIXTURES;

module("@memoria/adapters | MemoryAdapter | $Model.insert()", function (hooks) {
  setupMemoria(hooks);

  test("$Model.insert() will insert an empty model and auto-generate primaryKeys", async function (assert) {
    const { MemoryPhoto, MemoryPhotoComment } = generateModels();

    let initialPhotos = await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));

    assert.propEqual(initialPhotos, PHOTOS.map((photo) => MemoryPhoto.build(photo)));
    assert.ok(
      initialPhotos.every(
        (photo) => !photo.isNew && photo.isPersisted && !photo.isDirty && !photo.isDeleted
      )
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
    assert.propEqual(await MemoryPhoto.findAll(), [
      ...PHOTOS,
      {
        id: 4,
        is_public: true,
        name: "Default photo name",
        href: null,
        owner_id: null,
        group_uuid: null
      },
      {
        id: 5,
        is_public: true,
        name: "Default photo name",
        href: null,
        owner_id: null,
        group_uuid: null
      },
    ].map((photo) => MemoryPhoto.build(photo)));

    const initialCommentUUIDs = (await MemoryPhotoComment.findAll()).map(
      (photoComment) => photoComment.uuid
    );

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
    assert.ok(!initialCommentUUIDs[lastPhotoComment.uuid], "inserted comment has a unique uuid");
  });

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

    assert.equal(await MemoryPhoto.count(), 5);
    assert.propEqual(await MemoryPhoto.findAll(), [
      ...PHOTOS,
      {
        id: 99,
        is_public: false,
        name: "Default photo name",
        href: "/izel.html",
      },
      {
        id: 100,
        is_public: true,
        name: "Baby photo",
        href: "/baby.jpg",
      },
    ].map((photo) => MemoryPhoto.build(photo)));

    const initialCommentUUIDs = (await MemoryPhotoComment.findAll()).map((comment) => comment.uuid);
    const commentOne = await MemoryPhotoComment.insert({
      uuid: "6e1aed96-9ef7-4685-981d-db004c568zzz",
      inserted_at: new Date("2015-10-25T20:54:04.447Z"),
      content: null,
      user_id: null
    });
    assert.notOk(commentOne.isNew);
    assert.ok(commentOne.isPersisted);
    assert.notOk(commentOne.isDeleted);
    assert.notOk(commentOne.isDirty);
    assert.deepEqual(commentOne.changes, {});
    assert.deepEqual(commentOne.revision, {
      content: null,
      inserted_at: new Date("2015-10-25T20:54:04.447Z"),
      is_important: true,
      uuid: "6e1aed96-9ef7-4685-981d-db004c568zzz",
      photo_id: null,
      user_id: null
    });
    assert.deepEqual(commentOne.revisionHistory, [
      {
        inserted_at: new Date("2015-10-25T20:54:04.447Z"),
        is_important: true,
        uuid: "6e1aed96-9ef7-4685-981d-db004c568zzz",
        content: null,
        photo_id: null,
        user_id: null
      },
    ]);

    const commentTwo = await MemoryPhotoComment.insert({
      uuid: "6401f27c-49aa-4da7-9835-08f6f669e29f",
      is_important: false,
      content: null,
      user_id: null
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
    assert.equal(commentOne.photo_id, undefined);
    assert.equal(commentOne.is_important, true);
    assert.equal(commentTwo.uuid, "6401f27c-49aa-4da7-9835-08f6f669e29f");
    assert.ok(new Date() - commentTwo.inserted_at < 10000);
    assert.equal(commentTwo.photo_id, null);
    assert.equal(commentTwo.is_important, false);

    lastInsertedComments.forEach((comment) => {
      assert.ok(!initialCommentUUIDs.includes(comment.uuid), "inserted comment uuid is unique");
    });
  });

  test("$Model.insert($model) creates a copied object in store and returns another copied object instead of the actual object", async function (assert) {
    const { MemoryPhoto } = generateModels();

    let photo = MemoryPhoto.build({ name: "some name" });

    assert.propEqual(photo, MemoryPhoto.build({
      href: null,
      id: null,
      is_public: null,
      name: "some name",
    }));

    let insertedPhoto = await MemoryPhoto.insert(photo);

    assert.propEqual(photo, MemoryPhoto.build({
      href: null,
      id: 1,
      is_public: null,
      name: "some name",
    }));
    assert.deepEqual(MemoryPhoto.peek(insertedPhoto.id), insertedPhoto);

    insertedPhoto.name = "testing store just holds a copy";

    assert.equal(insertedPhoto.name, "testing store just holds a copy");
    assert.notEqual(photo.name, insertedPhoto.name);
    assert.notPropEqual(MemoryPhoto.peek(photo.id), insertedPhoto);
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

  test("$Model.insert(attributes) cannot add new values to $Model.attributes when new attributes are discovered", async function (assert) {
    const { MemoryPhoto, MemoryPhotoComment } = generateModels();

    await Promise.all([MemoryPhoto, MemoryPhotoComment].map((model) => model.resetCache()));
    await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));
    await Promise.all(PHOTO_COMMENTS.map((photoComment) => MemoryPhotoComment.insert(photoComment)));

    await MemoryPhoto.insert({
      published_at: new Date("2017-10-10").toJSON(),
      description: "Some description",
    });
    await MemoryPhoto.insert({ location: "Istanbul", is_public: false });
    await MemoryPhotoComment.insert({ updated_at: new Date("2017-01-10").toJSON(), like_count: 22 });
    await MemoryPhotoComment.insert({ reply_id: 1 });

    assert.deepEqual(Array.from(MemoryPhoto.columnNames), ["id", "name", "href", "is_public", "owner_id", "group_uuid"]);
    assert.deepEqual(Array.from(MemoryPhotoComment.columnNames), ["uuid", "content", "is_important", "inserted_at", "user_id", "photo_id"]);
    assert.propEqual(await MemoryPhoto.findAll(), [
      ...PHOTOS,
      {
        id: 4,
        is_public: true,
        name: "Default photo name",
        href: null,
      },
      {
        id: 5,
        is_public: false,
        name: "Default photo name",
        href: null,
      },
    ].map((photo) => MemoryPhoto.build(photo)));
  });

  test("$Model.insert(data, { cache: 0 }) can immediately evict the cache", async function (assert) {
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

    let photo = await MemoryPhoto.insert(PHOTOS[1], { cache: 0 });

    assert.propEqual(photo, MemoryPhoto.build(PHOTOS[1]));
    assert.propEqual(await MemoryPhoto.findAll(), [
      MemoryPhoto.build({
        href: "ski-trip.jpeg",
        id: 1,
        name: "Ski trip",
        is_public: false,
      }),
    ]);

    let secondPhoto = await MemoryPhoto.insert(PHOTOS[1]);

    assert.propEqual(secondPhoto, MemoryPhoto.build(PHOTOS[1]));
    assert.propEqual(await MemoryPhoto.findAll(), [
      MemoryPhoto.build({
        href: "ski-trip.jpeg",
        id: 1,
        name: "Ski trip",
        is_public: false,
      }),
      secondPhoto,
    ]);
  });

  test("$Model.insert(json. { cache: $cacheTimeout }) can cache with different cache timeouts", async function (assert) {
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

    let photoOne = await MemoryPhoto.insert(PHOTOS[1], { cache: 10 });
    let photoTwo = await MemoryPhoto.insert(PHOTOS[2], { cache: 70 });

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

    await wait(60);

    assert.propEqual(await MemoryPhoto.findAll(), [
      MemoryPhoto.build({
        href: "ski-trip.jpeg",
        id: 1,
        name: "Ski trip",
        is_public: false,
      }),
      photoOne,
    ]);
  });
});
