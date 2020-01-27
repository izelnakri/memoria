import test from "ava";
import fs from "fs-extra";

const CWD = process.cwd();

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
        // static defaultAttributes: {
        //   is_public: true,
        //   name() {
        //     return 'Imported photo';
        //   }
        // }
        // static publicPhotos() {
        //   return this.findAll({ is_public: true });
        // }
      }
    `
    ),
    fs.writeFile(
      `${CWD}/memserver/models/photo-comment.ts`,
      `
      import Model from '${CWD}/dist/model';

      export default class PhotoComment extends Model {
        // static defaultAttributes: {
        //   inserted_at() {
        //     return new Date().toJSON();
        //   },
        //   is_important: true
        // }
        // static forPhoto(photo) {
        //   return this.findAll({ photo_id: photo.id });
        // }
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
    fs.writeFile(`${CWD}/memserver/server.js`, "export default function(Models) {}"),
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

test.serial("$Model.modelName gets set correctly", async (t) => {
  t.plan(2);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;

  console.log(Photo);
  // const MemServer = require("../../lib/index.js");
  // const { Photo, PhotoComment } = MemServer.Models;

  // t.is(Photo.modelName, "Photo");
  // t.is(PhotoComment.modelName, "PhotoComment");

  // MemServer.start();

  // t.is(Photo.modelName, "Photo");
  // t.is(PhotoComment.modelName, "PhotoComment");
});

// test.serial("$Model.primaryKey gets set correctly", (t) => {
//   t.plan(6);

//   const MemServer = require("../../lib/index.js");
//   const { Photo, PhotoComment, User } = MemServer.Models;

//   t.is(Photo.primaryKey, null);
//   t.is(PhotoComment.primaryKey, null);
//   t.is(User.primaryKey, null);

//   MemServer.start();

//   t.is(Photo.primaryKey, "id");
//   t.is(PhotoComment.primaryKey, "uuid");
//   t.is(User.primaryKey, null);
// });

// test.serial("$Model.defaultAttributes gets set correctly", async (t) => {
//   t.plan(10);

//   await Promise.all([
//     fs.writeFile(
//       `${CWD}/memserver/models/photo.js`,
//       `
//       import Model from '${CWD}/lib/model';

//       export default Model({
//         defaultAttributes: {
//           is_public: true,
//           name() {
//             return 'Imported photo';
//           }
//         },
//         publicPhotos() {
//           return this.findAll({ is_public: true });
//         }
//       });
//     `
//     ),
//     fs.writeFile(
//       `${CWD}/memserver/models/photo-comment.js`,
//       `
//       import Model from '${CWD}/lib/model';

//       export default Model({
//         defaultAttributes: {
//           inserted_at() {
//             return new Date().toJSON();
//           },
//           is_important: true
//         },
//         forPhoto(photo) {
//           return this.findAll({ photo_id: photo.id });
//         }
//       });
//     `
//     )
//   ]);

//   Object.keys(require.cache).forEach((key) => delete require.cache[key]);

//   const MemServer = require("../../lib/index.js");
//   const { Photo, PhotoComment, User } = MemServer.Models;
//   const initialPhotoDefaultAttributes = Photo.defaultAttributes;
//   const initialPhotoCommentDefaultAttributes = PhotoComment.defaultAttributes;

//   t.deepEqual(Object.keys(initialPhotoDefaultAttributes), ["is_public", "name"]);
//   t.is(initialPhotoDefaultAttributes.is_public, true);
//   t.true(initialPhotoDefaultAttributes.name.toString().includes("Imported photo"));

//   t.deepEqual(Object.keys(initialPhotoCommentDefaultAttributes), ["inserted_at", "is_important"]);
//   t.true(initialPhotoCommentDefaultAttributes.inserted_at.toString().includes(".toJSON();"));
//   t.is(initialPhotoCommentDefaultAttributes.is_important, true);
//   t.deepEqual(User.defaultAttributes, {});

//   MemServer.start();

//   t.is(Photo.defaultAttributes, initialPhotoDefaultAttributes);
//   t.deepEqual(PhotoComment.defaultAttributes, initialPhotoCommentDefaultAttributes);
//   t.deepEqual(User.defaultAttributes, {});
// });

// test.serial("$Model.attributes gets set correctly", (t) => {
//   t.plan(6);

//   const MemServer = require("../../lib/index.js");
//   const { Photo, PhotoComment, User } = MemServer.Models;

//   t.deepEqual(Photo.attributes, ["is_public", "name"]);
//   t.deepEqual(PhotoComment.attributes, ["inserted_at", "is_important"]);
//   t.deepEqual(User.attributes, []);

//   MemServer.start();

//   t.deepEqual(Photo.attributes, ["is_public", "name", "id", "href"]);
//   t.deepEqual(PhotoComment.attributes, [
//     "inserted_at",
//     "is_important",
//     "uuid",
//     "content",
//     "photo_id",
//     "user_id"
//   ]);
//   t.deepEqual(User.attributes, []);
// });

// test.serial("$Model.count counts the models correctly", (t) => {
//   t.plan(4);

//   const MemServer = require("../../lib/index.js");
//   const { Photo, PhotoComment } = MemServer.Models;

//   t.is(Photo.count(), 0);
//   t.is(PhotoComment.count(), 0);

//   MemServer.start();

//   t.is(Photo.count(), 3);
//   t.is(PhotoComment.count(), 4);
// });

// test.serial("$Model can have custom methods/queries for the model", (t) => {
//   t.plan(2);

//   Object.keys(require.cache).forEach((key) => delete require.cache[key]);

//   const MemServer = require("../../lib/index.js");
//   const { Photo, PhotoComment } = MemServer.Models;

//   MemServer.start();

//   const photo = Photo.find(1);

//   t.deepEqual(PhotoComment.forPhoto(photo), PhotoComment.findAll({ photo_id: photo.id }));
//   t.deepEqual(Photo.publicPhotos(), Photo.findAll({ is_public: true }));
// });
