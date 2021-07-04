// TODO: how can i do the function default values?
import Model, { Column, CreateDateColumn } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemserver from "./helpers/setup-memserver";

module("@memoria/model | $Model.insert()", function (hooks) {
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
    class Photo extends Model {
      @Column({ type: "bool", default: true })
      is_public: boolean;

      @Column({ type: "varchar", default: "Some default name" })
      name: string;
    }
    class PhotoComment extends Model {
      @CreateDateColumn()
      inserted_at: Date;

      @Column({ type: "bool", default: true })
      is_important: boolean;
    }

    return { Photo, PhotoComment, User };
  }

  test("$Model.insert() will insert an empty model and auto-generate primaryKeys", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));
    PHOTO_COMMENT_FIXTURES.forEach((photoComment) => PhotoComment.insert(photoComment));

    assert.deepEqual(
      Photo.findAll().map((photo) => photo.id),
      [1, 2, 3]
    );

    Photo.insert();

    assert.deepEqual(
      Photo.findAll().map((photo) => photo.id),
      [1, 2, 3, 4]
    );

    Photo.insert();

    assert.equal(Photo.count(), 5);
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
      {
        id: 4,
        href: undefined,
        is_public: true,
        name: "Some default name",
      },
      {
        id: 5,
        href: undefined,
        is_public: true,
        name: "Some default name",
      },
    ]);

    const initialCommentUUIDs = PhotoComment.findAll().map((photoComment) => photoComment.uuid);

    assert.deepEqual(initialCommentUUIDs, [
      "499ec646-493f-4eea-b92e-e383d94182f4",
      "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
      "d351963d-e725-4092-a37c-1ca1823b57d3",
      "374c7f4a-85d6-429a-bf2a-0719525f5f29",
    ]);

    PhotoComment.insert();

    const allPhotoComments = PhotoComment.findAll();
    const lastPhotoComment = allPhotoComments[allPhotoComments.length - 1];

    assert.equal(PhotoComment.count(), 5);
    assert.ok(!initialCommentUUIDs[lastPhotoComment.uuid], "inserted comment has a unique uuid");
  });

  test("$Model.insert(attributes) will insert a model with overriden attributes", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));
    PHOTO_COMMENT_FIXTURES.forEach((photoComment) => PhotoComment.insert(photoComment));

    Photo.insert({ id: 99, href: "/izel.html", is_public: false });
    Photo.insert({ name: "Baby photo", href: "/baby.jpg" });

    assert.equal(Photo.count(), 5);
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
      {
        id: 99,
        href: "/izel.html",
        is_public: false,
        name: "Some default name",
      },
      {
        id: 4,
        href: "/baby.jpg",
        is_public: true,
        name: "Baby photo",
      },
    ]);

    const initialCommentUUIDs = PhotoComment.findAll().map((comment) => comment.uuid);
    const commentOne = PhotoComment.insert({
      inserted_at: "2015-10-25T20:54:04.447Z",
      photo_id: 1,
    });
    const commentTwo = PhotoComment.insert({
      uuid: "6401f27c-49aa-4da7-9835-08f6f669e29f",
      is_important: false,
    });

    assert.equal(PhotoComment.count(), 6);

    const allComments = PhotoComment.findAll();
    const lastInsertedComments = allComments.slice(4, allComments.length);

    assert.ok(allComments.includes(commentOne), "first comment inserassert.equal in the database");
    assert.ok(allComments.includes(commentTwo), "second comment inserassert.equal in the database");

    assert.equal(commentOne.inserted_at, "2015-10-25T20:54:04.447Z");
    assert.equal(commentOne.photo_id, 1);
    assert.equal(commentOne.is_important, true);
    assert.equal(commentTwo.uuid, "6401f27c-49aa-4da7-9835-08f6f669e29f");
    assert.equal(commentTwo.inserted_at, "2017-10-25T20:54:04.447Z");
    assert.equal(commentTwo.photo_id, undefined);
    assert.equal(commentTwo.is_important, false);

    lastInsertedComments.forEach((comment) => {
      assert.ok(!initialCommentUUIDs.includes(comment.uuid), "inserted comment uuid is unique");
    });
  });

  test("$Model.insert(attributes) will throw if overriden primaryKey already exists", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));
    PHOTO_COMMENT_FIXTURES.forEach((photoComment) => PhotoComment.insert(photoComment));

    assert.throws(
      () => Photo.insert({ id: 1 }),
      /\[Memserver\] Photo id 1 already exists in the database! Photo.insert\(\{ id: 1 \}\) fails/
    );
    assert.throws(
      () => PhotoComment.insert({ uuid: "d351963d-e725-4092-a37c-1ca1823b57d3" }),
      /\[Memserver\] PhotoComment uuid d351963d-e725-4092-a37c-1ca1823b57d3 already exists in the database! PhotoComment.insert\(\{ uuid: 'd351963d-e725-4092-a37c-1ca1823b57d3' \}\) fails/
    );
  });

  test("$Model.insert(attributes) will throw if overriden primaryKey is wrong type", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));
    PHOTO_COMMENT_FIXTURES.forEach((photoComment) => PhotoComment.insert(photoComment));

    assert.throws(
      () => Photo.insert({ id: "99" }),
      /\[Memserver\] Photo model primaryKey type is 'id'. Instead you've tried to enter id: 99 with string type/
    );

    assert.throws(
      () => PhotoComment.insert({ uuid: 1 }),
      /\[Memserver\] PhotoComment model primaryKey type is 'uuid'. Instead you've tried to enter uuid: 1 with number type/
    );
  });

  test("$Model.insert(attributes) can add new values to $Model.attributes when new attributes are discovered", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    [Photo, PhotoComment].forEach((model) => model.resetDatabase());

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));
    PHOTO_COMMENT_FIXTURES.forEach((photoComment) => PhotoComment.insert(photoComment));

    Photo.insert({
      published_at: new Date("2017-10-10").toJSON(),
      description: "Some description",
    });
    Photo.insert({ location: "Istanbul", is_public: false });
    PhotoComment.insert({ updated_at: new Date("2017-01-10").toJSON(), like_count: 22 });
    PhotoComment.insert({ reply_id: 1 });

    assert.deepEqual(Array.from(Photo.attributes), [
      "is_public",
      "name",
      "id",
      "href",
      "published_at",
      "description",
      "location",
    ]);
    assert.deepEqual(Array.from(PhotoComment.attributes), [
      "inserted_at",
      "is_important",
      "uuid",
      "content",
      "photo_id",
      "user_id",
      "updated_at",
      "like_count",
      "reply_id",
    ]);
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
      {
        id: 4,
        href: undefined,
        is_public: true,
        published_at: "2017-10-10T00:00:00.000Z",
        description: "Some description",
        name: "Some default name",
      },
      {
        id: 5,
        href: undefined,
        is_public: false,
        location: "Istanbul",
        published_at: undefined,
        name: "Some default name",
        description: undefined,
      },
    ]);
  });
});
