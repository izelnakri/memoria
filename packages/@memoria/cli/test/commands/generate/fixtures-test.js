import fs from 'fs/promises';
import { module, test } from "qunitx";
import util from "util";
import child_process from "child_process";
import transpileImport from './../../helpers/transpile-import.js';

const CWD = process.cwd();
const PKG_PATH = `${CWD}/packages/@memserver/cli`;
const CLI_JS = `${PKG_PATH}/src/cli.js`;

const shell = util.promisify(child_process.exec);

module("@memserver/cli | g fixtures command", function (hooks) {
  hooks.beforeEach(async function() {
    await fs.rm(`${CWD}/memserver`, { force: true, recursive: true });
    await fs.rm(`${CWD}/tmp`, { force: true, recursive: true });
  });

  test("$ memserver g fixtures | without memserver directory raises error", async function(assert) {
    assert.expect(3);

    const folderExistence = await pathExists(`${CWD}/memserver`);

    assert.ok(!folderExistence);

    let result = await shell(`node ${CLI_JS} generate fixtures`);

    assert.ok(
      result.stdout.includes(
        "[Memserver CLI] cannot find /memserver folder. Did you run $ memserver init ?"
      )
    );

    result = await shell(`node ${CLI_JS} g fixtures`);

    assert.ok(
      result.stdout.includes(
        "[Memserver CLI] cannot find /memserver folder. Did you run $ memserver init ?"
      )
    );
  });

  test("$ memserver g fixtures [modelName] | without memserver directory raises error", async function(assert) {
    assert.expect(3);

    const folderExistence = await pathExists(`${CWD}/memserver`);

    assert.ok(!folderExistence);

    let result = await shell(`node ${CLI_JS} generate fixtures user`);

    assert.ok(
      result.stdout.includes(
        "[Memserver CLI] cannot find /memserver folder. Did you run $ memserver init ?"
      )
    );

    result = await shell(`node ${CLI_JS} g fixtures`);

    assert.ok(
      result.stdout.includes(
        "[Memserver CLI] cannot find /memserver folder. Did you run $ memserver init ?"
      )
    );
  });

  test("$ memserver g fixtures | works for the entire state", async function(assert) {
    assert.expect(9);

    await generateMemServerState();

    const { stdout } = await shell(`node ${CLI_JS} g fixtures`);

    assert.ok(stdout.includes("[MemServer] data written to /fixtures/users.ts"));
    assert.ok(stdout.includes("[MemServer] data written to /fixtures/likes.ts"));
    assert.ok(stdout.includes("[MemServer] data written to /fixtures/photos.ts"));
    assert.ok(stdout.includes("[MemServer] data written to /fixtures/photo-comments.ts"));

    const fixturesPath = `${CWD}/memserver/fixtures`;

    assert.deepEqual(await fs.readdir(fixturesPath), [
      "likes.ts",
      "photo-comments.ts",
      "photos.ts",
      "users.ts",
    ]);
    // TODO: how to check these?
    assert.deepEqual(await transpileImport(`${fixturesPath}/users.ts`), [
      {
        password: "123456",
        authentication_token: "12or12rnfasdfzlemfp1m3epfm134",
        id: 1,
        first_name: "Izel",
        last_name: "Nakri",
      },
    ]);
    assert.deepEqual(await transpileImport(`${fixturesPath}/photos.ts`), [
      { id: 1, name: "Me skiing", href: "ski-trip.jpeg", is_public: false },
      { id: 2, name: "Family photo", href: "family-photo.jpeg", is_public: true },
      { id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false },
      { id: 4, name: "Travel photo", href: "travel-photo.jpeg", is_public: false },
    ]);
    assert.deepEqual(await transpileImport(`${fixturesPath}/photo-comments.ts`), [
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
      {
        uuid: "374c7f4a-85d6-429a-bf2a-0719525faaaa",
        content: "This is badass",
        photo_id: 1,
        user_id: 1,
      },
    ]);
    assert.deepEqual(await transpileImport(`${fixturesPath}/likes.ts`), []);
  });

  test("$ memserver generate fixtures [modelName] works", async function(assert) {
    assert.expect(12);

    await generateMemServerState();

    const { stdout } = await shell(`node ${CLI_JS} generate fixtures users`);
    assert.ok(stdout.includes("[MemServer] data written to /fixtures/users.ts"));

    const fixturesPath = `${CWD}/memserver/fixtures`;

    assert.deepEqual(await fs.readdir(fixturesPath), ["photo-comments.ts", "photos.ts", "users.ts"]);
    assert.deepEqual(await transpileImport(`${fixturesPath}/users.ts`), [
      {
        password: "123456",
        authentication_token: "12or12rnfasdfzlemfp1m3epfm134",
        id: 1,
        first_name: "Izel",
        last_name: "Nakri",
      },
    ]);
    assert.deepEqual(await transpileImport(`${fixturesPath}/photos.ts`), [
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
    ]);
    assert.deepEqual(await transpileImport(`${fixturesPath}/photo-comments.ts`), [
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
    ]);
    assert.ok(!(await pathExists(`${fixturesPath}/likes.js`)));

    let result = await shell(`node ${CLI_JS} generate fixtures photos`);
    assert.ok(result.stdout.includes("[MemServer] data written to /fixtures/photos.ts"));

    assert.deepEqual(await fs.readdir(fixturesPath), ["photo-comments.js", "photo-comments.ts", "photos.js", "photos.ts", "users.js", "users.ts"]);
    assert.deepEqual(await transpileImport(`${fixturesPath}/users.ts`), [
      {
        password: "123456",
        authentication_token: "12or12rnfasdfzlemfp1m3epfm134",
        id: 1,
        first_name: "Izel",
        last_name: "Nakri",
      },
    ]);

    const photosFixtureData = (await fs.readFile(`${fixturesPath}/photos.ts`)).toString();

    assert.deepEqual(eval(photosFixtureData.slice(15, photosFixtureData.length - 1)), [
      // TODO: babel cache: false doesnt work
      { id: 1, name: "Me skiing", href: "ski-trip.jpeg", is_public: false },
      { id: 2, name: "Family photo", href: "family-photo.jpeg", is_public: true },
      { id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false },
      { id: 4, name: "Travel photo", href: "travel-photo.jpeg", is_public: false },
    ]);
    assert.deepEqual(await transpileImport(`${fixturesPath}/photo-comments.ts`), [
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
    ]);
    assert.ok(!(await pathExists(`${fixturesPath}/likes.ts`)));
  });

  test("$ memserver g fixtures [modelName] works", async function(assert) {
    assert.expect(12);

    await generateMemServerState();
    const { stdout } = await shell(`node ${CLI_JS} g fixtures users`);

    assert.ok(stdout.includes("[MemServer] data written to /fixtures/users.ts"));

    const fixturesPath = `${CWD}/memserver/fixtures`;

    assert.deepEqual(await fs.readdir(fixturesPath), ["photo-comments.ts", "photos.ts", "users.ts"]);
    assert.deepEqual(await transpileImport(`${fixturesPath}/users.ts`), [
      {
        password: "123456",
        authentication_token: "12or12rnfasdfzlemfp1m3epfm134",
        id: 1,
        first_name: "Izel",
        last_name: "Nakri",
      },
    ]);
    assert.deepEqual(await transpileImport(`${fixturesPath}/photos.ts`), [
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
    ]);
    assert.deepEqual(await transpileImport(`${fixturesPath}/photo-comments.ts`), [
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
    ]);
    assert.ok(!(await pathExists(`${fixturesPath}/likes.ts`)));

    let result = await shell(`node ${CLI_JS} g fixtures photos`);

    assert.ok(result.stdout.includes("[MemServer] data written to /fixtures/photos.ts"));

    assert.deepEqual(await fs.readdir(fixturesPath), ["photo-comments.js", "photo-comments.ts", "photos.js", "photos.ts", "users.js", "users.ts"]);
    assert.deepEqual(await transpileImport(`${fixturesPath}/users.ts`), [
      {
        password: "123456",
        authentication_token: "12or12rnfasdfzlemfp1m3epfm134",
        id: 1,
        first_name: "Izel",
        last_name: "Nakri",
      },
    ]);

    const photosFixtureData = (await fs.readFile(`${fixturesPath}/photos.ts`)).toString();

    assert.deepEqual(eval(photosFixtureData.slice(15, photosFixtureData.length - 1)), [
      // TODO: babel cache: false doesnt work
      { id: 1, name: "Me skiing", href: "ski-trip.jpeg", is_public: false },
      { id: 2, name: "Family photo", href: "family-photo.jpeg", is_public: true },
      { id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false },
      { id: 4, name: "Travel photo", href: "travel-photo.jpeg", is_public: false },
    ]);
    assert.deepEqual(await transpileImport(`${fixturesPath}/photo-comments.ts`), [
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
    ]);
    assert.ok(!(await pathExists(`${fixturesPath}/likes.js`)));
  });

  // test('$ memserver generate fixtures [modelName] with wrong modelName raises', (t) => {
  // });

  // test('$ memserver g fixtures [modelName] with wrong modelName raises', (t) => {
  // });
});

async function generateMemServerState() {
  const modelFileContent = (className) => `import Model from '@memserver/model';
  export default class ${className} extends Model{
  }`;

  await fs.mkdir(`${CWD}/memserver`);
  await Promise.all([fs.mkdir(`${CWD}/memserver/models`), fs.mkdir(`${CWD}/memserver/fixtures`)]);
  await Promise.all([
    fs.writeFile(
      `${CWD}/memserver/models/user.ts`,
      `import Model from '@memserver/model';
    export default class User extends Model {
      static defaultAttributes = {
        password: '123456',
        authentication_token() {
          return '12or12rnfasdfzlemfp1m3epfm134';
        }
      }
    }`
    ),
    fs.writeFile(`${CWD}/memserver/models/photo.ts`, modelFileContent("Photo")),
    fs.writeFile(
      `${CWD}/memserver/models/photo-comment.ts`,
      `import Model from '@memserver/model';
    export default class PhotoComment extends Model {
      static createForUser(user, photo, photoOptions) {
        console.log(user);
        console.log(photo);
        return this.insert(Object.assign({}, photoOptions, {
          photo_id: photo.id, user_id: user.id
        }));
      }
    }`
    ),
    fs.writeFile(`${CWD}/memserver/models/likes.ts`, modelFileContent("Likes")),
    fs.writeFile(`${CWD}/memserver/routes.ts`, "export default function() {}"),
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
    ),
    fs.writeFile(
      `${CWD}/memserver/initializer.ts`,
      `
      import User from './models/user';
      import Photo from './models/photo';
      import PhotoComment from './models/photo-comment';
      import photos from './fixtures/photos';
      import photoComments from './fixtures/photo-comments';

      export default function() {
        Photo.resetDatabase(photos);
        PhotoComment.resetDatabase(photoComments);

        const user = User.insert({ first_name: 'Izel', last_name: 'Nakri' });
        const photo = Photo.find(1);

        Photo.insert({ name: 'Travel photo', href: 'travel-photo.jpeg', is_public: false });
        PhotoComment.createForUser(user, photo, {
          uuid: '374c7f4a-85d6-429a-bf2a-0719525faaaa', content: 'This is badass'
        });

        Photo.update({ id: 1, name: 'Me skiing' });
    }`
    ),
  ]);
}

async function pathExists(path) {
  try {
    await fs.access(path);

    return true;
  } catch {
    return false;
  }
}
