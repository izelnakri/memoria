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

test.beforeEach(async () => {
  Object.keys(require.cache).forEach((key) => delete require.cache[key]);

  await Promise.all([
    fs.writeFile(
      `${CWD}/memserver/models/photo.ts`,
      `
      import Model from '${CWD}/dist/model';

      export default class Photo extends Model {
        static defaultAttributes = {
          is_public: true,
          name() {
            return 'Some default name';
          }
        }
      }`
    ),
    fs.writeFile(
      `${CWD}/memserver/models/photo-comment.ts`,
      `
    import Model from '${CWD}/dist/model';

    export default class PhotoComment extends Model {
      static defaultAttributes = {
        inserted_at() {
          return '2017-10-25T20:54:04.447Z';
        },
        is_important: true
      }
    }`
    )
  ]);
});

test.afterEach(() => {
  Object.keys(require.cache).forEach((key) => delete require.cache[key]);
});

test.after.always(async () => {
  if (await fs.pathExists(`${CWD}/memserver`)) {
    await fs.remove(`${CWD}/memserver`);
  }
});

test.serial(
  "$Model.insert() will insert an empty model and auto-generate primaryKeys",
  async (t) => {
    t.plan(7);

    await Promise.all([
      fs.writeFile(`${CWD}/memserver/models/photo.ts`, modelFileContent("Photo")),
      fs.writeFile(`${CWD}/memserver/models/photo-comment.ts`, modelFileContent("PhotoComment"))
    ]);

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
    const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
      .default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));
    PhotoCommentFixtures.forEach((photoComment) => PhotoComment.insert(photoComment));

    t.deepEqual(Photo.findAll().map((photo) => photo.id), [1, 2, 3]);

    Photo.insert();

    t.deepEqual(Photo.findAll().map((photo) => photo.id), [1, 2, 3, 4]);

    Photo.insert();

    t.is(Photo.count(), 5);
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
      },
      {
        id: 4,
        href: undefined,
        is_public: undefined,
        name: undefined
      },
      {
        id: 5,
        href: undefined,
        is_public: undefined,
        name: undefined
      }
    ]);

    const initialCommentUUIDs = PhotoComment.findAll().map((photoComment) => photoComment.uuid);

    t.deepEqual(initialCommentUUIDs, [
      "499ec646-493f-4eea-b92e-e383d94182f4",
      "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
      "d351963d-e725-4092-a37c-1ca1823b57d3",
      "374c7f4a-85d6-429a-bf2a-0719525f5f29"
    ]);

    PhotoComment.insert();

    const allPhotoComments = PhotoComment.findAll();
    const lastPhotoComment = allPhotoComments[allPhotoComments.length - 1];

    t.is(PhotoComment.count(), 5);
    t.true(!initialCommentUUIDs[lastPhotoComment.uuid], "inserted comment has a unique uuid");
  }
);

test.serial(
  "$Model.insert(attributes) will insert a model with overriden attributes",
  async (t) => {
    t.plan(14);

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
    const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
      .default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));
    PhotoCommentFixtures.forEach((photoComment) => PhotoComment.insert(photoComment));

    Photo.insert({ id: 99, href: "/izel.html", is_public: false });
    Photo.insert({ name: "Baby photo", href: "/baby.jpg" });

    t.is(Photo.count(), 5);
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
      },
      {
        id: 99,
        href: "/izel.html",
        is_public: false,
        name: "Some default name"
      },
      {
        id: 4,
        href: "/baby.jpg",
        is_public: true,
        name: "Baby photo"
      }
    ]);

    const initialCommentUUIDs = PhotoComment.findAll().map((comment) => comment.uuid);
    const commentOne = PhotoComment.insert({
      inserted_at: "2015-10-25T20:54:04.447Z",
      photo_id: 1
    });
    const commentTwo = PhotoComment.insert({
      uuid: "6401f27c-49aa-4da7-9835-08f6f669e29f",
      is_important: false
    });

    t.is(PhotoComment.count(), 6);

    const allComments = PhotoComment.findAll();
    const lastInsertedComments = allComments.slice(4, allComments.length);

    t.true(allComments.includes(commentOne), "first comment insert is in the database");
    t.true(allComments.includes(commentTwo), "second comment insert is in the database");

    t.is(commentOne.inserted_at, "2015-10-25T20:54:04.447Z");
    t.is(commentOne.photo_id, 1);
    t.is(commentOne.is_important, true);
    t.is(commentTwo.uuid, "6401f27c-49aa-4da7-9835-08f6f669e29f");
    t.is(commentTwo.inserted_at, "2017-10-25T20:54:04.447Z");
    t.is(commentTwo.photo_id, undefined);
    t.is(commentTwo.is_important, false);

    lastInsertedComments.forEach((comment) => {
      t.true(!initialCommentUUIDs.includes(comment.uuid), "inserted comment uuid is unique");
    });
  }
);

test("$Model.insert(attributes) will throw if overriden primaryKey already exists", async (t) => {
  t.plan(4);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
  const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
    .default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));
  PhotoCommentFixtures.forEach((photoComment) => PhotoComment.insert(photoComment));

  const error = t.throws(() => Photo.insert({ id: 1 }), { instanceOf: Error });

  t.true(
    /\[MemServer\] Photo id 1 already exists in the database! Photo.insert\(\{ id: 1 \}\) fails/.test(
      error.message
    )
  );

  const secondError = t.throws(
    () => PhotoComment.insert({ uuid: "d351963d-e725-4092-a37c-1ca1823b57d3" }),
    { instanceOf: Error }
  );

  t.true(
    /\[MemServer\] PhotoComment uuid d351963d-e725-4092-a37c-1ca1823b57d3 already exists in the database! PhotoComment.insert\(\{ uuid: 'd351963d-e725-4092-a37c-1ca1823b57d3' \}\) fails/.test(
      secondError.message
    )
  );
});

test("$Model.insert(attributes) will throw if overriden primaryKey is wrong type", async (t) => {
  t.plan(4);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
  const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
    .default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));
  PhotoCommentFixtures.forEach((photoComment) => PhotoComment.insert(photoComment));

  const error = t.throws(() => Photo.insert({ id: "99" }), { instanceOf: Error });

  t.true(
    /\[MemServer\] Photo model primaryKey type is 'id'. Instead you've tried to enter id: 99 with string type/.test(
      error.message
    )
  );

  const secondError = t.throws(() => PhotoComment.insert({ uuid: 1 }), { instanceOf: Error });

  t.true(
    /\[MemServer\] PhotoComment model primaryKey type is 'uuid'. Instead you've tried to enter uuid: 1 with number type/.test(
      secondError.message
    )
  );
});

test("$Model.insert(attributes) can add new values to $Model.attributes when new attributes are discovered", async (t) => {
  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
  const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
    .default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));
  PhotoCommentFixtures.forEach((photoComment) => PhotoComment.insert(photoComment));

  Photo.insert({ published_at: new Date("2017-10-10").toJSON(), description: "Some description" });
  Photo.insert({ location: "Istanbul", is_public: false });
  PhotoComment.insert({ updated_at: new Date("2017-01-10").toJSON(), like_count: 22 });
  PhotoComment.insert({ reply_id: 1 });

  t.deepEqual(Photo.attributes, [
    "is_public",
    "name",
    "id",
    "href",
    "published_at",
    "description",
    "location"
  ]);
  t.deepEqual(PhotoComment.attributes, [
    "inserted_at",
    "is_important",
    "uuid",
    "content",
    "photo_id",
    "user_id",
    "updated_at",
    "like_count",
    "reply_id"
  ]);
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
    },
    {
      id: 4,
      href: undefined,
      is_public: true,
      published_at: "2017-10-10T00:00:00.000Z",
      description: "Some description",
      name: "Some default name"
    },
    {
      id: 5,
      href: undefined,
      is_public: false,
      location: "Istanbul",
      published_at: undefined,
      name: "Some default name",
      description: undefined
    }
  ]);
});
