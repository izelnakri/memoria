import test from "ava";
import fs from "fs-extra";

const CWD = process.cwd();

// TODO: test reset() function, if implementation is required
test.before(async () => {
  Object.keys(require.cache).forEach((key) => delete require.cache[key]);

  await fs.mkdir(`${CWD}/memserver`);
  await fs.mkdir(`${CWD}/memserver/models`);
  await Promise.all([
    fs.writeFile(
      `${CWD}/memserver/models/photo.ts`,
      `
      import Model from '${CWD}/dist/model';

      export default class Photo extends Model {
        static defaultAttributes = {
          is_public: true,
          name() {
            return 'Imported photo';
          }
        }
        static publicPhotos() {
          return super.findAll({ is_public: true });
        }
      }
    `
    ),
    fs.writeFile(
      `${CWD}/memserver/models/photo-comment.ts`,
      `
      import Model from '${CWD}/dist/model';

      export default class PhotoComment extends Model {
        static defaultAttributes = {
          inserted_at() {
            return new Date().toJSON();
          },
          is_important: true
        }
        static forPhoto(photo) {
          return super.findAll({ photo_id: photo.id });
        }
      }
    `
    ),
    fs.writeFile(
      `${CWD}/memserver/models/user.ts`,
      `
      import Model from '${CWD}/dist/model';

      export default class User extends Model {
      }
    `
    ),
    fs.writeFile(`${CWD}/memserver/server.js`, "export default function() {}"),
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

test.afterEach(() => {
  Object.keys(require.cache).forEach((key) => delete require.cache[key]);
});

test.after.always(async () => {
  if (await fs.pathExists(`${CWD}/memserver`)) {
    await fs.remove(`${CWD}/memserver`);
  }
});

test.serial("$Model.name gets set correctly", async (t) => {
  t.plan(2);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;

  t.is(Photo.name, "Photo");
  t.is(PhotoComment.name, "PhotoComment");
});

test.serial("$Model.primaryKey gets set correctly", async (t) => {
  t.plan(7);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
  const User = (await import(`${CWD}/memserver/models/user.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
  const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
    .default;

  t.is(Photo.primaryKey, null);
  t.is(PhotoComment.primaryKey, null);
  t.is(User.primaryKey, null);

  PhotoFixtures.forEach((photo) => Photo.insert(photo));
  PhotoCommentFixtures.forEach((photoComment) => PhotoComment.insert(photoComment));

  t.is(Photo.primaryKey, "id");
  t.is(PhotoComment.primaryKey, "uuid");
  t.is(User.primaryKey, null);
  t.true(Photo._DB === PhotoComment._DB);
});

test.serial("$Model.defaultAttributes gets set correctly", async (t) => {
  t.plan(10);

  await Promise.all([
    fs.writeFile(
      `${CWD}/memserver/models/photo.ts`,
      `
      import Model from '${CWD}/dist/model';

      export default class Photo extends Model {
        static defaultAttributes = {
          is_public: true,
          name() {
            return 'Imported photo';
          }
        }
        static publicPhotos() {
          return super.findAll({ is_public: true });
        }
      }
    `
    ),
    fs.writeFile(
      `${CWD}/memserver/models/photo-comment.ts`,
      `
      import Model from '${CWD}/dist/model';

      export default class PhotoComment extends Model {
        static defaultAttributes = {
          inserted_at() {
            return new Date().toJSON();
          },
          is_important: true
        }
        static forPhoto(photo) {
          return super.findAll({ photo_id: photo.id });
        }
      }
    `
    )
  ]);

  Object.keys(require.cache).forEach((key) => delete require.cache[key]);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
  const User = (await import(`${CWD}/memserver/models/user.ts`)).default;
  const initialPhotoDefaultAttributes = Photo.defaultAttributes;
  const initialPhotoCommentDefaultAttributes = PhotoComment.defaultAttributes;

  t.deepEqual(Object.keys(initialPhotoDefaultAttributes), ["is_public", "name"]);
  t.is(initialPhotoDefaultAttributes.is_public, true);
  t.true(initialPhotoDefaultAttributes.name.toString().includes("Imported photo"));

  t.deepEqual(Object.keys(initialPhotoCommentDefaultAttributes), ["inserted_at", "is_important"]);
  t.true(initialPhotoCommentDefaultAttributes.inserted_at.toString().includes(".toJSON();"));
  t.is(initialPhotoCommentDefaultAttributes.is_important, true);
  t.deepEqual(User.defaultAttributes, {});

  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
  const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
    .default;
  PhotoFixtures.forEach((photo) => Photo.insert(photo));
  PhotoCommentFixtures.forEach((photoComment) => PhotoComment.insert(photoComment));

  t.is(Photo.defaultAttributes, initialPhotoDefaultAttributes);
  t.deepEqual(PhotoComment.defaultAttributes, initialPhotoCommentDefaultAttributes);
  t.deepEqual(User.defaultAttributes, {});
});

test.serial("$Model.attributes gets set correctly", async (t) => {
  t.plan(6);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
  const User = (await import(`${CWD}/memserver/models/user.ts`)).default;

  t.deepEqual(Photo.attributes, ["is_public", "name"]);
  t.deepEqual(PhotoComment.attributes, ["inserted_at", "is_important"]);
  t.deepEqual(User.attributes, []);

  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
  const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
    .default;
  PhotoFixtures.forEach((photo) => Photo.insert(photo));
  PhotoCommentFixtures.forEach((photoComment) => PhotoComment.insert(photoComment));

  t.deepEqual(Photo.attributes, ["is_public", "name", "id", "href"]);
  t.deepEqual(PhotoComment.attributes, [
    "inserted_at",
    "is_important",
    "uuid",
    "content",
    "photo_id",
    "user_id"
  ]);
  t.deepEqual(User.attributes, []);
});

test.serial("$Model.count counts the models correctly", async (t) => {
  t.plan(4);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;

  t.is(Photo.count(), 0);
  t.is(PhotoComment.count(), 0);

  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
  const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
    .default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));
  PhotoCommentFixtures.forEach((photoComment) => PhotoComment.insert(photoComment));

  t.is(Photo.count(), 3);
  t.is(PhotoComment.count(), 4);
});

test.serial("$Model can have custom methods/queries for the model", async (t) => {
  t.plan(2);

  Object.keys(require.cache).forEach((key) => delete require.cache[key]);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
  const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
    .default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));
  PhotoCommentFixtures.forEach((photoComment) => PhotoComment.insert(photoComment));

  const photo = Photo.find(1);

  t.deepEqual(PhotoComment.forPhoto(photo), PhotoComment.findAll({ photo_id: photo.id }));
  t.deepEqual(Photo.publicPhotos(), Photo.findAll({ is_public: true }));
});
