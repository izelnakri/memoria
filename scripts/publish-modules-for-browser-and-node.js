const fs = require("fs-extra");
const util = require("util");
const CWD = process.cwd();
const child_process = require("child_process");
const shell = util.promisify(child_process.exec);

async function main() {
  await Promise.all([
    fs.remove(`${CWD}/index.js`),
    fs.remove(`${CWD}/model.js`),
    fs.remove(`${CWD}/response.js`),
    fs.remove(`${CWD}/server.js`),
    fs.remove(`${CWD}/setup-dom.js`)
  ]);

  await Promise.all([
    fs.copy(`${CWD}/dist/index.js`, `${CWD}/index`),
    shell("rollup -c -i dist/model.js > model.js"),
    shell("rollup -c -i dist/response.js > response.js"),
    shell("rollup -c -i dist/server.js > server.js"),
    fs.copy(`${CWD}/dist/setup-dom.js`, `${CWD}/setup-dom.js`)
  ]);
}

main().then(() => console.log("done"));
