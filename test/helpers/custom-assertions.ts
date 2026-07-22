// Custom QUnit assertions shared by every package's test suite.
//
// Historically each package's setup-memoria.ts registered its own copy of these on `QUnit.assert`
// inside a `before()` hook. That worked only in the browser; qunitx 1.x runs the same files on
// `node:test` too, where there is no `QUnit` singleton and every test gets its own `Assert`
// instance.
//
// The two runtimes expose different -- but equivalent -- extension points, and in both cases the
// object we extend is the *prototype* of the per-test assert object, so `this` inside an assertion
// is the assert of the currently running test:
//
//   node/deno : the exported `Assert` class -> extend `Assert.prototype`
//   browser   : qunitx re-exports QUnit itself, whose `QUnit.assert` *is* that prototype
//
// Note the assertions below call `this.equal(...)` rather than a captured module-level `assert`.
// The old code closed over `QUnit.assert`, relying on QUnit's singleton proxying to the active
// test. Under node:test that indirection does not exist, and nested assertions would have been
// attributed to the wrong test (or thrown).
import * as qunitx from "qunitx";
import Model, { RelationshipDB, match } from "@memoria/model";
import type { HasManyArray } from "@memoria/model";

type AssertLike = {
  pushResult(info: { result: boolean; actual?: unknown; expected?: unknown; message?: string }): void;
  equal(actual: unknown, expected: unknown, message?: string): void;
  strictEqual(actual: unknown, expected: unknown, message?: string): void;
  deepEqual(actual: unknown, expected: unknown, message?: string): void;
  hasMany(hasManyArray: HasManyArray, expectedHasManyArray: Model[], strictMode?: boolean): void;
};

const assertPrototype: AssertLike = (qunitx as any).Assert?.prototype ?? (qunitx as any).assert;

if (!assertPrototype) {
  throw new Error("qunitx did not expose an assert prototype to extend -- custom assertions cannot be registered");
}

assertPrototype.matchJson = function (this: AssertLike, value: unknown, expected: unknown, message?: string) {
  let actual = JSON.parse(JSON.stringify(value, null, 2));

  this.pushResult({ result: match(actual, expected), actual, expected, message });
};

assertPrototype.matchChangeset = function (this: AssertLike, value: object, expected: object, message?: string) {
  let actual = JSON.parse(JSON.stringify(filterObject(value, ["date"]), null, 2));
  let filteredExpected = JSON.parse(JSON.stringify(filterObject(expected, ["date"]), null, 2));

  this.pushResult({ result: match(actual, filteredExpected), actual, expected: filteredExpected, message });
};

assertPrototype.hasMany = function (
  this: AssertLike,
  hasManyArray: HasManyArray,
  expectedHasManyArray: Model[],
  strictMode?: boolean
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

assertPrototype.strictHasMany = function (
  this: AssertLike,
  hasManyArray: HasManyArray,
  expectedHasManyArray: Model[]
) {
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
