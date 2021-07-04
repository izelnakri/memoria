import Model from "@memserver/model";
import { module, test } from "qunitx";
import setupMemserver from "./helpers/setup-memserver";

module("@memserver/model | Relationship UUID for UUID(string)", function (hooks) {
  setupMemserver(hooks);

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
    class User extends Model {}
    class Email extends Model {}
    class Activity extends Model {}

    class Photo extends Model {}
    class PhotoComment extends Model {
      static embedReferences = {
        photo: Photo,
        author: User,
      };
    }
    Photo.embedReferences = {
      activity: Activity,
      comments: PhotoComment,
    };

    return { Activity, Email, User, Photo, PhotoComment };
  }

  test("$Model.getRelationship() works for hasOne/belongsTo uuid relationships both sides on uuid relationship", async function (assert) {
    const { Activity, Photo } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));
    ACITIVITY_FIXTURES.forEach((activity) => Activity.insert(activity));

    const activity = Photo.getRelationship(
      Photo.findBy({
        uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
      }),
      "activity"
    );

    assert.deepEqual(activity, {
      id: 1,
      user_id: 1,
      photo_uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
    });
    assert.equal(
      Photo.getRelationship(
        Photo.findBy({
          uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
        }),
        "activity"
      ),
      undefined
    );
    assert.deepEqual(
      Activity.getRelationship(activity, "photo", Photo),
      Photo.findBy({
        uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
      })
    );
    assert.equal(Activity.getRelationship(Activity.find(2), "photo", Photo), undefined);
  });

  test("$Model.getRelationship() works for hasMany/belongsTo uuid relationship both sides on uuid", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));
    PHOTO_COMMENT_FIXTURES.forEach((photoComment) => PhotoComment.insert(photoComment));

    const firstPhotoComments = Photo.getRelationship(
      Photo.findBy({
        uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
      }),
      "comments"
    );
    const secondPhotoComments = Photo.getRelationship(
      Photo.findBy({
        uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
      }),
      "comments"
    );
    const thirdPhotoComments = Photo.getRelationship(
      Photo.findBy({
        uuid: "6f0c74bb-13e0-4609-b34d-568cd3cee6bc",
      }),
      "comments"
    );

    assert.deepEqual(firstPhotoComments, [
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
    assert.deepEqual(secondPhotoComments, [
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
      /\[Memserver\] PhotoComment\.getRelationship expects model input to be an object not an array/
    );

    assert.deepEqual(PhotoComment.getRelationship(firstPhotoComments[0], "photo", Photo), {
      uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
      name: "Ski trip",
      href: "ski-trip.jpeg",
      is_public: false,
    });
    assert.deepEqual(PhotoComment.getRelationship(secondPhotoComments[0], "photo", Photo), {
      uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
      name: "Family photo",
      href: "family-photo.jpeg",
      is_public: true,
    });
  });

  test("$Model.getRelationship() works for custom named hasOne/belongsTo uuid relationships both side on uuid relationship", async function (assert) {
    const { Activity, Email, User, Photo, PhotoComment } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));
    ACITIVITY_FIXTURES.forEach((activity) => Activity.insert(activity));
    USER_FIXTURES.forEach((user) => User.insert(user));
    EMAIL_FIXTURES.forEach((email) => Email.insert(email));

    const activity = Photo.getRelationship(
      Photo.findBy({
        uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
      }),
      "userActivity",
      Activity
    );

    assert.deepEqual(activity, {
      id: 1,
      user_id: 1,
      photo_uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
    });
    assert.deepEqual(User.getRelationship(User.find(1), "primaryEmail", Email), {
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
        Photo.findBy({
          uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
        }),
        "userActivity",
        Activity
      ),
      undefined
    );
    assert.deepEqual(
      Activity.getRelationship(activity, "photo", Photo),
      Photo.findBy({
        uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
      })
    );
    assert.equal(Activity.getRelationship(Activity.find(2), "photo", Photo), undefined);
  });

  test("$Model.getRelationship() works for custom named hasMany/belongsTo uuid relationships both side on uuid relationship", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));
    PHOTO_COMMENT_FIXTURES.forEach((photoComment) => PhotoComment.insert(photoComment));

    const firstPhotoComments = Photo.getRelationship(
      Photo.findBy({
        uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
      }),
      "comments",
      PhotoComment
    );
    const secondPhotoComments = Photo.getRelationship(
      Photo.findBy({
        uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
      }),
      "comments",
      PhotoComment
    );
    const thirdPhotoComments = Photo.getRelationship(
      Photo.findBy({
        uuid: "6f0c74bb-13e0-4609-b34d-568cd3cee6bc",
      }),
      "comments",
      PhotoComment
    );

    assert.deepEqual(firstPhotoComments, [
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
    assert.deepEqual(secondPhotoComments, [
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
      /\[Memserver\] PhotoComment\.getRelationship expects model input to be an object not an array/
    );
    assert.deepEqual(PhotoComment.getRelationship(firstPhotoComments[0], "photo", Photo), {
      uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
      name: "Ski trip",
      href: "ski-trip.jpeg",
      is_public: false,
    });
    assert.deepEqual(PhotoComment.getRelationship(secondPhotoComments[0], "photo", Photo), {
      uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
      name: "Family photo",
      href: "family-photo.jpeg",
      is_public: true,
    });
  });

  test("$Model.getRelationship() throws an error when uuid relationship reference is invalid", async function (assert) {
    const { Photo } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));

    assert.throws(() => {
      return Photo.getRelationship(
        Photo.findBy({
          uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
        }),
        "userComments"
      );
    }, /\[Memserver\] userComments relationship could not be found on Photo model\. Please put the userComments Model object as the third parameter to Photo\.getRelationship function/);
    assert.throws(() => {
      Photo.getRelationship(
        Photo.findBy({
          uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
        }),
        "userActivity"
      );
    }, /\[Memserver\] userActivity relationship could not be found on Photo model\. Please put the userActivity Model object as the third parameter to Photo\.getRelationship function/);
  });
});
