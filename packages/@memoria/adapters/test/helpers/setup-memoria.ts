import { Schema, DB } from "@memoria/model";
import "../../../../../test/helpers/custom-assertions.js";

export default function (hooks) {
  // NOTE: debugging affordance -- lets a test dump locals onto the global scope for inspection
  // from a browser console when the suite is run via qunitx-cli.
  globalThis.expose = function (obj) {
    Object.keys(obj).forEach((key) => {
      globalThis[key] = obj[key];
    });
  };

  hooks.beforeEach(async function () {
    await DB.resetRecords();
    await Schema.resetSchemas();
  });
  hooks.afterEach(async function () {
    if (this.Server) {
      this.Server.shutdown();
    }

    await DB.resetRecords();
    await Schema.resetSchemas();
  });
}
