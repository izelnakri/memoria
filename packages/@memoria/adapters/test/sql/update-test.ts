import Model, {
  DB,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  UpdateError,
} from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";
import SQLAdapter from "../helpers/sql-adapter.js";
import generateModels from "../helpers/models-with-relations/sql/mix/index.js";
import FIXTURES from "../helpers/fixtures/mix/index.js"

const { PHOTOS, PHOTO_COMMENTS } = FIXTURES;

module("@memoria/adapters | SQLAdapter | $Model.update()", function (hooks) {
  setupMemoria(hooks);

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
      user_id: 1
    });
    assert.ok(firstComment.inserted_at instanceof Date);
    assert.ok(firstComment.updated_at instanceof Date);
    assert.notOk(firstComment.isNew);
    assert.ok(firstComment.isPersisted);
    assert.notOk(firstComment.isDeleted);
    assert.notOk(firstComment.isDirty);
    assert.deepEqual(firstComment.changes, {});

    let firstPhoto = await SQLPhoto.update({
      id: 1,
      name: "S trip",
      href: "ski-trip.jpeg",
      is_public: false,
    });
    assert.propEqual(firstPhoto, SQLPhoto.build({
      id: 1,
      name: "S trip",
      href: "ski-trip.jpeg",
      is_public: false,
    }));
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

    let secondPhoto = await SQLPhoto.update({ id: 2, href: "family-photo-2.jpeg", is_public: false });
    assert.ok(
      !secondPhoto.isNew &&
        !secondPhoto.isDirty &&
        secondPhoto.isPersisted &&
        !secondPhoto.isDeleted
    );
    assert.propEqual(secondPhoto, SQLPhoto.build({
      id: 2,
      name: "Family photo",
      href: "family-photo-2.jpeg",
      is_public: false,
    }));
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
      user_id: 1
    });
    assert.ok(comment.inserted_at instanceof Date);
    assert.ok(comment.updated_at instanceof Date);
    assert.propEqual(
      comment,
      await SQLPhotoComment.findBy({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29" })
    );

    assert.propEqual(firstComment.inserted_at, comment.inserted_at);
    assert.propEqual(firstComment.updated_at, comment.updated_at);
  });

  test("$Model.update(attributes) throws an exception when updating a nonexistent model", async function (assert) {
    const { SQLPhoto, SQLPhotoComment } = generateModels();
    await DB.resetRecords();

    await Promise.all(PHOTOS.map((photo) => SQLPhoto.insert(photo)));
    await Promise.all(
      PHOTO_COMMENTS.map((photoComment) => SQLPhotoComment.insert(photoComment))
    );

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

  test("$Model.update(attributes) does not throw an exception when a model gets updated with an unknown $Model.attribute", async function (assert) {
    const { SQLPhoto, SQLPhotoComment } = generateModels();
    await DB.resetRecords();

    await Promise.all(PHOTOS.map((photo) => SQLPhoto.insert(photo)));
    await Promise.all(
      PHOTO_COMMENTS.map((photoComment) => SQLPhotoComment.insert(photoComment))
    );

    let photo = await SQLPhoto.update({ id: 1, name: "ME", is_verified: false });

    assert.matchJson(photo, {
      id: 1,
      name: "ME",
      href: "ski-trip.jpeg",
      is_public: false,
      group_uuid: null,
      owner_id: null
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
      user_id: 1
    });
  });
});
