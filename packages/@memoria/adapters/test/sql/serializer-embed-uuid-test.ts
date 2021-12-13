import Model, {
  ConfigStore,
  ModelStore,
  PrimaryGeneratedColumn,
  Column,
  RuntimeError,
  Serializer,
} from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";
import SQLAdapter from "../helpers/sql-adapter.js";

module("@memoria/adapters | SQLAdapter | Relationship UUID for UUID(string)", function (hooks) {
  setupMemoria(hooks);

  const PHOTO_FIXTURES = [
    {
      uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
      name: "Ski trip",
      href: "ski-trip.jpeg",
      is_public: false,
    },
    {
      uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
      name: "Family photo",
      href: "family-photo.jpeg",
      is_public: true,
    },
    {
      uuid: "6f0c74bb-13e0-4609-b34d-568cd3cee6bc",
      name: "Selfie",
      href: "selfie.jpeg",
      is_public: false,
    },
  ];
  const PHOTO_COMMENT_FIXTURES = [
    {
      uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
      content: "What a nice photo!",
      photo_uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
      user_id: 1,
    },
    {
      uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
      content: "I agree",
      photo_uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
      user_id: 2,
    },
    {
      uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
      content: "I was kidding",
      photo_uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
      user_id: 1,
    },
    {
      uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
      content: "Interesting indeed",
      photo_uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
      user_id: 1,
    },
  ];
  const ACITIVITY_FIXTURES = [
    {
      id: 1,
      user_id: 1,
      photo_uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
    },
    {
      id: 2,
      user_id: 1,
      photo_uuid: null,
    },
  ];
  const USER_FIXTURES = [
    {
      id: 1,
      authentication_token: "1RQFPDXxNBvhGwZAEOj8ztGFItejDusXJw_F1FAg5-GknxhqrcfH9h4p9NGCiCVG",
      password_digest:
        "tL4rJzy3GrjSQ7K0ZMNqKsgMthsikbWfIEPTi/HJXD3lme7q6HT57RpuCKJOcAC9DFb3lXtEONmkB3fO0q3zWA==",
      primary_email_uuid: "8a80e7f1-825c-4641-a3e4-c9a43022c18c",
    },
  ];
  const EMAIL_FIXTURES = [
    {
      uuid: "8a80e7f1-825c-4641-a3e4-c9a43022c18c",
      address: "contact@izelnakri.com",
      is_public: false,
      confirmed_at: "2018-02-25T23:00:00.000Z",
      confirmation_token: "951d3321-9e66-4099-a4a5-cc1e4795d4ss",
      confirmation_token_sent_at: "2018-02-25T22:16:01.133Z",
      person_id: 1,
    },
  ];

  async function prepare() {
    await ConfigStore.resetSchemas();

    class User extends Model {
      static Adapter = SQLAdapter;
      static Serializer = class UserSerializer extends Serializer {};

      @PrimaryGeneratedColumn()
      id: number;

      @Column()
      authentication_token: string;

      @Column()
      password_digest: string;

      @Column()
      primary_email_uuid: string;
    }
    class Email extends Model {
      static Adapter = SQLAdapter;
      static Serializer = class EmailSerializer extends Serializer {};

      @PrimaryGeneratedColumn("uuid")
      uuid: string;

      @Column()
      address: string;

      @Column("boolean")
      is_public: boolean;

      @Column()
      confirmed_at: string;

      @Column()
      confirmation_token: string;

      @Column()
      confirmation_token_sent_at: string;

      @Column("int")
      person_id: number;
    }
    class Activity extends Model {
      static Adapter = SQLAdapter;
      static Serializer = class ActivitySerializer extends Serializer {};

      @PrimaryGeneratedColumn()
      id: number;

      @Column("int")
      user_id: number;

      @Column("varchar", { nullable: true })
      photo_uuid: string;
    }
    class Photo extends Model {
      static Adapter = SQLAdapter;
      static Serializer = class PhotoSerializer extends Serializer {};

      @PrimaryGeneratedColumn("uuid")
      uuid: string;

      @Column()
      name: string;

      @Column()
      href: string;

      @Column("boolean")
      is_public: boolean;
    }
    class PhotoComment extends Model {
      static Adapter = SQLAdapter;
      static Serializer = class PhotoCommentSerializer extends Serializer {
        static embeds = {
          photo: Photo,
          author: User,
        };
      };

      @PrimaryGeneratedColumn("uuid")
      uuid: string;

      @Column()
      content: string;

      @Column("varchar", { nullable: true })
      photo_uuid: string;

      @Column("int")
      user_id: number;
    }

    Photo.Serializer.embeds = {
      activity: Activity,
      comments: PhotoComment,
    };

    await ModelStore.resetForTests();

    return { Activity, Email, User, Photo, PhotoComment };
  }

  test("$Model.Serializer.getEmbeddedRelationship() works for hasOne/belongsTo uuid relationships both sides on uuid relationship", async function (assert) {
    const { Activity, Photo } = await prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(ACITIVITY_FIXTURES.map((activity) => Activity.insert(activity)));

    const activity = Photo.Serializer.getEmbeddedRelationship(
      Photo,
      await Photo.findBy({
        uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
      }),
      "activity"
    );

    assert.propEqual(activity, {
      id: 1,
      user_id: 1,
      photo_uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
    });
    assert.equal(
      Photo.Serializer.getEmbeddedRelationship(
        Photo,
        await Photo.findBy({
          uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
        }),
        "activity"
      ),
      undefined
    );
    assert.deepEqual(
      Activity.Serializer.getEmbeddedRelationship(Activity, activity, "photo", Photo),
      await Photo.findBy({
        uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
      })
    );
    assert.equal(
      Activity.Serializer.getEmbeddedRelationship(Activity, await Activity.find(2), "photo", Photo),
      undefined
    );
  });

  test("$Model.Serializer.getEmbeddedRelationship() works for hasMany/belongsTo uuid relationship both sides on uuid", async function (assert) {
    const { Photo, PhotoComment } = await prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    const firstPhotoComments = Photo.Serializer.getEmbeddedRelationship(
      Photo,
      await Photo.findBy({
        uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
      }),
      "comments"
    );
    const secondPhotoComments = Photo.Serializer.getEmbeddedRelationship(
      Photo,
      await Photo.findBy({
        uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
      }),
      "comments"
    );
    const thirdPhotoComments = Photo.Serializer.getEmbeddedRelationship(
      Photo,
      await Photo.findBy({
        uuid: "6f0c74bb-13e0-4609-b34d-568cd3cee6bc",
      }),
      "comments"
    );

    assert.propEqual(firstPhotoComments, [
      {
        uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
        content: "What a nice photo!",
        photo_uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
        user_id: 1,
      },
      {
        uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
        content: "I agree",
        photo_uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
        user_id: 2,
      },
      {
        uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
        content: "I was kidding",
        photo_uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
        user_id: 1,
      },
    ]);
    assert.propEqual(secondPhotoComments, [
      {
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        content: "Interesting indeed",
        photo_uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
        user_id: 1,
      },
    ]);
    assert.deepEqual(thirdPhotoComments, []);

    try {
      PhotoComment.Serializer.getEmbeddedRelationship(PhotoComment, firstPhotoComments, "photo");
    } catch (error) {
      assert.ok(error instanceof RuntimeError);
    }

    assert.propEqual(
      PhotoComment.Serializer.getEmbeddedRelationship(
        PhotoComment,
        firstPhotoComments[0],
        "photo",
        Photo
      ),
      {
        uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
        name: "Ski trip",
        href: "ski-trip.jpeg",
        is_public: false,
      }
    );
    assert.propEqual(
      PhotoComment.Serializer.getEmbeddedRelationship(
        PhotoComment,
        secondPhotoComments[0],
        "photo",
        Photo
      ),
      {
        uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
        name: "Family photo",
        href: "family-photo.jpeg",
        is_public: true,
      }
    );
  });

  test("$Model.Serializer.getEmbeddedRelationship() works for custom named hasOne/belongsTo uuid relationships both side on uuid relationship", async function (assert) {
    const { Activity, Email, User, Photo, PhotoComment } = await prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(ACITIVITY_FIXTURES.map((activity) => Activity.insert(activity)));
    await Promise.all(USER_FIXTURES.map((user) => User.insert(user)));
    await Promise.all(EMAIL_FIXTURES.map((email) => Email.insert(email)));

    const activity = Photo.Serializer.getEmbeddedRelationship(
      Photo,
      await Photo.findBy({
        uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
      }),
      "userActivity",
      Activity
    );

    assert.propEqual(activity, {
      id: 1,
      user_id: 1,
      photo_uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
    });
    assert.propEqual(
      User.Serializer.getEmbeddedRelationship(User, await User.find(1), "primaryEmail", Email),
      {
        uuid: "8a80e7f1-825c-4641-a3e4-c9a43022c18c",
        address: "contact@izelnakri.com",
        is_public: false,
        confirmed_at: "2018-02-25T23:00:00.000Z",
        confirmation_token: "951d3321-9e66-4099-a4a5-cc1e4795d4ss",
        confirmation_token_sent_at: "2018-02-25T22:16:01.133Z",
        person_id: 1,
      }
    );
    assert.equal(
      Photo.Serializer.getEmbeddedRelationship(
        Photo,
        await Photo.findBy({
          uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
        }),
        "userActivity",
        Activity
      ),
      undefined
    );
    assert.deepEqual(
      Activity.Serializer.getEmbeddedRelationship(Activity, activity, "photo", Photo),
      await Photo.findBy({
        uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
      })
    );
    assert.equal(
      Activity.Serializer.getEmbeddedRelationship(Activity, await Activity.find(2), "photo", Photo),
      undefined
    );
  });

  test("$Model.Serializer.getEmbeddedRelationship() works for custom named hasMany/belongsTo uuid relationships both side on uuid relationship", async function (assert) {
    const { Photo, PhotoComment } = await prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    const firstPhotoComments = Photo.Serializer.getEmbeddedRelationship(
      Photo,
      await Photo.findBy({
        uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
      }),
      "comments",
      PhotoComment
    );
    const secondPhotoComments = Photo.Serializer.getEmbeddedRelationship(
      Photo,
      await Photo.findBy({
        uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
      }),
      "comments",
      PhotoComment
    );
    const thirdPhotoComments = Photo.Serializer.getEmbeddedRelationship(
      Photo,
      await Photo.findBy({
        uuid: "6f0c74bb-13e0-4609-b34d-568cd3cee6bc",
      }),
      "comments",
      PhotoComment
    );

    assert.propEqual(firstPhotoComments, [
      {
        uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
        content: "What a nice photo!",
        photo_uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
        user_id: 1,
      },
      {
        uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
        content: "I agree",
        photo_uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
        user_id: 2,
      },
      {
        uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
        content: "I was kidding",
        photo_uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
        user_id: 1,
      },
    ]);
    assert.propEqual(secondPhotoComments, [
      {
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        content: "Interesting indeed",
        photo_uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
        user_id: 1,
      },
    ]);
    assert.deepEqual(thirdPhotoComments, []);

    try {
      PhotoComment.Serializer.getEmbeddedRelationship(PhotoComment, firstPhotoComments, "photo");
    } catch (error) {
      assert.ok(error instanceof RuntimeError);
    }

    assert.propEqual(
      PhotoComment.Serializer.getEmbeddedRelationship(
        PhotoComment,
        firstPhotoComments[0],
        "photo",
        Photo
      ),
      {
        uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
        name: "Ski trip",
        href: "ski-trip.jpeg",
        is_public: false,
      }
    );
    assert.propEqual(
      PhotoComment.Serializer.getEmbeddedRelationship(
        PhotoComment,
        secondPhotoComments[0],
        "photo",
        Photo
      ),
      {
        uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
        name: "Family photo",
        href: "family-photo.jpeg",
        is_public: true,
      }
    );
  });

  test("$Model.Serializer.getEmbeddedRelationship() throws an error when uuid relationship reference is invalid", async function (assert) {
    const { Photo } = await prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));

    try {
      Photo.Serializer.getEmbeddedRelationship(
        Photo,
        Photo.findBy({
          uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
        }),
        "userComments"
      );
    } catch (error) {
      assert.ok(error instanceof RuntimeError);
    }

    try {
      Photo.Serializer.getEmbeddedRelationship(
        Photo,
        Photo.findBy({
          uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
        }),
        "userActivity"
      );
    } catch (error) {
      assert.ok(error instanceof RuntimeError);
    }
  });
});
