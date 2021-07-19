import fs from 'fs/promises';

const TARGET_LIBRARIES = [
  '@memoria/adapters',
  '@memoria/model',
  // '@memoria/response',
  // '@memoria/server',
  // '@memoria/cli',
]

let TARGET_ENTRYPOINT = process.argv[2] === 'js' ? 'dist/index.js' : 'src/index.ts';

console.log('LIBRARY TARGET ENTRYPOINTS("main") ARE:', TARGET_ENTRYPOINT);

await Promise.all(TARGET_LIBRARIES.map((libraryName) => changeLibEntrypoint(libraryName)));

async function changeLibEntrypoint(libraryName) {
  let packageJSON = await fs.readFile(`packages/${libraryName}/package.json`);
  let oldJSON = JSON.parse(packageJSON.toString());

  oldJSON.main = TARGET_ENTRYPOINT

  await fs.writeFile(`packages/${libraryName}/package.json`, JSON.stringify(oldJSON, null, 2));
}
