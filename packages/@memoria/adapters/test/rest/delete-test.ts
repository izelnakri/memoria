import Memoria from "@memoria/server";
import { RESTAdapter, MemoryAdapter } from "@memoria/adapters";
import Model, {
  Changeset,
  ModelStore,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  DeleteError,
  RuntimeError,
} from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";

module("@memoria/adapters | RESTAdapter | $Model.delete()", function (hooks) {
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

      @PrimaryGeneratedColumn("increment")
      id: number;
    }
    class Photo extends Model {
      static Adapter = RESTAdapter;

      @PrimaryGeneratedColumn()
      id: number;

      @Column("varchar")
      name: string;

      @Column()
      href: string;

      @Column("boolean")
      is_public: boolean;
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
    }
    await ModelStore.resetForTests();

    return { User, Photo, PhotoComment };
  }

  async function prepareServer() {
    class ServerPhoto extends Model {
      @PrimaryGeneratedColumn()
      id: number;

      @Column("varchar", { default: "Some default name" })
      name: string;

      @Column("varchar")
      href: string;

      @Column("boolean", { default: true })
      is_public: boolean;
    }
    class ServerPhotoComment extends Model {
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

      @Column("int")
      photo_id: number;

      @Column("int")
      user_id: number;
    }
    class ServerUser extends Model {
      @PrimaryGeneratedColumn()
      id: number;
    }

    await ModelStore.resetForTests();

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

        this.get("/photos", async ({ queryParams }) => {
          let photos = await ServerPhoto.findAll();

          return { photos: ServerPhoto.serializer(photos) };
        });

        this.delete("/photos/:id", async ({ params }) => {
          try {
            await ServerPhoto.delete(params.photo);
          } catch (changeset) {
            return { errors: Changeset.serializer(changeset) };
          }
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
          if (request.queryParams) {
            let photoComments = await ServerPhotoComment.findAll(request.queryParams);

            return { photoComments: ServerPhotoComment.serializer(photoComments) };
          }

          let photoComment = await ServerPhotoComment.findAll();

          return { photoComments: ServerPhotoComment.serializer(photoComment) };
        });

        this.delete("/photo-comments/:uuid", async ({ params }) => {
          try {
            await ServerPhotoComment.delete(params.photoComment);
          } catch (changeset) {
            return { errors: Changeset.serializer(changeset) };
          }
        });

        this.get("/photo-comments/count", async (request) => {
          let photoComment = await ServerPhotoComment.findAll();

          return { count: photoComment.length };
        });
      },
    });
  }

  test("$Model.delete() can delete existing items", async function (assert) {
    const { Photo, PhotoComment } = await prepare();
    this.Server = await prepareServer();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    let deletedPhoto = await Photo.delete({ id: 2 });
    assert.propEqual(deletedPhoto, {
      id: 2,
      name: "Family photo",
      href: "family-photo.jpeg",
      is_public: true,
    });
    assert.notOk(deletedPhoto.isNew);
    assert.ok(deletedPhoto.isPersisted);
    assert.ok(deletedPhoto.isDeleted);
    assert.notOk(deletedPhoto.isDirty);
    assert.deepEqual(deletedPhoto.changes, {});
    assert.deepEqual(deletedPhoto.revision, {
      id: 2,
      name: "Family photo",
      href: "family-photo.jpeg",
      is_public: true,
    });
    assert.deepEqual(deletedPhoto.revisionHistory, [
      {
        id: 2,
        name: "Family photo",
        href: "family-photo.jpeg",
        is_public: true,
      },
    ]);

    let deletedComment = await PhotoComment.delete({
      uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
    });
    assert.propEqual(deletedComment, {
      uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
      content: "What a nice photo!",
      photo_id: 1,
      user_id: 1,
    });
    assert.ok(!deletedComment.isNew && !deletedComment.isDirty && deletedComment.isDeleted);

    await PhotoComment.delete({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29" });

    assert.propEqual(await Photo.findAll(), [
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
    assert.propEqual(await PhotoComment.findAll(), [
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

  test("$Model.delete(model) throws when the model primaryKey doesnt exist in the database", async function (assert) {
    const { Photo, PhotoComment } = await prepare();
    this.Server = await prepareServer();

    try {
      await Photo.delete({ id: 1 });
    } catch (error) {
      assert.ok(error instanceof DeleteError);
    }
    try {
      await PhotoComment.delete({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5111" });
    } catch (error) {
      assert.ok(error instanceof DeleteError);
    }

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    await Photo.delete({ id: 1 });

    try {
      await Photo.delete({ id: 1 });
    } catch (error) {
      assert.ok(error instanceof DeleteError);
    }
    try {
      await PhotoComment.delete({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5111" });
    } catch (error) {
      assert.ok(error instanceof DeleteError);
    }
  });

  test("$Model.delete() throws when called without a parameter", async function (assert) {
    const { Photo, PhotoComment } = await prepare();
    this.Server = await prepareServer();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    try {
      await Photo.delete();
    } catch (error) {
      assert.ok(error instanceof RuntimeError);
    }
    try {
      await PhotoComment.delete();
    } catch (error) {
      assert.ok(error instanceof RuntimeError);
    }
  });
});

// NOTE: $Model.delete(primaryKey) feature ?
