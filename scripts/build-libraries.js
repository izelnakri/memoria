import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import recursiveLookup from 'recursive-lookup';

const shell = promisify(exec);

let targetPackages = [
  '@memserver/model',
  '@memserver/response',
  '@memserver/server'
];

await targetPackages.reduce(async (lastCompile, packageName) => {
  await lastCompile;

  return buildPackage(packageName);
}, new Promise((resolve) => resolve()));

async function buildPackage(packageName) {
  let targetFolder = `${process.cwd()}/packages/${packageName}`;

  await fs.rm(`${targetFolder}/dist`, { recursive: true, force: true });
  await fs.mkdir(`${targetFolder}/dist`, { recursive: true });

  try {

    if (process.env.ENVIRONMENT !== 'development') {
      await shell(`node_modules/.bin/tsc $(find 'packages/${packageName}/src' -type f ) --outDir packages/${packageName}/dist --module es2020 --target ES2018 --moduleResolution node --allowSyntheticDefaultImports true --experimentalDecorators true -d --allowJs`);

      let fileAbsolutePaths = await recursiveLookup(`packages/${packageName}/dist`, (path) => path.endsWith('.js'));

      await Promise.all(fileAbsolutePaths.map((fileAbsolutePath) => {
        return shell(`node_modules/.bin/babel ${fileAbsolutePath} --plugins babel-plugin-module-extension-resolver -o ${fileAbsolutePath}`);
      }));
    } else {
      let fileAbsolutePaths = await recursiveLookup(`packages/${packageName}/src`, (path) => path.endsWith('.ts') || path.endsWith('.js'));

      await Promise.all(fileAbsolutePaths.map((fileAbsolutePath) => {
        let targetPath = fileAbsolutePath
          .replace(`packages/${packageName}/src`, `packages/${packageName}/dist`)
        targetPath = targetPath.slice(0, targetPath.length - 3) + '.js';

        return shell(`node_modules/.bin/babel ${fileAbsolutePath} --presets @babel/preset-typescript --plugins babel-plugin-module-extension-resolver -o ${targetPath}`);
      }));
    }
  } catch (error) {
    console.error(error);
  }
}

// NOTE: with esbuild I had to do this:
// await shell(`node_modules/.bin/esbuild $(find 'packages/${packageName}/test' -type f -name \*.ts)  --outdir="./tmp/${packageName}" --platform=node --format=esm`);
// let fileAbsolutePaths = await recursiveLookup(`tmp/${packageName}`, (path) => path.endsWith('.js'));
// await Promise.all(fileAbsolutePaths.map((fileAbsolutePath) => {
//   return shell(`node_modules/.bin/babel ${fileAbsolutePath} --plugins babel-plugin-module-extension-resolver -o ${fileAbsolutePath}`);
// }));

