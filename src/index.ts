declare global {
  interface Window {
    Pretender: any;
    RouteRecognizer: any;
    FakeXMLHttpRequest: any;
    MemServer?: any;
    modelFixtureTree?: any;
    [propName: string]: any;
  }

  namespace NodeJS {
    interface Global {
      window?: any;
      document?: any;
      self: any;
      $?: any;
      [propName: string]: any;
    }
  }
}

import fs from "fs-extra";
import chalk from "ansi-colors";
import { classify, dasherize } from "ember-cli-string-utils";
import Inflector from "i";
import setupDom from "./setup-dom";

const { pluralize } = Inflector();

const CWD = process.cwd();

(async () => {
  if (!(await fs.pathExists(`${CWD}/memserver`))) {
    throw new Error(chalk.red("/memserver folder doesn't exist for this directory!"));
  } else if (!(await fs.pathExists(`${CWD}/memserver/models`))) {
    throw new Error(chalk.red("/memserver/models folder doesn't exist for this directory!"));
  } else if (!(await fs.pathExists(`${CWD}/memserver/routes.ts`))) {
    throw new Error(chalk.red("/memserver/routes.ts doesn't exist for this directory!"));
  }

  await setupDom();

  const modelFileNames = await fs.readdir(`${CWD}/memserver/models`);
  const modelRegistry = await Promise.all(
    modelFileNames.map(async (fileName) => {
      const modelName = fileName.slice(0, -3);
      const fixturePath = `${CWD}/memserver/fixtures/${dasherize(pluralize(modelName))}`;
      const fixtureExists = await fs.pathExists(`${fixturePath}.ts`);

      const [model, fixtures] = await Promise.all([
        import(`${CWD}/memserver/models/${fileName}`),
        fixtureExists ? import(fixturePath) : { default: [] }
      ]);

      return {
        [classify(modelName)]: {
          model: model.default,
          fixtures: fixtures.default
        }
      };
    }, [])
  );

  window.Memserver = (await import("./server")).default;
  const [initializerModule, routesModule] = await Promise.all([
    import(`${CWD}/memserver/initializer`),
    import(`${CWD}/memserver/routes`)
  ]);

  window.MemServer = new window.Memserver({
    initializer: initializerModule.default,
    routes: routesModule.default
  });
  window.modelRegistry = modelRegistry;

  modelRegistry.forEach((modelRegister) => {
    const modelName = Object.keys(modelRegister)[0];

    window[modelName] = modelRegister[modelName].model;
    window[modelName].resetDatabase(modelRegister[modelName].fixtures);
  });

  return window.MemServer;
})();

// import('./dist').then((memserver) => global.MemServer = memserver)
