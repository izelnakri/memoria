import test from "ava";
import fs from "fs-extra";
import child_process from "child_process";

const CWD = process.cwd();
const shell = child_process.exec;

test.afterEach.always(async () => {
  if (await fs.pathExists(`${CWD}/memserver`)) {
    await fs.remove(`${CWD}/memserver`);
  }
});

test.serial.cb(
  "$ memserver | and $ memserver helper | and $ memserver h | without arguments shows help screen",
  async t => {
    t.plan(3);

    const version = JSON.parse(
      (await fs.readFile("../../package.json")).toString()
    ).version;
    const expectedOutput = `[MemServer CLI v${version}] Usage: memserver <command (Default: help)>

memserver init | new                    # Sets up the initial memserver folder structure
memserver generate model [ModelName]    # Generates the initial files for a MemServer Model [alias: "memserver g model"]
memserver generate fixtures             # Outputs your initial MemServer state as pure javascript fixture files
memserver generate fixtures [ModelName] # Outputs your initial MemServer state for certain model as pure javascript fixture
memserver console                       # Starts a MemServer console in node.js [alias: "memserver c"]
memserver serve | server [outputFile]   # Builds an ES5 javascript bundle with all your memserver code continuosly on watch [alias: "memserver s"]
memserver build | rollup [outputFile]   # Builds an ES5 javascript bundle with all your memserver code
memserver version | v                   # Displays memserver version

`;

    shell(`node ${CWD}/cli.js`, (error, stdout) => {
      t.true(stdout.includes(expectedOutput));

      shell(`node ${CWD}/cli.js help`, (error, stdout) => {
        t.true(stdout.includes(expectedOutput));

        shell(`node ${CWD}/cli.js help`, (error, stdout) => {
          t.true(stdout.includes(expectedOutput));

          t.end();
        });
      });
    });
  }
);

// test.serial.cb('$ memserver init | sets up the initial folder structure', (t) => {
//   t.plan(6);

//   t.true(!fs.existsSync(`${CWD}/memserver`));

//   const expectedOutput = '[MemServer CLI] /memserver/server.js created\n' +
//     '[MemServer CLI] /memserver/initializer.js created\n' +
//     '[MemServer CLI] /memserver/fixtures folder created\n' +
//     '[MemServer CLI] /memserver/models folder created\n';

//   shell(`node ${process.cwd()}/cli.js init`, async (error, stdout) => {
//     t.is(stdout, expectedOutput);

//     const [
//       serverBuffer, initializerBuffer, fixturesFolderExistence, modelsFolderExists
//     ] = await Promise.all([
//       fs.readFile(`${CWD}/memserver/server.js`),
//       fs.readFile(`${CWD}/memserver/initializer.js`),
//       fs.exists(`${CWD}/memserver/fixtures`),
//       fs.exists(`${CWD}/memserver/models`)
//     ]);

//     t.is(serverBuffer.toString(), 'export default function(Models) {\n}');
//     t.is(initializerBuffer.toString(), 'export default function(Models) {\n}');
//     t.true(fixturesFolderExistence);
//     t.true(modelsFolderExists);

//     t.end();
//   });
// });

// test.serial.cb('$ memserver new | sets up the initial folder structure', (t) => {
//   t.plan(6);

//   t.true(!fs.existsSync(`${CWD}/memserver`));

//   const expectedOutput = '[MemServer CLI] /memserver/server.js created\n' +
//     '[MemServer CLI] /memserver/initializer.js created\n' +
//     '[MemServer CLI] /memserver/fixtures folder created\n' +
//     '[MemServer CLI] /memserver/models folder created\n';

//   shell(`node ${CWD}/cli.js new`, async (error, stdout) => {
//     t.is(stdout, expectedOutput);

//     const [
//       serverBuffer, initializerBuffer, fixturesFolderExistence, modelsFolderExists
//     ] = await Promise.all([
//       fs.readFile(`${CWD}/memserver/server.js`),
//       fs.readFile(`${CWD}/memserver/initializer.js`),
//       fs.exists(`${CWD}/memserver/fixtures`),
//       fs.exists(`${CWD}/memserver/models`)
//     ]);

//     t.is(serverBuffer.toString(), 'export default function(Models) {\n}');
//     t.is(initializerBuffer.toString(), 'export default function(Models) {\n}');
//     t.true(fixturesFolderExistence);
//     t.true(modelsFolderExists);

//     t.end();
//   });
// });

// test.serial.cb('$ memserver version | and $ memserver v', (t) => {
//   t.plan(2);

//   shell(`node ${CWD}/cli.js v`, (error, stdout) => {
//     t.is(stdout, `[MemServer CLI] ${require(CWD + '/package.json').version}\n`);

//     shell(`node ${CWD}/cli.js version`, (error, stdout) => {
//       t.is(stdout, `[MemServer CLI] ${require(CWD + '/package.json').version}\n`);

//       t.end();
//     });
//   });
// });
