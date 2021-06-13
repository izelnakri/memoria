import fs from 'fs/promises';
import { module, test } from "qunitx";
import util from "util";
import child_process from "child_process";

const CWD = process.cwd();
const PKG_PATH = `${CWD}/packages/@memserver/cli`;
const CLI_JS = `${PKG_PATH}/src/cli.js`;

const shell = util.promisify(child_process.exec);

module("@memserver/cli | help and version commands ", function (hooks) {
  test("$ memserver | and $ memserver helper | and $ memserver h | without arguments shows help screen", async function(assert) {
    let jsonDataBuffer = await fs.readFile(`${PKG_PATH}/package.json`);
    let version = JSON.parse(jsonDataBuffer.toString()).version;
    let expectedOutput = `[Memserver CLI v${version}] Usage: memserver <command (Default: help)>

memserver init | new                    # Sets up the initial memserver folder structure
memserver generate model [ModelName]    # Generates the initial files for a MemServer Model [alias: "memserver g model"]
memserver generate fixtures             # Outputs your initial MemServer state as pure javascript fixture files
memserver generate fixtures [ModelName] # Outputs your initial MemServer state for certain model as pure javascript fixture
`;

    let result = await shell(`node ${CLI_JS}`);

    assert.ok(result.stdout.includes(expectedOutput));

    result = await shell(`node ${CLI_JS} help`);

    assert.ok(result.stdout.includes(expectedOutput));

    result = await shell(`node ${CLI_JS} h`);

    assert.ok(result.stdout.includes(expectedOutput));
  });

  test("$ memserver version | and $ memserver v", async function (assert) {
    let result = await shell(`node ${CLI_JS} v`);
    let jsonDataBuffer = await fs.readFile(`${PKG_PATH}/package.json`);
    let version = JSON.parse(jsonDataBuffer.toString()).version;

    assert.equal(result.stdout, `[Memserver CLI] ${version}\n`);

    result = await shell(`node ${CLI_JS} version`);

    assert.equal(result.stdout, `[Memserver CLI] ${version}\n`);
  });
});

