declare global {
  interface Window {
    $?: any;
  }
}

import test from "ava";
import fs from "fs-extra";

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
    fs.mkdir(`${CWD}/memserver/fixtures`)
  ]);
  await fs.writeFile(
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
  );
});

test.beforeEach(() => {
  Object.keys(require.cache).forEach((key) => delete require.cache[key]);
});

test.after.always(async () => {
  if (await fs.pathExists(`${CWD}/memserver`)) {
    await fs.remove(`${CWD}/memserver`);
  }
});

test.serial("POST /resources work with shortcut", async (t) => {
  t.plan(5);

  await writeServerFileWithNoHandlers();

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));

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
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({ photo: { name: "Izel Nakri" } })
  }).then((data, textStatus, jqXHR) => {
    t.is(jqXHR.status, 201);
    t.deepEqual(data, { photo: Photo.serializer(Photo.find(4)) });
    t.is(Photo.count(), 4);
    t.deepEqual(Photo.find(4), {
      id: 4,
      name: "Izel Nakri",
      is_public: true,
      href: undefined,
      user_id: undefined
    });
  });
});

test.serial("GET /resources works with shortcut", async (t) => {
  t.plan(4);

  await writeServerFileWithNoHandlers();

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));

  await (await import(`${CWD}/dist/setup-dom`)).default();

  const MemServer = (await import(`${CWD}/dist/server`)).default;

  const Server = new MemServer({
    routes: (await import(`${CWD}/memserver/routes`)).default
  });

  window.$ = await import("jquery");

  t.is(Photo.count(), 3);

  await window.$.ajax({
    type: "GET",
    url: "/photos",
    headers: { "Content-Type": "application/json" }
  }).then((data, textStatus, jqXHR) => {
    t.is(jqXHR.status, 200);
    t.deepEqual(data, { photos: Photo.serializer(Photo.findAll()) });
    t.is(Photo.count(), 3);
  });
});

test.serial("GET /resources/:id works with shortcut", async (t) => {
  t.plan(2);

  await writeServerFileWithNoHandlers();

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));

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
  }).then((data, textStatus, jqXHR) => {
    t.is(jqXHR.status, 200);
    t.deepEqual(data, { photo: Photo.serializer(Photo.find(1)) });
  });
});

test.serial("PUT /resources/:id works with shortcut", async (t) => {
  t.plan(4);

  await writeServerFileWithNoHandlers();

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));

  await (await import(`${CWD}/dist/setup-dom`)).default();

  const MemServer = (await import(`${CWD}/dist/server`)).default;

  const Server = new MemServer({
    routes: (await import(`${CWD}/memserver/routes`)).default
  });

  window.$ = await import("jquery");

  t.is(Photo.find(1).name, "Ski trip");

  await window.$.ajax({
    type: "PUT",
    url: "/photos/1",
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({ photo: { id: 1, name: "New custom title" } })
  }).then((data, textStatus, jqXHR) => {
    const photo = Photo.find(1);

    t.is(jqXHR.status, 200);
    t.deepEqual(data, { photo: Photo.serializer(photo) });
    t.is(photo.name, "New custom title");
  });
});

test.serial("DELETE /resources/:id works with shortcut", async (t) => {
  t.plan(5);

  await writeServerFileWithNoHandlers();

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));

  await (await import(`${CWD}/dist/setup-dom`)).default();

  const MemServer = (await import(`${CWD}/dist/server`)).default;

  const Server = new MemServer({
    routes: (await import(`${CWD}/memserver/routes`)).default
  });

  window.$ = await import("jquery");

  t.is(Photo.count(), 3);

  await window.$.ajax({
    type: "DELETE",
    url: "/photos/1",
    headers: { "Content-Type": "application/json" }
  }).then((data, textStatus, jqXHR) => {
    t.is(jqXHR.status, 204);
    t.deepEqual(data, undefined);
    t.is(Photo.count(), 2);
    t.is(Photo.find(1), undefined);
  });
});

test.serial("throws an helpful error message when shortcuts model is not found", async (t) => {
  t.plan(2);

  await fs.writeFile(
    `${CWD}/memserver/routes.ts`,
    `
    export default function(Models) {
      this.post('/photos');
      this.get('/photos');
      this.get('/photos/:id');
      this.put('/photos/:id');
      this.delete('/photos/:id');

      this.get('/houses');
    }
  `
  );

  Object.keys(require.cache).forEach((key) => delete require.cache[key]);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));

  await (await import(`${CWD}/dist/setup-dom`)).default();

  const MemServer = (await import(`${CWD}/dist/server`)).default;
  const routes = (await import(`${CWD}/memserver/routes`)).default;

  window.$ = await import("jquery");

  const error = t.throws(() => new MemServer({ routes }), { instanceOf: Error });

  t.true(
    /\[Memserver\] GET \/houses route handler cannot be generated automatically: House is not on your window.House, also please check that your route name matches the model reference or create a custom handler function/.test(
      error.message
    )
  );
});

test.serial("GET /houses could use Photo model for its default route generation", async (t) => {
  t.plan(4);

  await fs.writeFile(
    `${CWD}/memserver/routes.ts`,
    `
    import Photo from './models/photo';

    export default function(Models) {
      this.post('/photos');
      this.get('/photos');
      this.get('/photos/:id');
      this.put('/photos/:id');
      this.delete('/photos/:id');

      this.get('/houses', Photo);
    }
  `
  );

  Object.keys(require.cache).forEach((key) => delete require.cache[key]);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));

  await (await import(`${CWD}/dist/setup-dom`)).default();

  const MemServer = (await import(`${CWD}/dist/server`)).default;
  const routes = (await import(`${CWD}/memserver/routes`)).default;

  new MemServer({
    routes: (await import(`${CWD}/memserver/routes`)).default
  });

  window.$ = await import("jquery");

  t.is(Photo.count(), 3);

  await window.$.ajax({
    type: "GET",
    url: "/photos",
    headers: { "Content-Type": "application/json" }
  }).then((data, textStatus, jqXHR) => {
    t.is(jqXHR.status, 200);
    t.deepEqual(data, { photos: Photo.serializer(Photo.findAll()) });
    t.is(Photo.count(), 3);
  });
});

test.serial("POST /resources works correctly with undefined handler response", async (t) => {
  t.plan(4);

  await writeServerFileWithEmptyHandlers();

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));

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
    t.is(jqXHR.status, 500);
    t.deepEqual(jqXHR.responseJSON, {
      error:
        "[Memserver] POST /photos route handler did not return anything to respond to the request!"
    });
    t.is(Photo.count(), 3);
  });
});

test.serial("GET /resources works correctly with undefined handler response", async (t) => {
  t.plan(2);

  await writeServerFileWithEmptyHandlers();

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
    t.is(jqXHR.status, 500);
    t.deepEqual(jqXHR.responseJSON, {
      error:
        "[Memserver] GET /photos route handler did not return anything to respond to the request!"
    });
  });
});

test.serial("GET /resources/:id works correctly with undefined handler response", async (t) => {
  t.plan(2);

  await writeServerFileWithEmptyHandlers();

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
    t.is(jqXHR.status, 500);
    t.deepEqual(jqXHR.responseJSON, {
      error:
        "[Memserver] GET /photos/1 route handler did not return anything to respond to the request!"
    });
  });
});

test.serial("PUT /resources/:id works correctly with undefined handler response", async (t) => {
  t.plan(2);

  await writeServerFileWithEmptyHandlers();

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
    data: JSON.stringify({ photo: { id: 1, name: "New Name" } })
  }).catch((jqXHR) => {
    t.is(jqXHR.status, 500);
    t.deepEqual(jqXHR.responseJSON, {
      error:
        "[Memserver] PUT /photos/1 route handler did not return anything to respond to the request!"
    });
  });
});

test.serial("DELETE /resources/:id works correctly with undefined handler response", async (t) => {
  t.plan(2);

  await writeServerFileWithEmptyHandlers();

  await (await import(`${CWD}/dist/setup-dom`)).default();

  const MemServer = (await import(`${CWD}/dist/server`)).default;
  const Server = new MemServer({
    routes: (await import(`${CWD}/memserver/routes`)).default
  });

  window.$ = await import("jquery");

  await window.$.ajax({
    type: "DELETE",
    url: "/photos/1",
    headers: { "Content-Type": "application/json" }
  }).then((data, textStatus, jqXHR) => {
    t.is(jqXHR.status, 204);
    t.deepEqual(jqXHR.responseJSON, {});
  });
});

async function writeServerFileWithNoHandlers() {
  await fs.writeFile(
    `${CWD}/memserver/routes.ts`,
    `
    export default function() {
      this.post('/photos');
      this.get('/photos');
      this.get('/photos/:id');
      this.put('/photos/:id');
      this.delete('/photos/:id');
    }
  `
  );
}

async function writeServerFileWithEmptyHandlers() {
  await fs.writeFile(
    `${CWD}/memserver/routes.ts`,
    `
    export default function() {
      this.post('/photos', () => {});
      this.get('/photos', () => {});
      this.get('/photos/:id', () => {});
      this.put('/photos/:id', () => {});
      this.delete('/photos/:id', () => {});
    }
  `
  );
}
