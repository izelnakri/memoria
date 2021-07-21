import { Store } from "@memoria/model";

export default function (hooks) {
  hooks.beforeEach(function () {
    // TODO: add here setup-dom logic in node.js
    Store.reset();
  });
  hooks.afterEach(function () {
    this.Server ? this.Server.shutdown() : null;
    Store.reset();
  });
}
