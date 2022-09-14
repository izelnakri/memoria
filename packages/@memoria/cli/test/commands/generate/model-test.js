import fs from "fs/promises";
import { module, test } from "qunitx";
import util from "util";
import child_process from "child_process";

const CWD = process.cwd();
const PKG_PATH = `${CWD}/packages/@memserver/cli`;
const CLI_JS = `${PKG_PATH}/src/cli.js`;

const shell = util.promisify(child_process.exec);

module("@memserver/cli | g model command", function (hooks) {
  hooks.beforeEach(async function () {
    await fs.rm(`${CWD}/memserver`, { force: true, recursive: true });
  });

  test("$ memserver g | and $ memserver generate | without memserver directory raises", async function (assert) {
    assert.expect(2);

    const { stdout } = await shell(`node ${CLI_JS} generate`);

    assert.equal(stdout, "[Memserver CLI] cannot find /memserver folder. Did you run $ memserver init ?\n");

    let result = await shell(`node ${CLI_JS} g`);

    assert.equal(result.stdout, "[Memserver CLI] cannot find /memserver folder. Did you run $ memserver init ?\n");
  });

  test("$ memserver g model | and $ memserver generate model | without memserver directory raises", async function (assert) {
    assert.expect(2);

    const { stdout } = await shell(`node ${CLI_JS} generate model`);

    assert.equal(stdout, "[Memserver CLI] cannot find /memserver folder. Did you run $ memserver init ?\n");

    let result = await shell(`node ${CLI_JS} g model`);

    assert.equal(result.stdout, "[Memserver CLI] cannot find /memserver folder. Did you run $ memserver init ?\n");
  });

  test("$ memserver g model | and $ memserver generate model | without model raises", async function (assert) {
    assert.expect(1);

    await initializeMemServer();
    const { stdout } = await shell(`node ${CLI_JS} generate model`);

    assert.equal(
      stdout,
      "[Memserver CLI] Please put a modelName to the memserver generate. Example: $ memserver generate model user\n"
    );
  });

  const EXPECTED_OUTPUT =
    "[Memserver CLI] /memserver/models/email.ts created\n" + "[Memserver CLI] /memserver/fixtures/emails.ts created\n";

  test("$ memserver g [modelName] | works", async function (assert) {
    assert.expect(5);

    await initializeMemServer();

    const [emailModelExists, emailFixturesBuffer] = await Promise.all([
      pathExists(`${CWD}/memserver/models/email.ts`),
      pathExists(`${CWD}/memserver/fixtures/emails.ts`),
    ]);

    assert.ok(!emailModelExists);
    assert.ok(!emailFixturesBuffer);

    const { stdout } = await shell(`node ${CLI_JS} g model email`);

    assert.equal(stdout, EXPECTED_OUTPUT);

    const [emailModelBuffer, userFixturesBuffer] = await Promise.all([
      fs.readFile(`${CWD}/memserver/models/email.ts`),
      fs.readFile(`${CWD}/memserver/fixtures/emails.ts`),
    ]);

    assert.equal(
      emailModelBuffer.toString().trim(),
      `import Model from '@memserver/model';

export default class Email extends Model {
  constructor() {
    super();
  }
}`
    );
    assert.equal(userFixturesBuffer.toString(), "export default [\n];");
  });

  test("$ memserver generate [modelName] | works", async function (assert) {
    assert.expect(5);

    await initializeMemServer();
    const [emailModelExists, emailFixturesBuffer] = await Promise.all([
      pathExists(`${CWD}/memserver/models/user.ts`),
      pathExists(`${CWD}/memserver/fixtures/users.ts`),
    ]);

    assert.ok(!emailModelExists);
    assert.ok(!emailFixturesBuffer);

    const { stdout } = await shell(`node ${CLI_JS} generate model email`);

    assert.equal(stdout, EXPECTED_OUTPUT);

    const [emailModelBuffer, userFixturesBuffer] = await Promise.all([
      fs.readFile(`${CWD}/memserver/models/email.ts`),
      fs.readFile(`${CWD}/memserver/fixtures/emails.ts`),
    ]);

    assert.equal(
      emailModelBuffer.toString().trim(),
      `import Model from '@memserver/model';

export default class Email extends Model {
  constructor() {
    super();
  }
}`
    );
    assert.equal(userFixturesBuffer.toString(), "export default [\n];");
  });
});

function initializeMemServer() {
  return new Promise(async (resolve) => {
    await fs.rm(`${CWD}/memserver`, { recursive: true, force: true });

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
      fs.mkdir(`${memServerDirectory}/models`),
    ]);

    resolve(null);
  });
}

async function pathExists(path) {
  try {
    await fs.access(path);

    return true;
  } catch {
    return false;
  }
}
