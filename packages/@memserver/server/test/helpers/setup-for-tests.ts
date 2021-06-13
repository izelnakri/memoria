import Model, { resetMemory } from "@memserver/model";

export default function (hooks) {
  hooks.beforeEach(function () {
    // TODO: add here setup-dom logic in node.js
    resetMemory(Model);
  });
  hooks.afterEach(function () {
    this.Server ? this.Server.shutdown() : null;
    resetMemory(Model);
  });
}
