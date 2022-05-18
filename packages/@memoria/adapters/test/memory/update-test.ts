import Model, {
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  UpdateError,
  RuntimeError,
} from "@memoria/model";
import wait from "@memoria/model/test/helpers/wait.js";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";
import FIXTURES from "../helpers/fixtures/mix/index.js";
import generateModels from "../helpers/models-with-relations/memory/mix/index.js";

const { PHOTOS, PHOTO_COMMENTS } = FIXTURES;

module("@memoria/adapters | MemoryAdapter | $Model.update()", function (hooks) {
  setupMemoria(hooks);

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

    let firstPhoto = await MemoryPhoto.update({
      id: 1,
      name: "S trip",
      href: "ski-trip.jpeg",
      is_public: false,
    });
    assert.propEqual(firstPhoto, MemoryPhoto.build({
      id: 1,
      name: "S trip",
      href: "ski-trip.jpeg",
      is_public: false,
    }));
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

    let secondPhoto = await MemoryPhoto.update({ id: 2, href: "family-photo-2.jpeg", is_public: false });
    assert.propEqual(secondPhoto, MemoryPhoto.build({
      id: 2,
      name: "Family photo",
      href: "family-photo-2.jpeg",
      is_public: false,
    }));
    assert.propEqual(secondPhoto, await MemoryPhoto.find(2));
    assert.ok(
      !secondPhoto.isNew &&
        secondPhoto.isPersisted &&
        !secondPhoto.isDirty &&
        !secondPhoto.isDeleted
    );

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
        user_id: 1,
        photo_id: 2,
      },
      {
        content: "Coolie",
        inserted_at: comment.inserted_at,
        is_important: true,
        updated_at: comment.updated_at,
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
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

  test("$Model.update(attributes) doesnt throw an exception when a model gets updated with an unknown attribute", async function (assert) {
    const { MemoryPhoto, MemoryPhotoComment } = generateModels();

    await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));
    await Promise.all(PHOTO_COMMENTS.map((photoComment) => MemoryPhotoComment.insert(photoComment)));

    let photo = await MemoryPhoto.update({ id: 1, name: "ME", is_verified: false });

    assert.matchJson(photo, {
      href: "ski-trip.jpeg",
      id: 1,
      is_public: false,
      name: "ME",
      group_uuid: null,
      owner_id: null
    });

    let photoComment = await MemoryPhotoComment.update({
      uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
      location: "Amsterdam",
    });

    assert.matchJson(photoComment, {
      content: "Interesting indeed",
      inserted_at: String,
      is_important: true,
      updated_at: String,
      uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
      photo_id: 2,
      user_id: 1
    });
  });

  test("$Model.update(data, { cache: 0 }) can immediately evict the cache", async function (assert) {
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

    let photo = await MemoryPhoto.update({ id: 1, name: "ME", is_verified: false }, { cache: 0 });

    assert.matchJson(photo, {
      href: "ski-trip.jpeg",
      id: 1,
      is_public: false,
      name: "ME",
      group_uuid: null,
      owner_id: null
    });
    assert.propEqual(await MemoryPhoto.findAll(), []);

    await MemoryPhoto.insert(PHOTOS[0]);

    let anotherPhoto = await MemoryPhoto.update({ id: 1, name: "ME", is_verified: false });

    assert.matchJson(anotherPhoto, {
      href: "ski-trip.jpeg",
      id: 1,
      is_public: false,
      name: "ME",
      group_uuid: null,
      owner_id: null
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

  test("$Model.update(json. { cache: $cacheTimeout }) can cache with different cache timeouts", async function (assert) {
    const { MemoryPhoto } = generateModels();

    await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));

    assert.propEqual(await MemoryPhoto.findAll(), PHOTOS.map((photo) => MemoryPhoto.build(photo)));

    let photoOne = await MemoryPhoto.update({ id: PHOTOS[1].id, name: "first" }, { cache: 10 });
    let photoTwo = await MemoryPhoto.update({ id: PHOTOS[2].id, name: "second" }, { cache: 70 });

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

  test("$Model.update(json. { cache: $cacheTimeout }) can override previous $cacheTimeout", async function (assert) {
    const { MemoryPhoto } = generateModels();

    await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));

    assert.propEqual(await MemoryPhoto.findAll(), PHOTOS.map((photo) => MemoryPhoto.build(photo)));

    await MemoryPhoto.update({ id: PHOTOS[1].id, name: "aa" }, { cache: 10 });
    await MemoryPhoto.update({ id: PHOTOS[1].id, name: "bb" }, { cache: 70 });
    await wait(25);

    assert.propEqual(await MemoryPhoto.findAll(), [
      MemoryPhoto.build(PHOTOS[0]),
      MemoryPhoto.build({ ...PHOTOS[1], name: "bb" }),
      MemoryPhoto.build(PHOTOS[2]),
    ]);

    await wait(150);

    assert.propEqual(await MemoryPhoto.findAll(), [MemoryPhoto.build(PHOTOS[0]), MemoryPhoto.build(PHOTOS[2])]);

    await MemoryPhoto.update({ id: PHOTOS[0].id, name: "bb" }, { cache: 150 });
    await wait(25);

    assert.propEqual(await MemoryPhoto.findAll(), [
      MemoryPhoto.build({ ...PHOTOS[0], name: "bb" }),
      MemoryPhoto.build(PHOTOS[2])
    ]);

    await MemoryPhoto.update({ id: PHOTOS[0].id, name: "aa" }, { cache: 25 });
    await wait(25);

    assert.propEqual(await MemoryPhoto.findAll(), [MemoryPhoto.build(PHOTOS[2])]);
  });
});
