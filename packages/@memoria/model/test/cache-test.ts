import Model, { Column, CreateDateColumn, PrimaryGeneratedColumn, RuntimeError } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "./helpers/setup-memoria.js";
import wait from "./helpers/wait.js";

module("@memoria/model | $Model.cache()", function (hooks) {
  setupMemoria(hooks);

  const PHOTO_FIXTURES = [
    {
      id: 1,
      name: "Ski trip",
      is_public: false,
    },
    {
      id: 2,
      name: "Family photo",
      is_public: true,
    },
    {
      id: 3,
      name: "Selfie",
      is_public: false,
    },
  ];
  const PHOTO_COMMENT_FIXTURES = [
    {
      uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
      content: "What a nice photo!",
      photo_id: 1,
      user_id: 1,
      inserted_at: "2011-09-25T20:54:04.447Z",
    },
    {
      uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
      content: "I agree",
      photo_id: 1,
      user_id: 2,
    },
    {
      uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
      content: "I was kidding",
      photo_id: 1,
      user_id: 1,
    },
    {
      uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
      content: "Interesting indeed",
      photo_id: 2,
      user_id: 1,
    },
  ];

  function prepare() {
    class Photo extends Model {
      @PrimaryGeneratedColumn()
      id: number;

      @Column("bool", { default: true })
      is_public: boolean;

      @Column("varchar", { default: "Some default name" })
      name: string;
    }
    class PhotoComment extends Model {
      @PrimaryGeneratedColumn("uuid")
      uuid: string;

      @Column()
      content: string;

      @Column("int")
      photo_id: number;

      @Column("int")
      user_id: number;

      @CreateDateColumn()
      inserted_at: Date;

      @Column("bool", { default: true })
      is_important: boolean;
    }
    class User extends Model {}

    return { Photo, PhotoComment, User };
  }

  test("$Model.cache(json) inserts json records correctly when not existing in the cache", async function (assert) {
    const { Photo, PhotoComment } = prepare();
    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment)));
    assert.deepEqual(
      (await Photo.findAll()).map((photo) => photo.id),
      [1, 2, 3]
    );

    let model = Photo.cache({ id: 99, name: "just adding this" });
    assert.propEqual(model, {
      id: 99,
      is_public: null,
      name: "just adding this",
    });
    assert.notOk(model.isNew);
    assert.ok(model.isPersisted);
    assert.notOk(model.isDeleted);
    assert.deepEqual(model.changes, {});
    assert.propEqual(model.revision, { id: 99, is_public: null, name: "just adding this" });
    assert.deepEqual(model.revisionHistory, [{ id: 99, is_public: null, name: "just adding this" }]);
    assert.propEqual(await Photo.findAll(), [
      {
        id: 1,
        name: "Ski trip",
        is_public: false,
      },
      {
        id: 2,
        name: "Family photo",
        is_public: true,
      },
      {
        id: 3,
        name: "Selfie",
        is_public: false,
      },
      {
        id: 99,
        is_public: null,
        name: "just adding this",
      },
    ]);

    const initialCommentUUIDs = (await PhotoComment.findAll()).map((photoComment) => photoComment.uuid);
    assert.deepEqual(initialCommentUUIDs, [
      "499ec646-493f-4eea-b92e-e383d94182f4",
      "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
      "d351963d-e725-4092-a37c-1ca1823b57d3",
      "374c7f4a-85d6-429a-bf2a-0719525f5f29",
    ]);

    let uuidModel = PhotoComment.cache({
      uuid: "374c7f4a-85d6-429a-bf2a-0719525f5aaa",
      inserted_at: "2015-10-25T20:54:04.447Z",
    });
    assert.propEqual(uuidModel, {
      uuid: "374c7f4a-85d6-429a-bf2a-0719525f5aaa",
      inserted_at: new Date("2015-10-25T20:54:04.447Z"),
      is_important: null,
      photo_id: null,
      user_id: null,
      content: null,
    });
    assert.notOk(uuidModel.isNew);
    assert.ok(uuidModel.isPersisted);
    assert.notOk(uuidModel.isDeleted);
    assert.deepEqual(uuidModel.changes, {});
    assert.propEqual(uuidModel.revision, {
      uuid: "374c7f4a-85d6-429a-bf2a-0719525f5aaa",
      inserted_at: new Date("2015-10-25T20:54:04.447Z"),
      photo_id: null,
      user_id: null,
      content: null,
      is_important: null,
    });
    assert.deepEqual(uuidModel.revisionHistory, [
      {
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5aaa",
        inserted_at: new Date("2015-10-25T20:54:04.447Z"),
        is_important: null,
        photo_id: null,
        user_id: null,
        content: null,
      },
    ]);
    assert.equal(await PhotoComment.count(), 5);

    const lastCommentUUIDs = (await PhotoComment.findAll()).map((photoComment) => photoComment.uuid);
    assert.deepEqual(lastCommentUUIDs, [
      "499ec646-493f-4eea-b92e-e383d94182f4",
      "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
      "d351963d-e725-4092-a37c-1ca1823b57d3",
      "374c7f4a-85d6-429a-bf2a-0719525f5f29",
      "374c7f4a-85d6-429a-bf2a-0719525f5aaa",
    ]);
  });

  test("$Model.cache(json) throws RuntimeError when primaryKey is not included", async function (assert) {
    const { Photo, PhotoComment } = prepare();
    try {
      Photo.cache({ name: "just adding this" });
    } catch (error) {
      assert.ok(error instanceof RuntimeError);
    }
    try {
      PhotoComment.cache({ inserted_at: "2015-10-25T20:54:04.447Z" });
    } catch (error) {
      assert.ok(error instanceof RuntimeError);
    }
  });

  test("$Model.cache(json) updates json record correctly when existing in the cache", async function (assert) {
    const { Photo, PhotoComment } = prepare();
    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment)));
    assert.propEqual(await Photo.findAll(), [
      {
        id: 1,
        name: "Ski trip",
        is_public: false,
      },
      {
        id: 2,
        name: "Family photo",
        is_public: true,
      },
      {
        id: 3,
        name: "Selfie",
        is_public: false,
      },
    ]);

    let model = Photo.cache({ id: 3, name: "just adding this" });
    assert.propEqual(model, {
      id: 3,
      is_public: false,
      name: "just adding this",
    });
    assert.notOk(model.isNew);
    assert.ok(model.isPersisted);
    assert.notOk(model.isDeleted);
    assert.deepEqual(model.changes, {});
    assert.propEqual(model.revision, { id: 3, is_public: false, name: "just adding this" });
    assert.deepEqual(model.revisionHistory, [
      { id: 3, is_public: false, name: "Selfie" },
      { id: 3, is_public: false, name: "just adding this" },
    ]);
    assert.propEqual(await Photo.findAll(), [
      {
        id: 1,
        name: "Ski trip",
        is_public: false,
      },
      {
        id: 2,
        name: "Family photo",
        is_public: true,
      },
      {
        id: 3,
        name: "just adding this",
        is_public: false,
      },
    ]);

    const initialCommentUUIDs = (await PhotoComment.findAll()).map((photoComment) => photoComment.uuid);
    assert.deepEqual(initialCommentUUIDs, [
      "499ec646-493f-4eea-b92e-e383d94182f4",
      "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
      "d351963d-e725-4092-a37c-1ca1823b57d3",
      "374c7f4a-85d6-429a-bf2a-0719525f5f29",
    ]);

    let oldUUIDModel = await PhotoComment.find("499ec646-493f-4eea-b92e-e383d94182f4");
    assert.propEqual(oldUUIDModel, {
      uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
      content: "What a nice photo!",
      photo_id: 1,
      user_id: 1,
      inserted_at: new Date("2011-09-25T20:54:04.447Z"),
      is_important: true,
    });

    let uuidModel = PhotoComment.cache({
      uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
      inserted_at: "2015-10-25T20:54:04.447Z",
    });
    assert.propEqual(uuidModel, {
      uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
      content: "What a nice photo!",
      photo_id: 1,
      user_id: 1,
      inserted_at: new Date("2015-10-25T20:54:04.447Z"),
      is_important: true,
    });
    assert.notOk(uuidModel.isNew);
    assert.ok(uuidModel.isPersisted);
    assert.notOk(uuidModel.isDeleted);
    assert.deepEqual(uuidModel.changes, {});
    assert.propEqual(uuidModel.revision, {
      uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
      content: "What a nice photo!",
      photo_id: 1,
      user_id: 1,
      inserted_at: new Date("2015-10-25T20:54:04.447Z"),
      is_important: true,
    });
    assert.deepEqual(uuidModel.revisionHistory, [
      {
        uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
        content: "What a nice photo!",
        photo_id: 1,
        user_id: 1,
        inserted_at: new Date("2011-09-25T20:54:04.447Z"),
        is_important: true,
      },
      {
        uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
        content: "What a nice photo!",
        photo_id: 1,
        user_id: 1,
        inserted_at: new Date("2015-10-25T20:54:04.447Z"),
        is_important: true,
      },
    ]);

    assert.equal(await PhotoComment.count(), 4);

    const lastCommentUUIDs = (await PhotoComment.findAll()).map((photoComment) => photoComment.uuid);
    assert.deepEqual(lastCommentUUIDs, [
      "499ec646-493f-4eea-b92e-e383d94182f4",
      "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
      "d351963d-e725-4092-a37c-1ca1823b57d3",
      "374c7f4a-85d6-429a-bf2a-0719525f5f29",
    ]);
  });

  test("$Model.cache(json, { cacheDuration: 0 }) can immediately evict the cache", async function (assert) {
    const { Photo } = prepare();

    await Photo.insert(PHOTO_FIXTURES[0]);

    assert.propEqual(await Photo.findAll(), [
      {
        id: 1,
        name: "Ski trip",
        is_public: false,
      },
    ]);

    let photo = await Photo.cache(PHOTO_FIXTURES[1], { cacheDuration: 0 });

    assert.propEqual(photo, PHOTO_FIXTURES[1]);
    assert.propEqual(await Photo.findAll(), [
      {
        id: 1,
        name: "Ski trip",
        is_public: false,
      },
    ]);

    let secondPhoto = await Photo.insert(PHOTO_FIXTURES[1]);

    assert.propEqual(secondPhoto, PHOTO_FIXTURES[1]);
    assert.propEqual(await Photo.findAll(), [
      {
        id: 1,
        name: "Ski trip",
        is_public: false,
      },
      secondPhoto,
    ]);
  });

  test("$Model.cache(json. { cacheDuration: $cacheTimeout }) can cache with different cache timeouts", async function (assert) {
    const { Photo } = prepare();

    await Photo.insert(PHOTO_FIXTURES[0]);

    assert.propEqual(await Photo.findAll(), [
      {
        id: 1,
        name: "Ski trip",
        is_public: false,
      },
    ]);

    let photoOne = await Photo.cache(PHOTO_FIXTURES[1], { cacheDuration: 10 });
    let photoTwo = await Photo.cache(PHOTO_FIXTURES[2], { cacheDuration: 70 });

    assert.propEqual(photoOne, PHOTO_FIXTURES[1]);
    assert.propEqual(photoTwo, PHOTO_FIXTURES[2]);
    assert.propEqual(await Photo.findAll(), [
      {
        id: 1,
        name: "Ski trip",
        is_public: false,
      },
      photoOne,
      photoTwo,
    ]);

    await wait(10);

    assert.propEqual(await Photo.findAll(), [
      {
        id: 1,
        name: "Ski trip",
        is_public: false,
      },
      photoTwo,
    ]);

    let lastPhoto = await Photo.insert(PHOTO_FIXTURES[1]);

    assert.propEqual(lastPhoto, PHOTO_FIXTURES[1]);

    await wait(60);

    assert.propEqual(await Photo.findAll(), [
      {
        id: 1,
        name: "Ski trip",
        is_public: false,
      },
      photoOne,
    ]);
  });

  test("$Model.cache(json. { cacheDuration: $cacheTimeout }) can override previous $cacheTimeout", async function (assert) {
    const { Photo } = prepare();

    let photoOne = await Photo.cache(PHOTO_FIXTURES[1], { cacheDuration: 25 });
    let anotherPhotoOne = await Photo.cache(PHOTO_FIXTURES[1], { cacheDuration: 150 });

    await wait(25);

    assert.propEqual(await Photo.findAll(), [photoOne]);

    await wait(150);

    assert.propEqual(await Photo.findAll(), []);

    let photoTwo = await Photo.cache(PHOTO_FIXTURES[1], { cacheDuration: 150 });

    await wait(25);

    assert.propEqual(await Photo.findAll(), [photoTwo]);

    let anotherPhotoTwo = await Photo.cache(PHOTO_FIXTURES[1], { cacheDuration: 25 });

    await wait(25);

    assert.propEqual(await Photo.findAll(), []);
  });

  // test("$Model.cache(model) sets non-embed relationships correctly", async function (assert) {});

  // test("$Model.cache(model) sets embed relationships many layers correctly", async function (assert) {});

  // test("$Model.cache(model) sets null relationships correctly", async function (assert) {});
});
