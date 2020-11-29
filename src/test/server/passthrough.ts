declare global {
  interface Window {
    $?: any;
  }
}

import test from "ava";
import cors from "cors";
import express from "express";
import fs from "fs/promises";
import sinon from "sinon";

let actualServer;

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
      `${CWD}/memserver/models/photo.ts`,
      `
    import Model from '${CWD}/dist/model';

    export default class Photo extends Model {
    }`
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

  const app = express();

  app.use(cors());

  app.get("/films", (req, res) => {
    res.json({ film: "responsed correctly" });
  });

  app.get("/movies/too-big-to-fail", (req, res) => {
    res.json({ movie: "is too-big-to-fail" });
  });

  actualServer = app.listen(4000, () => console.log("Web server started on port 4000"));
});

test.beforeEach(async () => {
  await fs.writeFile(
    `${CWD}/memserver/routes.ts`,
    `
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

      this.passthrough('/films');
      this.passthrough('http://localhost:4000/films');
      this.passthrough('http://localhost:4000/movies/*');
    }
  `
  );

  Object.keys(require.cache).forEach((key) => delete require.cache[key]);
});

test.after.always(async () => {
  await fs.rmdir(`${CWD}/memserver`, { recursive: true });

  actualServer.close();
});

test.serial(
  "[MemServer.Server] throws an error when MemServer tried to intercept an undeclared route",
  async (t) => {
    t.plan(1);

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));

    await (await import(`${CWD}/dist/setup-dom`)).default();

    const MemServer = (await import(`${CWD}/dist/server`)).default;
    const Server = new MemServer({
      routes: (await import(`${CWD}/memserver/routes`)).default
    });

    Server.unhandledRequest = sinon.spy();

    window.$ = await import("jquery");

    window.$.ajax({
      type: "GET",
      url: "/izelnakri",
      headers: { "Content-Type": "application/json" }
    });

    t.true(Server.unhandledRequest.calledOnce, "Server.unhandledRequest called once");
  }
);

test.serial("[MemServer.Server] this.passthrough(url) shortcut works", async (t) => {
  t.plan(2);

  await (await import(`${CWD}/dist/setup-dom`)).default();

  const MemServer = (await import(`${CWD}/dist/server`)).default;
  const Server = new MemServer({
    routes: (await import(`${CWD}/memserver/routes`)).default
  });

  window.$ = await import("jquery");

  await window.$.ajax({
    type: "GET",
    url: "http://localhost:4000/films",
    headers: { "Content-Type": "application/json" }
  }).then((data, textStatus, jqXHR) => {
    t.is(jqXHR.status, 200);
    t.deepEqual(jqXHR.responseJSON, { film: "responsed correctly" });
  });
});

test.serial(
  "[MemServer.Server] this.passthrough(url) shortcut works with wild cards",
  async (t) => {
    t.plan(2);

    await (await import(`${CWD}/dist/setup-dom`)).default();

    const MemServer = (await import(`${CWD}/dist/server`)).default;
    const Server = new MemServer({
      routes: (await import(`${CWD}/memserver/routes`)).default
    });

    window.$ = await import("jquery");

    await window.$.ajax({
      type: "GET",
      url: "http://localhost:4000/movies/too-big-to-fail",
      headers: { "Content-Type": "application/json" }
    }).then((data, textStatus, jqXHR) => {
      t.is(jqXHR.status, 200);
      t.deepEqual(jqXHR.responseJSON, { movie: "is too-big-to-fail" });
    });
  }
);

test.serial(
  "[MemServer.Server] can create global passthrough via this.passthrough()",
  async (t) => {
    t.plan(6);

    Object.keys(require.cache).forEach((key) => delete require.cache[key]);

    await writeGlobalPassthroughServerFile();

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));

    await (await import(`${CWD}/dist/setup-dom`)).default();

    const MemServer = (await import(`${CWD}/dist/server`)).default;
    const Server = new MemServer({
      routes: (await import(`${CWD}/memserver/routes`)).default
    });

    Server.unhandledRequest = sinon.spy();

    window.$ = await import("jquery");

    await window.$.ajax({
      type: "GET",
      url: "/photos",
      headers: { "Content-Type": "application/json" }
    }).then((data, textStatus, jqXHR) => {
      t.is(jqXHR.status, 200);
      t.deepEqual(jqXHR.responseJSON, { photos: Photo.serializer(Photo.findAll()) });
    });
    await window.$.ajax({
      type: "GET",
      url: "http://localhost:4000/films",
      headers: { "Content-Type": "application/json" }
    }).then((data, textStatus, jqXHR) => {
      t.is(jqXHR.status, 200);
      t.deepEqual(jqXHR.responseJSON, { film: "responsed correctly" });
    });
    await window.$.ajax({
      type: "GET",
      url: "http://localhost:4000/movies/too-big-to-fail",
      headers: { "Content-Type": "application/json" }
    }).then((data, textStatus, jqXHR) => {
      t.is(jqXHR.status, 200);
      t.deepEqual(jqXHR.responseJSON, { movie: "is too-big-to-fail" });
    });
  }
);

// TODO: TEST BELOW ISNT WORKING: has beforeEach!! afterwards
// TODO: test this.passthrough('/something') when there is this.namespace;

// NOTE: passthrough order? investigate

async function writeGlobalPassthroughServerFile() {
  await fs.writeFile(
    `${CWD}/memserver/server.js`,
    `
    import Response from '../lib/response';

    export default function({ Photo }) {
      this.get('/photos', () => {
        const photos = Photo.findAll();

        if (!photos || photos.length === 0) {
          return Response(404, { error: 'Not found' });
        }

        return { photos: Photo.serializer(photos) };
      });

      this.passthrough();
    }
  `
  );

  Object.keys(require.cache).forEach((key) => delete require.cache[key]);
}
