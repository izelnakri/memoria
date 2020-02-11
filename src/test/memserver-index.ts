import test from "ava";
import fs from "fs-extra";

const CWD = process.cwd();

test.afterEach.always(async () => {
  if (await fs.pathExists(`${CWD}/memserver`)) {
    await fs.remove(`${CWD}/memserver`);
  }
});

test.serial(
  "MemServer require() should throw error if /memserver folder doesnt exist",
  async (t) => {
    const startMemserver = (await import("../index")).default;
    const error = await t.throwsAsync(() => startMemserver(), {
      instanceOf: Error
    });

    t.true(/\/memserver folder doesn't exist for this directory!/.test(error.message));
  }
);

test.serial(
  "MemServer require() should throw error if /memserver/models folder doesnt exist",
  async (t) => {
    await fs.mkdir(`${CWD}/memserver`);
    const startMemserver = (await import("../index")).default;
    const error = await t.throwsAsync(() => startMemserver(), {
      instanceOf: Error
    });

    t.true(/\/memserver\/models folder doesn't exist for this directory!/.test(error.message));
  }
);

test.serial(
  "MemServer require() should throw error if /memserver/routes.ts doesnt exist",
  async (t) => {
    await fs.mkdir(`${CWD}/memserver`);
    await fs.mkdir(`${CWD}/memserver/models`);
    const startMemserver = (await import("../index")).default;
    const error = await t.throwsAsync(() => startMemserver(), {
      instanceOf: Error
    });

    t.true(/\/memserver\/routes.ts doesn't exist for this directory!/.test(error.message));
  }
);

test.serial(
  "MemServer require() should throw error if /memserver/initializer.ts doesnt exist",
  async (t) => {
    await fs.mkdir(`${CWD}/memserver`);
    await fs.mkdir(`${CWD}/memserver/models`);
    await fs.writeFile(`${CWD}/memserver/routes.ts`, "export default function() {}");
    const startMemserver = (await import("../index")).default;
    const error = await t.throwsAsync(() => startMemserver(), {
      instanceOf: Error
    });

    t.true(/\/memserver\/initializer.ts doesn't exist for this directory!/.test(error.message));
  }
);

test.serial(
  "MemServer require() exports a MemServer with right functions and empty DB when there is no model",
  async (t) => {
    t.plan(1);

    await fs.mkdir(`${CWD}/memserver`);
    await fs.mkdir(`${CWD}/memserver/models`);
    await fs.writeFile(`${CWD}/memserver/routes.ts`, "export default function() {}");
    await fs.writeFile(`${CWD}/memserver/initializer.ts`, "export default function() {}");

    const startMemserver = (await import("../index")).default;
    const Server = await startMemserver();

    t.true(!!Server.shutdown);
  }
);

test.serial(
  "MemServer require() exports a MemServer with right functions and empty DB and models",
  async (t) => {
    t.plan(52);

    const modelFileContent = (fileName) => `import Model from '${CWD}/dist/model';
    export default class ${fileName} extends Model{
    }`;

    await fs.mkdir(`${CWD}/memserver`);
    await fs.mkdir(`${CWD}/memserver/models`);
    await Promise.all([
      fs.writeFile(`${CWD}/memserver/models/photo.ts`, modelFileContent("Photo")),
      fs.writeFile(`${CWD}/memserver/models/user.ts`, modelFileContent("User")),
      fs.writeFile(`${CWD}/memserver/models/photo-comment.ts`, modelFileContent("PhotoComment")),
      fs.writeFile(`${CWD}/memserver/routes.ts`, "export default function() {}"),
      fs.writeFile(`${CWD}/memserver/initializer.ts`, "export default function() {}")
    ]);

    Object.keys(require.cache).forEach((key) => delete require.cache[key]);

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
    const User = (await import(`${CWD}/memserver/models/user.ts`)).default;

    const startMemserver = (await import("../index")).default;
    const Server = await startMemserver();

    t.deepEqual(Object.keys(Server), [
      "hosts",
      "handlers",
      "handledRequests",
      "passthroughRequests",
      "unhandledRequests",
      "requestReferences",
      "forcePassthrough",
      "disableUnhandled",
      "_nativeXMLHttpRequest",
      "running",
      "ctx",
      "_fetchProps",
      "_nativefetch",
      "_nativeHeaders",
      "_nativeRequest",
      "_nativeResponse",
      "Models",
      "handledRequest",
      "passthroughRequest",
      "unhandledRequest",
      "passthrough",
    ]);
    [Photo, PhotoComment, User].forEach((modelDefinition) => {
      t.deepEqual(modelDefinition.findAll(), []);
      [
        "name",
        "primaryKey",
        "defaultAttributes",
        "attributes",
        "count",
        "find",
        "findBy",
        "findAll",
        "insert",
        "update",
        "delete",
        "embed",
        "embedReferences",
        "serializer",
        "serialize",
        "getRelationship"
      ].forEach((method) => {
        t.true(method in modelDefinition);
      });
    });
  }
);
