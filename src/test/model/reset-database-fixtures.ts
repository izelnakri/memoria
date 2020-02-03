import test from "ava";
import fs from "fs-extra";

const CWD = process.cwd();
const modelFileContent = (className) => `import Model from '${CWD}/dist/model';
export default class ${className} extends Model{
}`;

test.beforeEach(async (t) => {
  await fs.mkdirp(`${CWD}/memserver`);
  await fs.mkdirp(`${CWD}/memserver/models`);
  await Promise.all([
    fs.writeFile(`${CWD}/memserver/models/photo.ts`, modelFileContent("Photo")),
    fs.writeFile(`${CWD}/memserver/models/user.ts`, modelFileContent("User")),
    fs.writeFile(`${CWD}/memserver/models/photo-comment.ts`, modelFileContent("PhotoComment")),
    fs.writeFile(`${CWD}/memserver/server.ts`, "export default function() {}")
  ]);

  Object.keys(require.cache).forEach((key) => delete require.cache[key]);
});

test.afterEach.always(async () => {
  // NOTE: maybe remove require cache if needed
  Object.keys(require.cache).forEach((key) => delete require.cache[key]);

  if (await fs.pathExists(`${CWD}/memserver`)) {
    await fs.remove(`${CWD}/memserver`);
  }
});

test.serial(
  "Memserver fixtures should throw error if any of the fixtures missing id or uuid",
  async (t) => {
    t.plan(2);

    if (!(await fs.pathExists(`${CWD}/memserver/fixtures`))) {
      await fs.mkdir(`${CWD}/memserver/fixtures`);
    }

    await fs.writeFile(
      `${CWD}/memserver/fixtures/photo-comments.ts`,
      `export default [
      {
        content: 'What a nice photo!',
        photo_id: 1,
        user_id: 1
      },
      {
        content: 'I agree',
        photo_id: 1,
        user_id: 2
      },
      {
        content: 'I was kidding',
        photo_id: 1,
        user_id: 1
      },
      {
        content: 'Interesting indeed',
        photo_id: 2,
        user_id: 1
      }
    ];`
    );

    const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
    const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
      .default;
    const error = t.throws(() => PhotoComment.resetDatabase(PhotoCommentFixtures), {
      instanceOf: Error
    });

    t.true(
      /\[Memserver\] DATABASE ERROR: At least one of your PhotoComment fixtures missing a primary key\. Please make sure all your PhotoComment fixtures have either id or uuid primaryKey/.test(
        error.message
      )
    );
  }
);

test.serial(
  "Memserver fixtures should throw error if any of the id fixtures have an incorrect type",
  async (t) => {
    t.plan(2);

    await fs.mkdirp(`${CWD}/memserver/fixtures`);
    await fs.writeFile(
      `${process.cwd()}/memserver/fixtures/photos.ts`,
      `export default [
      {
        id: 1,
        name: 'Ski trip',
        href: 'ski-trip.jpeg',
        is_public: false
      },
      {
        id: '2',
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
    );

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
    const error = t.throws(() => Photo.resetDatabase(PhotoFixtures), {
      instanceOf: Error
    });

    t.true(
      /\[Memserver\] Photo model primaryKey type is 'id'\. Instead you've tried to enter id: 2 with string type/.test(
        error.message
      )
    );
  }
);

test("Memserver fixtures should throw error if any of the uuid fixtures have an incorrect type", async (t) => {
  t.plan(2);

  await fs.mkdirp("./memserver/fixtures");
  await fs.writeFile(
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
        uuid: 12,
        content: 'Interesting indeed',
        photo_id: 2,
        user_id: 1
      }
    ];`
  );

  const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
  const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
    .default;
  const error = t.throws(() => PhotoComment.resetDatabase(PhotoCommentFixtures), {
    instanceOf: Error
  });

  t.true(
    /\[Memserver\] PhotoComment model primaryKey type is 'uuid'. Instead you've tried to enter uuid: 12 with number type/.test(
      error.message
    )
  );
});

test.serial(
  "Memserver fixtures should throw error if there are duplicate id fixtures",
  async (t) => {
    t.plan(2);

    await fs.mkdirp(`${CWD}/memserver/fixtures`);
    await fs.writeFile(
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
      id: 2,
      name: 'Selfie',
      href: 'selfie.jpeg',
      is_public: false
    }
  ];`
    );

    Object.keys(require.cache).forEach((key) => delete require.cache[key]);

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
    const error = t.throws(() => Photo.resetDatabase(PhotoFixtures), {
      instanceOf: Error
    });

    t.true(
      /\[Memserver\] DATABASE ERROR: Duplication in Photo fixtures with id: 2/.test(error.message)
    );
  }
);

test.serial(
  "Memserver fixtures should throw error if there are duplicate uuid fixtures",
  async (t) => {
    t.plan(2);

    await fs.mkdirp("./memserver/fixtures");
    await fs.writeFile(
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
      uuid: '499ec646-493f-4eea-b92e-e383d94182f4',
      content: 'Interesting indeed',
      photo_id: 2,
      user_id: 1
    }
  ];`
    );

    const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
    const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
      .default;
    const error = t.throws(() => PhotoComment.resetDatabase(PhotoCommentFixtures), {
      instanceOf: Error
    });

    t.true(
      /\[Memserver\] DATABASE ERROR: Duplication in PhotoComment fixtures with uuid: 499ec646-493f-4eea-b92e-e383d94182f4/.test(
        error.message
      )
    );
  }
);
