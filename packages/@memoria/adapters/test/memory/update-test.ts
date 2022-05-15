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

module("@memoria/adapters | MemoryAdapter | $Model.update()", function (hooks) {
  setupMemoria(hooks);

  const PHOTO_FIXTURES = [
    {
      id: 1,
      name: "Ski trip",
      href: "ski-trip.jpeg",
      is_public: false,
    },
    {
      id: 2,
      name: "Family photo",
      href: "family-photo.jpeg",
      is_public: true,
    },
    {
      id: 3,
      name: "Selfie",
      href: "selfie.jpeg",
      is_public: false,
    },
  ];
  const PHOTO_COMMENT_FIXTURES = [
    {
      uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
      content: "What a nice photo!",
      photo_id: 1,
      user_id: 1,
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

      @Column("varchar", { default: "Some default name" })
      name: string;

      @Column("varchar")
      href: string;

      @Column("boolean", { default: true })
      is_public: boolean;
    }
    class PhotoComment extends Model {
      @PrimaryGeneratedColumn("uuid")
      uuid: string;

      @CreateDateColumn()
      inserted_at: Date;

      @UpdateDateColumn()
      updated_at: Date;

      @Column("boolean", { default: true })
      is_important: boolean;

      @Column()
      content: string;
    }
    class User extends Model {
      @PrimaryGeneratedColumn()
      id: number;
    }

    return { Photo, PhotoComment, User };
  }

  test("$Model.update(attributes) can update models", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    let firstComment = await PhotoComment.findBy({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29" });
    assert.matchJson(firstComment, {
      uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
      inserted_at: String,
      updated_at: String,
      is_important: true,
      content: "Interesting indeed",
    });
    assert.ok(firstComment.inserted_at instanceof Date);
    assert.ok(firstComment.updated_at instanceof Date);
    assert.notOk(firstComment.isNew);
    assert.ok(firstComment.isPersisted);
    assert.notOk(firstComment.isDeleted);
    assert.notOk(firstComment.isDirty);
    assert.deepEqual(firstComment.changes, {});

    let firstPhoto = await Photo.update({
      id: 1,
      name: "S trip",
      href: "ski-trip.jpeg",
      is_public: false,
    });
    assert.propEqual(firstPhoto, {
      id: 1,
      name: "S trip",
      href: "ski-trip.jpeg",
      is_public: false,
    });
    assert.propEqual(firstPhoto, Object.assign(await Photo.find(1), { name: "S trip" }));
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
    });
    assert.deepEqual(firstPhoto.revisionHistory, [
      {
        id: 1,
        name: "Ski trip",
        href: "ski-trip.jpeg",
        is_public: false,
      },
      {
        id: 1,
        name: "S trip",
        href: "ski-trip.jpeg",
        is_public: false,
      },
    ]);

    let secondPhoto = await Photo.update({ id: 2, href: "family-photo-2.jpeg", is_public: false });
    assert.propEqual(secondPhoto, {
      id: 2,
      name: "Family photo",
      href: "family-photo-2.jpeg",
      is_public: false,
    });
    assert.propEqual(secondPhoto, await Photo.find(2));
    assert.ok(
      !secondPhoto.isNew &&
        secondPhoto.isPersisted &&
        !secondPhoto.isDirty &&
        !secondPhoto.isDeleted
    );

    let comment = await PhotoComment.update({
      uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
      content: "Coolie",
    });
    assert.matchJson(comment, {
      uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
      inserted_at: String,
      updated_at: String,
      is_important: true,
      content: "Coolie",
    });
    assert.propEqual(
      comment,
      Object.assign(await PhotoComment.findBy({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29" }), {
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
    });
    assert.deepEqual(comment.revisionHistory, [
      {
        content: "Interesting indeed",
        inserted_at: comment.inserted_at,
        is_important: true,
        updated_at: comment.inserted_at,
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
      },
      {
        content: "Coolie",
        inserted_at: comment.inserted_at,
        is_important: true,
        updated_at: comment.updated_at,
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
      },
    ]);
    assert.ok(comment.inserted_at instanceof Date);
    assert.ok(comment.updated_at instanceof Date);
    assert.equal(firstComment.inserted_at, comment.inserted_at);
    assert.notEqual(firstComment.updated_at, comment.updated_at);
    assert.propEqual({ ...firstComment, updated_at: comment.updated_at, content: "Coolie" }, comment);
  });

  test("$Model.update(attributes) throws an exception when updating a nonexistent model", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    try {
      await Photo.update({ id: 99, href: "family-photo-2.jpeg" });
    } catch (error) {
      assert.ok(error instanceof UpdateError);
    }

    try {
      await PhotoComment.update({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5666", content: "Nice" });
    } catch (error) {
      assert.ok(error instanceof UpdateError);
    }
  });

  test("$Model.update(attributes) doesnt throw an exception when a model gets updated with an unknown attribute", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    let photo = await Photo.update({ id: 1, name: "ME", is_verified: false });

    assert.matchJson(photo, {
      href: "ski-trip.jpeg",
      id: 1,
      is_public: false,
      name: "ME",
    });

    let photoComment = await PhotoComment.update({
      uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
      location: "Amsterdam",
    });

    assert.matchJson(photoComment, {
      content: "Interesting indeed",
      inserted_at: String,
      is_important: true,
      updated_at: String,
      uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
    });
  });

  test("$Model.update(data, { cache: 0 }) can immediately evict the cache", async function (assert) {
    const { Photo } = prepare();

    await Photo.insert(PHOTO_FIXTURES[0]);

    assert.propEqual(await Photo.findAll(), [
      {
        href: "ski-trip.jpeg",
        id: 1,
        name: "Ski trip",
        is_public: false,
      },
    ]);

    let photo = await Photo.update({ id: 1, name: "ME", is_verified: false }, { cache: 0 });

    assert.matchJson(photo, {
      href: "ski-trip.jpeg",
      id: 1,
      is_public: false,
      name: "ME",
    });
    assert.propEqual(await Photo.findAll(), []);

    await Photo.insert(PHOTO_FIXTURES[0]);

    let anotherPhoto = await Photo.update({ id: 1, name: "ME", is_verified: false });

    assert.matchJson(anotherPhoto, {
      href: "ski-trip.jpeg",
      id: 1,
      is_public: false,
      name: "ME",
    });
    assert.propEqual(await Photo.findAll(), [
      {
        href: "ski-trip.jpeg",
        id: 1,
        is_public: false,
        name: "ME",
      },
    ]);
  });

  test("$Model.update(json. { cache: $cacheTimeout }) can cache with different cache timeouts", async function (assert) {
    const { Photo } = prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));

    assert.propEqual(await Photo.findAll(), PHOTO_FIXTURES);

    let photoOne = await Photo.update({ id: PHOTO_FIXTURES[1].id, name: "first" }, { cache: 10 });
    let photoTwo = await Photo.update({ id: PHOTO_FIXTURES[2].id, name: "second" }, { cache: 70 });

    assert.propEqual(photoOne, { ...PHOTO_FIXTURES[1], name: "first" });
    assert.propEqual(photoTwo, { ...PHOTO_FIXTURES[2], name: "second" });
    assert.propEqual(await Photo.findAll(), [
      {
        href: "ski-trip.jpeg",
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
        href: "ski-trip.jpeg",
        id: 1,
        name: "Ski trip",
        is_public: false,
      },
      photoTwo,
    ]);

    await wait(60);

    assert.propEqual(await Photo.findAll(), [
      {
        href: "ski-trip.jpeg",
        id: 1,
        name: "Ski trip",
        is_public: false,
      },
    ]);
  });

  test("$Model.update(json. { cache: $cacheTimeout }) can override previous $cacheTimeout", async function (assert) {
    const { Photo } = prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));

    assert.propEqual(await Photo.findAll(), PHOTO_FIXTURES);

    await Photo.update({ id: PHOTO_FIXTURES[1].id, name: "aa" }, { cache: 10 });
    await Photo.update({ id: PHOTO_FIXTURES[1].id, name: "bb" }, { cache: 70 });
    await wait(25);

    assert.propEqual(await Photo.findAll(), [
      PHOTO_FIXTURES[0],
      { ...PHOTO_FIXTURES[1], name: "bb" },
      PHOTO_FIXTURES[2],
    ]);

    await wait(150);

    assert.propEqual(await Photo.findAll(), [PHOTO_FIXTURES[0], PHOTO_FIXTURES[2]]);

    await Photo.update({ id: PHOTO_FIXTURES[0].id, name: "bb" }, { cache: 150 });
    await wait(25);

    assert.propEqual(await Photo.findAll(), [
      { ...PHOTO_FIXTURES[0], name: "bb" },
      PHOTO_FIXTURES[2],
    ]);

    await Photo.update({ id: PHOTO_FIXTURES[0].id, name: "aa" }, { cache: 25 });
    await wait(25);

    assert.propEqual(await Photo.findAll(), [PHOTO_FIXTURES[2]]);
  });
});
