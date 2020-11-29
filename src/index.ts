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
    }
  }
}

import fs from 'fs/promises';
import chalk from "ansi-colors";
import { classify, dasherize } from "@ember/string";
import { pluralize } from "ember-inflector";
import setupDom from "./setup-dom";

const CWD = process.cwd();

export default async function(): Promise<any> {
  if (!(await pathExists(`${CWD}/memserver`))) {
    throw new Error(chalk.red("/memserver folder doesn't exist for this directory!"));
  } else if (!(await pathExists(`${CWD}/memserver/models`))) {
    throw new Error(chalk.red("/memserver/models folder doesn't exist for this directory!"));
  } else if (!(await checkFile(`${CWD}/memserver/routes`))) {
    throw new Error(chalk.red("/memserver/routes.ts doesn't exist for this directory!"));
  } else if (!(await checkFile(`${CWD}/memserver/initializer`))) {
    throw new Error(chalk.red("/memserver/initializer.ts doesn't exist for this directory!"));
  }

  await setupDom();

  window.Memserver = (await import("./server")).default;

  const [initializerModule, routesModule] = await Promise.all([
    import(`${CWD}/memserver/initializer`),
    import(`${CWD}/memserver/routes`)
  ]);

  window.MemServer = new window.Memserver({
    globalizeModels: true,
    initializer: initializerModule.default,
    routes: routesModule.default
  });

  return window.MemServer;
}

async function checkFile(filePath) {
  return await pathExists(`${filePath}.ts`) || await pathExists(`${filePath}.js`);
}

async function pathExists(path) {
  try {
    await fs.access(path);

    return true;
  } catch {
    return false;
  }
}
