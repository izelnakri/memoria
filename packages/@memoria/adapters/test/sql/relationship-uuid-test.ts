import Model, { PrimaryGeneratedColumn, Column } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "./helpers/setup-memoria.js";

module("@memoria/model | Relationship UUID for UUID(string)", function (hooks) {
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
      primary_email_uuid: "951d3321-9e66-4099-a4a5-cc1e4795d4zz",
    },
  ];
  const EMAIL_FIXTURES = [
    {
      uuid: "951d3321-9e66-4099-a4a5-cc1e4795d4zz",
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
      @PrimaryGeneratedColumn()
      id: number;

      @Column("int")
      user_id: number;

      @Column()
      photo_uuid: string;
    }
    class Photo extends Model {
      @PrimaryGeneratedColumn("uuid")
      uuid: string;

      @Column()
      name: string;

      @Column()
      href: string;

      @Column()
      is_public: boolean;
    }
    class PhotoComment extends Model {
      static embedReferences = {
        photo: Photo,
        author: User,
      };

      @PrimaryGeneratedColumn("uuid")
      uuid: string;

      @Column()
      content: string;

      @Column()
      photo_uuid: string;

      @Column("int")
      user_id: number;
    }

    Photo.embedReferences = {
      activity: Activity,
      comments: PhotoComment,
    };

    return { Activity, Email, User, Photo, PhotoComment };
  }

  test("$Model.getRelationship() works for hasOne/belongsTo uuid relationships both sides on uuid relationship", async function (assert) {
    const { Activity, Photo } = prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(ACITIVITY_FIXTURES.map((activity) => Activity.insert(activity)));

    const activity = Photo.getRelationship(
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
      Photo.getRelationship(
        await Photo.findBy({
          uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
        }),
        "activity"
      ),
      undefined
    );
    assert.deepEqual(
      Activity.getRelationship(activity, "photo", Photo),
      await Photo.findBy({
        uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
      })
    );
    assert.equal(Activity.getRelationship(await Activity.find(2), "photo", Photo), undefined);
  });

  test("$Model.getRelationship() works for hasMany/belongsTo uuid relationship both sides on uuid", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    const firstPhotoComments = Photo.getRelationship(
      await Photo.findBy({
        uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
      }),
      "comments"
    );
    const secondPhotoComments = Photo.getRelationship(
      await Photo.findBy({
        uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
      }),
      "comments"
    );
    const thirdPhotoComments = Photo.getRelationship(
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

    assert.throws(
      () => PhotoComment.getRelationship(firstPhotoComments, "photo"),
      /\[Memoria\] PhotoComment\.getRelationship expects model input to be an object not an array/
    );

    assert.propEqual(PhotoComment.getRelationship(firstPhotoComments[0], "photo", Photo), {
      uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
      name: "Ski trip",
      href: "ski-trip.jpeg",
      is_public: false,
    });
    assert.propEqual(PhotoComment.getRelationship(secondPhotoComments[0], "photo", Photo), {
      uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
      name: "Family photo",
      href: "family-photo.jpeg",
      is_public: true,
    });
  });

  test("$Model.getRelationship() works for custom named hasOne/belongsTo uuid relationships both side on uuid relationship", async function (assert) {
    const { Activity, Email, User, Photo, PhotoComment } = prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(ACITIVITY_FIXTURES.map((activity) => Activity.insert(activity)));
    await Promise.all(USER_FIXTURES.map((user) => User.insert(user)));
    await Promise.all(EMAIL_FIXTURES.map((email) => Email.insert(email)));

    const activity = Photo.getRelationship(
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
    assert.propEqual(User.getRelationship(await User.find(1), "primaryEmail", Email), {
      uuid: "951d3321-9e66-4099-a4a5-cc1e4795d4zz",
      address: "contact@izelnakri.com",
      is_public: false,
      confirmed_at: "2018-02-25T23:00:00.000Z",
      confirmation_token: "951d3321-9e66-4099-a4a5-cc1e4795d4ss",
      confirmation_token_sent_at: "2018-02-25T22:16:01.133Z",
      person_id: 1,
    });
    assert.equal(
      Photo.getRelationship(
        await Photo.findBy({
          uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
        }),
        "userActivity",
        Activity
      ),
      undefined
    );
    assert.deepEqual(
      Activity.getRelationship(activity, "photo", Photo),
      await Photo.findBy({
        uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
      })
    );
    assert.equal(Activity.getRelationship(await Activity.find(2), "photo", Photo), undefined);
  });

  test("$Model.getRelationship() works for custom named hasMany/belongsTo uuid relationships both side on uuid relationship", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    const firstPhotoComments = Photo.getRelationship(
      await Photo.findBy({
        uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
      }),
      "comments",
      PhotoComment
    );
    const secondPhotoComments = Photo.getRelationship(
      await Photo.findBy({
        uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
      }),
      "comments",
      PhotoComment
    );
    const thirdPhotoComments = Photo.getRelationship(
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

    assert.throws(
      () => PhotoComment.getRelationship(firstPhotoComments, "photo"),
      /\[Memoria\] PhotoComment\.getRelationship expects model input to be an object not an array/
    );
    assert.propEqual(PhotoComment.getRelationship(firstPhotoComments[0], "photo", Photo), {
      uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
      name: "Ski trip",
      href: "ski-trip.jpeg",
      is_public: false,
    });
    assert.propEqual(PhotoComment.getRelationship(secondPhotoComments[0], "photo", Photo), {
      uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
      name: "Family photo",
      href: "family-photo.jpeg",
      is_public: true,
    });
  });

  test("$Model.getRelationship() throws an error when uuid relationship reference is invalid", async function (assert) {
    const { Photo } = prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));

    assert.throws(() => {
      return Photo.getRelationship(
        Photo.findBy({
          uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
        }),
        "userComments"
      );
    }, /\[Memoria\] userComments relationship could not be found on Photo model\. Please put the userComments Model object as the third parameter to Photo\.getRelationship function/);
    assert.throws(() => {
      Photo.getRelationship(
        Photo.findBy({
          uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
        }),
        "userActivity"
      );
    }, /\[Memoria\] userActivity relationship could not be found on Photo model\. Please put the userActivity Model object as the third parameter to Photo\.getRelationship function/);
  });
});
