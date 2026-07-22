import fs from 'fs/promises';

const TARGET_LIBRARIES = [
  '@memoria/adapters',
  '@memoria/model',
  // '@memoria/response',
  // '@memoria/server',
  // '@memoria/cli',
]

const TARGETING_JS = process.argv[2] === 'js';
let TARGET_ENTRYPOINT = TARGETING_JS ? 'dist/index.js' : 'src/index.ts';

console.log('LIBRARY TARGET ENTRYPOINTS("main") ARE:', TARGET_ENTRYPOINT);

await Promise.all(TARGET_LIBRARIES.map((libraryName) => changeLibEntrypoint(libraryName)));

async function changeLibEntrypoint(libraryName) {
  let packageJSON = await fs.readFile(`packages/${libraryName}/package.json`);
  let oldJSON = JSON.parse(packageJSON.toString());

  oldJSON.main = TARGET_ENTRYPOINT

  // NOTE: `exports` takes precedence over `main` in node and every modern bundler, so a package
  // that declares one has to have it re-pointed too -- otherwise flipping `main` to dist/ silently
  // keeps resolving src/. Only the declared entry points are rewritten; the "./*" passthrough that
  // keeps deep imports working is left alone.
  if (oldJSON.exports) {
    oldJSON.exports = Object.keys(oldJSON.exports).reduce((result, subpath) => {
      if (subpath === '*' || subpath.endsWith('*')) {
        return { ...result, [subpath]: oldJSON.exports[subpath] };
      }

      let sourcePath = subpath === '.' ? 'src/index.ts' : `src/${subpath.slice(2)}/index.ts`;
      let distPath = subpath === '.' ? 'dist/index.js' : `dist/${subpath.slice(2)}/index.js`;

      return { ...result, [subpath]: `./${TARGETING_JS ? distPath : sourcePath}` };
    }, {});
  }

  await fs.writeFile(`packages/${libraryName}/package.json`, JSON.stringify(oldJSON, null, 2));
}
