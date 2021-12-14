import Memoria from "@memoria/server";
import { RESTAdapter, MemoryAdapter } from "@memoria/adapters";
import Model, {
  Changeset,
  DB,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  UpdateError,
} from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";

module("@memoria/adapters | RESTAdapter | $Model.update()", function (hooks) {
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

      @Column("varchar", { default: "Some default name" })
      name: string;

      @Column("varchar")
      href: string;

      @Column("boolean", { default: true })
      is_public: boolean;
    }
    class PhotoComment extends Model {
      static Adapter = RESTAdapter;

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
      static Adapter = RESTAdapter;

      @PrimaryGeneratedColumn()
      id: number;
    }

    return { Photo, PhotoComment, User };
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
    }
    class ServerUser extends Model {
      @PrimaryGeneratedColumn()
      id: number;
    }

    await DB.resetRecords();

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

        this.get("/photos/:id", async (request) => {
          let photo = await ServerPhoto.find(request.params.id);

          return { photo: ServerPhoto.serializer(photo) };
        });

        this.put("/photos/:id", async (request) => {
          try {
            let photo = await ServerPhoto.update(request.params.photo);

            return { photo: ServerPhoto.serializer(photo) };
          } catch (changeset) {
            return changeset;
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

        this.get("/photo-comments/:uuid", async (request) => {
          let photoComment = (await ServerPhotoComment.find(
            request.params.uuid
          )) as ServerPhotoComment;

          return { photoComment: ServerPhotoComment.serializer(photoComment) };
        });

        this.put("/photo-comments/:uuid", async (request) => {
          try {
            let photoComment = await ServerPhotoComment.update(request.params.photoComment);

            return { photoComment: ServerPhotoComment.serializer(photoComment) };
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

  test("$Model.update(attributes) can update models", async function (assert) {
    const { Photo, PhotoComment } = await prepare();
    this.Server = await prepareServer();

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
    assert.ok(
      !secondPhoto.isNew &&
        !secondPhoto.isDirty &&
        secondPhoto.isPersisted &&
        !secondPhoto.isDeleted
    );
    assert.propEqual(secondPhoto, {
      id: 2,
      name: "Family photo",
      href: "family-photo-2.jpeg",
      is_public: false,
    });
    assert.propEqual(secondPhoto, await Photo.find(2));

    let comment = await PhotoComment.update({
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
    });
    assert.ok(comment.inserted_at instanceof Date);
    assert.ok(comment.updated_at instanceof Date);
    assert.propEqual(firstComment.inserted_at, comment.inserted_at);
    assert.propEqual(firstComment.updated_at, comment.updated_at);
    assert.propEqual(
      comment,
      await PhotoComment.findBy({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29" })
    );
  });

  test("$Model.update(attributes) throws an exception when updating a nonexistent model", async function (assert) {
    const { Photo, PhotoComment } = await prepare();
    this.Server = await prepareServer();

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

  test("$Model.update(attributes) does not throw an exception when a model gets updated with an unknown $Model.attribute", async function (assert) {
    const { Photo, PhotoComment } = await prepare();
    this.Server = await prepareServer();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    let photo = await Photo.update({ id: 1, name: "ME", is_verified: false });

    assert.matchJson(photo, {
      id: 1,
      name: "ME",
      href: "ski-trip.jpeg",
      is_public: false,
    });

    let photoComment = await PhotoComment.update({
      uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
      location: "Amsterdam",
    });

    assert.matchJson(photoComment, {
      uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
      inserted_at: String,
      updated_at: String,
      is_important: true,
      content: "Interesting indeed",
    });
  });
});
