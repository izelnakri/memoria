// Custom QUnit assertions shared by every package's test suite.
//
// qunitx documents `Assert.prototype` from `qunitx/assert` as the extension point for custom
// assertions: every per-test `assert` object inherits from it on node and deno. The browser build
// runs vendored QUnit directly, whose tests inherit from `QUnit.assert` instead -- qunitx re-exports
// that as `assert` from its browser entry only, so it is read off the namespace and is undefined
// everywhere else. In both cases what is extended is the *prototype* of the per-test assert, so
// `this` inside an assertion is the assert of the currently running test.
//
// The assertions call `this.equal(...)` rather than a captured module-level `assert`: under
// node:test there is no QUnit singleton proxying to the active test, so nested assertions made
// through a captured object would be attributed to the wrong test.
import * as qunitx from "qunitx";
import BaseAssert from "qunitx/assert";
import Model, { RelationshipDB, match } from "@memoria/model";
import type { HasManyArray } from "@memoria/model";

/** The `assert` every memoria test receives. Annotate a test's parameter with it to use the custom assertions. */
export interface Assert extends BaseAssert {
  matchJson(value: unknown, expected: unknown, message?: string): void;
  matchChangeset(value: object, expected: object, message?: string): void;
  hasMany(hasManyArray: HasManyArray, expectedHasManyArray: Model[], strictMode?: boolean): void;
  strictHasMany(hasManyArray: HasManyArray, expectedHasManyArray: Model[]): void;
}

const assertPrototype = ((qunitx as { assert?: BaseAssert }).assert ?? BaseAssert.prototype) as Assert;

assertPrototype.matchJson = function (this: Assert, value: unknown, expected: unknown, message?: string) {
  let actual = JSON.parse(JSON.stringify(value, null, 2));

  this.pushResult({ result: match(actual, expected), actual, expected, message });
};

assertPrototype.matchChangeset = function (this: Assert, value: object, expected: object, message?: string) {
  let actual = JSON.parse(JSON.stringify(filterObject(value, ["date"]), null, 2));
  let filteredExpected = JSON.parse(JSON.stringify(filterObject(expected, ["date"]), null, 2));

  this.pushResult({ result: match(actual, filteredExpected), actual, expected: filteredExpected, message });
};

assertPrototype.hasMany = function (
  this: Assert,
  hasManyArray: HasManyArray,
  expectedHasManyArray: Model[],
  strictMode?: boolean,
) {
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

  this.equal(hasManyArray.length, expectedHasManyArray.length);

  expectedHasManyArray.forEach((expectedModel: Model, index: number) => {
    let targetIndex = hasManyArray.findIndex((model) => match(model.toJSON(), expectedModel.toJSON()));
    if (targetIndex === -1) {
      throw new Error(`expectedHasManyArray[${index}] does not match any value of hasManyArray`);
    }

    if (strictMode) {
      this.strictEqual(hasManyArray[targetIndex], expectedModel);
    } else {
      this.deepEqual(hasManyArray[targetIndex].toJSON(), expectedModel.toJSON());

      let expectedBelongsToReference = RelationshipDB.findRelationshipFor(expectedModel, belongsToKey);
      if (expectedBelongsToReference) {
        let primaryKeyName = (expectedBelongsToReference.constructor as typeof Model).primaryKeyName;
        this.equal(expectedBelongsToReference[primaryKeyName], hasManyArray.belongsTo[targetPrimaryKeyName]);
      }
    }

    this.equal(expectedModel[belongsToForeignKey], hasManyArray.belongsTo[targetPrimaryKeyName]);
  });
};

assertPrototype.strictHasMany = function (this: Assert, hasManyArray: HasManyArray, expectedHasManyArray: Model[]) {
  return this.hasMany(hasManyArray, expectedHasManyArray, true);
};

function filterObject(object: object, arrayOfKeysToFilter: string[] = []) {
  return Object.keys(object).reduce((result, keyName) => {
    if (!arrayOfKeysToFilter.includes(keyName)) {
      result[keyName] = object[keyName];
    }

    return result;
  }, {});
}
