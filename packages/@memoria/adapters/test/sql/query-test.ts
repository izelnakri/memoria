import Model, { Config, Column, PrimaryGeneratedColumn, RuntimeError } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";
import SQLAdapter from "../helpers/sql-adapter.js";

module("@memoria/adapters | SQLAdapter | Query API", function (hooks) {
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

      @Column("varchar")
      name: string;

      @Column("varchar")
      href: string;

      @Column("bool")
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

      @Column("varchar")
      content: string;

      @Column("int")
      photo_id: number;

      @Column("int")
      user_id: number;
    }
    await Config.resetForTests();

    return { Photo, User, PhotoComment };
  }

  test("$Model.find() throws without a number id or ids", async function (assert) {
    const { Photo, PhotoComment } = await prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    const array = [null, undefined, "", "1", true, {}];

    await Promise.all(
      array.map(async (param) => {
        try {
          await Photo.find(param);
        } catch (error) {
          assert.ok(error instanceof RuntimeError);
        }
        try {
          await PhotoComment.find(param);
        } catch (error) {
          assert.ok(error instanceof RuntimeError);
        }
      })
    );
  });

  test("$Model.find(id) works for different models", async function (assert) {
    const { Photo } = await prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));

    assert.propEqual(await Photo.find(1), {
      id: 1,
      name: "Ski trip",
      href: "ski-trip.jpeg",
      is_public: false,
    });
    assert.propEqual(await Photo.find(3), {
      id: 3,
      name: "Selfie",
      href: "selfie.jpeg",
      is_public: false,
    });
  });

  test("$Model.find(ids) works for multiple ids", async function (assert) {
    const { Photo } = await prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));

    assert.propEqual(await Photo.find([1, 3]), [
      { id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false },
      { id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false },
    ]);
    assert.propEqual(await Photo.find([2, 3]), [
      { id: 2, name: "Family photo", href: "family-photo.jpeg", is_public: true },
      { id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false },
    ]);
  });

  test("$Model.findBy(attributes) returns a single model for the options", async function (assert) {
    const { Photo, PhotoComment } = await prepare();

    const firstPhoto = { id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false };

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    assert.propEqual(await Photo.findBy({ is_public: false }), firstPhoto);
    assert.propEqual(await Photo.findBy(firstPhoto), firstPhoto);
    assert.propEqual(await Photo.findBy({ name: "Family photo", href: "family-photo.jpeg" }), {
      id: 2,
      name: "Family photo",
      href: "family-photo.jpeg",
      is_public: true,
    });
    assert.propEqual(await PhotoComment.findBy({ uuid: "d351963d-e725-4092-a37c-1ca1823b57d3" }), {
      uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
      content: "I was kidding",
      photo_id: 1,
      user_id: 1,
    });
  });

  test("$Model.findAll() without parameters returns all the models in the database", async function (assert) {
    const { Photo, PhotoComment } = await prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    assert.propEqual(await Photo.findAll(), [
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
    ]);
    assert.propEqual(await PhotoComment.findAll(), [
      {
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        content: "Interesting indeed",
        photo_id: 2,
        user_id: 1,
      },
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
    ]);
  });

  test("$Model.findAll(attributes) returns right models in the database", async function (assert) {
    const { Photo, PhotoComment } = await prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    assert.propEqual(await Photo.findAll({ is_public: false }), [
      {
        id: 1,
        name: "Ski trip",
        href: "ski-trip.jpeg",
        is_public: false,
      },
      {
        id: 3,
        name: "Selfie",
        href: "selfie.jpeg",
        is_public: false,
      },
    ]);
    assert.propEqual(await PhotoComment.findAll({ photo_id: 1, user_id: 1 }), [
      {
        uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
        content: "What a nice photo!",
        photo_id: 1,
        user_id: 1,
      },
      {
        uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
        content: "I was kidding",
        photo_id: 1,
        user_id: 1,
      },
    ]);
    assert.propEqual(await PhotoComment.findAll({ user_id: 1 }), [
      {
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        content: "Interesting indeed",
        photo_id: 2,
        user_id: 1,
      },
      {
        uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
        content: "What a nice photo!",
        photo_id: 1,
        user_id: 1,
      },
      {
        uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
        content: "I was kidding",
        photo_id: 1,
        user_id: 1,
      },
    ]);
  });
});
