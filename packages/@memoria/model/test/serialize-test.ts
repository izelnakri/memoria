import Model, { PrimaryGeneratedColumn, Column } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "./helpers/setup-memoria";

// TODO: half of the time fails even with commented out tests
module("@memoria/model | $Model.serialize()", function (hooks) {
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

  function prepare() {
    class Photo extends Model {
      @PrimaryGeneratedColumn()
      id: number;

      @Column()
      name: string;

      @Column()
      href: string;

      @Column("boolean")
      is_public: boolean;
    }
    class PhotoComment extends Model {
      @PrimaryGeneratedColumn("uuid")
      uuid: string;

      @Column()
      content: string;

      @Column("int")
      photo_id: number;

      @Column("int")
      user_id: number;
    }
    class User extends Model {
      @PrimaryGeneratedColumn()
      id: number;

      @Column()
      first_name: string;

      @Column()
      last_name: string;
    }
    [Photo, PhotoComment, User].forEach((Model) => (Model.embedReferences = {})); // TODO: REMOVE THIS REGISTRATION BY IMPLEMENTING SERIALIZER

    return { User, Photo, PhotoComment };
  }

  test("$Model.serialize(model) serializes a model", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    const photo = await Photo.find(1);
    const photoComment = await PhotoComment.findBy({
      uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
    });

    assert.deepEqual(Photo.serialize(photo), {
      id: 1,
      name: "Ski trip",
      href: "ski-trip.jpeg",
      is_public: false,
    });
    assert.deepEqual(PhotoComment.serialize(photoComment), {
      uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
      content: "Interesting indeed",
      photo_id: 2,
      user_id: 1,
    });
  });

  test("$Model.serialize(models) can serialize models", async function (assert) {
    const { Photo, PhotoComment, User } = prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    const photos = await Photo.findAll({ is_public: false });
    const photoComments = await PhotoComment.findAll({ photo_id: 1 });

    assert.deepEqual(Photo.serializer(photos), [
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
    assert.deepEqual(PhotoComment.serializer(photoComments), [
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
  });

  test("$Model.serialize() can serialize empty record and record arrays", async function (assert) {
    const { Photo, PhotoComment, User } = prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    const notFoundPhoto = await Photo.find(99);
    const notFoundPhotos = await Photo.findAll({ name: "Wubba lubba dub" });
    const notFoundComment = await PhotoComment.findBy({
      uuid: "374c7f4a-85d6-429a-bf2a-0719525f5111",
    });
    const notFoundComments = await Photo.findAll({ content: "Aint easy" });

    assert.equal(Photo.serializer(notFoundPhoto), undefined);
    assert.deepEqual(Photo.serializer({}), {
      id: null,
      href: null,
      is_public: null,
      name: null,
    });
    assert.deepEqual(Photo.serializer(notFoundPhotos), []);
    assert.equal(PhotoComment.serializer(notFoundComment), undefined);
    assert.deepEqual(PhotoComment.serializer({}), {
      uuid: null,
      content: null,
      photo_id: null,
      user_id: null,
    });
    assert.deepEqual(PhotoComment.serializer(notFoundComments), []);
  });

  test("$Model.serialize(model) can serialize embeded records recursively", async function (assert) {
    const { Photo, PhotoComment, User } = prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    await User.insert({ id: 1, first_name: "Izel", last_name: "Nakri" });
    await User.insert({ id: 2, first_name: "Benjamin", last_name: "Graham" });

    Photo.embed({ comments: PhotoComment });
    PhotoComment.embed({ author: User });

    const firstComment = await PhotoComment.findBy({
      uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
    });
    const firstPhoto = await Photo.find(1);
    const targetSerializedUser = await User.find(1);

    assert.deepEqual(targetSerializedUser, { id: 1, first_name: "Izel", last_name: "Nakri" });
    assert.deepEqual(User.serializer(targetSerializedUser), targetSerializedUser);
    assert.deepEqual(
      PhotoComment.serializer(firstComment),
      Object.assign({}, firstComment, {
        author: targetSerializedUser,
      })
    );
    assert.deepEqual(
      Photo.serializer(firstPhoto),
      Object.assign({}, firstPhoto, {
        comments: PhotoComment.peekAll({ photo_id: 1 }).map((comment) => {
          return Object.assign({}, comment, { author: User.peek(comment.user_id) });
        }),
      })
    );

    const targetUsers = await User.findAll();
    const photoComments = await PhotoComment.findAll();
    const targetPhotos = await Promise.all([Photo.find(1), Photo.find(2)]);

    assert.deepEqual(await User.findAll(), [
      { id: 1, first_name: "Izel", last_name: "Nakri" },
      { id: 2, first_name: "Benjamin", last_name: "Graham" },
    ]);
    assert.deepEqual(User.serializer(targetUsers), targetUsers);
    assert.deepEqual(
      PhotoComment.serializer(photoComments),
      photoComments.map((comment) => {
        return Object.assign({}, comment, { author: User.peek(comment.user_id) });
      })
    );
    assert.deepEqual(
      Photo.serializer(targetPhotos),
      targetPhotos.map((photo) => {
        return Object.assign({}, photo, {
          comments: PhotoComment.peekAll({ photo_id: photo.id }).map((comment) => {
            return Object.assign({}, comment, { author: User.peek(comment.user_id) });
          }),
        });
      })
    );
  });

  test("$Model allows for custom serializer declarations", async function (assert) {
    const { User, Photo, PhotoComment } = prepare();

    const user = await User.insert({ id: 1, first_name: "Izel", last_name: "Nakri" });
    const secondUser = await User.insert({ id: 2, first_name: "Benjamin", last_name: "Graham" });

    User.authenticationSerializer = function (user) {
      let serializedResponse = User.serializer(user);

      if (Array.isArray(serializedResponse)) {
        serializedResponse.forEach((serializedModel) => delete serializedModel.last_name);
      } else {
        delete serializedResponse.last_name;
      }

      return serializedResponse;
    };

    assert.deepEqual(User.authenticationSerializer(user), { id: 1, first_name: "Izel" });
    assert.deepEqual(User.authenticationSerializer([user, secondUser]), [
      { id: 1, first_name: "Izel" },
      { id: 2, first_name: "Benjamin" },
    ]);
  });
});
