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
    fs.writeFile(`${CWD}/memserver/models/user.ts`, modelFileContent("User")),
    fs.writeFile(
      `${CWD}/memserver/routes.ts`,
      `
      import Photo from './models/photo';
      import Response from '../dist/response';

      export default function() {
        this.get('/photos', () => {
          const photos = Photo.findAll();

          return Response(202, { photos: Photo.serializer(photos) });
        });
      }`
    ),
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
      `${CWD}/memserver/fixtures/users.ts`,
      `export default [
      {
        id: 1,
        first_name: 'Izel',
        last_name: 'Nakri'
      }
    ]`
    )
  ]);
});

test.after.always(async () => {
  if (await fs.pathExists(`${CWD}/memserver`)) {
    await fs.remove(`${CWD}/memserver`);
  }
});

test.beforeEach(() => {
  Object.keys(require.cache).forEach((key) => delete require.cache[key]);
});

test.serial("MemServer.Response can be used outside the server file", async (t) => {
  t.plan(2);

  const User = (await import(`${CWD}/memserver/models/user.ts`)).default;
  const UserFixtures = (await import(`${CWD}/memserver/fixtures/users.ts`)).default;

  await (await import(`${CWD}/dist/setup-dom`)).default();

  const MemServer = (await import(`${CWD}/dist/server`)).default;
  const Response = (await import(`${CWD}/dist/response`)).default;

  UserFixtures.forEach((user) => User.insert(user));

  const Server = new MemServer();
  const $ = await import("jquery");

  Server.get("/users/:id", (request) => {
    const user = User.find(Number(request.params.id));

    if (user) {
      return Response(200, { user: User.serializer(user) });
    }
  });

  await $.ajax({
    type: "GET",
    url: "/users/1"
  }).then((data, textStatus, jqXHR) => {
    t.is(jqXHR.status, 200);
    t.deepEqual(data, { user: { id: 1, first_name: "Izel", last_name: "Nakri" } });
  });
});

test.serial("MemServer.Response can be used inside the server file", async (t) => {
  t.plan(2);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;

  await (await import(`${CWD}/dist/setup-dom`)).default();

  const MemServer = (await import(`${CWD}/dist/server`)).default;
  const Response = (await import(`${CWD}/dist/response`)).default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));

  const Server = new MemServer({
    routes: (await import(`${CWD}/memserver/routes`)).default
  });
  const $ = await import("jquery");

  await $.getJSON("/photos", (data, textStatus, jqXHR) => {
    t.is(jqXHR.status, 202);
    t.deepEqual(data, { photos: Photo.serializer(Photo.findAll()) });
  });
});

test.serial(
  "MemServer.Response can be used when overwriting an existing server route",
  async (t) => {
    t.plan(2);

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;

    await (await import(`${CWD}/dist/setup-dom`)).default();

    const MemServer = (await import(`${CWD}/dist/server`)).default;
    const Response = (await import(`${CWD}/dist/response`)).default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));

    const Server = new MemServer({
      routes: (await import(`${CWD}/memserver/routes`)).default
    });
    const $ = await import("jquery");

    Server.get("/photos", () => Response(500, { error: "Internal Server Error" }));

    try {
      await $.getJSON("/photos");
    } catch (jqXHR) {
      t.is(jqXHR.status, 500);
      t.deepEqual(jqXHR.responseJSON, { error: "Internal Server Error" });
    }
  }
);
