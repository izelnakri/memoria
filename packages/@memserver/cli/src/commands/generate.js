import fs from 'fs/promises';
import util from 'util';
import kleur from 'kleur';
import { classify, dasherize, underscore, pluralize, singularize } from "inflected";
import getMemServerDirectory from '../utils/get-memserver-directory.js';
import createFixtureAndModelFoldersIfNeeded from '../utils/create-fixture-and-model-folders-if-needed.js';
import startMemserver from '../index.js';

import helpCommand from './help.js';

export default async function generateCommand() {
  const memserverDirectory = await getMemServerDirectory();
  const generationType = process.argv[3];
  const modelName = process.argv[4] ? process.argv[4].toLocaleLowerCase() : null;

  if (!memserverDirectory) {
    return console.log(
      kleur.red("[Memserver CLI] cannot find /memserver folder. Did you run $ memserver init ?")
    );
  } else if (!generationType) {
    return console.log(
      kleur.red(
        "[Memserver CLI] generate should be either $ memserver g model [modelName] or $ memserver g fixtures"
      )
    );
  } else if (generationType === "model") {
    return await generateModel(modelName, memserverDirectory);
  } else if (generationType === "fixtures") {
    return await generateFixtures(modelName, memserverDirectory);
  }

  console.log(
    kleur.red(
      `[Memserver CLI] $ memserver ${process.argv[2]} ${process.argv[3]} ${
        process.argv[4] || ""
      } does not exists, available commands:`
    )
  );

  return await helpCommand();
}

async function generateModel(modelName, memserverDirectory) {
  if (!modelName) {
    return console.log(
      kleur.red(
        "[Memserver CLI] Please put a modelName to the memserver generate. Example: $ memserver generate model user"
      )
    );
  }

  await createFixtureAndModelFoldersIfNeeded(memserverDirectory);

  let modelFileName = dasherize(singularize(modelName));
  let fixtureFileName = dasherize(pluralize(modelName));

  try {
    await fs.access(`${memserverDirectory}/models/${modelFileName}.ts`);
  } catch (error) {
    const classModelName = classify(modelName);

    await fs.writeFile(
      `${memserverDirectory}/models/${modelFileName}.ts`,
      `import Model from '@memserver/model';

export default class ${classModelName} extends Model {
  constructor() {
    super();
  }
}`
    );
    console.log(kleur.cyan(`[Memserver CLI] /memserver/models/${modelFileName}.ts created`));
  }

  try {
    await fs.access(`${memserverDirectory}/fixtures/${fixtureFileName}.ts`);
  } catch (error) {
    await fs.writeFile(
      `${memserverDirectory}/fixtures/${fixtureFileName}.ts`,
      `export default [
];`
    );
    console.log(kleur.cyan(`[Memserver CLI] /memserver/fixtures/${fixtureFileName}.ts created`));
  }
}

async function generateFixtures(modelName, memserverDirectory) {
  const modelFiles = await fs.readdir(`${memserverDirectory}/models`);
  const IS_TYPESCRIPT = modelFiles.some((modelFile) => modelFile.endsWith(".ts"));
  // TODO: this should be absolute path!
  const memserverImportDirectory = IS_TYPESCRIPT
    ? await buildTmpDirectory(memserverDirectory)
    : memserverDirectory;

  console.log("memserverImportDirectory is:");
  console.log(memserverImportDirectory);

  const Server = await startMemserver(memserverDirectory); // TODO: this will be from cli/index.js
  const ModelDefinitions = await importModelDefinitions(memserverImportDirectory, modelFiles, IS_TYPESCRIPT);
  const targetModels = modelName
    ? [classify(singularize(modelName))]
    : Object.keys(ModelDefinitions);

  await Promise.all(
    targetModels.map(async (Model) => {
      console.log('ModelDefinitions are');
      console.log(ModelDefinitions);

      let sortedState = ModelDefinitions[Model].findAll().sort(sortFunction);
      let arrayOfRecords = util.inspect(sortedState, {
        depth: null,
        maxArrayLength: null,
      });
      console.log('ARRAY OF RECORDS ARE');
      console.log(arrayOfRecords);
      let targetFileName = pluralize(dasherize(underscore(Model)));
      let fixtureToImport = `/fixtures/${targetFileName}`;
      let expectedFixtureRelativePath = `${fixtureToImport}` + (IS_TYPESCRIPT ? ".ts" : ".js");
      let expectedFixtureFullPath = `${memserverDirectory}/${expectedFixtureRelativePath}`;

      try {
        await fs.access(expectedFixtureFullPath);

        let fixtureImportPath = IS_TYPESCRIPT
          ? `${memserverImportDirectory}/${expectedFixtureRelativePath}`
          : `${memserverDirectory}/${expectedFixtureRelativePath}`;
        const previousModels = (await import(fixtureImportPath)).default;

        if (JSON.stringify(previousModels.sort(sortFunction)) === JSON.stringify(sortedState)) {
          return;
        }
      } catch (error) {
      } finally {
        await fs.writeFile(expectedFixtureFullPath, `export default ${arrayOfRecords};`);

        console.log(kleur.yellow(`[MemServer] data written to ${expectedFixtureRelativePath}`));
      }
    })
  );
}

function sortFunction(a, b) {
  if (a.id > b.id) {
    return 1;
  } else if (a.id < b.id) {
    return -1;
  }

  return 0;
}

async function importModelDefinitions(esmDirectory, modelFiles, isTypescript) {
  const modelDefinitions = await Promise.all(
    modelFiles.map(async (modelPath) => {
      console.log(`${esmDirectory}/models/${formatExtension(modelPath, isTypescript)}`);
      return (await import(`${esmDirectory}/models/${formatExtension(modelPath, isTypescript)}`)).default; // TODO: also make it change if its typescript
    })
  );

  return modelDefinitions.reduce((result, modelDefinition) => {
    return Object.assign(result, { [modelDefinition.name]: modelDefinition });
  }, {});
}

function formatExtension(modelPath, isTypescript) {
  if (isTypescript) {
    let paths = modelPath.split('/');

    return paths.slice(0, paths.length - 1).concat([paths[paths.length - 1].replace('.ts', '.js')]);
  }

  return modelPath;
}

async function buildTmpDirectory(memserverDirectory) {
  let paths = memserverDirectory.split("/");
  let tmpDirectory = paths
    .slice(0, paths.length - 1)
    .concat(["tmp", "memserver"])
    .join("/");

  await fs.mkdir(tmpDirectory, { recursive: true, force: true });

  return tmpDirectory;
}
