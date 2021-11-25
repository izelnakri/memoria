import Memoria from "@memoria/server";
import { RESTAdapter, MemoryAdapter } from "@memoria/adapters";
import Model, {
  InsertError,
  RuntimeError,
  CreateDateColumn,
  Changeset,
  Config,
  PrimaryGeneratedColumn,
  Column,
} from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";

module("@memoria/adapters | RESTAdapter | $Model.resetRecords(initialState)", function (hooks) {
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
      static Adapter = RESTAdapter;

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
      static Adapter = RESTAdapter;

      @PrimaryGeneratedColumn()
      id: number;
    }
    class PhotoComment extends Model {
      static Adapter = RESTAdapter;

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

  async function prepareServer() {
    await Config.resetForTests();

    class ServerPhoto extends Model {
      @PrimaryGeneratedColumn()
      id: number;

      @Column("varchar", { default: "Imported photo" })
      name: string;

      @Column()
      href: string;

      @Column("bool", { default: true })
      is_public: boolean;
    }
    class ServerUser extends Model {
      @PrimaryGeneratedColumn()
      id: number;
    }
    class ServerPhotoComment extends Model {
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

        this.post("/photos/reset", async (request) => {
          let photos = await ServerPhoto.resetRecords(request.params.photos);

          return { photos: ServerPhoto.serializer(photos) };
        });

        this.get("/photos", async (request) => {
          let photos = await ServerPhoto.findAll();

          return { photos: ServerPhoto.serializer(photos) };
        });

        this.get("/photos/:id", async (request) => {
          let photo = await ServerPhoto.find(request.params.id);

          return { photo: ServerPhoto.serializer(photo) };
        });

        this.post("/photo-comments", async (request) => {
          try {
            let photoComment = await ServerPhotoComment.insert(request.params.photoComment);

            return { photoComment: ServerPhotoComment.serializer(photoComment) };
          } catch (changeset) {
            return { errors: Changeset.serializer(changeset) };
          }
        });

        this.post("/photo-comments/reset", async (request) => {
          try {
            let photoComments = await ServerPhotoComment.resetRecords(request.params.photoComments);

            return { photoComments: ServerPhotoComment.serializer(photoComments) };
          } catch (changeset) {
            return { errors: Changeset.serializer(changeset) };
          }
        });

        this.get("/photo-comments", async (request) => {
          let photoComment = await ServerPhotoComment.findAll();

          return { photoComment: ServerPhotoComment.serializer(photoComment) };
        });

        this.get("/photo-comments/:uuid", async (request) => {
          let photoComment = (await ServerPhotoComment.find(
            request.params.uuid
          )) as ServerPhotoComment;

          return { photoComment: ServerPhotoComment.serializer(photoComment) };
        });

        this.post("/users", async (request) => {
          try {
            let user = await ServerUser.insert(request.params.user);

            return { user: ServerUser.serializer(user) };
          } catch (changeset) {
            return { errors: Changeset.serializer(changeset) };
          }
        });

        this.get("/users/:id", async (request) => {
          let user = await ServerUser.find(request.params.id);

          return { user: ServerUser.serializer(user) };
        });
      },
    });
  }

  test("$Model.resetRecords() resets the models DB", async function (assert) {
    const { Photo, PhotoComment, User } = await prepare();
    this.Server = await prepareServer();

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
    this.Server = await prepareServer();

    assert.deepEqual(await Photo.findAll(), []);
    assert.deepEqual(await PhotoComment.findAll(), []);

    await Photo.resetRecords(PHOTO_FIXTURES);
    await PhotoComment.resetRecords(PHOTO_COMMENT_FIXTURES);

    assert.propEqual(await Photo.findAll(), PHOTO_FIXTURES);

    let photoComments = await PhotoComment.findAll();
    assert.propEqual(photoComments, [
      {
        uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
        content: "What a nice photo!",
        photo_id: 1,
        user_id: 1,
        is_important: true,
        inserted_at: photoComments[0].inserted_at,
      },
      {
        uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
        content: "I agree",
        photo_id: 1,
        user_id: 2,
        is_important: true,
        inserted_at: photoComments[1].inserted_at,
      },
      {
        uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
        content: "I was kidding",
        photo_id: 1,
        user_id: 1,
        is_important: true,
        inserted_at: photoComments[2].inserted_at,
      },
      {
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        content: "Interesting indeed",
        photo_id: 2,
        user_id: 1,
        is_important: true,
        inserted_at: photoComments[3].inserted_at,
      },
    ]);

    let photoComment = photoComments[0];
    assert.notOk(photoComment.isNew);
    assert.ok(photoComment.isPersisted);
    assert.notOk(photoComment.isDeleted);
    assert.notOk(photoComment.isDirty);
    assert.deepEqual(photoComment.changes, {});
    assert.deepEqual(photoComment.revision, {
      content: "What a nice photo!",
      inserted_at: photoComments[0].inserted_at,
      is_important: true,
      photo_id: 1,
      user_id: 1,
      uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
    });
    assert.deepEqual(photoComment.revisionHistory, [
      {
        content: "What a nice photo!",
        inserted_at: photoComments[0].inserted_at,
        is_important: true,
        photo_id: 1,
        user_id: 1,
        uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
      },
    ]);
  });

  test("Memoria fixtures should throw error if any of the fixtures missing id or uuid", async function (assert) {
    const { PhotoComment } = await prepare();
    this.Server = await prepareServer();

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
      assert.ok(error instanceof RuntimeError);
    }
  });

  test("Memoria fixtures should throw error if any of the id fixtures have an incorrect type", async function (assert) {
    const { Photo } = await prepare();
    this.Server = await prepareServer();

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
      assert.ok(error instanceof RuntimeError);
    }
  });

  test("Memoria fixtures should throw error if any of the uuid fixtures have an incorrect type", async function (assert) {
    const { PhotoComment } = await prepare();
    this.Server = await prepareServer();

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
      assert.ok(error instanceof RuntimeError);
    }
  });

  test("Memoria fixtures should throw error if there are duplicate id fixtures", async function (assert) {
    const { Photo } = await prepare();
    this.Server = await prepareServer();

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
      assert.ok(error instanceof RuntimeError);
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
      assert.ok(error instanceof RuntimeError);
    }
  });
});
