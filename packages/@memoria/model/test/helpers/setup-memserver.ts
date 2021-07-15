import match from "match-json";
import Qunit from "qunitx";
import Model, { Store } from "@memoria/model";

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
  hooks.beforeEach(() => Store.reset());
  hooks.afterEach(() => Store.reset());
}
