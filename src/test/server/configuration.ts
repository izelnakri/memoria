declare global {
  interface Window {
    $?: any;
  }
}

import test from "ava";
import fs from "fs/promises";

const CWD = process.cwd();

test.before(async () => {
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
    )
  ]);
});

test.beforeEach(() => {
  Object.keys(require.cache).forEach((key) => delete require.cache[key]);
});

test.after.always(async () => {
  await fs.rmdir(`${CWD}/memserver`, { recursive: true });
});

test.serial(
  "namespace configuration option could be passed in during MemServer.start()",
  async (t) => {
    t.plan(2);

    await fs.writeFile(
      `${CWD}/memserver/routes.ts`,
      `
    import Photo from '${CWD}/memserver/models/photo';
    import Response from '../dist/response';

    export default function() {
      this.get('/photos', () => {
        const photos = Photo.findAll();

        if (!photos || photos.length === 0) {
          return Response(404, { error: 'Not found' });
        }

        return { photos: Photo.serializer(photos) };
      });
    }
  `
    );

    Object.keys(require.cache).forEach((key) => delete require.cache[key]);

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));

    await (await import(`${CWD}/dist/setup-dom`)).default();
    const MemServer = (await import(`${CWD}/dist/server`)).default;

    const Server = new MemServer({
      namespace: "api/v1",
      routes: (await import(`${CWD}/memserver/routes`)).default
    });

    window.$ = await import("jquery");

    await window.$.ajax({
      type: "GET",
      url: "/api/v1/photos",
      headers: { "Content-Type": "application/json" }
    }).then((data, textStatus, jqXHR) => {
      t.is(jqXHR.status, 200);
      t.deepEqual(data, { photos: Photo.serializer(Photo.findAll()) });
    });
  }
);

test.serial(
  "server this.namespace() configuration can overwrite existing namespace config",
  async (t) => {
    t.plan(2);

    await fs.writeFile(
      `${CWD}/memserver/routes.ts`,
      `
    import Photo from './models/photo';
    import Response from '../dist/response';

    export default function() {
      this.namespace = 'api/';

      this.get('/photos', () => {
        const photos = Photo.findAll();

        if (!photos || photos.length === 0) {
          return Response(404, { error: 'Not found' });
        }

        return { photos: Photo.serializer(photos) };
      });
    }
  `
    );

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));

    await (await import(`${CWD}/dist/setup-dom`)).default();
    const MemServer = (await import(`${CWD}/dist/server`)).default;

    const Server = new MemServer({
      namespace: "api/v1",
      routes: (await import(`${CWD}/memserver/routes`)).default
    });

    window.$ = await import("jquery");

    await window.$.ajax({
      type: "GET",
      url: "/api/photos",
      headers: { "Content-Type": "application/json" }
    }).then((data, textStatus, jqXHR) => {
      t.is(jqXHR.status, 200);
      t.deepEqual(data, { photos: Photo.serializer(Photo.findAll()) });
    });
  }
);

test.serial(
  "urlPrefix configuration option could be passed in during MemServer.start()",
  async (t) => {
    t.plan(2);

    await fs.writeFile(
      `${CWD}/memserver/server.ts`,
      `
    import Photo from './models/photo';
    import Response from '../dist/response';

    export default function() {
      this.namespace = 'api/';
      this.get('/photos', () => {
        const photos = Photo.findAll();

        if (!photos || photos.length === 0) {
          return Response(404, { error: 'Not found' });
        }

        return { photos: Photo.serializer(photos) };
      });
    }
  `
    );

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));

    await (await import(`${CWD}/dist/setup-dom`)).default();
    const MemServer = (await import(`${CWD}/dist/server`)).default;

    const Server = new MemServer({
      urlPrefix: "http://twitter.com",
      routes: (await import(`${CWD}/memserver/routes`)).default
    });

    window.$ = await import("jquery");

    await window.$.ajax({
      type: "GET",
      url: "http://twitter.com/api/photos",
      headers: { "Content-Type": "application/json" }
    }).then((data, textStatus, jqXHR) => {
      t.is(jqXHR.status, 200);
      t.deepEqual(data, { photos: Photo.serializer(Photo.findAll()) });
    });
  }
);

test.serial(
  "server this.urlPrefix() configuration can overwrite existing urlPrefix config",
  async (t) => {
    t.plan(2);

    await fs.writeFile(
      `${CWD}/memserver/routes.ts`,
      `
    import Photo from './models/photo';
    import Response from '../dist/response';

    export default function() {
      this.urlPrefix = 'http://facebook.com/';
      this.namespace = 'api';

      this.get('/photos', () => {
        const photos = Photo.findAll();

        if (!photos || photos.length === 0) {
          return Response(404, { error: 'Not found' });
        }

        return { photos: Photo.serializer(photos) };
      });
    }
  `
    );

    Object.keys(require.cache).forEach((key) => delete require.cache[key]);

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));

    await (await import(`${CWD}/dist/setup-dom`)).default();
    const MemServer = (await import(`${CWD}/dist/server`)).default;

    const Server = new MemServer({
      urlPrefix: "http://twitter.com",
      routes: (await import(`${CWD}/memserver/routes`)).default
    });

    window.$ = await import("jquery");

    await window.$.ajax({
      type: "GET",
      url: "http://facebook.com/api/photos",
      headers: { "Content-Type": "application/json" }
    }).then((data, textStatus, jqXHR) => {
      t.is(jqXHR.status, 200);
      t.deepEqual(data, { photos: Photo.serializer(Photo.findAll()) });
    });
  }
);

test.serial('timing configuration option could be passed in during MemServer.start()', async (t) => {
  t.plan(3);

  await fs.writeFile(`${CWD}/memserver/routes.ts`, `
    import Photo from './models/photo';
    import Response from '../dist/response';

    export default function() {
      this.get('/photos', () => {
        const photos = Photo.findAll();

        if (!photos || photos.length === 0) {
          return Response(404, { error: 'Not found' });
        }

        return { photos: Photo.serializer(photos) };
      });
    }
  `);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));

  await (await import(`${CWD}/dist/setup-dom`)).default();
  const MemServer = (await import(`${CWD}/dist/server`)).default;

  const Server = new MemServer({
    timing: 3000,
    routes: (await import(`${CWD}/memserver/routes`)).default
  });

  window.$ = await import("jquery");

  let ThreeSecondsPassed = false;

  setTimeout(() => { ThreeSecondsPassed = true; }, 2200);

  await window.$.ajax({
    type: 'GET', url: '/photos', headers: { 'Content-Type': 'application/json' }
  }).then((data, textStatus, jqXHR) => {
    t.true(ThreeSecondsPassed);
    t.is(jqXHR.status, 200);
    t.deepEqual(data, { photos: Photo.serializer(Photo.findAll()) });
  });
});

// test.serial('server this.get(url, timing) configuration can overwrite existing timing config', async () => {
//
// });
