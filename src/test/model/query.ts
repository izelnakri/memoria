import test from "ava";
import fs from "fs/promises";

const CWD = process.cwd();
const modelFileContent = (className) => `import Model from '${CWD}/dist/model';
export default class ${className} extends Model{
}`;

test.before(async () => {
  await fs.mkdir(`${CWD}/memserver`);
  await fs.mkdir(`${CWD}/memserver/models`);
  await Promise.all([
    fs.writeFile(`${CWD}/memserver/models/photo.ts`, modelFileContent("Photo")),
    fs.writeFile(`${CWD}/memserver/models/user.ts`, modelFileContent("User")),
    fs.writeFile(`${CWD}/memserver/models/photo-comment.ts`, modelFileContent("PhotoComment")),
    fs.writeFile(`${CWD}/memserver/server.ts`, "export default function(Models) {}"),
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

test.after.always(async () => {
  await fs.rmdir(`${CWD}/memserver`, { recursive: true });
});

test.beforeEach(() => {
  Object.keys(require.cache).forEach((key) => delete require.cache[key]);
});

test.serial("$Model.find() throws without a number id or ids", async (t) => {
  t.plan(24);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
  const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
    .default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));
  PhotoCommentFixtures.forEach((photoComment) => PhotoComment.insert(photoComment));

  const array = [null, undefined, "", "1", true, {}];

  array.forEach((param) => {
    const error = t.throws(() => Photo.find(param), { instanceOf: Error });

    t.true(
      /\[Memserver\] Photo.find\(id\) cannot be called without a valid id/.test(error.message)
    );

    const secondError = t.throws(() => PhotoComment.find(param), { instanceOf: Error });

    t.true(
      /\[Memserver\] PhotoComment.find\(id\) cannot be called without a valid id/.test(
        secondError.message
      )
    );
  });
});

test.serial("$Model.find(id) works for different models", async (t) => {
  t.plan(2);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));

  t.deepEqual(Photo.find(1), {
    id: 1,
    name: "Ski trip",
    href: "ski-trip.jpeg",
    is_public: false
  });
  t.deepEqual(Photo.find(3), {
    id: 3,
    name: "Selfie",
    href: "selfie.jpeg",
    is_public: false
  });
});

test.serial("$Model.find(ids) works for multiple ids", async (t) => {
  t.plan(2);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));

  t.deepEqual(Photo.find([1, 3]), [
    { id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false },
    { id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false }
  ]);
  t.deepEqual(Photo.find([2, 3]), [
    { id: 2, name: "Family photo", href: "family-photo.jpeg", is_public: true },
    { id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false }
  ]);
});

test.serial("$Model.findBy() throws without params", async (t) => {
  t.plan(2);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));

  const error = t.throws(() => Photo.findBy(), { instanceOf: Error });

  t.true(
    /\[Memserver\] Photo.findBy\(id\) cannot be called without a parameter/.test(error.message)
  );
});

test.serial("$Model.findBy(attributes) returns a single model for the options", async (t) => {
  t.plan(4);

  const firstPhoto = { id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false };

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
  const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
    .default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));
  PhotoCommentFixtures.forEach((photoComment) => PhotoComment.insert(photoComment));

  t.deepEqual(Photo.findBy({ is_public: false }), firstPhoto);
  t.deepEqual(Photo.findBy(firstPhoto), firstPhoto);
  t.deepEqual(Photo.findBy({ name: "Family photo", href: "family-photo.jpeg" }), {
    id: 2,
    name: "Family photo",
    href: "family-photo.jpeg",
    is_public: true
  });
  t.deepEqual(PhotoComment.findBy({ uuid: "d351963d-e725-4092-a37c-1ca1823b57d3" }), {
    uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
    content: "I was kidding",
    photo_id: 1,
    user_id: 1
  });
});

test.serial(
  "$Model.findAll() without parameters returns all the models in the database",
  async (t) => {
    t.plan(2);

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
    const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
      .default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));
    PhotoCommentFixtures.forEach((photoComment) => PhotoComment.insert(photoComment));

    t.deepEqual(Photo.findAll(), [
      {
        id: 1,
        name: "Ski trip",
        href: "ski-trip.jpeg",
        is_public: false
      },
      {
        id: 2,
        name: "Family photo",
        href: "family-photo.jpeg",
        is_public: true
      },
      {
        id: 3,
        name: "Selfie",
        href: "selfie.jpeg",
        is_public: false
      }
    ]);
    t.deepEqual(PhotoComment.findAll(), [
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
      },
      {
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        content: "Interesting indeed",
        photo_id: 2,
        user_id: 1
      }
    ]);
  }
);

test("$Model.findAll(attributes) returns right models in the database", async (t) => {
  t.plan(3);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
  const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
    .default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));
  PhotoCommentFixtures.forEach((photoComment) => PhotoComment.insert(photoComment));

  t.deepEqual(Photo.findAll({ is_public: false }), [
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
  t.deepEqual(PhotoComment.findAll({ photo_id: 1, user_id: 1 }), [
    {
      uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
      content: "What a nice photo!",
      photo_id: 1,
      user_id: 1
    },
    {
      uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
      content: "I was kidding",
      photo_id: 1,
      user_id: 1
    }
  ]);
  t.deepEqual(PhotoComment.findAll({ user_id: 1 }), [
    {
      uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
      content: "What a nice photo!",
      photo_id: 1,
      user_id: 1
    },
    {
      uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
      content: "I was kidding",
      photo_id: 1,
      user_id: 1
    },
    {
      uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
      content: "Interesting indeed",
      photo_id: 2,
      user_id: 1
    }
  ]);
});
