import test from "ava";
import fs from "fs/promises";

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
        static defaultAttributes = {
          is_public: true,
          name() {
            return 'Imported photo';
          },
          href() {
            return this.name;
          }
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
        href: null,
        is_public: false
      },
      {
        id: 4,
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
  await fs.rmdir(`${CWD}/memserver`, { recursive: true });
});

test.serial(
  "$Model.insert() sets dynamic defaultAttributes when target attribute doest exist",
  async (t) => {
    t.plan(7);

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));

    t.deepEqual(Photo.findAll(), [
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
        href: null,
        is_public: false,
      },
      {
        id: 4,
        name: "Imported photo",
        href: "Imported photo",
        is_public: false,
      },
    ]);

    const target = Photo.insert({ name: "Izel" });

    t.deepEqual(target, {
      id: 5,
      name: "Izel",
      href: "Izel",
      is_public: true,
    });
    t.deepEqual(target, Photo.find(target.id));

    const secondTarget = Photo.insert({ name: "Izel", href: "something else" });

    t.deepEqual(secondTarget, {
      id: 6,
      name: "Izel",
      href: "something else",
      is_public: true,
    });
    t.deepEqual(secondTarget, Photo.find(secondTarget.id));

    const thirdTarget = Photo.insert({ name: "Izel", href: null });

    t.deepEqual(thirdTarget, {
      id: 7,
      name: "Izel",
      href: null,
      is_public: true,
    });
    t.deepEqual(thirdTarget, Photo.find(thirdTarget.id));
  }
);
