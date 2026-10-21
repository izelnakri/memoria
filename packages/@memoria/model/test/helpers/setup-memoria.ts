import { Schema, DB } from "@memoria/model";
import "../../../../../test/helpers/custom-assertions.js";

export default function (hooks) {
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
