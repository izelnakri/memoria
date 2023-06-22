import QUnit from "qunitx";
import Model, { Schema, DB, RelationshipDB, match } from "@memoria/model";
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

      assert.equal(hasManyArray.length, expectedHasManyArray.length);

      expectedHasManyArray.forEach((expectedModel: Model, index: number) => {
        let targetIndex = hasManyArray.findIndex((model) => match(model.toJSON(), expectedModel.toJSON()));
        if (targetIndex === -1) {
          throw new Error(`expectedHasManyArray[${index}] does not match any value of hasManyArray`);
        }

        if (strictMode) {
          assert.strictEqual(hasManyArray[targetIndex], expectedModel);
        } else {
          assert.deepEqual(hasManyArray[targetIndex].toJSON(), expectedModel.toJSON());

          let expectedBelongsToReference = RelationshipDB.findRelationshipFor(expectedModel, belongsToKey);
          if (expectedBelongsToReference) {
            let primaryKeyName = (expectedBelongsToReference.constructor as typeof Model).primaryKeyName;
            assert.equal(expectedBelongsToReference[primaryKeyName], hasManyArray.belongsTo[targetPrimaryKeyName]);
          }
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
