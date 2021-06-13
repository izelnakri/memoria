import fs from "fs/promises";
import { promisify } from 'util';
import { exec } from 'child_process';
import kleur from "kleur";
import { pluralize } from "inflected";
import recursiveLookup from 'recursive-lookup';
import setupDom from "@memserver/server/dist/setup-dom.js";
import { transformAsync } from '@babel/core';

const CWD = process.cwd();
const shell = promisify(exec);

// NOTE: Reads structure, builds the files, builds dom environment, runs the node.js environment with memserverDirectory and returns the Memserver
export default async function startMemserver(memserverDirectory = `${CWD}/memserver`) {
  let IS_TYPESCRIPT = (await fs.readdir(`${memserverDirectory}/models`))
    .some((modelFile) => modelFile.endsWith(".ts"));
  let outputDirectory = IS_TYPESCRIPT
    ? await buildTmpDirectory(memserverDirectory)
    : memserverDirectory;

  if (IS_TYPESCRIPT) {
    let entryPoints = await recursiveLookup(
      memserverDirectory,
      (path) => ['.js', '.ts'].some((extension) => path.endsWith(extension))
    );

    await Promise.all(entryPoints.map(async (entryPoint) => {
      let codeBuffer = await fs.readFile(entryPoint);
      let output = await transformAsync(codeBuffer.toString(), {
        filename: entryPoint,
        inputSourceMap: false,
        presets: [
          '@babel/preset-typescript',
        ],
        plugins: [
          'babel-plugin-module-extension-resolver'
        ]
      });

      let targetEntry = entryPoint
        .replace(memserverDirectory, outputDirectory);
      targetEntry = targetEntry.slice(0, targetEntry.length - 3) + '.js';
      let targetPaths = targetEntry.split('/');
      let targetFolder = targetPaths.slice(0, targetPaths.length - 1).join('/');

      await fs.mkdir(targetFolder, { recursive: true });
      await fs.writeFile(targetEntry, output.code);
    }));
  }

  if (!(await pathExists(`${memserverDirectory}`))) {
    throw new Error(kleur.red("/memserver folder doesn't exist for this directory!"));
  } else if (!(await pathExists(`${memserverDirectory}/models`))) {
    throw new Error(kleur.red("/memserver/models folder doesn't exist for this directory!"));
  } else if (!(await checkFile(`${memserverDirectory}/routes`))) {
    throw new Error(kleur.red("/memserver/routes.ts or js doesn't exist for this directory!"));
  } else if (!(await checkFile(`${memserverDirectory}/initializer`))) {
    throw new Error(kleur.red("/memserver/initializer.ts or js doesn't exist for this directory!"));
  }

  await setupDom();

  const Memserver = (await import("@memserver/server")).default;

  const [initializerModule, routesModule] = await Promise.all([
    import(`${CWD}/${outputDirectory}/initializer.js`),
    import(`${CWD}/${outputDirectory}/routes.js`),
  ]);

  return new Memserver({
    globalizeModules: true,
    globalizeModels: true,
    initializer: initializerModule.default,
    routes: routesModule.default,
  });
}

async function checkFile(filePath) {
  return (await pathExists(`${filePath}.ts`)) || (await pathExists(`${filePath}.js`));
}

async function pathExists(path) {
  try {
    await fs.access(path);

    return true;
  } catch {
    return false;
  }
}

async function buildTmpDirectory(memserverDirectory) {
  let paths = memserverDirectory.split("/");
  let tmpDirectory = paths
    .slice(0, paths - 1)
    .concat(["tmp", "memserver"])
    .join("/");

  await fs.mkdir(tmpDirectory, { recursive: true, force: true });

  return tmpDirectory;
}
