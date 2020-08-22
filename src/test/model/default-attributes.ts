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
          },
          href() {
            console.log(super);
            console.log(super.name);

            return this.name;
          }
        }
        static publicPhotos() {
          return super.findAll({ is_public: true });
        }
      }
    `
    ),
    fs.mkdir(`${CWD}/memserver/fixtures`),
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

test.serial(
  "$Model.insert() sets dynamic defaultAttributes when target attribute doest exist",
  async (t) => {
    t.plan(7);

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));

    t.deepEqual(
      Photo.findAll().map((photo) => photo.id),
      [
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
      ]
    );

    Photo.insert();
  }
);

// test.serial("$Model.update() doesnt set defaultAttributes", async (t) => {

// });
