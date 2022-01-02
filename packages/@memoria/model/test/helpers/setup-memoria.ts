import match from "match-json";
import Qunit from "qunitx";
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
    QUnit.assert.matchChangeset = function (value, expected, message) {
      let actual = JSON.parse(JSON.stringify(filterObject(value, ["date"]), null, 2));
      let filteredExpected = JSON.parse(JSON.stringify(filterObject(expected, ["date"]), null, 2));

      this.pushResult({
        result: match(actual, filteredExpected),
        actual,
        expected: filteredExpected,
        message,
      });
    };
  });
  hooks.beforeEach(async function () {
    await DB.resetRecords();
    await Schema.resetSchemas();
  });
  hooks.afterEach(async function () {
    await DB.resetRecords();
    await Schema.resetSchemas();
  });
}

function filterObject(object, arrayOfKeysToFilter = []) {
  return Object.keys(object).reduce((result, keyName) => {
    if (!arrayOfKeysToFilter.includes(keyName)) {
      result[keyName] = object[keyName];
    }

    return result;
  }, {});
}
