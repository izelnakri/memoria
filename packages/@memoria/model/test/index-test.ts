import Model from "@memoria/model";
import { module, test } from "qunitx";
import setupMemserver from "./helpers/setup-memserver";

// NOTE: maybe add modelNames, and fixtures
module("@memoria/model | Public API", function (hooks) {
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

  function prepare() {
    class Photo extends Model {
      static defaultAttributes = {
        is_public: true,
        name() {
          return "Imported photo";
        },
      };
      static publicPhotos() {
        return super.findAll({ is_public: true });
      }
    }
    class PhotoComment extends Model {
      static defaultAttributes = {
        inserted_at() {
          return new Date().toJSON();
        },
        is_important: true,
      };
      static forPhoto(photo) {
        return super.findAll({ photo_id: photo.id });
      }
    }
    class User extends Model {}

    return { Photo, PhotoComment, User };
  }

  test("$Model.name gets set correctly", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    assert.equal(Photo.name, "Photo");
    assert.equal(PhotoComment.name, "PhotoComment");
  });

  test("$Model.primaryKey gets set correctly", async function (assert) {
    const { Photo, PhotoComment, User } = prepare();

    assert.equal(Photo.primaryKey, null);
    assert.equal(PhotoComment.primaryKey, null);
    assert.equal(User.primaryKey, null);

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));
    PHOTO_COMMENT_FIXTURES.forEach((photoComment) => PhotoComment.insert(photoComment));

    assert.equal(Photo.primaryKey, "id");
    assert.equal(PhotoComment.primaryKey, "uuid");
    assert.equal(User.primaryKey, null);
    assert.ok(Photo._DB === PhotoComment._DB);
  });

  test("$Model.defaultAttributes gets set correctly", async function (assert) {
    const { Photo, PhotoComment, User } = prepare();

    let initialPhotoDefaultAttributes = Photo.defaultAttributes;
    let initialPhotoCommentDefaultAttributes = PhotoComment.defaultAttributes;

    assert.deepEqual(Object.keys(initialPhotoDefaultAttributes), ["is_public", "name"]);
    assert.equal(initialPhotoDefaultAttributes.is_public, true);
    assert.ok(initialPhotoDefaultAttributes.name.toString().includes("Imported photo"));

    assert.deepEqual(Object.keys(initialPhotoCommentDefaultAttributes), [
      "inserted_at",
      "is_important",
    ]);
    assert.ok(initialPhotoCommentDefaultAttributes.inserted_at.toString().includes(".toJSON();"));
    assert.equal(initialPhotoCommentDefaultAttributes.is_important, true);
    assert.deepEqual(User.defaultAttributes, {});

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));
    PHOTO_COMMENT_FIXTURES.forEach((photoComment) => PhotoComment.insert(photoComment));

    assert.equal(Photo.defaultAttributes, initialPhotoDefaultAttributes);
    assert.deepEqual(PhotoComment.defaultAttributes, initialPhotoCommentDefaultAttributes);
    assert.deepEqual(User.defaultAttributes, {});
  });

  test("$Model.attributes gets set correctly", async function (assert) {
    const { Photo, PhotoComment, User } = prepare();

    [Photo, PhotoComment, User].forEach((model) => model.resetDatabase());

    assert.deepEqual(Array.from(Photo.attributes), ["is_public", "name"]);
    assert.deepEqual(Array.from(PhotoComment.attributes), ["inserted_at", "is_important"]);
    assert.deepEqual(Array.from(User.attributes), []);

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));
    PHOTO_COMMENT_FIXTURES.forEach((photoComment) => PhotoComment.insert(photoComment));

    assert.deepEqual(Array.from(Photo.attributes), ["is_public", "name", "id", "href"]);
    assert.deepEqual(Array.from(PhotoComment.attributes), [
      "inserted_at",
      "is_important",
      "uuid",
      "content",
      "photo_id",
      "user_id",
    ]);
    assert.deepEqual(Array.from(User.attributes), []);
  });

  test("$Model.count counts the models correctly", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    assert.equal(Photo.count(), 0);
    assert.equal(PhotoComment.count(), 0);

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));
    PHOTO_COMMENT_FIXTURES.forEach((photoComment) => PhotoComment.insert(photoComment));

    assert.equal(Photo.count(), 3);
    assert.equal(PhotoComment.count(), 4);
  });

  test("$Model can have custom methods/queries for the model", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));
    PHOTO_COMMENT_FIXTURES.forEach((photoComment) => PhotoComment.insert(photoComment));

    let photo = Photo.find(1);

    assert.deepEqual(PhotoComment.forPhoto(photo), PhotoComment.findAll({ photo_id: photo.id }));
    assert.deepEqual(Photo.publicPhotos(), Photo.findAll({ is_public: true }));
  });
});
