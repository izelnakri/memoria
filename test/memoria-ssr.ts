declare global {
  interface Window {
    $?: any;
  }

  namespace NodeJS {
    interface Global {
      window?: any;
      document?: any;
      self: any;
      fastboot?: any;
      $?: any;
    }
  }
}

import test from "ava";
import express from "express";
import fs from "fs/promises";
import FastBootExpressMiddleware from "./test-helpers/fastboot-dist/mber-fastboot-express-middleware";
import http from "http";

const CWD = process.cwd();
const modelFileContent = (fileName) => `import Model from '${CWD}/dist/model';
export default class ${fileName} extends Model{
}`;

test.beforeEach(async () => {
  await fs.mkdir(`${CWD}/memoria`, { recursive: true });
  await Promise.all([fs.mkdir(`${CWD}/memoria/models`), fs.mkdir(`${CWD}/memoria/fixtures`)]);
  await Promise.all([
    fs.writeFile(`${CWD}/memoria/models/photo.ts`, modelFileContent("Photo")),
    fs.writeFile(`${CWD}/memoria/models/user.ts`, modelFileContent("User")),
    fs.writeFile(`${CWD}/memoria/models/photo-comment.ts`, modelFileContent("PhotoComment")),
    fs.writeFile(`${CWD}/memoria/routes.ts`, "export default function() {}"),
    fs.writeFile(
      `${CWD}/memoria/fixtures/photos.ts`,
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
      `${CWD}/memoria/fixtures/photo-comments.ts`,
      `export default [
      {
        uuid: '499ec646-493f-4eea-b92e-e383d94182f4',
        content: 'What a nice photo!',
        photo_id: 1,
        user_id: 1
      },
      {
        uuid: '77653ad3-47e4-4ec2-b49f-57ea36a627e7',
        content: 'Second photo',
        photo_id: 1,
        user_id: 2
      },
      {
        uuid: 'd351963d-e725-4092-a37c-1ca1823b57d3',
        content: 'Third photo',
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
  ]);

  Object.keys(require.cache).forEach((key) => delete require.cache[key]);
});

test.afterEach.always(async () => {
  // NOTE: maybe remove require cache if needed
  Object.keys(require.cache).forEach((key) => delete require.cache[key]);

  await fs.rm(`${CWD}/memoria`, { recursive: true, recursive: true });
});

test.serial(
  "memoria with JSDOM could be used with ember fastboot for server side rendering",
  async (t) => {
    const FASTBOOT_DIST_PATH = `${CWD}/src/test/test-helpers/fastboot-dist`;
    const jsdom = (await import("jsdom")).default;
    const FastBoot = (await import("fastboot")).default;
    const dom = new jsdom.JSDOM("<p>Hello</p>", { url: "http://localhost:3000" });

    global.window = dom.window;
    global.document = dom.window.document;
    global.self = dom.window.self;

    const Photo = (await import(`${CWD}/memoria/models/photo.ts`)).default;
    const PhotoComment = (await import(`${CWD}/memoria/models/photo-comment.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memoria/fixtures/photos.ts`)).default;
    const PhotoCommentFixtures = (await import(`${CWD}/memoria/fixtures/photo-comments.ts`))
      .default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));
    PhotoCommentFixtures.forEach((photoComment) => PhotoComment.insert(photoComment));

    await (await import(`${CWD}/dist/setup-dom`)).default();

    const memoria = (await import(`${CWD}/dist/server`)).default;
    const Server = new memoria({
      routes: (await import(`${CWD}/memoria/routes`)).default,
    });

    window.$ = await import("jquery");

    global.fastboot = new FastBoot({
      distPath: FASTBOOT_DIST_PATH,
      resilient: true,
      shouldRender: true,
      buildSandboxGlobals: (defaultGlobals) => {
        return Object.assign(defaultGlobals, {
          global: global,
          self: global.self,
          window: global.window,
          document: global.document,
          location: global.window.location,
          XMLHttpRequest: global.window.XMLHttpRequest,
          $: window.$,
          jQuery: window.$,
          navigator: global.window.navigator,
        });
      },
    });

    const server = express();

    server.use("/assets", express.static(`${FASTBOOT_DIST_PATH}/assets`));
    server.use(express.static(FASTBOOT_DIST_PATH));
    server.use((req, res, next) => {
      const fastbootByPassQueryParam = req.query.fastboot && req.query.fastboot === "false";

      if (fastbootByPassQueryParam) {
        return res.sendFile(`${FASTBOOT_DIST_PATH}/index.html`);
      }

      const middleware = FastBootExpressMiddleware({
        distPath: FASTBOOT_DIST_PATH,
        fastboot: global.fastboot,
        resilient: true,
        shouldRender: true,
      });

      return middleware(req, res, next);
    });

    server.listen(5000, () => console.log("server listening on port 5000"));

    const response = await makeHTTPRequest("http://localhost:5000");

    console.log("response is", response);

    // TODO: assert against the response

    t.true(true);

    // TODO: BOOT UP puppeteer and check without ?fastboot=false the content

    // server.close();
  }
);

function makeHTTPRequest(url) {
  return new Promise((resolve, reject) => {
    return http
      .get(url, (res) => {
        const { statusCode } = res;

        if (statusCode !== 200) {
          console.log("statusCode is", statusCode);
          console.log("response is");
          console.log(res);
          throw new Error(`Request Failed.\nStatus Code: ${statusCode}`);
        }

        res.setEncoding("utf8");
        let rawData = "";
        res.on("data", (chunk) => {
          rawData += chunk;
        });
        res.on("end", () => resolve(rawData));
      })
      .on("error", (error) => reject(`http error: ${error.message}`));
  });
}

// NOTE: mber tests wait 1s from JSDOM, but not needed here
