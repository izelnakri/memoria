import { ConfigStore, ModelStore } from "@memoria/model";

export default function (hooks) {
  hooks.beforeEach(async function () {
    // TODO: add here setup-dom logic in node.js
    await ModelStore.resetForTests();
    await ConfigStore.resetSchemas();
  });
  hooks.afterEach(async function () {
    this.Server ? this.Server.shutdown() : null;
    await ModelStore.resetForTests();
    await ConfigStore.resetSchemas();
  });
}
