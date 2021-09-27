import { RESTAdapter, MemoryAdapter } from "@memoria/adapters";
import Model, {
  Changeset,
  Column,
  Config,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  InsertError,
  RuntimeError,
} from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";
import Memoria from "@memoria/server";

module("@memoria/adapters | RESTAdapter | $Model.insert()", function (hooks) {
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
    class User extends Model {
      static Adapter = RESTAdapter;
    }
    class Photo extends Model {
      static Adapter = RESTAdapter;

      @PrimaryGeneratedColumn()
      id: number;

      @Column("bool", { default: true })
      is_public: boolean;

      @Column("varchar", { default: "Some default name" })
      name: string;
    }
    class PhotoComment extends Model {
      static Adapter = RESTAdapter;

      @PrimaryGeneratedColumn("uuid")
      uuid: string;

      @CreateDateColumn()
      inserted_at: Date;

      @Column("bool", { default: true })
      is_important: boolean;
    }

    await Config.resetForTests();

    return { Photo, PhotoComment, User };
  }

  async function prepareServer() {
    class ServerPhoto extends Model {
      // NOTE: extending from another model doesnt work yet!
      static Adapter = MemoryAdapter;

      @PrimaryGeneratedColumn()
      id: number;

      @Column("bool", { default: true })
      is_public: boolean;

      @Column("varchar", { default: "Some default name" })
      name: string;
    }
    class ServerPhotoComment extends Model {
      // NOTE: extending from another model doesnt work yet!
      static Adapter = MemoryAdapter;

      @PrimaryGeneratedColumn("uuid")
      uuid: string;

      @CreateDateColumn()
      inserted_at: Date;

      @Column("bool", { default: true })
      is_important: boolean;
    }

    await Config.resetForTests();

    return new Memoria({
      routes() {
        this.post("/photos", async (request) => {
          try {
            let photo = await ServerPhoto.insert(request.params.photo);

            return { photo: ServerPhoto.serializer(photo) };
          } catch (changeset) {
            return { errors: Changeset.serializer(changeset) };
          }
        });

        this.get("/photos", async () => {
          let photos = await ServerPhoto.findAll();

          return { photos: ServerPhoto.serializer(photos) };
        });

        this.get("/photos/:id", async (request) => {
          let photo = await ServerPhoto.find(request.params.id);

          return { photo: ServerPhoto.serializer(photo) };
        });

        this.get("/photos/count", async (request) => {
          let photos = await ServerPhoto.findAll();

          return { count: photos.length };
        });

        this.post("/photo-comments", async (request) => {
          try {
            let photoComment = await ServerPhotoComment.insert(request.params.photoComment);

            return { photoComment: ServerPhotoComment.serializer(photoComment) };
          } catch (changeset) {
            return { errors: Changeset.serializer(changeset) };
          }
        });

        this.get("/photo-comments", async (request) => {
          let photoComment = await ServerPhotoComment.findAll();

          return { photoComments: ServerPhotoComment.serializer(photoComment) };
        });

        this.get("/photo-comments/count", async (request) => {
          let photoComment = await ServerPhotoComment.findAll();

          return { count: photoComment.length };
        });
      },
    });
  }

  test("$Model.insert() will insert an empty model and auto-generate primaryKeys", async function (assert) {
    const { Photo, PhotoComment } = await prepare();
    this.Server = await prepareServer();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
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
        id: 4,
        is_public: true,
        name: "Some default name",
      },
      {
        id: 5,
        is_public: true,
        name: "Some default name",
      },
    ]);

    const initialCommentUUIDs = (await PhotoComment.findAll()).map(
      (photoComment) => photoComment.uuid
    );

    assert.deepEqual(initialCommentUUIDs, [
      "499ec646-493f-4eea-b92e-e383d94182f4",
      "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
      "d351963d-e725-4092-a37c-1ca1823b57d3",
      "374c7f4a-85d6-429a-bf2a-0719525f5f29",
    ]);

    await PhotoComment.insert();

    const allPhotoComments = await PhotoComment.findAll();
    const lastPhotoComment = allPhotoComments[allPhotoComments.length - 1];

    assert.equal(await PhotoComment.count(), 5);
    assert.ok(!initialCommentUUIDs[lastPhotoComment.uuid], "inserted comment has a unique uuid");
  });

  test("$Model.insert(attributes) will insert a model with overriden attributes", async function (assert) {
    const { Photo, PhotoComment } = await prepare();
    this.Server = await prepareServer();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    await Photo.insert({ id: 99, href: "/izel.html", is_public: false });
    await Photo.insert({ name: "Baby photo", href: "/baby.jpg" });

    assert.equal(await Photo.count(), 5);
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
        is_public: false,
        name: "Some default name",
      },
      {
        id: 100,
        is_public: true,
        name: "Baby photo",
      },
    ]);

    const initialCommentUUIDs = (await PhotoComment.findAll()).map((comment) => comment.uuid);
    const commentOne = await PhotoComment.insert({
      inserted_at: new Date("2015-10-25T20:54:04.447Z"),
      photo_id: 1,
    });
    const commentTwo = await PhotoComment.insert({
      uuid: "6401f27c-49aa-4da7-9835-08f6f669e29f",
      is_important: false,
    });

    assert.equal(await PhotoComment.count(), 6);

    const allComments = await PhotoComment.findAll();
    const lastInsertedComments = allComments.slice(4, allComments.length);

    assert.ok(allComments.includes(commentOne), "first comment insert in the database");
    assert.ok(allComments.includes(commentTwo), "second comment insert in the database");

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

  test("$Model.insert(attributes) will throw if overriden primaryKey already exists", async function (assert) {
    const { Photo, PhotoComment } = await prepare();
    this.Server = await prepareServer();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    try {
      await Photo.insert({ id: 1 });
    } catch (changeset) {
      debugger;
      assert.ok(changeset instanceof InsertError);
      assert.propEqual(changeset.errors, [
        {
          attribute: "id",
          id: 1,
          message: "already exists",
          modelName: "Photo",
          name: "ModelError",
        },
      ]);
    }
    try {
      await PhotoComment.insert({ uuid: "d351963d-e725-4092-a37c-1ca1823b57d3" });
    } catch (changeset) {
      debugger;
      assert.ok(changeset instanceof InsertError);
      assert.propEqual(changeset.errors, [
        {
          attribute: "uuid",
          id: "d351963d-e725-4092-a37c-1ca1823b57d3",
          message: "already exists",
          modelName: "PhotoComment",
          name: "ModelError",
        },
      ]);
    }
  });

  test("$Model.insert(attributes) will throw if overriden primaryKey is wrong type", async function (assert) {
    const { Photo, PhotoComment } = await prepare();
    this.Server = await prepareServer();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    try {
      await Photo.insert({ id: "99" });
    } catch (changeset) {
      assert.ok(changeset instanceof RuntimeError);
    }
    try {
      await PhotoComment.insert({ uuid: 1 });
    } catch (changeset) {
      assert.ok(changeset instanceof RuntimeError);
    }
  });

  test("$Model.insert(attributes) cannot add new values to $Model.attributes when new attributes are discovered", async function (assert) {
    const { Photo, PhotoComment } = await prepare();
    this.Server = await prepareServer();

    await Promise.all([Photo, PhotoComment].map((model) => model.resetCache()));
    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    await Photo.insert({
      published_at: new Date("2017-10-10").toJSON(),
      description: "Some description",
    });
    await Photo.insert({ location: "Istanbul", is_public: false });
    await PhotoComment.insert({ updated_at: new Date("2017-01-10").toJSON(), like_count: 22 });
    await PhotoComment.insert({ reply_id: 1 });

    assert.deepEqual(Array.from(Photo.columnNames), ["id", "is_public", "name"]);
    assert.deepEqual(Array.from(PhotoComment.columnNames), ["uuid", "inserted_at", "is_important"]);
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
        id: 4,
        is_public: true,
        name: "Some default name",
      },
      {
        id: 5,
        is_public: false,
        name: "Some default name",
      },
    ]);
  });
});
