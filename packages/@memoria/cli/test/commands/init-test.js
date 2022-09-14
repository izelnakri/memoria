import fs from "fs/promises";
import { module, test } from "qunitx";
import util from "util";
import child_process from "child_process";

const CWD = process.cwd();
const shell = util.promisify(child_process.exec);
const PKG_PATH = `${CWD}/packages/@memserver/cli`;
const CLI_JS = `${PKG_PATH}/src/cli.js`;

module("@memserver/cli | $ memserver init", function (hooks) {
  hooks.beforeEach(async function () {
    await fs.rm(`${CWD}/memserver`, { force: true, recursive: true });
  });

  test("$ memserver init | sets up the initial folder structure", async function (assert) {
    assert.expect(7);

    assert.ok(!(await pathExists(`${CWD}/memserver`)));

    const expectedOutput =
      "[Memserver CLI] /memserver/index.ts created\n" +
      "[Memserver CLI] /memserver/routes.ts created\n" +
      "[Memserver CLI] /memserver/initializer.ts created\n" +
      "[Memserver CLI] /memserver/fixtures folder created\n" +
      "[Memserver CLI] /memserver/models folder created\n";

    const { stdout } = await shell(`node ${CLI_JS} init`);

    assert.equal(stdout, expectedOutput);

    const [indexBuffer, routesBuffer, initializerBuffer, fixturesFolderExistence, modelsFolderExists] =
      await Promise.all([
        fs.readFile(`${CWD}/memserver/index.ts`),
        fs.readFile(`${CWD}/memserver/routes.ts`),
        fs.readFile(`${CWD}/memserver/initializer.ts`),
        pathExists(`${CWD}/memserver/fixtures`),
        pathExists(`${CWD}/memserver/models`),
      ]);

    const [targetIndexFileBuffer, targetRoutesFileBuffer, targetInitializerBuffer] = await Promise.all([
      fs.readFile(`${PKG_PATH}/memserver-boilerplate/index.ts`),
      fs.readFile(`${PKG_PATH}/memserver-boilerplate/routes.ts`),
      fs.readFile(`${PKG_PATH}/memserver-boilerplate/initializer.ts`),
    ]);

    assert.equal(indexBuffer.toString(), targetIndexFileBuffer.toString());
    assert.equal(routesBuffer.toString(), targetRoutesFileBuffer.toString());
    assert.equal(initializerBuffer.toString(), targetInitializerBuffer.toString());
    assert.ok(fixturesFolderExistence);
    assert.ok(modelsFolderExists);
  });

  test("$ memserver new | sets up the initial folder structure", async function (assert) {
    assert.expect(7);

    assert.ok(!(await pathExists(`${CWD}/memserver`)));

    const expectedOutput =
      "[Memserver CLI] /memserver/index.ts created\n" +
      "[Memserver CLI] /memserver/routes.ts created\n" +
      "[Memserver CLI] /memserver/initializer.ts created\n" +
      "[Memserver CLI] /memserver/fixtures folder created\n" +
      "[Memserver CLI] /memserver/models folder created\n";

    const { stdout } = await shell(`node ${CLI_JS} new`);

    assert.equal(stdout, expectedOutput);

    const [indexBuffer, routesBuffer, initializerBuffer, fixturesFolderExistence, modelsFolderExists] =
      await Promise.all([
        fs.readFile(`${CWD}/memserver/index.ts`),
        fs.readFile(`${CWD}/memserver/routes.ts`),
        fs.readFile(`${CWD}/memserver/initializer.ts`),
        pathExists(`${CWD}/memserver/fixtures`),
        pathExists(`${CWD}/memserver/models`),
      ]);

    const [targetIndexFileBuffer, targetRoutesFileBuffer, targetInitializerBuffer] = await Promise.all([
      fs.readFile(`${PKG_PATH}/memserver-boilerplate/index.ts`),
      fs.readFile(`${PKG_PATH}/memserver-boilerplate/routes.ts`),
      fs.readFile(`${PKG_PATH}/memserver-boilerplate/initializer.ts`),
    ]);

    assert.equal(indexBuffer.toString(), targetIndexFileBuffer.toString());
    assert.equal(routesBuffer.toString(), targetRoutesFileBuffer.toString());
    assert.equal(initializerBuffer.toString(), targetInitializerBuffer.toString());
    assert.ok(fixturesFolderExistence);
    assert.ok(modelsFolderExists);
  });
});

async function pathExists(path) {
  try {
    await fs.access(path);

    return true;
  } catch {
    return false;
  }
}
