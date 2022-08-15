import { module, test } from "qunitx";
import { isCyclical } from "@memoria/model";

module("@memoria/model | Utils | isCyclical", function (hooks) {
  class Human {
    id = 0;
    categoryType = "human";
    relationship = null;
    records = [];
  }
  class Animal {
    id = 0;
    categoryType = "animal";
    relationship = null;
    records = [];
  }

  module("normal objects tests", function () {
    test("objects that are cyclical to itself should return true", function (assert) {
      let circularA = { abc: null };
      let circularB = { abc: null };
      circularA.abc = circularA;
      circularB.abc = circularB;

      assert.ok(isCyclical(circularA));
      assert.ok(isCyclical(circularB));
    });

    test("objects that are cyclical to another object should return true", function (assert) {
      let circularA = { abc: null };
      let circularB = { abc: null };
      circularA.abc = circularB;
      circularB.abc = circularA;

      assert.ok(isCyclical(circularA));
      assert.ok(isCyclical(circularB));
    });

    test("compare structures with multiple references to the same containers", function (assert) {
      var i;
      var x = {};
      var y = {};

      for (i = 0; i < 3; i++) {
        x = { foo: x, bar: x, baz: x };
        y = { foo: y, bar: y, baz: y };
      }

      assert.notOk(isCyclical(x));
      assert.notOk(isCyclical(y));

      x.foo.foo = y.foo;

      assert.notOk(isCyclical(x));
      assert.notOk(isCyclical(y));

      y.foo.foo = x;

      assert.ok(isCyclical(x));
      assert.ok(isCyclical(y));
    });

    test("objects that are not cyclical should return false", function (assert) {
      let obj = {};
      let objTwo = { abc: null };
      let objThree = { id: 1, name: "Izel", records: [] };

      assert.notOk(isCyclical(obj));
      assert.notOk(isCyclical(objTwo));
      assert.notOk(isCyclical(objThree));
    });

    test("objects that has cyclical references to itself in array should return true", function (assert) {
      let circularA = { id: 1, name: "Izel", records: [] };
      let circularB = { id: 2, name: "Moris", records: [] };

      circularA.records.push(circularA);
      circularB.records.push(circularB);

      assert.ok(isCyclical(circularA));
      assert.ok(isCyclical(circularB));
    });

    test("objects that has cyclical references to another object in array should return true", function (assert) {
      let circularA = { id: 1, name: "Izel", records: [] };
      let circularB = { id: 2, name: "Moris", records: [] };

      circularA.records.push(circularB);

      assert.notOk(isCyclical(circularA));
      assert.notOk(isCyclical(circularB));

      circularA.circularB = circularB;

      assert.notOk(isCyclical(circularA));
      assert.notOk(isCyclical(circularB));

      circularB.records.push(circularA);

      assert.ok(isCyclical(circularA));
      assert.ok(isCyclical(circularB));
    });
  });

  module("normal objects when Object prototype constructor is null tests", function () {
    test("objects that are cyclical to itself should return true", function (assert) {
      let circularA = Object.create(null);
      let circularB = Object.create(null);
      circularA.abc = circularA;
      circularB.abc = circularB;

      assert.ok(isCyclical(circularA));
      assert.ok(isCyclical(circularB));
    });

    test("objects that are cyclical to another object should return true", function (assert) {
      let circularA = Object.create(null);
      let circularB = Object.create(null);
      circularA.abc = circularB;
      circularB.abc = circularA;

      assert.ok(isCyclical(circularA));
      assert.ok(isCyclical(circularB));
    });

    test("objects that are not cyclical should return false", function (assert) {
      let obj = Object.create(null);
      let objTwo = Object.create(null);
      let objThree = Object.create(null);

      objTwo.abc = null;
      objThree.id = 1;
      objThree.name = "Izel";
      objThree.records = [];

      assert.notOk(isCyclical(obj));
      assert.notOk(isCyclical(objTwo));
      assert.notOk(isCyclical(objThree));
    });

    test("objects that has cyclical references to itself in array should return true", function (assert) {
      let circularA = Object.create(null, {
        id: { value: 1, enumerable: true },
        name: { value: "Izel", enumerable: true },
        records: { value: [], enumerable: true },
      });
      let circularB = Object.create(null, {
        id: { value: 1, enumerable: true },
        name: { value: "Izel", enumerable: true },
        records: { value: [], enumerable: true },
      });

      circularA.records.push(circularA);
      circularB.records.push(circularB);

      assert.ok(isCyclical(circularA));
      assert.ok(isCyclical(circularB));
    });

    test("objects that has cyclical references to another object in array should return true", function (assert) {
      let circularA = Object.create(null, {
        id: { value: 1, enumerable: true },
        name: { value: "Izel", enumerable: true },
        records: { value: [], enumerable: true },
      });
      let circularB = Object.create(null, {
        id: { value: 1, enumerable: true },
        name: { value: "Izel", enumerable: true },
        records: { value: [], enumerable: true },
      });

      circularA.records.push(circularB);
      circularB.records.push(circularA);

      assert.ok(isCyclical(circularA));
      assert.ok(isCyclical(circularB));
    });
  });

  module("Map tests", function () {
    test("maps that are cyclical to itself should return true", function (assert) {
      let circularA = new Map();
      let circularB = new Map();
      circularA.set("abc", circularA);
      circularB.set("abc", circularB);

      assert.ok(isCyclical(circularA));
      assert.ok(isCyclical(circularB));
    });

    test("objects that are cyclical to another object should return true", function (assert) {
      let circularA = new Map();
      let circularB = new Map();
      circularA.set("abc", circularB);
      circularB.set("abc", circularA);

      assert.ok(isCyclical(circularA));
      assert.ok(isCyclical(circularB));
    });

    test("objects that are not cyclical should return false", function (assert) {
      let obj = new Map();
      let objTwo = makeMap({ abc: null });
      let objThree = makeMap({ id: 1, name: "Izel", records: [] });

      assert.notOk(isCyclical(obj));
      assert.notOk(isCyclical(objTwo));
      assert.notOk(isCyclical(objThree));
    });

    test("objects that has cyclical references to itself in array should return true", function (assert) {
      let circularA = makeMap({ id: 1, name: "Izel", records: [] });
      let circularB = makeMap({ id: 2, name: "Moris", records: [] });

      circularA.get("records").push(circularA);
      circularB.get("records").push(circularB);

      assert.ok(isCyclical(circularA));
      assert.ok(isCyclical(circularB));
    });

    test("objects that has cyclical references to another object in array should return true", function (assert) {
      let circularA = makeMap({ id: 1, name: "Izel", records: [] });
      let circularB = makeMap({ id: 2, name: "Moris", records: [] });

      circularA.get("records").push(circularB);
      circularB.get("records").push(circularA);

      assert.ok(isCyclical(circularA));
      assert.ok(isCyclical(circularB));
    });
  });

  module("instance tests", function () {
    class Human {
      id = 0;
      categoryType = "human";
      relationship = null;
      records = [];
    }
    class Animal {
      id = 0;
      categoryType = "animal";
      relationship = null;
      records = [];
    }

    test("objects that are cyclical to itself should return true", function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.relationship = circularA;
      circularB.relationship = circularB;

      assert.ok(isCyclical(circularA));
      assert.ok(isCyclical(circularB));
    });

    test("objects that are cyclical to another object should return true", function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.relationship = circularB;
      circularB.relationship = circularA;

      assert.ok(isCyclical(circularA));
      assert.ok(isCyclical(circularB));
    });

    test("objects that are not cyclical should return false", function (assert) {
      let human = new Human();
      let animal = new Animal();

      assert.notOk(isCyclical(human));
      assert.notOk(isCyclical(animal));
    });

    test("objects that has cyclical references to itself in array should return true", function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.records.push(circularA);
      circularB.records.push(circularB);

      assert.ok(isCyclical(circularA));
      assert.ok(isCyclical(circularB));
    });

    test("objects that has cyclical references to another object in array should return true", function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.records.push(circularB);
      circularB.records.push(circularA);

      assert.ok(isCyclical(circularA));
      assert.ok(isCyclical(circularB));
    });
  });

  module("array tests", function () {
    test("array that has objects that are cyclical to itself should return true", function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.relationship = circularA;
      circularB.relationship = circularB;

      assert.ok(isCyclical([circularA]));
      assert.ok(isCyclical([circularB]));
      assert.ok(isCyclical([circularA, circularB]));
    });

    test("array that has objects objects that are cyclical to another object should return true", function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.relationship = circularB;
      circularB.relationship = circularA;

      assert.ok(isCyclical([circularA]));
      assert.ok(isCyclical([circularB]));
    });

    test("array that doesnt have cyclical objects should return false", function (assert) {
      let obj = {};
      let objTwo = { abc: null };
      let objThree = { id: 1, name: "Izel", records: [] };
      let objFour = { abc: objTwo };

      assert.notOk(isCyclical([obj]));
      assert.notOk(isCyclical([objTwo]));
      assert.notOk(isCyclical([objThree]));
      assert.notOk(isCyclical([obj, objTwo, objThree]));
      assert.notOk(isCyclical([obj, obj, objTwo, objThree]));
      assert.notOk(isCyclical([obj, obj, objTwo, objThree, objFour]));
    });

    test("array that has objects that has cyclical references to itself in array should return true", function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.records.push(circularA);
      circularB.records.push(circularB);

      assert.ok(isCyclical([circularA]));
      assert.ok(isCyclical([circularB]));
      assert.ok(isCyclical([circularA, circularB]));
    });

    test("array element duplication circular references should be checked correctly", function (assert) {
      let obj = { abc: null };
      let objTwo = { abc: obj };

      let array = [objTwo, objTwo, objTwo, [objTwo, objTwo, [objTwo, objTwo, objTwo], objTwo]];

      assert.notOk(isCyclical(array));

      array.push(Array.from(array));

      assert.notOk(isCyclical(array));

      array.push(array);

      assert.ok(isCyclical(array));
    });

    test("utmost parent array circular reference check works", function (assert) {
      let obj = {};

      assert.notOk(isCyclical(obj));

      obj.foo = obj;

      assert.ok(isCyclical(obj));

      let array = [];

      assert.notOk(isCyclical(array));

      array[0] = array;

      assert.ok(isCyclical(array));
    });

    test("array that has objects that has cyclical references to another object in array should return true", function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.records.push(circularB);
      circularB.records.push(circularA);

      assert.ok(isCyclical([circularA]));
      assert.ok(isCyclical([circularB]));
      assert.ok(isCyclical([circularA, circularB]));
    });

    test("array inside array that has objects that are cyclical to itself should return true", function (assert) {
      let circularA = new Human();
      let circularB = new Animal();
      let obj = {};
      let objTwo = { abc: null };
      let objThree = { id: 1, name: "Izel", records: [] };

      circularA.relationship = circularA;

      assert.ok(isCyclical([obj, objTwo, objThree, [obj, circularA]]));
      assert.notOk(isCyclical([obj, objTwo, objThree, [obj, circularB, [circularB, circularB]]]));
    });
  });

  module("set tests", function () {
    test("array that has objects that are cyclical to itself should return true", function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.relationship = circularA;
      circularB.relationship = circularB;

      assert.ok(isCyclical(new Set([circularA])));
      assert.ok(isCyclical(new Set([circularB])));
    });

    test("array that has objects objects that are cyclical to another object should return true", function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.relationship = circularB;
      circularB.relationship = circularA;

      assert.ok(isCyclical(new Set([circularA])));
      assert.ok(isCyclical(new Set([circularB])));
      assert.ok(isCyclical(new Set([circularA, circularB])));
    });

    test("array that doesnt have cyclical objects should return false", function (assert) {
      let obj = {};
      let objTwo = { abc: null };
      let objThree = { id: 1, name: "Izel", records: [] };
      let objFour = { abc: objTwo };

      assert.notOk(isCyclical(new Set([obj])));
      assert.notOk(isCyclical(new Set([objTwo])));
      assert.notOk(isCyclical(new Set([objThree])));
      assert.notOk(isCyclical(new Set([obj, objTwo, objThree])));
      assert.notOk(isCyclical(new Set([obj, obj, objTwo, objThree])));
      assert.notOk(isCyclical(new Set([obj, obj, objTwo, objThree, objFour])));
    });

    test("array that has objects that has cyclical references to itself in array should return true", function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.records = new Set([circularA]);
      circularB.records = new Set([circularB]);

      assert.ok(isCyclical(new Set([circularA])));
      assert.ok(isCyclical([circularB]));
      assert.ok(isCyclical(new Set([circularA, circularB])));
    });

    test("array element duplication circular references should be checked correctly", function (assert) {
      let obj = { abc: null };
      let objTwo = { abc: obj };

      let array = new Set([
        objTwo,
        objTwo,
        objTwo,
        [objTwo, objTwo, [objTwo, objTwo, objTwo], objTwo],
      ]);

      assert.notOk(isCyclical(array));

      array.add(Array.from(array));

      assert.notOk(isCyclical(array));

      array.add(array);

      assert.ok(isCyclical(array));
    });

    test("utmost parent array circular reference check works", function (assert) {
      let obj = {};

      assert.notOk(isCyclical(obj));

      obj.foo = obj;

      assert.ok(isCyclical(obj));

      let array = new Set([]);

      assert.notOk(isCyclical(array));

      array.add(array);

      assert.ok(isCyclical(array));
    });

    test("array that has objects that has cyclical references to another object in array should return true", function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.records = new Set([circularB]);
      circularB.records = new Set([circularA]);

      assert.ok(isCyclical([circularA]));
      assert.ok(isCyclical([circularB]));
      assert.ok(isCyclical([circularA, circularB]));
    });

    test("array inside array that has objects that are cyclical to itself should return true", function (assert) {
      let circularA = new Human();
      let circularB = new Animal();
      let obj = {};
      let objTwo = { abc: null };
      let objThree = { id: 1, name: "Izel", records: [] };

      circularA.relationship = circularA;

      assert.ok(isCyclical(new Set([obj, objTwo, objThree, new Set([obj, new Set([circularA])])])));
      assert.notOk(
        isCyclical(new Set([obj, objTwo, objThree, [obj, circularB, [circularB, circularB]]]))
      );
    });
  });
});

function makeMap(object) {
  return Object.keys(object).reduce((map, key) => {
    map.set(key, object[key]);

    return map;
  }, new Map());
}
