import Model from "@memserver/model";
import { module, test } from "qunitx";
import setupMemserver from "./helpers/setup-memserver";

module("@memserver/model | $Model.update()", function (hooks) {
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
          return "Some default name";
        },
      };
    }
    class PhotoComment extends Model {
      static defaultAttributes = {
        inserted_at() {
          return "2017-10-25T20:54:04.447Z";
        },
        is_important: true,
      };
    }
    class User extends Model {}

    return { Photo, PhotoComment, User };
  }

  test("$Model.update(attributes) can update models", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));
    PHOTO_COMMENT_FIXTURES.forEach((photoComment) => PhotoComment.insert(photoComment));

    Photo.update({ id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false });
    Photo.update({ id: 2, href: "family-photo-2.jpeg", is_public: false });
    PhotoComment.update({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29", content: "Cool" });

    assert.deepEqual(Photo.find(1), {
      id: 1,
      name: "Ski trip",
      href: "ski-trip.jpeg",
      is_public: false,
    });
    assert.deepEqual(Photo.find(2), {
      id: 2,
      name: "Family photo",
      href: "family-photo-2.jpeg",
      is_public: false,
    });
    assert.deepEqual(PhotoComment.findBy({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29" }), {
      uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
      inserted_at: "2017-10-25T20:54:04.447Z",
      is_important: true,
      content: "Cool",
      photo_id: 2,
      user_id: 1,
    });
  });

  test("$Model.update(attributes) throws an exception when updating a nonexistent model", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));
    PHOTO_COMMENT_FIXTURES.forEach((photoComment) => PhotoComment.insert(photoComment));

    assert.throws(
      () => Photo.update({ id: 99, href: "family-photo-2.jpeg" }),
      /\[Memserver\] Photo\.update\(record\) failed because Photo with id: 99 does not exist/
    );

    assert.throws(
      () => PhotoComment.update({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5666", content: "Nice" }),
      /\[Memserver\] PhotoComment\.update\(record\) failed because PhotoComment with uuid: 374c7f4a-85d6-429a-bf2a-0719525f5666 does not exist/
    );
  });

  test("$Model.update(attributes) throws an exception when a model gets updated with an unknown $Model.attribute", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));
    PHOTO_COMMENT_FIXTURES.forEach((photoComment) => PhotoComment.insert(photoComment));

    assert.throws(
      () => Photo.update({ id: 1, name: "ME", is_verified: false }),
      /\[Memserver\] Photo\.update id: 1 fails, Photo model does not have is_verified attribute to update/
    );

    assert.throws(
      () =>
        PhotoComment.update({
          uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
          location: "Amsterdam",
        }),
      /\[Memserver\] PhotoComment\.update uuid: 374c7f4a-85d6-429a-bf2a-0719525f5f29 fails, PhotoComment model does not have location attribute to update/
    );
  });
});
