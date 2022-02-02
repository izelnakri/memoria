import match from "match-json";
import QUnit from "qunitx";
import Model, { Schema, DB } from "@memoria/model";

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
    QUnit.assert.propContains = function (actual, expected, message) {
      [actual, expected] = Object.keys(expected).reduce(
        (result, key) => {
          result[0][key] = actual[key];
          result[1][key] = expected[key];

          return result;
        },
        [{}, {}]
      );

      this.pushResult({
        result: QUnit.equiv(actual, expected),
        actual,
        expected,
        message,
      });
    };

    QUnit.assert.notPropContains = function (actual, expected, message) {
      [actual, expected] = Object.keys(expected).reduce(
        (result, key) => {
          result[0][key] = actual[key];
          result[1][key] = expected[key];

          return result;
        },
        [{}, {}]
      );

      this.pushResult({
        result: !QUnit.equiv(actual, expected),
        actual,
        expected,
        message,
        negative: true,
      });
    };
  });
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
