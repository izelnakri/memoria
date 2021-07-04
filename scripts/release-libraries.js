import "./build-libraries.js";
import fs from 'fs/promises';
import { promisify } from 'util';
import { exec } from 'child_process';

const shell = promisify(exec);
const version = process.argv[2];

if (!version) {
  console.error('No version provided for upgrade!');
  process.exit(1);
}

const TARGET_LIBRARIES = [
  '@memoria/adapters',
  '@memoria/model',
  // '@memoria/response',
  // '@memoria/server',
  // '@memoria/cli',
]
let PROJECT_JSON = JSON.parse((await fs.readFile(`package.json`)).toString());

await Promise.all(TARGET_LIBRARIES.map((libraryName) => bumpVersion(libraryName, version, PROJECT_JSON.dependencies)));

console.log(`Bumped these packages to v${version}`, TARGET_LIBRARIES);

await Promise.all(TARGET_LIBRARIES.map((libraryName) => shell(`npm publish --workspace=${libraryName} --access public`)));

TARGET_LIBRARIES.forEach((libraryName) => {
  console.log(`Released v${version} of ${libraryName} on npm!`);
});

async function bumpVersion(libraryName, version, projectJSONDependencies) {
  let packageJSON = await fs.readFile(`packages/${libraryName}/package.json`);

  let oldJSON = JSON.parse(packageJSON.toString());

  oldJSON.version = version;

  let oldDependencies = oldJSON.dependencies || {};
  let projectJSONDependencyKeys = Object.keys(projectJSONDependencies);

  oldJSON.dependencies = Object.keys(oldDependencies).reduce((result, dependency) => {
    if (TARGET_LIBRARIES.includes(dependency)) {
      return { ...result, [dependency]: version };
    } else if (projectJSONDependencyKeys.includes(dependency)) {
      return { ...result, [dependency]: projectJSONDependencies[dependency] };
    }

    return { ...result, [dependency]: oldJSON.dependencies[dependency] };
  }, oldDependencies);

  await fs.writeFile(`packages/${libraryName}/package.json`, JSON.stringify(oldJSON, null, 2));
}

PROJECT_JSON.version = version;

await fs.writeFile('package.json', JSON.stringify(PROJECT_JSON, null, 2));

console.log(`Released memserver v${version} successfully`);
