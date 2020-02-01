declare global {
  interface Window {
    $?: any;
  }
}

import test from "ava";
import fs from "fs-extra";

const AUTHENTICATION_TOKEN = "ec25fc7b-6ee2-4bda-b57c-6c9867b30ff4";
const AJAX_AUTHORIZATION_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Token ${AUTHENTICATION_TOKEN}`
};
const CWD = process.cwd();

test.before(async () => {
  await fs.mkdir(`${CWD}/memserver`);
  await fs.mkdir(`${CWD}/memserver/models`);
  await Promise.all([
    fs.writeFile(
      `${CWD}/memserver/models/user.ts`,
      `
      import Photo from './photo';
      import Model from '${CWD}/dist/model';

      export default class User extends Model {
        static findFromHeaderToken(headers) {
          console.log('headers are', headers);
          const authorizationHeader = headers.Authorization;
          const token = authorizationHeader ? authorizationHeader.slice(6) : false;

          return this.findBy({ authentication_token: token }) || false;
        }
      }
    `
    ),
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
            return '2017-10-25T20:54:04.447Z';
          },
          is_important: true
        }
      }
    `
    ),
    fs.mkdir(`${CWD}/memserver/fixtures`)
  ]);
  await Promise.all([
    fs.writeFile(
      `${CWD}/memserver/fixtures/users.ts`,
      `export default [
      {
        id: 1,
        email: 'contact@izelnakri.com',
        username: 'izelnakri',
        authentication_token: '${AUTHENTICATION_TOKEN}'
      }
    ];`
    ),
    fs.writeFile(
      `${CWD}/memserver/fixtures/photos.ts`,
      `export default [
      {
        id: 1,
        name: 'Ski trip',
        href: 'ski-trip.jpeg',
        is_public: false,
        user_id: 1
      },
      {
        id: 2,
        name: 'Family photo',
        href: 'family-photo.jpeg',
        is_public: true,
        user_id: 1
      },
      {
        id: 3,
        name: 'Selfie',
        href: 'selfie.jpeg',
        is_public: false,
        user_id: 1
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
      `${CWD}/memserver/routes.ts`,
      `
      import User from './models/user';
      import Photo from './models/photo';
      import Response from '../dist/response';

      export default function() {
        this.post('/photos', ({ headers }) => {
          const user = User.findFromHeaderToken(headers);

          if (!user) {
            return Response(401, { error: 'Unauthorized' });
          }

          const photo = Photo.insert({ user_id: user.id });

          return { photo: Photo.serializer(photo) };
        });

        this.get('/photos', ({ headers }) => {
          const user = User.findFromHeaderToken(headers);

          if (!user) {
            return Response(404, { error: 'Not found' });
          }

          const photos = Photo.findAll({ user_id: user.id });

          return { photos: Photo.serializer(photos) };
        });

        this.get('/photos/:id', ({ headers, params }) => {
          const user = User.findFromHeaderToken(headers);

          if (!user) {
            return Response(401, { error: 'Unauthorized' });
          }

          const photo = Photo.findBy({ id: params.id, user_id: user.id });

          return photo ? { photo: Photo.serializer(photo) } : Response(404, { error: 'Not found'});
        });

        this.put('/photos/:id', ({ headers, params }) => {
          const user = User.findFromHeaderToken(headers);

          if (!user) {
            return Response(401, { error: 'Unauthorized' });
          }

          if (Photo.findBy({ id: params.id, user_id: user.id })) {
            return { photo: Photo.update(params.photo) };
          }
        });

        this.delete('/photos/:id', ({ headers, params }) => {
          const user = User.findFromHeaderToken(headers);

          if (user && Photo.findBy({ id: params.id, user_id: user.id })) {
            return Photo.delete({ id: params.id });
          }
        });

        this.get('http://izelnakri.com', () => {
          return Response(200, { result: 'external urls work!!' })
        })
      }
    `
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

test.serial("POST /resources work with custom headers and responses", async (t) => {
  t.plan(5);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const User = (await import(`${CWD}/memserver/models/user.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
  const UserFixtures = (await import(`${CWD}/memserver/fixtures/users.ts`)).default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));
  UserFixtures.forEach((user) => User.insert(user));

  await (await import(`${CWD}/dist/setup-dom`)).default();
  const MemServer = (await import(`${CWD}/dist/server`)).default;

  const Server = new MemServer({
    routes: (await import(`${CWD}/memserver/routes`)).default
  });

  window.$ = await import("jquery");

  t.is(Photo.count(), 3);

  await window.$.ajax({
    type: "POST",
    url: "/photos",
    headers: { "Content-Type": "application/json" }
  }).catch((jqXHR) => {
    t.is(jqXHR.status, 401);
    t.deepEqual(jqXHR.responseJSON, { error: "Unauthorized" });
  });
  await window.$.ajax({
    type: "POST",
    url: "/photos",
    headers: AJAX_AUTHORIZATION_HEADERS
  }).then((data, textStatus, jqXHR) => {
    t.is(jqXHR.status, 201);
    t.deepEqual(data, {
      photo: { is_public: true, name: "Some default name", id: 4, user_id: 1, href: null }
    });
  });
});

test.serial("GET /resources works with custom headers and responses", async (t) => {
  t.plan(4);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const User = (await import(`${CWD}/memserver/models/user.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
  const UserFixtures = (await import(`${CWD}/memserver/fixtures/users.ts`)).default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));
  UserFixtures.forEach((user) => User.insert(user));

  await (await import(`${CWD}/dist/setup-dom`)).default();
  const MemServer = (await import(`${CWD}/dist/server`)).default;

  const Server = new MemServer({
    routes: (await import(`${CWD}/memserver/routes`)).default
  });

  window.$ = await import("jquery");

  await window.$.ajax({
    type: "GET",
    url: "/photos",
    headers: { "Content-Type": "application/json" }
  }).catch((jqXHR) => {
    t.is(jqXHR.status, 404);
    t.deepEqual(jqXHR.responseJSON, { error: "Not found" });
  });
  await window.$.ajax({
    type: "GET",
    url: "/photos",
    headers: AJAX_AUTHORIZATION_HEADERS
  }).then((data, textStatus, jqXHR) => {
    t.is(jqXHR.status, 200);
    t.deepEqual(data, { photos: Photo.serializer(Photo.findAll()) });
  });
});

test.serial("GET /resources/:id works with custom headers and responses", async (t) => {
  t.plan(4);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const User = (await import(`${CWD}/memserver/models/user.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
  const UserFixtures = (await import(`${CWD}/memserver/fixtures/users.ts`)).default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));
  UserFixtures.forEach((user) => User.insert(user));

  await (await import(`${CWD}/dist/setup-dom`)).default();
  const MemServer = (await import(`${CWD}/dist/server`)).default;

  const Server = new MemServer({
    routes: (await import(`${CWD}/memserver/routes`)).default
  });

  window.$ = await import("jquery");

  await window.$.ajax({
    type: "GET",
    url: "/photos/1",
    headers: { "Content-Type": "application/json" }
  }).catch((jqXHR) => {
    t.is(jqXHR.status, 401);
    t.deepEqual(jqXHR.responseJSON, { error: "Unauthorized" });
  });
  await window.$.ajax({
    type: "GET",
    url: "/photos/1",
    headers: AJAX_AUTHORIZATION_HEADERS
  }).then((data, textStatus, jqXHR) => {
    t.is(jqXHR.status, 200);
    t.deepEqual(data, { photo: Photo.serializer(Photo.find(1)) });
  });
});

test.serial("PUT /resources/:id works with custom headers and responses", async (t) => {
  t.plan(5);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const User = (await import(`${CWD}/memserver/models/user.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
  const UserFixtures = (await import(`${CWD}/memserver/fixtures/users.ts`)).default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));
  UserFixtures.forEach((user) => User.insert(user));

  await (await import(`${CWD}/dist/setup-dom`)).default();
  const MemServer = (await import(`${CWD}/dist/server`)).default;

  const Server = new MemServer({
    routes: (await import(`${CWD}/memserver/routes`)).default
  });

  window.$ = await import("jquery");

  await window.$.ajax({
    type: "PUT",
    url: "/photos/1",
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({ photo: { id: 1, name: "Photo after edit" } })
  }).catch((jqXHR) => {
    t.is(jqXHR.status, 401);
    t.deepEqual(jqXHR.responseJSON, { error: "Unauthorized" });
  });
  await window.$.ajax({
    type: "PUT",
    url: "/photos/1",
    headers: AJAX_AUTHORIZATION_HEADERS,
    data: JSON.stringify({ photo: { id: 1, name: "Photo after edit" } })
  }).then((data, textStatus, jqXHR) => {
    t.is(jqXHR.status, 200);
    t.deepEqual(data, { photo: Photo.serializer(Photo.find(1)) });
    t.is(Photo.find(1).name, "Photo after edit");
  });
});

test.serial("DELETE /resources/:id works with custom headers and responses", async (t) => {
  t.plan(4);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const User = (await import(`${CWD}/memserver/models/user.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
  const UserFixtures = (await import(`${CWD}/memserver/fixtures/users.ts`)).default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));
  UserFixtures.forEach((user) => User.insert(user));

  await (await import(`${CWD}/dist/setup-dom`)).default();
  const MemServer = (await import(`${CWD}/dist/server`)).default;

  const Server = new MemServer({
    routes: (await import(`${CWD}/memserver/routes`)).default
  });

  window.$ = await import("jquery");

  t.truthy(Photo.find(1), "User id: 1 exists");

  await window.$.ajax({
    type: "DELETE",
    url: "/photos/1",
    headers: { "Content-Type": "application/json" }
  }).catch((jqXHR) => {
    t.is(jqXHR.status, 401);
    t.deepEqual(jqXHR.responseJSON, { error: "Unauthorized" });
    t.true(Photo.find(1), "User id: 1 exists");
  });
  await window.$.ajax({
    type: "DELETE",
    url: "/photos/1",
    headers: AJAX_AUTHORIZATION_HEADERS
  }).then((data, textStatus, jqXHR) => {
    t.is(jqXHR.status, 204);
    t.deepEqual(data, undefined);
    t.true(!Photo.find(1), "User id: 1 gets deleted");
  });
});

test.serial("MemServer.Server works for external links", async (t) => {
  t.plan(2);

  await (await import(`${CWD}/dist/setup-dom`)).default();
  const MemServer = (await import(`${CWD}/dist/server`)).default;

  const Server = new MemServer({
    routes: (await import(`${CWD}/memserver/routes`)).default
  });

  window.$ = await import("jquery");

  await window.$.ajax({
    type: "GET",
    url: "http://izelnakri.com",
    headers: { "Content-Type": "application/json" }
  }).then((data, textStatus, jqXHR) => {
    t.is(jqXHR.status, 200);
    t.deepEqual(jqXHR.responseJSON, { result: "external urls work!!" });
  });
});
