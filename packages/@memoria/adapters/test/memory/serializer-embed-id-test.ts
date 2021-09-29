import Model, { PrimaryGeneratedColumn, Column, RuntimeError, Serializer } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";

module("@memoria/adapters | MemoryAdapter | Serializer API for ID(integer)", function (hooks) {
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
  const ACITIVITY_FIXTURES = [
    {
      id: 1,
      user_id: 1,
      photo_id: 1,
    },
    {
      id: 2,
      user_id: 1,
      photo_id: null,
    },
  ];
  const USER_FIXTURES = [
    {
      id: 1,
      authentication_token: "1RQFPDXxNBvhGwZAEOj8ztGFItejDusXJw_F1FAg5-GknxhqrcfH9h4p9NGCiCVG",
      password_digest:
        "tL4rJzy3GrjSQ7K0ZMNqKsgMthsikbWfIEPTi/HJXD3lme7q6HT57RpuCKJOcAC9DFb3lXtEONmkB3fO0q3zWA==",
      primary_email_id: 1,
    },
  ];
  const EMAIL_FIXTURES = [
    {
      id: 1,
      address: "contact@izelnakri.com",
      is_public: false,
      confirmed_at: "2018-02-25T23:00:00.000Z",
      confirmation_token: "951d3321-9e66-4099-a4a5-cc1e4795d4ss",
      confirmation_token_sent_at: "2018-02-25T22:16:01.133Z",
      person_id: 1,
    },
  ];

  function prepare() {
    class User extends Model {
      static Serializer = class UserSerializer extends Serializer {};

      @PrimaryGeneratedColumn()
      id: number;

      @Column()
      authentication_token: string;

      @Column()
      password_digest: string;

      @Column("int")
      primary_email_id: number;
    }
    class Email extends Model {
      static Serializer = class EmailSerializer extends Serializer {};

      @PrimaryGeneratedColumn()
      id: number;

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
      static Serializer = class ActivitySerializer extends Serializer {};

      @PrimaryGeneratedColumn()
      id: number;

      @Column("int")
      user_id: number;

      @Column("int")
      photo_id: number;
    }
    class PhotoComment extends Model {
      static Serializer = class PhotoCommentSerializer extends Serializer {
        static embeds = {
          author: User,
        };
      };

      @PrimaryGeneratedColumn("uuid")
      uuid: string;

      @Column()
      content: string;

      @Column("int")
      photo_id: number;

      @Column("int")
      user_id: number;
    }
    class Photo extends Model {
      static Serializer = class PhotoSerializer extends Serializer {
        static embeds = {
          comments: PhotoComment,
          activity: Activity,
        };
      };

      @PrimaryGeneratedColumn()
      id: number;

      @Column()
      name: string;

      @Column()
      href: string;

      @Column()
      is_public: boolean;
    }

    return { Activity, Email, User, Photo, PhotoComment };
  }

  test("$Model.Serializer.getEmbeddedRelationship() works for hasOne/belongsTo id relationships both sides on id relationships", async function (assert) {
    const { Activity, Photo, PhotoComment } = prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(ACITIVITY_FIXTURES.map((activity) => Activity.insert(activity)));

    const activity = Photo.Serializer.getEmbeddedRelationship(
      Photo,
      Photo.peek(1),
      "activity",
      Activity
    );
    const activityLookupWithoutModel = Photo.Serializer.getEmbeddedRelationship(
      Photo,
      Photo.peek(1),
      "activity"
    );
    const activityLookupWithDifferentReferenceName = Photo.Serializer.getEmbeddedRelationship(
      Photo,
      Photo.peek(1),
      "somethingElse",
      Activity
    );

    assert.deepEqual(activity, activityLookupWithoutModel);
    assert.deepEqual(activity, activityLookupWithDifferentReferenceName);
    assert.propEqual(activity, { id: 1, user_id: 1, photo_id: 1 });
    assert.equal(
      Photo.Serializer.getEmbeddedRelationship(Photo, Photo.peek(2), "activity", Activity),
      undefined
    );
    assert.deepEqual(
      Activity.Serializer.getEmbeddedRelationship(Activity, activity, "photo", Photo),
      await Photo.find(1)
    );
    assert.equal(
      Activity.Serializer.getEmbeddedRelationship(Activity, Activity.peek(2), "photo", Photo),
      undefined
    );
  });

  test("$Model.Serializer.getEmbeddedRelationship() works for hasMany/belongsTo id relationships both sides on id relationships", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    const firstPhotoComments = Photo.Serializer.getEmbeddedRelationship(
      Photo,
      await Photo.find(1),
      "comments",
      PhotoComment
    );
    const secondPhotoComments = Photo.Serializer.getEmbeddedRelationship(
      Photo,
      await Photo.find(2),
      "comments",
      PhotoComment
    );
    const thirdPhotoComments = Photo.Serializer.getEmbeddedRelationship(
      Photo,
      await Photo.find(3),
      "comments",
      PhotoComment
    );

    assert.propEqual(firstPhotoComments, [
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
    assert.propEqual(secondPhotoComments, [
      {
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        content: "Interesting indeed",
        photo_id: 2,
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
        id: 1,
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
        id: 2,
        name: "Family photo",
        href: "family-photo.jpeg",
        is_public: true,
      }
    );
  });

  test("$Model.Serializer.getEmbeddedRelationship() works for custom named hasOne/belongsTo id relationships both side on id relationships", async function (assert) {
    const { Activity, Email, User, Photo, PhotoComment } = prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(ACITIVITY_FIXTURES.map((activity) => Activity.insert(activity)));
    await Promise.all(USER_FIXTURES.map((user) => User.insert(user)));
    await Promise.all(EMAIL_FIXTURES.map((email) => Email.insert(email)));

    const activity = Photo.Serializer.getEmbeddedRelationship(
      Photo,
      await Photo.find(1),
      "userActivity",
      Activity
    );

    assert.propEqual(activity, { id: 1, user_id: 1, photo_id: 1 });
    assert.propEqual(
      User.Serializer.getEmbeddedRelationship(User, await User.find(1), "primaryEmail", Email),
      {
        id: 1,
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
        await Photo.find(2),
        "userActivity",
        Activity
      ),
      undefined
    );
    assert.deepEqual(
      Activity.Serializer.getEmbeddedRelationship(Activity, activity, "photo", Photo),
      await Photo.find(1)
    );
    assert.equal(
      Activity.Serializer.getEmbeddedRelationship(
        Activity,
        await Activity.find(2),
        "userPhoto",
        Photo
      ),
      undefined
    );
    assert.deepEqual(
      Activity.Serializer.getEmbeddedRelationship(Activity, activity, "photo", Photo),
      await Photo.find(1)
    );
  });

  test("$Model.Serializer.getEmbeddedRelationship() works for custom named hasMany/belongsTo id relationships both side on id relationships", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    const firstPhotoComments = Photo.Serializer.getEmbeddedRelationship(
      Photo,
      await Photo.find(1),
      "comments",
      PhotoComment
    );
    const secondPhotoComments = Photo.Serializer.getEmbeddedRelationship(
      Photo,
      await Photo.find(2),
      "comments",
      PhotoComment
    );
    const thirdPhotoComments = Photo.Serializer.getEmbeddedRelationship(
      Photo,
      await Photo.find(3),
      "comments",
      PhotoComment
    );

    assert.propEqual(firstPhotoComments, [
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
    assert.propEqual(secondPhotoComments, [
      {
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        content: "Interesting indeed",
        photo_id: 2,
        user_id: 1,
      },
    ]);
    assert.deepEqual(thirdPhotoComments, []);

    try {
      PhotoComment.Serializer.getEmbeddedRelationship(
        PhotoComment,
        firstPhotoComments,
        "photo",
        Photo
      );
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
        id: 1,
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
        id: 2,
        name: "Family photo",
        href: "family-photo.jpeg",
        is_public: true,
      }
    );
  });

  test("$Model.Serializer.getEmbeddedRelationship() throws an error when id relationship reference is invalid", async function (assert) {
    const { Photo } = prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));

    try {
      Photo.Serializer.getEmbeddedRelationship(Photo, await Photo.find(1), "device");
    } catch (error) {
      assert.ok(error instanceof RuntimeError);
    }

    try {
      Photo.Serializer.getEmbeddedRelationship(Photo, await Photo.find(2), "senderActivity");
    } catch (error) {
      assert.ok(error instanceof RuntimeError);
    }
  });

  test("$Model.embedReferences can be set before runtime", async function (assert) {
    const { Activity, Photo, PhotoComment, User } = prepare();

    assert.deepEqual(Photo.Serializer.embeds, { comments: PhotoComment, activity: Activity });
    assert.deepEqual(PhotoComment.Serializer.embeds, { author: User });
  });

  test("$Model.embed({ embedName: ModelName }) sets an embedReference during runtime", async function (assert) {
    const { Activity, Photo, PhotoComment, User } = prepare();

    Photo.Serializer.embed(Photo, { userActivity: Activity });
    User.Serializer.embed(User, { activities: Activity });

    assert.deepEqual(Photo.Serializer.embeds, {
      comments: PhotoComment,
      activity: Activity,
      userActivity: Activity,
    });
    assert.deepEqual(User.Serializer.embeds, { activities: Activity });
  });

  test("$Model.Serializer.embed() throws error at runtime doesnt receive an object as parameter", async function (assert) {
    const { Activity, User } = prepare();

    try {
      User.Serializer.embed(User);
    } catch (error) {
      assert.ok(error instanceof RuntimeError);
    }

    try {
      User.Serializer.embed(User, Activity);
    } catch (error) {
      assert.ok(error instanceof RuntimeError);
    }
  });

  test("$Model.Serializer.embed() throws error when runtime $Model.embed(relationship) called with a Model that doesnt exist", async function (assert) {
    const { User } = prepare();

    try {
      User.Serializer.embed(User, { activities: undefined });
    } catch (error) {
      assert.ok(error instanceof RuntimeError);
    }
  });
});
