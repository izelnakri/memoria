import match from "match-json";
import QUnit from "qunitx";
import Model, { Config, DB } from "@memoria/model";

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
    await DB.resetForTests();
    await Config.resetSchemas();
  });
  hooks.afterEach(async function () {
    if (this.Server) {
      this.Server.shutdown();
    }

    await DB.resetForTests();
    await Config.resetSchemas();
  });
}
