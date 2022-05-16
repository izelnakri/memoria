import Model, {
  DB,
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  InsertError,
  RuntimeError,
} from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";
import SQLAdapter from "../helpers/sql-adapter.js";
import FIXTURES from "../helpers/fixtures/mix/index.js";

const { PHOTOS, PHOTO_COMMENTS } = FIXTURES;

module("@memoria/adapters | SQLAdapter | $Model.insert()", function (hooks) {
  setupMemoria(hooks);

  async function prepare() {
    class User extends Model {
      static Adapter = SQLAdapter;
    }
    class Photo extends Model {
      static Adapter = SQLAdapter;

      @PrimaryGeneratedColumn()
      id: number;

      @Column("bool", { default: true })
      is_public: boolean;

      @Column("varchar", { default: "Some default name" })
      name: string;

      @Column("varchar", { nullable: true })
      href: string;
    }

    class PhotoComment extends Model {
      static Adapter = SQLAdapter;

      @PrimaryGeneratedColumn("uuid")
      uuid: string;

      @CreateDateColumn()
      inserted_at: Date;

      @Column("bool", { default: true })
      is_important: boolean;

      @Column("int", { nullable: true })
      photo_id: number;

      @Column("int", { nullable: true })
      user_id: number;
    }

    await DB.resetRecords();

    return { Photo, PhotoComment, User };
  }

  test("$Model.insert() will insert an empty model and auto-generate primaryKeys", async function (assert) {
    const { Photo, PhotoComment } = await prepare();

    let initialPhotos = await Promise.all(PHOTOS.map((photo) => Photo.insert(photo)));

    assert.propEqual(initialPhotos, PHOTOS);

    assert.ok(
      initialPhotos.every(
        (photo) => !photo.isNew && photo.isPersisted && !photo.isDirty && !photo.isDeleted
      )
    );

    let initialPhotoComments = await Promise.all(
      PHOTO_COMMENTS.map((photoComment) => PhotoComment.insert(photoComment))
    );

    assert.ok(
      initialPhotoComments.every(
        (comment) => !comment.isNew && comment.isPersisted && !comment.isDirty && !comment.isDeleted
      )
    );
    assert.deepEqual(
      (await Photo.findAll()).map((photo) => photo.id),
      [1, 2, 3]
    );

    await Photo.insert();

    assert.deepEqual(
      (await Photo.findAll()).map((photo) => photo.id),
      [1, 2, 3, 4]
    );

    await Photo.insert();

    assert.equal(await Photo.count(), 5);
    assert.propEqual(await Photo.findAll(), [
      ...PHOTOS,
      {
        id: 4,
        is_public: true,
        name: "Some default name",
        href: null,
      },
      {
        id: 5,
        is_public: true,
        name: "Some default name",
        href: null,
      },
    ]);

    const initialCommentUUIDs = (await PhotoComment.findAll()).map(
      (photoComment) => photoComment.uuid
    );

    assert.deepEqual(initialCommentUUIDs, [
      "374c7f4a-85d6-429a-bf2a-0719525f5f29",
      "499ec646-493f-4eea-b92e-e383d94182f4",
      "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
      "d351963d-e725-4092-a37c-1ca1823b57d3",
    ]);

    await PhotoComment.insert();

    const allPhotoComments = await PhotoComment.findAll();
    const lastPhotoComment = allPhotoComments[allPhotoComments.length - 1];

    assert.equal(await PhotoComment.count(), 5);
    assert.ok(!initialCommentUUIDs[lastPhotoComment.uuid], "inserted comment has a unique uuid");
  });

  test("$Model.insert(attributes) will insert a model with overriden attributes", async function (assert) {
    const { Photo, PhotoComment } = await prepare();

    await Promise.all(PHOTOS.map((photo) => Photo.insert(photo)));
    await Promise.all(PHOTO_COMMENTS.map((photoComment) => PhotoComment.insert(photoComment)));

    await Photo.insert({ id: 99, href: "/izel.html", is_public: false });

    let model = await Photo.insert({ name: "Baby photo", href: "/baby.jpg" });
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
    });
    assert.deepEqual(model.revisionHistory, [
      {
        id: 100,
        name: "Baby photo",
        href: "/baby.jpg",
        is_public: true,
      },
    ]);

    assert.equal(await Photo.count(), 5);
    assert.propEqual(await Photo.findAll(), [
      ...PHOTOS,
      {
        id: 99,
        is_public: false,
        name: "Some default name",
        href: "/izel.html",
      },
      {
        id: 100,
        is_public: true,
        name: "Baby photo",
        href: "/baby.jpg",
      },
    ]);

    const initialCommentUUIDs = (await PhotoComment.findAll()).map((comment) => comment.uuid);
    const commentOne = await PhotoComment.insert({
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
      is_important: true,
      photo_id: 1,
      user_id: null,
      uuid: "63538a3b-911b-430f-bcf4-4f60d41fca27",
    });
    assert.deepEqual(commentOne.revisionHistory, [
      {
        inserted_at: new Date("2015-10-25T20:54:04.447Z"),
        is_important: true,
        photo_id: 1,
        user_id: null,
        uuid: "63538a3b-911b-430f-bcf4-4f60d41fca27",
      },
    ]);
    const commentTwo = await PhotoComment.insert({
      uuid: "6401f27c-49aa-4da7-9835-08f6f669e29f",
      is_important: false,
    });

    assert.equal(await PhotoComment.count(), 6);

    const allComments = await PhotoComment.findAll();
    const lastInsertedComments = allComments.filter(
      (comment) => !initialCommentUUIDs.includes(comment.uuid)
    );

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

  test("$Model.insert(attributes) will throw if overriden primaryKey already exists", async function (assert) {
    const { Photo, PhotoComment } = await prepare();

    await Promise.all(PHOTOS.map((photo) => Photo.insert(photo)));
    await Promise.all(PHOTO_COMMENTS.map((photoComment) => PhotoComment.insert(photoComment)));

    try {
      await Photo.insert({ id: 1 });
    } catch (error) {
      assert.ok(error instanceof InsertError);
    }
    try {
      await PhotoComment.insert({ uuid: "d351963d-e725-4092-a37c-1ca1823b57d3" });
    } catch (error) {
      assert.ok(error instanceof InsertError);
    }
  });

  test("$Model.insert(attributes) will throw if overriden primaryKey is wrong type", async function (assert) {
    const { Photo, PhotoComment } = await prepare();

    await Promise.all(PHOTOS.map((photo) => Photo.insert(photo)));
    await Promise.all(PHOTO_COMMENTS.map((photoComment) => PhotoComment.insert(photoComment)));

    try {
      await Photo.insert({ id: "99" });
    } catch (error) {
      assert.ok(error instanceof RuntimeError);
    }
    try {
      await PhotoComment.insert({ uuid: 1 });
    } catch (error) {
      assert.ok(error instanceof RuntimeError);
    }
  });

  test("$Model.insert(attributes) cannot add new values to $Model.attributes when new attributes are discovered", async function (assert) {
    const { Photo, PhotoComment } = await prepare();

    await Promise.all([Photo, PhotoComment].map((model) => model.resetCache()));
    await Promise.all(PHOTOS.map((photo) => Photo.insert(photo)));
    await Promise.all(PHOTO_COMMENTS.map((photoComment) => PhotoComment.insert(photoComment)));

    await Photo.insert({
      published_at: new Date("2017-10-10").toJSON(),
      description: "Some description",
    });
    await Photo.insert({ location: "Istanbul", is_public: false });
    await PhotoComment.insert({ updated_at: new Date("2017-01-10").toJSON(), like_count: 22 });
    await PhotoComment.insert({ reply_id: 1 });

    assert.deepEqual(Array.from(Photo.columnNames), ["id", "is_public", "name", "href"]);
    assert.deepEqual(Array.from(PhotoComment.columnNames), [
      "uuid",
      "inserted_at",
      "is_important",
      "photo_id",
      "user_id",
    ]);
    assert.propEqual(await Photo.findAll(), [
      ...PHOTOS,
      {
        id: 4,
        is_public: true,
        name: "Some default name",
        href: null,
      },
      {
        id: 5,
        is_public: false,
        name: "Some default name",
        href: null,
      },
    ]);
  });
});
