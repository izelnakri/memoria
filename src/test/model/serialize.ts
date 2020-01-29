import test from "ava";
import fs from "fs-extra";

const CWD = process.cwd();
const modelFileContent = (fileName) => `import Model from '${CWD}/dist/model';
export default class ${fileName} extends Model{
}`;

test.before(async () => {
  await fs.mkdir(`${CWD}/memserver`);
  await fs.mkdir(`${CWD}/memserver/models`);
  await Promise.all([
    fs.writeFile(`${CWD}/memserver/models/photo.ts`, modelFileContent("Photo")),
    fs.writeFile(`${CWD}/memserver/models/photo-comment.ts`, modelFileContent("PhotoComment")),
    fs.writeFile(`${CWD}/memserver/models/user.ts`, modelFileContent("User")),
    fs.mkdir(`${CWD}/memserver/fixtures`)
  ]);
  await Promise.all([
    fs.writeFile(
      `${CWD}/memserver/fixtures/photos.ts`,
      `export default [
      {
        id: 1,
        name: 'Ski trip',
        href: 'ski-trip.jpeg',
        is_public: false
      },
      {
        id: 2,
        name: 'Family photo',
        href: 'family-photo.jpeg',
        is_public: true
      },
      {
        id: 3,
        name: 'Selfie',
        href: 'selfie.jpeg',
        is_public: false
      }
    ];`
    ),
    fs.writeFile(
      `${CWD}/memserver/fixtures/photo-comments.ts`,
      `export default [
      {
        uuid: '499ec646-493f-4eea-b92e-e383d94182f4',
        content: 'What a nice photo!',
        photo_id: 1,
        user_id: 1
      },
      {
        uuid: '77653ad3-47e4-4ec2-b49f-57ea36a627e7',
        content: 'I agree',
        photo_id: 1,
        user_id: 2
      },
      {
        uuid: 'd351963d-e725-4092-a37c-1ca1823b57d3',
        content: 'I was kidding',
        photo_id: 1,
        user_id: 1
      },
      {
        uuid: '374c7f4a-85d6-429a-bf2a-0719525f5f29',
        content: 'Interesting indeed',
        photo_id: 2,
        user_id: 1
      }
    ];`
    )
  ]);
});

test.beforeEach(() => {
  Object.keys(require.cache).forEach((key) => delete require.cache[key]);
});

test.after.always(async () => {
  if (await fs.pathExists(`${CWD}/memserver`)) {
    await fs.remove(`${CWD}/memserver`);
  }
});

test.serial("$Model.serialize(model) serializes a model", async (t) => {
  t.plan(2);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
  const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
    .default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));
  PhotoCommentFixtures.forEach((photoComment) => PhotoComment.insert(photoComment));

  const photo = Photo.find(1);
  const photoComment = PhotoComment.findBy({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29" });

  t.deepEqual(Photo.serialize(photo), {
    id: 1,
    name: "Ski trip",
    href: "ski-trip.jpeg",
    is_public: false
  });
  t.deepEqual(PhotoComment.serialize(photoComment), {
    uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
    content: "Interesting indeed",
    photo_id: 2,
    user_id: 1
  });
});

test.serial("$Model.serialize(models) can serialize models", async (t) => {
  t.plan(2);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
  const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
    .default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));
  PhotoCommentFixtures.forEach((photoComment) => PhotoComment.insert(photoComment));

  const photos = Photo.findAll({ is_public: false });
  const photoComments = PhotoComment.findAll({ photo_id: 1 });

  t.deepEqual(Photo.serializer(photos), [
    {
      id: 1,
      name: "Ski trip",
      href: "ski-trip.jpeg",
      is_public: false
    },
    {
      id: 3,
      name: "Selfie",
      href: "selfie.jpeg",
      is_public: false
    }
  ]);
  t.deepEqual(PhotoComment.serializer(photoComments), [
    {
      uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
      content: "What a nice photo!",
      photo_id: 1,
      user_id: 1
    },
    {
      uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
      content: "I agree",
      photo_id: 1,
      user_id: 2
    },
    {
      uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
      content: "I was kidding",
      photo_id: 1,
      user_id: 1
    }
  ]);
});

test.serial("$Model.serialize() can serialize empty record and record arrays", async (t) => {
  t.plan(6);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
  const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
    .default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));
  PhotoCommentFixtures.forEach((photoComment) => PhotoComment.insert(photoComment));

  const notFoundPhoto = Photo.find(99);
  const notFoundPhotos = Photo.findAll({ name: "Wubba lubba dub" });
  const notFoundComment = PhotoComment.findBy({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5111" });
  const notFoundComments = Photo.findAll({ content: "Aint easy" });

  t.is(Photo.serializer(notFoundPhoto), undefined);
  t.deepEqual(Photo.serializer({}), {
    id: null,
    href: null,
    is_public: null,
    name: null
  });
  t.deepEqual(Photo.serializer(notFoundPhotos), []);
  t.is(PhotoComment.serializer(notFoundComment), undefined);
  t.deepEqual(PhotoComment.serializer({}), {
    uuid: null,
    content: null,
    photo_id: null,
    user_id: null
  });
  t.deepEqual(PhotoComment.serializer(notFoundComments), []);
});

test.serial("$Model.serialize(model) can serialize embeded records recursively", async (t) => {
  t.plan(8);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
  const User = (await import(`${CWD}/memserver/models/user.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
  const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
    .default;
  // const UserFixtures = (await import(`${CWD}/memserver/fixtures/users.ts`)).default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));
  PhotoCommentFixtures.forEach((photoComment) => PhotoComment.insert(photoComment));
  // User.forEach((user) => User.insert(user));

  User.insert({ id: 1, first_name: "Izel", last_name: "Nakri" });
  User.insert({ id: 2, first_name: "Benjamin", last_name: "Graham" });

  Photo.embed({ comments: PhotoComment });
  PhotoComment.embed({ author: User });

  const firstComment = PhotoComment.findBy({ uuid: "499ec646-493f-4eea-b92e-e383d94182f4" });
  const firstPhoto = Photo.find(1);
  const targetSerializedUser = User.find(1);

  t.deepEqual(targetSerializedUser, { id: 1, first_name: "Izel", last_name: "Nakri" });
  t.deepEqual(User.serializer(targetSerializedUser), targetSerializedUser);
  t.deepEqual(
    PhotoComment.serializer(firstComment),
    Object.assign({}, firstComment, {
      author: targetSerializedUser
    })
  );
  t.deepEqual(
    Photo.serializer(firstPhoto),
    Object.assign({}, firstPhoto, {
      comments: PhotoComment.findAll({ photo_id: 1 }).map((comment) => {
        return Object.assign({}, comment, { author: User.find(comment.user_id) });
      })
    })
  );

  const targetUsers = User.findAll();
  const photoComments = PhotoComment.findAll();
  const targetPhotos = [Photo.find(1), Photo.find(2)];

  t.deepEqual(User.findAll(), [
    { id: 1, first_name: "Izel", last_name: "Nakri" },
    { id: 2, first_name: "Benjamin", last_name: "Graham" }
  ]);
  t.deepEqual(User.serializer(targetUsers), targetUsers);
  t.deepEqual(
    PhotoComment.serializer(photoComments),
    photoComments.map((comment) => {
      return Object.assign({}, comment, { author: User.find(comment.user_id) });
    })
  );
  t.deepEqual(
    Photo.serializer(targetPhotos),
    targetPhotos.map((photo) => {
      return Object.assign({}, photo, {
        comments: PhotoComment.findAll({ photo_id: photo.id }).map((comment) => {
          return Object.assign({}, comment, { author: User.find(comment.user_id) });
        })
      });
    })
  );
});

test.serial("$Model allows for custom serializer declarations", async (t) => {
  const User = (await import(`${CWD}/memserver/models/user.ts`)).default;
  const user = User.insert({ id: 1, first_name: "Izel", last_name: "Nakri" });
  const secondUser = User.insert({ id: 2, first_name: "Benjamin", last_name: "Graham" });

  User.authenticationSerializer = function(user) {
    let serializedResponse = this.serializer(user);

    if (Array.isArray(serializedResponse)) {
      serializedResponse.forEach((serializedModel) => delete serializedModel.last_name);
    } else {
      delete serializedResponse.last_name;
    }

    return serializedResponse;
  };

  t.deepEqual(User.authenticationSerializer(user), { id: 1, first_name: "Izel" });
  t.deepEqual(User.authenticationSerializer([user, secondUser]), [
    { id: 1, first_name: "Izel" },
    { id: 2, first_name: "Benjamin" }
  ]);
});
