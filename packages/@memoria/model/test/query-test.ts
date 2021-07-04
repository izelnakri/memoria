import Model from "@memserver/model";
import { module, test } from "qunitx";
import setupMemserver from "./helpers/setup-memserver";

module("@memserver/model | Query API", function (hooks) {
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
    class Photo extends Model {}
    class User extends Model {}
    class PhotoComment extends Model {}

    return { Photo, User, PhotoComment };
  }

  test("$Model.find() throws without a number id or ids", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));
    PHOTO_COMMENT_FIXTURES.forEach((photoComment) => PhotoComment.insert(photoComment));

    const array = [null, undefined, "", "1", true, {}];

    array.forEach((param) => {
      assert.throws(
        () => Photo.find(param),
        /\[Memserver\] Photo.find\(id\) cannot be called without a valid id/
      );
      assert.throws(
        () => PhotoComment.find(param),
        /\[Memserver\] PhotoComment.find\(id\) cannot be called without a valid id/
      );
    });
  });

  test("$Model.find(id) works for different models", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));

    assert.deepEqual(Photo.find(1), {
      id: 1,
      name: "Ski trip",
      href: "ski-trip.jpeg",
      is_public: false,
    });
    assert.deepEqual(Photo.find(3), {
      id: 3,
      name: "Selfie",
      href: "selfie.jpeg",
      is_public: false,
    });
  });

  test("$Model.find(ids) works for multiple ids", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));

    assert.deepEqual(Photo.find([1, 3]), [
      { id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false },
      { id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false },
    ]);
    assert.deepEqual(Photo.find([2, 3]), [
      { id: 2, name: "Family photo", href: "family-photo.jpeg", is_public: true },
      { id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false },
    ]);
  });

  test("$Model.findBy() throws without params", async function (assert) {
    const { Photo } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));

    assert.throws(
      () => Photo.findBy(),
      /\[Memserver\] Photo.findBy\(id\) cannot be called without a parameter/
    );
  });

  test("$Model.findBy(attributes) returns a single model for the options", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    const firstPhoto = { id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false };

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));
    PHOTO_COMMENT_FIXTURES.forEach((photoComment) => PhotoComment.insert(photoComment));

    assert.deepEqual(Photo.findBy({ is_public: false }), firstPhoto);
    assert.deepEqual(Photo.findBy(firstPhoto), firstPhoto);
    assert.deepEqual(Photo.findBy({ name: "Family photo", href: "family-photo.jpeg" }), {
      id: 2,
      name: "Family photo",
      href: "family-photo.jpeg",
      is_public: true,
    });
    assert.deepEqual(PhotoComment.findBy({ uuid: "d351963d-e725-4092-a37c-1ca1823b57d3" }), {
      uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
      content: "I was kidding",
      photo_id: 1,
      user_id: 1,
    });
  });

  test("$Model.findAll() without parameters returns all the models in the database", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));
    PHOTO_COMMENT_FIXTURES.forEach((photoComment) => PhotoComment.insert(photoComment));

    assert.deepEqual(Photo.findAll(), [
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
    ]);
    assert.deepEqual(PhotoComment.findAll(), [
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
    ]);
  });

  test("$Model.findAll(attributes) returns right models in the database", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));
    PHOTO_COMMENT_FIXTURES.forEach((photoComment) => PhotoComment.insert(photoComment));

    assert.deepEqual(Photo.findAll({ is_public: false }), [
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
    assert.deepEqual(PhotoComment.findAll({ photo_id: 1, user_id: 1 }), [
      {
        uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
        content: "What a nice photo!",
        photo_id: 1,
        user_id: 1,
      },
      {
        uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
        content: "I was kidding",
        photo_id: 1,
        user_id: 1,
      },
    ]);
    assert.deepEqual(PhotoComment.findAll({ user_id: 1 }), [
      {
        uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
        content: "What a nice photo!",
        photo_id: 1,
        user_id: 1,
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
    ]);
  });
});
