#!/usr/bin/env -S TS_NODE_LOG_ERROR=true ts-node-script
import fs from 'fs/promises';
import path from 'path';
import util from "util";
import child_process from "child_process";
import chalk from "ansi-colors";
import { classify, dasherize, underscore, pluralize, singularize } from "inflected";

if (process.env.NODE_ENV === "test") {
  chalk.enabled = false;
}

const CLI = {
  default(commandHandler) {
    !process.argv[2] ? commandHandler() : null;
  },
  command(commandName, commandHandler) {
    if (Array.isArray(commandName)) {
      return commandName.includes(process.argv[2]) ? commandHandler() : null;
    }

    commandName === process.argv[2] ? commandHandler() : null;
  }
};

CLI.default(printCommands);
CLI.command(["help", "h"], printCommands);
CLI.command(["init", "new"], async () => {
  let memServerDirectory = await getMemServerDirectory();
  let boilerplateDirectory = `${__dirname}/../memserver-boilerplate`;

  if (!memServerDirectory) {
    memServerDirectory = "./memserver";

    await fs.mkdir(memServerDirectory);
  }

  try {
    await fs.access(`${memServerDirectory}/index.ts`)
  } catch(error) {
    const indexCode = await fs.readFile(`${boilerplateDirectory}/index.ts`);

    await fs.writeFile(`${memServerDirectory}/index.ts`, indexCode);

    console.log(chalk.cyan("[Memserver CLI] /memserver/index.ts created"));
  }

  try {
    await fs.access(`${memServerDirectory}/routes.ts`)
  } catch(error) {
    const routesCode = await fs.readFile(`${boilerplateDirectory}/routes.ts`);

    await fs.writeFile(`${memServerDirectory}/routes.ts`, routesCode);

    console.log(chalk.cyan("[Memserver CLI] /memserver/routes.ts created"));
  }

  try {
    await fs.access(`${memServerDirectory}/initializer.ts`)
  } catch(error) {
    const initializerCode = await fs.readFile(`${boilerplateDirectory}/initializer.ts`);

    await fs.writeFile(`${memServerDirectory}/initializer.ts`, initializerCode);

    console.log(chalk.cyan("[Memserver CLI] /memserver/initializer.ts created"));
  }

  await createFixtureAndModelFoldersIfNeeded(memServerDirectory);
});
CLI.command(["generate", "g"], async () => {
  const memServerDirectory = await getMemServerDirectory();
  const generationType = process.argv[3];
  const modelName = process.argv[4] ? process.argv[4].toLocaleLowerCase() : null;

  if (!memServerDirectory) {
    return console.log(
      chalk.red("[Memserver CLI] cannot find /memserver folder. Did you run $ memserver init ?")
    );
  } else if (!generationType) {
    return console.log(
      chalk.red(
        "[Memserver CLI] generate should be either $ memserver g model [modelName] or $ memserver g fixtures"
      )
    );
  } else if (generationType === "model") {
    return await generateModel(modelName, memServerDirectory);
  } else if (generationType === "fixtures") {
    return await generateFixtures(modelName, memServerDirectory);
  }

  console.log(
    chalk.red(
      `[Memserver CLI] $ memserver ${process.argv[2]} ${process.argv[3]} ${process.argv[4] ||
        ""} does not exists, available commands:`
    )
  );

  return printCommands();
});
CLI.command(["console", "c"], async () => await openConsole());
CLI.command(["version", "v"], async () => {
  console.log(
    chalk.cyan("[Memserver CLI]"),
    JSON.parse((await fs.readFile(`${__dirname}/../package.json`)).toString()).version
  );
});

async function printCommands() {
  const config = JSON.parse((await fs.readFile(`${__dirname}/../package.json`)).toString());
  const highlight = (text) => chalk.bold.cyan(text);

  console.log(`${highlight(
    "[Memserver CLI v" + config.version + "] Usage:"
  )} memserver ${chalk.yellow("<command (Default: help)>")}

memserver init | new                    # Sets up the initial memserver folder structure
memserver generate model ${chalk.yellow(
    "[ModelName]"
  )}    # Generates the initial files for a MemServer Model ${chalk.cyan(
    '[alias: "memserver g model"]'
  )}
memserver generate fixtures             # Outputs your initial MemServer state as pure javascript fixture files
memserver generate fixtures ${chalk.yellow(
    "[ModelName]"
  )} # Outputs your initial MemServer state for certain model as pure javascript fixture
memserver console                       # Starts a MemServer console in node.js ${chalk.cyan(
    '[alias: "memserver c"]'
  )}`);
}

async function generateModel(modelName, memServerDirectory) {
  if (!modelName) {
    return console.log(
      chalk.red(
        "[Memserver CLI] Please put a modelName to the memserver generate. Example: $ memserver generate model user"
      )
    );
  }

  await createFixtureAndModelFoldersIfNeeded(memServerDirectory);

  const modelFileName = dasherize(singularize(modelName));
  const fixtureFileName = dasherize(pluralize(modelName));

  try {
    await fs.access(`${memServerDirectory}/models/${modelFileName}.ts`)
  } catch(error) {
    const classModelName = classify(modelName);

    await fs.writeFile(
      `${memServerDirectory}/models/${modelFileName}.ts`,
      `import Model from 'memserver/model';

export default class ${classModelName} extends Model {
  constructor() {
    super();
  }
}`
    );
    console.log(chalk.cyan(`[Memserver CLI] /memserver/models/${modelFileName}.ts created`));
  }

  try {
    await fs.access(`${memServerDirectory}/fixtures/${fixtureFileName}.ts`)
  } catch(error) {
    await fs.writeFile(
      `${memServerDirectory}/fixtures/${fixtureFileName}.ts`,
      `export default [
];`
    );
    console.log(chalk.cyan(`[Memserver CLI] /memserver/fixtures/${fixtureFileName}.ts created`));
  }
}

// TODO: this has to change MemServer.start() will change
async function generateFixtures(modelName, memServerDirectory) {
  const Model = (await import("./model")).default;
  const startMemserver = (await import("./index")).default;
  const Server = await startMemserver();
  const ModelDefinitions = await getModelDefinitions(memServerDirectory);

  const targetModels = modelName
    ? [classify(singularize(modelName))]
    : Object.keys(ModelDefinitions);

  await Promise.all(targetModels.map(async (Model) => {
    const sortedState = ModelDefinitions[Model].findAll().sort(sortFunction);
    const arrayOfRecords = util.inspect(sortedState, {
      depth: null,
      maxArrayLength: null
    });
    const targetFileName = pluralize(dasherize(underscore(Model)));
    const fileRelativePath = `/fixtures/${targetFileName}.ts`;
    const fileAbsolutePath = `${memServerDirectory}${fileRelativePath}`;

    try {
      await fs.access(fileAbsolutePath);

      const previousModels = (await import(fileAbsolutePath)).default;

      if (JSON.stringify(previousModels.sort(sortFunction)) === JSON.stringify(sortedState)) {
        return;
      }
    } catch(error) {
    } finally {
      await fs.writeFile(fileAbsolutePath, `export default ${arrayOfRecords};`);

      console.log(chalk.yellow(`[MemServer] data written to ${fileRelativePath}`));
    }
  }));
}

async function createFixtureAndModelFoldersIfNeeded(memServerDirectory) {
  let boilerplateDirectory = `${__dirname}/../memserver-boilerplate`;

  try {
    await fs.access(`${memServerDirectory}/fixtures`)
  } catch(error) {
    await fs.mkdir(`${memServerDirectory}/fixtures`);
    await recursiveCopy(`${boilerplateDirectory}/fixtures`, `${memServerDirectory}/fixtures`);

    console.log(chalk.cyan("[Memserver CLI] /memserver/fixtures folder created"));
  }

  try {
    await fs.access(`${memServerDirectory}/models`)
  } catch(error) {
    await fs.mkdir(`${memServerDirectory}/models`);
    await recursiveCopy(`${boilerplateDirectory}/models`, `${memServerDirectory}/models`);

    console.log(chalk.cyan("[Memserver CLI] /memserver/models folder created"));
  }
}

async function openConsole() {
  if (process.cwd().includes("memserver")) {
    throw new Error(
      chalk.red(
        "[Memserver CLI] You are in the memserver directory, go to the root of your project to start memserver console."
      )
    );
  }
  const MemServer = await (await import("./index")).default();
  const repl = (await import("repl")).default;
  console.log(
    chalk.cyan("[Memserver CLI]"),
    "Started MemServer node.js console - check window.Memserver, window.MemServer and import/use your models ;)"
  );
  repl.start("> ");
}

async function getMemServerDirectory() {
  const cwd = process.cwd();
  const folders = cwd.split("/");
  const memServerIndex = folders.findIndex((path) => path === "memserver");

  if (memServerIndex !== -1) {
    return folders.slice(0, memServerIndex + 1).join("/");
  } else if ((await fs.readdir(".")).includes("memserver")) {
    return `${cwd}/memserver`;
  }
}

function sortFunction(a, b) {
  if (a.id > b.id) {
    return 1;
  } else if (a.id < b.id) {
    return -1;
  }

  return 0;
}

async function getModelDefinitions(memServerDirectory) {
  const models = await fs.readdir(`${memServerDirectory}/models`);

  const modelDefinitions = await Promise.all(
    models.map(async (modelPath) => {
      return (await import(`${memServerDirectory}/models/${modelPath}`)).default;
    })
  );

  return modelDefinitions.reduce((result, modelDefinition) => {
    return Object.assign(result, { [modelDefinition.name]: modelDefinition });
  }, {});
}

async function recursiveCopy(sourcePath, targetPath) {
  try {
    await fs.access(sourcePath)

    let stats = await fs.stat(sourcePath);

    if (stats.isDirectory()) {
      try {
        await fs.access(targetPath);
      } catch {
        await fs.mkdir(targetPath);
      }

      let entries = await fs.readdir(sourcePath);

      await Promise.all(
        entries.map((entry) => recursiveCopy(path.join(sourcePath, entry), path.join(targetPath, entry)))
      );
    } else {
      await fs.copyFile(sourcePath, targetPath);
    }
  } catch(error) {
    console.log('Recursive copy error:');
    throw error;
  }
}
