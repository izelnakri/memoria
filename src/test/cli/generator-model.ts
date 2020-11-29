import util from "util";
import test from "ava";
import fs from "fs-extra";
import child_process from "child_process";

const CWD = process.cwd();
const shell = util.promisify(child_process.exec);

test.beforeEach(async () => {
  await fs.remove(`${CWD}/memserver`);
});

test.serial(
  "$ memserver g | and $ memserver generate | without memserver directory raises",
  async (t) => {
    t.plan(2);

    const { stdout } = await shell(`ts-node ${CWD}/dist/cli.js generate`);

    t.is(stdout, "[Memserver CLI] cannot find /memserver folder. Did you run $ memserver init ?\n");

    let result = await shell(`ts-node ${CWD}/dist/cli.js g`);

    t.is(
      result.stdout,
      "[Memserver CLI] cannot find /memserver folder. Did you run $ memserver init ?\n"
    );
  }
);

test.serial(
  "$ memserver g model | and $ memserver generate model | without memserver directory raises",
  async (t) => {
    t.plan(2);

    const { stdout } = await shell(`ts-node ${CWD}/dist/cli.js generate model`);

    t.is(stdout, "[Memserver CLI] cannot find /memserver folder. Did you run $ memserver init ?\n");

    let result = await shell(`ts-node ${CWD}/dist/cli.js g model`);

    t.is(
      result.stdout,
      "[Memserver CLI] cannot find /memserver folder. Did you run $ memserver init ?\n"
    );
  }
);

test.serial(
  "$ memserver g model | and $ memserver generate model | without model raises",
  async (t) => {
    t.plan(1);

    await initializeMemServer();
    const { stdout } = await shell(`node ${CWD}/dist/cli.js generate model`);

    t.is(
      stdout,
      "[Memserver CLI] Please put a modelName to the memserver generate. Example: $ memserver generate model user\n"
    );
  }
);

const EXPECTED_OUTPUT =
  "[Memserver CLI] /memserver/models/email.ts created\n" +
  "[Memserver CLI] /memserver/fixtures/emails.ts created\n";

test.serial("$ memserver g [modelName] | works", async (t) => {
  t.plan(5);

  await initializeMemServer();

  const [emailModelExists, emailFixturesBuffer] = await Promise.all([
    fs.pathExists(`${CWD}/memserver/models/email.ts`),
    fs.pathExists(`${CWD}/memserver/fixtures/emails.ts`)
  ]);

  t.true(!emailModelExists);
  t.true(!emailFixturesBuffer);

  const { stdout } = await shell(`node ${CWD}/dist/cli.js g model email`);

  t.is(stdout, EXPECTED_OUTPUT);

  const [emailModelBuffer, userFixturesBuffer] = await Promise.all([
    fs.readFile(`${CWD}/memserver/models/email.ts`),
    fs.readFile(`${CWD}/memserver/fixtures/emails.ts`)
  ]);

  t.is(
    emailModelBuffer.toString(),
    `import Model from 'memserver/model';

export default class Email extends Model {
  constructor() {
    super();
  }
}`
  );
  t.is(userFixturesBuffer.toString(), "export default [\n];");
});

test.serial("$ memserver generate [modelName] | works", async (t) => {
  t.plan(5);

  await initializeMemServer();
  const [emailModelExists, emailFixturesBuffer] = await Promise.all([
    fs.pathExists(`${CWD}/memserver/models/user.ts`),
    fs.pathExists(`${CWD}/memserver/fixtures/users.ts`)
  ]);

  t.true(!emailModelExists);
  t.true(!emailFixturesBuffer);

  const { stdout } = await shell(`node ${process.cwd()}/dist/cli.js generate model email`);

  t.is(stdout, EXPECTED_OUTPUT);

  const [emailModelBuffer, userFixturesBuffer] = await Promise.all([
    fs.readFile(`${CWD}/memserver/models/email.ts`),
    fs.readFile(`${CWD}/memserver/fixtures/emails.ts`)
  ]);

  t.is(
    emailModelBuffer.toString(),
    `import Model from 'memserver/model';

export default class Email extends Model {
  constructor() {
    super();
  }
}`
  );
  t.is(userFixturesBuffer.toString(), "export default [\n];");
});

function initializeMemServer() {
  return new Promise(async (resolve) => {
    if (await fs.pathExists(`${CWD}/memserver`)) {
      await fs.remove(`${CWD}/memserver`);
    }

    const memServerDirectory = `${CWD}/memserver`;

    await fs.mkdir(memServerDirectory);
    await Promise.all([
      fs.writeFile(
        `${memServerDirectory}/server.js`,
        `export default function(Models) {
    }`
      ),
      fs.writeFile(
        `${memServerDirectory}/initializer.js`,
        `export default function(Models) {
      }`
      ),
      fs.mkdir(`${memServerDirectory}/fixtures`),
      fs.mkdir(`${memServerDirectory}/models`)
    ]);

    resolve(null);
  });
}
