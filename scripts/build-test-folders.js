import fs from 'fs/promises';
import { promisify } from 'util';
import { exec } from 'child_process';
import recursiveLookup from 'recursive-lookup';

const shell = promisify(exec);

let targetPackages = [
  '@memserver/model',
  '@memserver/response',
  '@memserver/server',
];

await targetPackages.reduce(async (lastCompile, packageName) => {
  await lastCompile;

  return buildPackage(packageName);
}, new Promise((resolve) => resolve()));


// TODO: maybe do not use --bundle due to cross reference:
async function buildPackage(packageName) {
  let targetFolder = `${process.cwd()}/packages/${packageName}`;

  await fs.rm(`${targetFolder}/tmp`, { recursive: true, force: true });

  try {
    let fileAbsolutePaths = await recursiveLookup(`packages/${packageName}/test`, (path) => path.endsWith('.ts'));

    await Promise.all(fileAbsolutePaths.map((fileAbsolutePath) => {
      let targetPath = fileAbsolutePath
        .replace(`packages/${packageName}/test`, `tmp/${packageName}`)
      targetPath = targetPath.slice(0, targetPath.length - 3) + '.js';

      return shell(`node_modules/.bin/babel ${fileAbsolutePath} --presets @babel/preset-typescript --plugins babel-plugin-module-extension-resolver -o ${targetPath}`);
    }));

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

