import match from "match-json";
import QUnit from "qunitx";
import Model, { Schema, DB } from "@memoria/model";
import type { HasManyArray } from "@memoria/model";

export default function (hooks) {
  window.expose = function (obj) {
    Object.keys(obj).forEach((key) => {
      window[key] = obj[key];
    });
  };

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
    let assert = QUnit.assert;
    QUnit.assert.hasMany = function (hasManyArray: HasManyArray, expectedHasManyArray: Model[], strictMode?: boolean) {
      if (!Array.isArray(hasManyArray) || !Array.isArray(expectedHasManyArray)) {
        return this.pushResult({
          result: false,
          actual: hasManyArray,
          expected: expectedHasManyArray,
          message: Array.isArray(hasManyArray)
            ? "assert.hasMany(hasManyArray, expectedHasManyArray): expectedHasManyArray is not an array"
            : "assert.hasMany(hasManyArray, expectedHasManyArray): hasManyArray is not an array",
        });
      }
      let belongsToKey = hasManyArray.metadata.reverseRelationshipName;
      let belongsToForeignKey = hasManyArray.metadata.reverseRelationshipForeignKeyColumnName;
      let TargetModel = hasManyArray.belongsTo.constructor as typeof Model;
      let targetPrimaryKeyName = TargetModel.primaryKeyName;

      assert.deepEqual(hasManyArray, expectedHasManyArray);
      expectedHasManyArray.forEach((expectedModel: Model, index: number) => {
        if (strictMode) {
          assert.strictEqual(hasManyArray[index], expectedModel);
          assert.strictEqual(expectedModel[belongsToKey], hasManyArray.belongsTo);
        } else {
          let primaryKeyName = (expectedModel[belongsToKey].constructor as typeof Model).primaryKeyName;
          assert.equal(expectedModel[belongsToKey][primaryKeyName], hasManyArray.belongsTo[targetPrimaryKeyName]);
        }

        assert.equal(expectedModel[belongsToForeignKey], hasManyArray.belongsTo[targetPrimaryKeyName]);
      });
    };
    QUnit.assert.strictHasMany = function (hasManyArray: HasManyArray, expectedHasManyArray: Model[]) {
      return QUnit.assert.hasMany(hasManyArray, expectedHasManyArray, true);
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
