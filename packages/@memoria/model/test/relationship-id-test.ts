import Model from "@memoria/model";
import { module, test } from "qunitx";
import setupMemserver from "./helpers/setup-memserver";

module("@memoria/model | Relationship API for ID(integer)", function (hooks) {
  setupMemserver(hooks);

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
    class User extends Model {}
    class Email extends Model {}
    class Activity extends Model {}
    class PhotoComment extends Model {
      static embedReferences = {
        author: User,
      };
    }
    class Photo extends Model {
      static embedReferences = {
        comments: PhotoComment,
        activity: Activity,
      };
    }

    return { Activity, Email, User, Photo, PhotoComment };
  }

  test("$Model.getRelationship() works for hasOne/belongsTo id relationships both sides on id relationships", async function (assert) {
    const { Activity, Photo, PhotoComment } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));
    ACITIVITY_FIXTURES.forEach((activity) => Activity.insert(activity));

    const activity = Photo.getRelationship(Photo.find(1), "activity", Activity);
    const activityLookupWithoutModel = Photo.getRelationship(Photo.find(1), "activity");
    const activityLookupWithDifferentReferenceName = Photo.getRelationship(
      Photo.find(1),
      "somethingElse",
      Activity
    );

    assert.deepEqual(activity, activityLookupWithoutModel);
    assert.deepEqual(activity, activityLookupWithDifferentReferenceName);
    assert.deepEqual(activity, { id: 1, user_id: 1, photo_id: 1 });
    assert.equal(Photo.getRelationship(Photo.find(2), "activity", Activity), undefined);
    assert.deepEqual(Activity.getRelationship(activity, "photo", Photo), Photo.find(1));
    assert.equal(Activity.getRelationship(Activity.find(2), "photo", Photo), undefined);
  });

  test("$Model.getRelationship() works for hasMany/belongsTo id relationships both sides on id relationships", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));
    PHOTO_COMMENT_FIXTURES.forEach((photoComment) => PhotoComment.insert(photoComment));

    const firstPhotoComments = Photo.getRelationship(Photo.find(1), "comments", PhotoComment);
    const secondPhotoComments = Photo.getRelationship(Photo.find(2), "comments", PhotoComment);
    const thirdPhotoComments = Photo.getRelationship(Photo.find(3), "comments", PhotoComment);

    assert.deepEqual(firstPhotoComments, [
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
    assert.deepEqual(secondPhotoComments, [
      {
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        content: "Interesting indeed",
        photo_id: 2,
        user_id: 1,
      },
    ]);
    assert.deepEqual(thirdPhotoComments, []);

    assert.throws(
      () => PhotoComment.getRelationship(firstPhotoComments, "photo"),
      /\[Memserver\] PhotoComment\.getRelationship expects model input to be an object not an array/
    );
    assert.deepEqual(PhotoComment.getRelationship(firstPhotoComments[0], "photo", Photo), {
      id: 1,
      name: "Ski trip",
      href: "ski-trip.jpeg",
      is_public: false,
    });
    assert.deepEqual(PhotoComment.getRelationship(secondPhotoComments[0], "photo", Photo), {
      id: 2,
      name: "Family photo",
      href: "family-photo.jpeg",
      is_public: true,
    });
  });

  test("$Model.getRelationship() works for custom named hasOne/belongsTo id relationships both side on id relationships", async function (assert) {
    const { Activity, Email, User, Photo, PhotoComment } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));
    ACITIVITY_FIXTURES.forEach((activity) => Activity.insert(activity));
    USER_FIXTURES.forEach((user) => User.insert(user));
    EMAIL_FIXTURES.forEach((email) => Email.insert(email));

    const activity = Photo.getRelationship(Photo.find(1), "userActivity", Activity);

    assert.deepEqual(activity, { id: 1, user_id: 1, photo_id: 1 });
    assert.deepEqual(User.getRelationship(User.find(1), "primaryEmail", Email), {
      id: 1,
      address: "contact@izelnakri.com",
      is_public: false,
      confirmed_at: "2018-02-25T23:00:00.000Z",
      confirmation_token: "951d3321-9e66-4099-a4a5-cc1e4795d4ss",
      confirmation_token_sent_at: "2018-02-25T22:16:01.133Z",
      person_id: 1,
    });
    assert.equal(Photo.getRelationship(Photo.find(2), "userActivity", Activity), undefined);
    assert.deepEqual(Activity.getRelationship(activity, "photo", Photo), Photo.find(1));
    assert.equal(Activity.getRelationship(Activity.find(2), "userPhoto", Photo), undefined);
    assert.deepEqual(Activity.getRelationship(activity, "photo", Photo), Photo.find(1));
  });

  test("$Model.getRelationship() works for custom named hasMany/belongsTo id relationships both side on id relationships", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));
    PHOTO_COMMENT_FIXTURES.forEach((photoComment) => PhotoComment.insert(photoComment));

    const firstPhotoComments = Photo.getRelationship(Photo.find(1), "comments", PhotoComment);
    const secondPhotoComments = Photo.getRelationship(Photo.find(2), "comments", PhotoComment);
    const thirdPhotoComments = Photo.getRelationship(Photo.find(3), "comments", PhotoComment);

    assert.deepEqual(firstPhotoComments, [
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
    assert.deepEqual(secondPhotoComments, [
      {
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        content: "Interesting indeed",
        photo_id: 2,
        user_id: 1,
      },
    ]);
    assert.deepEqual(thirdPhotoComments, []);

    assert.throws(
      () => PhotoComment.getRelationship(firstPhotoComments, "photo", Photo),
      /\[Memserver\] PhotoComment\.getRelationship expects model input to be an object not an array/
    );
    assert.deepEqual(PhotoComment.getRelationship(firstPhotoComments[0], "photo", Photo), {
      id: 1,
      name: "Ski trip",
      href: "ski-trip.jpeg",
      is_public: false,
    });
    assert.deepEqual(PhotoComment.getRelationship(secondPhotoComments[0], "photo", Photo), {
      id: 2,
      name: "Family photo",
      href: "family-photo.jpeg",
      is_public: true,
    });
  });

  test("$Model.getRelationship() throws an error when id relationship reference is invalid", async function (assert) {
    const { Photo } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));

    assert.throws(
      () => Photo.getRelationship(Photo.find(1), "device"),
      /\[Memserver\] device relationship could not be found on Photo model\. Please put the device Model object as the third parameter to Photo\.getRelationship function/
    );
    assert.throws(
      () => Photo.getRelationship(Photo.find(2), "senderActivity"),
      /\[Memserver\] senderActivity relationship could not be found on Photo model\. Please put the senderActivity Model object as the third parameter to Photo\.getRelationship function/
    );
  });

  test("$Model.embedReferences can be set before runtime", async function (assert) {
    const { Activity, Photo, PhotoComment, User } = prepare();

    assert.deepEqual(Photo.embedReferences, { comments: PhotoComment, activity: Activity });
    assert.deepEqual(PhotoComment.embedReferences, { author: User });
  });

  test("$Model.embed({ embedName: ModelName }) sets an embedReference during runtime", async function (assert) {
    const { Activity, Photo, PhotoComment, User } = prepare();

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
    const { Activity, User } = prepare();

    assert.throws(
      () => User.embed(),
      /\[Memserver\] User\.embed\(relationshipObject\) requires an object as a parameter: { relationshipKey: \$RelationshipModel }/
    );
    assert.throws(
      () => User.embed(Activity),
      /\[Memserver\] User\.embed\(relationshipObject\) requires an object as a parameter: { relationshipKey: \$RelationshipModel }/
    );
  });

  test("$Model.embed() throws error when runtime $Model.embed(relationship) called with a Model that doesnt exist", async function (assert) {
    const { User } = prepare();

    assert.throws(
      () => User.embed({ activities: undefined }),
      /\[Memserver\] User\.embed\(\) fails: activities Model reference is not a valid\. Please put a valid \$ModelName to User\.embed\(\)/
    );
  });
});
