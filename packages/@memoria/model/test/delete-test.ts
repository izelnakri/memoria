import Model from "@memoria/model";
import { module, test } from "qunitx";
import setupMemserver from "./helpers/setup-memserver";

module("@memoria/model | $Model.delete()", function (hooks) {
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
    class User extends Model {}
    class Photo extends Model {}
    class PhotoComment extends Model {}

    return { User, Photo, PhotoComment };
  }

  test("$Model.delete() can delete existing items", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));
    PHOTO_COMMENT_FIXTURES.forEach((photoComment) => PhotoComment.insert(photoComment));

    const deletedPhoto = Photo.delete({ id: 2 });
    const deletedComment = PhotoComment.delete({ uuid: "499ec646-493f-4eea-b92e-e383d94182f4" });

    PhotoComment.delete({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29" });

    assert.deepEqual(deletedPhoto, {
      id: 2,
      name: "Family photo",
      href: "family-photo.jpeg",
      is_public: true,
    });
    assert.deepEqual(deletedComment, {
      uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
      content: "What a nice photo!",
      photo_id: 1,
      user_id: 1,
    });
    assert.deepEqual(Photo.findAll(), [
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
    assert.deepEqual(PhotoComment.findAll(), [
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
  });

  test("$Model.delete(model) throws when the model primaryKey doesnt exist in the database", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    assert.throws(
      () => Photo.delete({ id: 1 }),
      /\[Memserver\] Photo has no records in the database to delete\. Photo\.delete\(\{ id: 1 \}\) failed/
    );
    assert.throws(
      () => PhotoComment.delete({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5111" }),
      /\[Memserver\] PhotoComment has no records in the database to delete\. PhotoComment\.delete\(\{ uuid: '374c7f4a-85d6-429a-bf2a-0719525f5111' \}\) failed/
    );

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));
    PHOTO_COMMENT_FIXTURES.forEach((photoComment) => PhotoComment.insert(photoComment));

    Photo.delete({ id: 1 });

    assert.throws(
      () => Photo.delete({ id: 1 }),
      /\[Memserver\] Could not find Photo with id 1 to delete\. Photo\.delete\(\{ id: 1 \}\) failed/
    );
    assert.throws(
      () => PhotoComment.delete({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5111" }),
      /\[Memserver\] Could not find PhotoComment with uuid 374c7f4a-85d6-429a-bf2a-0719525f5111 to delete\. PhotoComment\.delete\(\{ uuid: '374c7f4a-85d6-429a-bf2a-0719525f5111' \}\) failed/
    );
  });

  test("$Model.delete() throws when called without a parameter", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));
    PHOTO_COMMENT_FIXTURES.forEach((photoComment) => PhotoComment.insert(photoComment));

    assert.throws(
      () => Photo.delete(),
      /\[Memserver\] Photo\.delete\(model\) model object parameter required to delete a model/
    );
    assert.throws(
      () => PhotoComment.delete(),
      /\[Memserver\] PhotoComment\.delete\(model\) model object parameter required to delete a model/
    );
  });
});

// NOTE: $Model.delete(primaryKey) feature ?
