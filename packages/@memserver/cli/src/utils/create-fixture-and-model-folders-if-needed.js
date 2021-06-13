import fs from 'fs/promises';
import kleur from 'kleur';
import recursiveCopy from './recursive-copy.js';

import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function createFixtureAndModelFoldersIfNeeded(memServerDirectory) {
  let boilerplateDirectory = `${__dirname}/../../memserver-boilerplate`;

  try {
    await fs.access(`${memServerDirectory}/fixtures`);
  } catch (error) {
    await fs.mkdir(`${memServerDirectory}/fixtures`);
    await recursiveCopy(`${boilerplateDirectory}/fixtures`, `${memServerDirectory}/fixtures`);

    console.log(kleur.cyan("[Memserver CLI] /memserver/fixtures folder created"));
  }

  try {
    await fs.access(`${memServerDirectory}/models`);
  } catch (error) {
    await fs.mkdir(`${memServerDirectory}/models`);
    await recursiveCopy(`${boilerplateDirectory}/models`, `${memServerDirectory}/models`);

    console.log(kleur.cyan("[Memserver CLI] /memserver/models folder created"));
  }
}
