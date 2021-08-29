import Model, { Config, PrimaryGeneratedColumn, Column, CreateDateColumn } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";
import SQLAdapter from "../helpers/sql-adapter.js";

module("@memoria/adapters | SQLAdapter | $Model.resetRecords(initialState)", function (hooks) {
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

  async function prepare() {
    class Photo extends Model {
      static Adapter = SQLAdapter;

      @PrimaryGeneratedColumn()
      id: number;

      @Column("varchar", { default: "Imported photo" })
      name: string;

      @Column()
      href: string;

      @Column("bool", { default: true })
      is_public: boolean;
    }

    class User extends Model {
      static Adapter = SQLAdapter;

      @PrimaryGeneratedColumn()
      id: number;
    }

    class PhotoComment extends Model {
      static Adapter = SQLAdapter;

      @PrimaryGeneratedColumn("uuid")
      uuid: string;

      @Column()
      content: string;

      @Column("int")
      photo_id: number;

      @Column("int")
      user_id: number;

      @Column("boolean", { default: true })
      is_important: boolean;

      @CreateDateColumn()
      inserted_at: Date;
    }
    await Config.resetForTests();

    return { Photo, PhotoComment, User };
  }

  test("$Model.resetRecords() resets the models DB", async function (assert) {
    const { Photo, PhotoComment, User } = await prepare();

    assert.deepEqual(await Photo.findAll(), []);
    assert.deepEqual(await PhotoComment.findAll(), []);

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    assert.notDeepEqual(await Photo.findAll(), []);
    assert.notDeepEqual(await PhotoComment.findAll(), []);

    await Photo.resetRecords();
    await PhotoComment.resetRecords();

    assert.deepEqual(await Photo.findAll(), []);
    assert.deepEqual(await PhotoComment.findAll(), []);
  });

  test("$Model.resetRecords(fixtures) resets the models DB with initial state and defaultAttributes", async function (assert) {
    const { Photo, PhotoComment, User } = await prepare();

    assert.deepEqual(await Photo.findAll(), []);
    assert.deepEqual(await PhotoComment.findAll(), []);

    await Photo.resetRecords(PHOTO_FIXTURES);
    await PhotoComment.resetRecords(PHOTO_COMMENT_FIXTURES);

    assert.propEqual(await Photo.findAll(), PHOTO_FIXTURES);

    let photoComments = await PhotoComment.findAll();
    assert.propEqual(await PhotoComment.findAll(), [
      {
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        content: "Interesting indeed",
        photo_id: 2,
        user_id: 1,
        is_important: null,
        inserted_at: photoComments[3].inserted_at,
      },
      {
        uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
        content: "What a nice photo!",
        photo_id: 1,
        user_id: 1,
        is_important: null,
        inserted_at: photoComments[0].inserted_at,
      },
      {
        uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
        content: "I agree",
        photo_id: 1,
        user_id: 2,
        is_important: null,
        inserted_at: photoComments[1].inserted_at,
      },
      {
        uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
        content: "I was kidding",
        photo_id: 1,
        user_id: 1,
        is_important: null,
        inserted_at: photoComments[2].inserted_at,
      },
    ]);
  });

  test("Memoria fixtures should throw error if any of the fixtures missing id or uuid", async function (assert) {
    const { PhotoComment } = await prepare();

    const PHOTO_COMMENT_FIXTURES = [
      {
        content: "What a nice photo!",
        photo_id: 1,
        user_id: 1,
      },
      {
        content: "I agree",
        photo_id: 1,
        user_id: 2,
      },
      {
        content: "I was kidding",
        photo_id: 1,
        user_id: 1,
      },
      {
        content: "Interesting indeed",
        photo_id: 2,
        user_id: 1,
      },
    ];

    try {
      await PhotoComment.resetRecords(PHOTO_COMMENT_FIXTURES);
    } catch (error) {
      assert.ok(/A PhotoComment Record is missing a primary key/.test(error.message));
    }
  });

  test("Memoria fixtures should throw error if any of the id fixtures have an incorrect type", async function (assert) {
    const { Photo } = await prepare();

    const PHOTO_FIXTURES = [
      {
        id: 1,
        name: "Ski trip",
        href: "ski-trip.jpeg",
        is_public: false,
      },
      {
        id: "2",
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

    try {
      await Photo.resetRecords(PHOTO_FIXTURES);
    } catch (error) {
      assert.ok(
        /\[Memoria\] Photo.primaryKeyType is 'id'\. Instead you've tried: 2 with string type/.test(
          error.message
        )
      );
    }
  });

  test("Memoria fixtures should throw error if any of the uuid fixtures have an incorrect type", async function (assert) {
    const { PhotoComment } = await prepare();

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
        uuid: 12,
        content: "Interesting indeed",
        photo_id: 2,
        user_id: 1,
      },
    ];

    try {
      await PhotoComment.resetRecords(PHOTO_COMMENT_FIXTURES);
    } catch (error) {
      assert.ok(
        /\[Memoria\] PhotoComment\.primaryKeyType is 'uuid'\. Instead you've tried: 12 with number type/.test(
          error.message
        )
      );
    }
  });

  test("Memoria fixtures should throw error if there are duplicate id fixtures", async function (assert) {
    const { Photo } = await prepare();

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
        id: 2,
        name: "Selfie",
        href: "selfie.jpeg",
        is_public: false,
      },
    ];

    try {
      await Photo.resetRecords(PHOTO_FIXTURES);
    } catch (error) {
      assert.ok(error);
      // assert.ok(
      //   /\[Memoria\] CacheError: Photo.cache\(\) fails: id 2 already exists in the cache!/.test(
      //     error.message
      //   )
      // );
    }
  });

  test("Memoria fixtures should throw error if there are duplicate uuid fixtures", async function (assert) {
    const { PhotoComment } = await prepare();

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
        uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
        content: "Interesting indeed",
        photo_id: 2,
        user_id: 1,
      },
    ];

    try {
      await PhotoComment.resetRecords(PHOTO_COMMENT_FIXTURES);
    } catch (error) {
      assert.ok(error);
      // assert.ok(
      //   /\[Memoria\] CacheError: PhotoComment.cache\(\) fails: uuid 499ec646-493f-4eea-b92e-e383d94182f4 already exists in the cache!/.test(
      //     error.message
      //   )
      // );
    }
  });
});
