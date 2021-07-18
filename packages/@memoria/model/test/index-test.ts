import Model, { Column, CreateDateColumn, PrimaryGeneratedColumn } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "./helpers/setup-memoria";

module("@memoria/model | Public API", function (hooks) {
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

      @Column("boolean", { default: true })
      is_public: boolean;

      @Column({ type: "varchar", default: "Imported Photo" })
      name: string;

      static async publicPhotos() {
        return await super.findAll({ is_public: true });
      }
    }
    class PhotoComment extends Model {
      @PrimaryGeneratedColumn("uuid")
      uuid: string;

      @CreateDateColumn()
      inserted_at: Date;

      @Column("boolean", { default: true })
      is_important: boolean;

      @Column("bigint")
      photo_id: number;

      static async forPhoto(photo) {
        return await super.findAll({ photo_id: photo.id });
      }
    }
    class User extends Model {}

    return { Photo, PhotoComment, User };
  }

  test("$Model.name gets set correctly", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    assert.equal(Photo.name, "Photo");
    assert.equal(PhotoComment.name, "PhotoComment");
  });

  test("$Model.primaryKey gets set correctly", async function (assert) {
    const { Photo, PhotoComment, User } = prepare();

    assert.equal(Photo.primaryKeyName, "id");
    assert.equal(PhotoComment.primaryKeyName, "uuid");
    assert.equal(User.primaryKeyName, null);

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    assert.equal(Photo.primaryKeyName, "id");
    assert.equal(PhotoComment.primaryKeyName, "uuid");
    assert.equal(User.primaryKeyName, null);
    assert.ok(Photo._Store._DB === PhotoComment._Store._DB);
  });

  test("$Model.columnNames gets set correctly", async function (assert) {
    const { Photo, PhotoComment, User } = prepare();

    await Promise.all([Photo, PhotoComment, User].map((model) => model.resetCache()));

    assert.deepEqual(Array.from(Photo.columnNames), ["id", "is_public", "name"]);
    assert.deepEqual(Array.from(PhotoComment.columnNames), [
      "uuid",
      "inserted_at",
      "is_important",
      "photo_id",
    ]);
    assert.deepEqual(Array.from(User.columnNames), []);

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    assert.deepEqual(Array.from(Photo.columnNames), ["id", "is_public", "name"]);
    assert.deepEqual(Array.from(PhotoComment.columnNames), [
      "uuid",
      "inserted_at",
      "is_important",
      "photo_id",
    ]);
    assert.deepEqual(Array.from(User.columnNames), []);
  });

  test("$Model.count counts the models correctly", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    assert.equal(await Photo.count(), 0);
    assert.equal(await PhotoComment.count(), 0);

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    assert.equal(await Photo.count(), 3);
    assert.equal(await PhotoComment.count(), 4);
  });

  test("$Model can have custom methods/queries for the model", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    let photo = await Photo.find(1);

    assert.deepEqual(
      await PhotoComment.forPhoto(photo),
      await PhotoComment.findAll({ photo_id: photo.id })
    );
    assert.deepEqual(await Photo.publicPhotos(), await Photo.findAll({ is_public: true }));
  });
});
