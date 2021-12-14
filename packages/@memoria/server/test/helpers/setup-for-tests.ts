import { Config, DB } from "@memoria/model";

export default function (hooks) {
  hooks.beforeEach(async function () {
    // TODO: add here setup-dom logic in node.js
    await DB.resetForTests();
    await Config.resetSchemas();
  });
  hooks.afterEach(async function () {
    this.Server ? this.Server.shutdown() : null;
    await DB.resetForTests();
    await Config.resetSchemas();
  });
}
