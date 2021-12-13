import match from "match-json";
import QUnit from "qunitx";
import Model, { ConfigStore, ModelStore } from "@memoria/model";

export default function (hooks) {
  hooks.before(function () {
    QUnit.assert.matchJson = function (value, expected, message) {
      let actual = JSON.parse(JSON.stringify(value, null, 2));
      this.pushResult({
        result: match(actual, expected),
        actual,
        expected: expected,
        message,
      });
    };
  });
  hooks.beforeEach(async function () {
    await ModelStore.resetForTests();
    await ConfigStore.resetSchemas();
  });
  hooks.afterEach(async function () {
    if (this.Server) {
      this.Server.shutdown();
    }

    await ModelStore.resetForTests();
    await ConfigStore.resetSchemas();
  });
}
