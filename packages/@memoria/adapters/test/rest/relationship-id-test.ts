import Memoria from "@memoria/server";
import { RESTAdapter, MemoryAdapter } from "@memoria/adapters";
import Model, { Changeset, Config, PrimaryGeneratedColumn, Column } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";

module("@memoria/adapters | RESTAdapter | Relationship API for ID(integer)", function (hooks) {
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

  async function prepare() {
    class User extends Model {
      static Adapter = RESTAdapter;

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
      static Adapter = RESTAdapter;

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
      static Adapter = RESTAdapter;

      @PrimaryGeneratedColumn()
      id: number;

      @Column("int")
      user_id: number;

      @Column("int", { nullable: true })
      photo_id: number;
    }
    class PhotoComment extends Model {
      static Adapter = RESTAdapter;

      static embedReferences = {
        author: User,
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
      static Adapter = RESTAdapter;

      static embedReferences = {
        comments: PhotoComment,
        activity: Activity,
      };

      @PrimaryGeneratedColumn()
      id: number;

      @Column()
      name: string;

      @Column()
      href: string;

      @Column("bool")
      is_public: boolean;
    }

    await Config.resetForTests();

    return { Activity, Email, User, Photo, PhotoComment };
  }

  async function prepareServer() {
    class ServerUser extends Model {
      @PrimaryGeneratedColumn()
      id: number;

      @Column()
      authentication_token: string;

      @Column()
      password_digest: string;

      @Column("int")
      primary_email_id: number;
    }
    class ServerEmail extends Model {
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
    class ServerActivity extends Model {
      @PrimaryGeneratedColumn()
      id: number;

      @Column("int")
      user_id: number;

      @Column("int", { nullable: true })
      photo_id: number;
    }
    class ServerPhotoComment extends Model {
      static embedReferences = {
        author: ServerUser,
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
    class ServerPhoto extends Model {
      static embedReferences = {
        comments: ServerPhotoComment,
        activity: ServerActivity,
      };

      @PrimaryGeneratedColumn()
      id: number;

      @Column()
      name: string;

      @Column()
      href: string;

      @Column("bool")
      is_public: boolean;
    }

    await Config.resetForTests();

    return new Memoria({
      routes() {
        this.post("/activities", async (request) => {
          try {
            let activity = await ServerActivity.insert(request.params.activity);

            return { activity: ServerActivity.serializer(activity) };
          } catch (changeset) {
            return { errors: Changeset.serializer(changeset) };
          }
        });

        this.get("/activities/:id", async (request) => {
          let activity = await ServerActivity.find(request.params.id);

          return { activity: ServerActivity.serializer(activity) };
        });

        this.post("/emails", async (request) => {
          try {
            let email = await ServerEmail.insert(request.params.email);

            return { email: ServerEmail.serializer(email) };
          } catch (changeset) {
            return { errors: Changeset.serializer(changeset) };
          }
        });

        this.post("/photos", async (request) => {
          try {
            let photo = await ServerPhoto.insert(request.params.photo);

            return { photo: ServerPhoto.serializer(photo) };
          } catch (changeset) {
            return { errors: Changeset.serializer(changeset) };
          }
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

  test("$Model.getRelationship() works for hasOne/belongsTo id relationships both sides on id relationships", async function (assert) {
    const { Activity, Photo, PhotoComment } = await prepare();
    this.Server = await prepareServer();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(ACITIVITY_FIXTURES.map((activity) => Activity.insert(activity)));

    const activity = Photo.getRelationship(Photo.peek(1), "activity", Activity);
    const activityLookupWithoutModel = Photo.getRelationship(Photo.peek(1), "activity");
    const activityLookupWithDifferentReferenceName = Photo.getRelationship(
      Photo.peek(1),
      "somethingElse",
      Activity
    );

    assert.deepEqual(activity, activityLookupWithoutModel);
    assert.deepEqual(activity, activityLookupWithDifferentReferenceName);
    assert.propEqual(activity, { id: 1, user_id: 1, photo_id: 1 });
    assert.equal(Photo.getRelationship(Photo.peek(2), "activity", Activity), undefined);
    assert.deepEqual(Activity.getRelationship(activity, "photo", Photo), await Photo.find(1));
    assert.equal(Activity.getRelationship(Activity.peek(2), "photo", Photo), undefined);
  });

  test("$Model.getRelationship() works for hasMany/belongsTo id relationships both sides on id relationships", async function (assert) {
    const { Photo, PhotoComment } = await prepare();
    this.Server = await prepareServer();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    const firstPhotoComments = Photo.getRelationship(await Photo.find(1), "comments", PhotoComment);
    const secondPhotoComments = Photo.getRelationship(
      await Photo.find(2),
      "comments",
      PhotoComment
    );
    const thirdPhotoComments = Photo.getRelationship(await Photo.find(3), "comments", PhotoComment);

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
      PhotoComment.getRelationship(firstPhotoComments, "photo");
    } catch (error) {
      assert.ok(
        /\[Memoria\] PhotoComment\.getRelationship expects model input to be an object not an array/.test(
          error.message
        )
      );
    }

    assert.propEqual(PhotoComment.getRelationship(firstPhotoComments[0], "photo", Photo), {
      id: 1,
      name: "Ski trip",
      href: "ski-trip.jpeg",
      is_public: false,
    });
    assert.propEqual(PhotoComment.getRelationship(secondPhotoComments[0], "photo", Photo), {
      id: 2,
      name: "Family photo",
      href: "family-photo.jpeg",
      is_public: true,
    });
  });

  test("$Model.getRelationship() works for custom named hasOne/belongsTo id relationships both side on id relationships", async function (assert) {
    const { Activity, Email, User, Photo, PhotoComment } = await prepare();
    this.Server = await prepareServer();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(ACITIVITY_FIXTURES.map((activity) => Activity.insert(activity)));
    await Promise.all(USER_FIXTURES.map((user) => User.insert(user)));
    await Promise.all(EMAIL_FIXTURES.map((email) => Email.insert(email)));

    const activity = Photo.getRelationship(await Photo.find(1), "userActivity", Activity);

    assert.propEqual(activity, { id: 1, user_id: 1, photo_id: 1 });
    assert.propEqual(User.getRelationship(await User.find(1), "primaryEmail", Email), {
      id: 1,
      address: "contact@izelnakri.com",
      is_public: false,
      confirmed_at: "2018-02-25T23:00:00.000Z",
      confirmation_token: "951d3321-9e66-4099-a4a5-cc1e4795d4ss",
      confirmation_token_sent_at: "2018-02-25T22:16:01.133Z",
      person_id: 1,
    });
    assert.equal(Photo.getRelationship(await Photo.find(2), "userActivity", Activity), undefined);
    assert.deepEqual(Activity.getRelationship(activity, "photo", Photo), await Photo.find(1));
    assert.equal(Activity.getRelationship(await Activity.find(2), "userPhoto", Photo), undefined);
    assert.deepEqual(Activity.getRelationship(activity, "photo", Photo), await Photo.find(1));
  });

  test("$Model.getRelationship() works for custom named hasMany/belongsTo id relationships both side on id relationships", async function (assert) {
    const { Photo, PhotoComment } = await prepare();
    this.Server = await prepareServer();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    const firstPhotoComments = Photo.getRelationship(await Photo.find(1), "comments", PhotoComment);
    const secondPhotoComments = Photo.getRelationship(
      await Photo.find(2),
      "comments",
      PhotoComment
    );
    const thirdPhotoComments = Photo.getRelationship(await Photo.find(3), "comments", PhotoComment);

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
      PhotoComment.getRelationship(firstPhotoComments, "photo", Photo);
    } catch (error) {
      assert.ok(
        /\[Memoria\] PhotoComment\.getRelationship expects model input to be an object not an array/.test(
          error.message
        )
      );
    }

    assert.propEqual(PhotoComment.getRelationship(firstPhotoComments[0], "photo", Photo), {
      id: 1,
      name: "Ski trip",
      href: "ski-trip.jpeg",
      is_public: false,
    });
    assert.propEqual(PhotoComment.getRelationship(secondPhotoComments[0], "photo", Photo), {
      id: 2,
      name: "Family photo",
      href: "family-photo.jpeg",
      is_public: true,
    });
  });

  test("$Model.getRelationship() throws an error when id relationship reference is invalid", async function (assert) {
    const { Photo } = await prepare();
    this.Server = await prepareServer();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));

    try {
      Photo.getRelationship(await Photo.find(1), "device");
    } catch (error) {
      assert.ok(
        /\[Memoria\] device relationship could not be found on Photo model\. Please put the device Model object as the third parameter to Photo\.getRelationship function/.test(
          error.message
        )
      );
    }

    try {
      Photo.getRelationship(await Photo.find(2), "senderActivity");
    } catch (error) {
      assert.ok(
        /\[Memoria\] senderActivity relationship could not be found on Photo model\. Please put the senderActivity Model object as the third parameter to Photo\.getRelationship function/.test(
          error.message
        )
      );
    }
  });

  test("$Model.embedReferences can be set before runtime", async function (assert) {
    const { Activity, Photo, PhotoComment, User } = await prepare();

    assert.deepEqual(Photo.embedReferences, { comments: PhotoComment, activity: Activity });
    assert.deepEqual(PhotoComment.embedReferences, { author: User });
  });

  test("$Model.embed({ embedName: ModelName }) sets an embedReference during runtime", async function (assert) {
    const { Activity, Photo, PhotoComment, User } = await prepare();

    Photo.embed({ userActivity: Activity });
    User.embed({ activities: Activity });

    assert.deepEqual(Photo.embedReferences, {
      comments: PhotoComment,
      activity: Activity,
      userActivity: Activity,
    });
    assert.deepEqual(User.embedReferences, { activities: Activity });
  });

  test("$Model.embed() throws error at runtime doesnt receive an object as parameter", async function (assert) {
    const { Activity, User } = await prepare();

    try {
      User.embed();
    } catch (error) {
      assert.ok(
        /\[Memoria\] User\.embed\(relationshipObject\) requires an object as a parameter: { relationshipKey: \$RelationshipModel }/.test(
          error.message
        )
      );
    }

    try {
      User.embed(Activity);
    } catch (error) {
      assert.ok(
        /\[Memoria\] User\.embed\(relationshipObject\) requires an object as a parameter: { relationshipKey: \$RelationshipModel }/.test(
          error.message
        )
      );
    }
  });

  test("$Model.embed() throws error when runtime $Model.embed(relationship) called with a Model that doesnt exist", async function (assert) {
    const { User } = await prepare();

    try {
      User.embed({ activities: undefined });
    } catch (error) {
      assert.ok(
        /\[Memoria\] User\.embed\(\) fails: activities Model reference is not a valid\. Please put a valid \$ModelName to User\.embed\(\)/.test(
          error.message
        )
      );
    }
  });
});
