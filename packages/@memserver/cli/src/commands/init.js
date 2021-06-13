import fs from 'fs/promises';
import kleur from 'kleur';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import getMemServerDirectory from '../utils/get-memserver-directory.js';
import createFixtureAndModelFoldersIfNeeded from '../utils/create-fixture-and-model-folders-if-needed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function initCommand() {
  let memServerDirectory = await getMemServerDirectory();
  let boilerplateDirectory = `${__dirname}/../../memserver-boilerplate`;

  if (!memServerDirectory) {
    memServerDirectory = "./memserver";

    await fs.mkdir(memServerDirectory);
  }

  try {
    await fs.access(`${memServerDirectory}/index.ts`);
  } catch (error) {
    const indexCode = await fs.readFile(`${boilerplateDirectory}/index.ts`);

    await fs.writeFile(`${memServerDirectory}/index.ts`, indexCode);

    console.log(kleur.cyan("[Memserver CLI] /memserver/index.ts created"));
  }

  try {
    await fs.access(`${memServerDirectory}/routes.ts`);
  } catch (error) {
    const routesCode = await fs.readFile(`${boilerplateDirectory}/routes.ts`);

    await fs.writeFile(`${memServerDirectory}/routes.ts`, routesCode);

    console.log(kleur.cyan("[Memserver CLI] /memserver/routes.ts created"));
  }

  try {
    await fs.access(`${memServerDirectory}/initializer.ts`);
  } catch (error) {
    const initializerCode = await fs.readFile(`${boilerplateDirectory}/initializer.ts`);

    await fs.writeFile(`${memServerDirectory}/initializer.ts`, initializerCode);

    console.log(kleur.cyan("[Memserver CLI] /memserver/initializer.ts created"));
  }

  await createFixtureAndModelFoldersIfNeeded(memServerDirectory);
}
