const fs = require("fs-extra");
const util = require("util");
const CWD = process.cwd();
const child_process = require("child_process");
const shell = util.promisify(child_process.exec);

async function main() {
  await Promise.all([
    fs.remove(`${CWD}/index.js`),
    fs.remove(`${CWD}/index.d.ts`),
    fs.remove(`${CWD}/model.js`),
    fs.remove(`${CWD}/model.d.ts`),
    fs.remove(`${CWD}/response.js`),
    fs.remove(`${CWD}/response.d.ts`),
    fs.remove(`${CWD}/server.js`),
    fs.remove(`${CWD}/server.d.ts`),
    fs.remove(`${CWD}/setup-dom.js`),
    fs.remove(`${CWD}/setup-dom.d.ts`)
  ]);

  await Promise.all([
    fs.copy(`${CWD}/dist/index.js`, `${CWD}/index.js`),
    fs.copy(`${CWD}/dist/index.d.ts`, `${CWD}/index.d.ts`),
    shell("rollup -c -i dist/model.js > model.js"),
    fs.copy(`${CWD}/dist/model.d.ts`, `${CWD}/model.d.ts`),
    shell("rollup -c -i dist/response.js > response.js"),
    fs.copy(`${CWD}/dist/response.d.ts`, `${CWD}/response.d.ts`),
    shell("rollup -c -i dist/server.js > server.js"),
    fs.copy(`${CWD}/dist/server.d.ts`, `${CWD}/server.d.ts`),
    fs.copy(`${CWD}/dist/setup-dom.js`, `${CWD}/setup-dom.js`),
    fs.copy(`${CWD}/dist/setup-dom.d.ts`, `${CWD}/setup-dom.d.ts`)
  ]);
}

main().then(() => console.log("done"));
