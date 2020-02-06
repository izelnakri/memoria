const fs = require("fs-extra");
const util = require("util");
const CWD = process.cwd();
const child_process = require("child_process");
const shell = util.promisify(child_process.exec);

async function main() {
  const emberSourcePackages = [
    "@ember/string",
    "@ember/error",
    "@ember/-internals",
    "@ember/deprecated-features",
    "@ember/debug",
    "@ember/polyfills"
  ];
  const basePackages = emberSourcePackages.concat(["ember-inflector"]);

  await Promise.all(
    basePackages.map(async (packageName) => {
      if (await fs.exists(`${CWD}/${packageName}`)) {
        await fs.remove(`${CWD}/${packageName}`);
      }
    })
  );

  await Promise.all(
    emberSourcePackages
      .map((packageName) => {
        return shell(
          `node_modules/.bin/babel -x .js node_modules/ember-source/dist/packages/${packageName} -d ./${packageName} --config-file="./.babelrc"`
        );
      })
      .concat([
        shell(
          `node_modules/.bin/babel -x .js vendor/ember-inflector -d ./ember-inflector --config-file="./.babelrc"`
        )
      ])
  );

  await Promise.all(
    basePackages.map(async (packageName) => await writePackageJSONForLinking(packageName))
  );

  const currentPackageJSON = JSON.parse(await fs.readFile(`${CWD}/package.json`));
  const targetLinkPackages = basePackages.reduce((result, packageName) => {
    return Object.assign({}, result, {
      [packageName]: `file:${packageName}`
    });
  }, currentPackageJSON.devDependencies);

  await fs.writeFile(
    `${CWD}/package.json`,
    JSON.stringify(
      Object.assign(currentPackageJSON, { devDependencies: targetLinkPackages }),
      null,
      2
    )
  );
  console.log("package.json written:");
  console.log(
    JSON.stringify(
      Object.assign(currentPackageJSON, { devDependencies: targetLinkPackages }),
      null,
      2
    )
  );

  await shell(`npm link`);
}

main().then(() => console.log("npm-link-ember-source done"));

async function writePackageJSONForLinking(packageName) {
  await fs.writeFile(
    `${CWD}/${packageName}/package.json`,
    JSON.stringify(
      {
        name: packageName,
        version: "0.0.1",
        main: "./index.js"
      },
      null,
      2
    )
  );
}
