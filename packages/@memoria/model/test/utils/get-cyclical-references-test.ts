import { module, test } from "qunitx";
import { getCyclicalReferences } from "@memoria/model";

module("@memoria/model | Utils | getCyclicalReferences", function (hooks) {
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
    test("objects that are cyclical to itself should show references correctly", function (assert) {
      let circularA = { abc: null };
      let circularB = { abc: null, isB: true };
      circularA.abc = circularA;
      circularB.abc = circularB;
      circularB.another = circularB;

      assert.deepEqual(getCyclicalReferences(circularA), { abc: circularA });
      assert.deepEqual(getCyclicalReferences(circularB), { abc: circularB, another: circularB });

      assert.deepEqual(getCyclicalReferences(circularA.abc), { abc: circularA });
      assert.deepEqual(getCyclicalReferences(circularB.abc), { abc: circularB, another: circularB });
    });

    test("objects that are cyclical to another object should show references correctly", function (assert) {
      let circularA = { abc: null };
      let circularB = { abc: null, isB: true };
      circularA.abc = circularB;
      circularB.abc = circularA;
      circularB.same = circularA;
      circularB.another = circularB;

      assert.deepEqual(getCyclicalReferences(circularA), { abc: circularB });
      assert.deepEqual(getCyclicalReferences(circularB), {
        abc: circularA,
        same: circularA,
        another: circularB,
      });
    });

    test("compare structures with multiple references to the same containers", function (assert) {
      var i;
      var x = {};
      var y = {};

      for (i = 0; i < 3; i++) {
        x = { foo: x, bar: x, baz: x };
        y = { foo: y, bar: y, baz: y };
      }

      assert.deepEqual(getCyclicalReferences(x), {});
      assert.deepEqual(getCyclicalReferences(y), {});

      x.foo.foo = y.foo;

      assert.deepEqual(getCyclicalReferences(x), {});
      assert.deepEqual(getCyclicalReferences(y), {});

      y.foo.foo = x;

      assert.deepEqual(Object.keys(getCyclicalReferences(x)), ["foo", "bar", "baz"]);
      assert.deepEqual(Object.keys(getCyclicalReferences(y)), ["foo", "bar", "baz"]);
    });

    test("objects that are not cyclical return empty object", function (assert) {
      let obj = {};
      let objTwo = { abc: null };
      let objThree = { id: 1, name: "Izel", records: [] };

      assert.deepEqual(getCyclicalReferences(obj), {});
      assert.deepEqual(getCyclicalReferences(objTwo), {});
      assert.deepEqual(getCyclicalReferences(objThree), {});
    });

    test("objects that has cyclical references to itself in array should be shown correctly", function (assert) {
      let circularA = { id: 1, name: "Izel", records: [] };
      let circularB = { id: 2, name: "Moris", records: [] };

      circularA.records.push(circularA);
      circularB.records.push(circularB);
      circularB.records.push({});
      circularB.records.push(circularA);
      circularA.ofB = circularB;

      assert.deepEqual(getCyclicalReferences(circularA), {
        ofB: { records: [circularB, circularA] },
        records: [circularA],
      });
      assert.deepEqual(getCyclicalReferences(circularB), { records: [circularB, circularA] });
    });

    test("objects that has cyclical references to another object in array should bew shown correclty", function (assert) {
      let circularA = { id: 1, name: "Izel", records: [] };
      let circularB = { id: 2, name: "Moris", records: [] };

      circularA.records.push(circularB);

      assert.deepEqual(getCyclicalReferences(circularA), {});
      assert.deepEqual(getCyclicalReferences(circularB), {});

      circularA.circularB = circularB;

      assert.deepEqual(getCyclicalReferences(circularA), {});
      assert.deepEqual(getCyclicalReferences(circularB), {});

      circularB.records.push(circularA);

      assert.deepEqual(getCyclicalReferences(circularB), { records: [circularA] });
      assert.deepEqual(getCyclicalReferences(circularA), {
        records: [circularB],
        circularB: { records: [circularA] },
      });
    });
  });

  module("normal objects when Object prototype constructor is null tests", function () {
    test("objects that are cyclical to itself should be shown correctly", function (assert) {
      let circularA = Object.create(null);
      let circularB = Object.create(null);
      circularA.abc = circularA;
      circularB.abc = circularB;
      circularB.another = circularB;

      assert.deepEqual(getCyclicalReferences(circularA), { abc: circularA });
      assert.deepEqual(getCyclicalReferences(circularB), { abc: circularB, another: circularB });
    });

    test("objects that are cyclical to another object should be shown correclty", function (assert) {
      let circularA = Object.create(null);
      let circularB = Object.create(null);
      circularA.abc = circularB;
      circularB.abc = circularA;
      circularB.same = circularA;
      circularB.another = circularB;

      assert.deepEqual(getCyclicalReferences(circularA), { abc: circularB });
      assert.deepEqual(getCyclicalReferences(circularB), { abc: circularA, same: circularA, another: circularB });
    });

    test("objects that are not cyclical should be shown correctly", function (assert) {
      let obj = Object.create(null);
      let objTwo = Object.create(null);
      let objThree = Object.create(null);

      objTwo.abc = null;
      objThree.id = 1;
      objThree.name = "Izel";
      objThree.records = [];

      assert.deepEqual(getCyclicalReferences(obj), {});
      assert.deepEqual(getCyclicalReferences(objTwo), {});
      assert.deepEqual(getCyclicalReferences(objThree), {});
    });

    test("objects that has cyclical references to itself in array should be shown correctly", function (assert) {
      let circularA = Object.create(null, {
        id: { value: 1, enumerable: true },
        name: { value: "Izel", enumerable: true },
        records: { value: [], enumerable: true },
      });
      let circularB = Object.create(null, {
        id: { value: 1, enumerable: true },
        name: { value: "Moris", enumerable: true },
        records: { value: [], enumerable: true },
      });

      circularA.records.push(circularA);
      circularB.records.push(circularB);

      assert.deepEqual(getCyclicalReferences(circularA), { records: [circularA] });
      assert.deepEqual(getCyclicalReferences(circularB), { records: [circularB] });
    });

    test("objects that has cyclical references to another object in array should be shown correctly", function (assert) {
      let circularA = Object.create(null, {
        id: { value: 1, enumerable: true },
        name: { value: "Izel", enumerable: true },
        records: { value: [], enumerable: true },
      });
      let circularB = Object.create(null, {
        id: { value: 1, enumerable: true },
        name: { value: "Moris", enumerable: true },
        records: { value: [], enumerable: true },
      });

      circularA.records.push(circularB);
      circularB.records.push(circularA);

      assert.deepEqual(getCyclicalReferences(circularA), { records: [circularB] });
      assert.deepEqual(getCyclicalReferences(circularB), { records: [circularA] });
    });
  });

  module("Map tests", function () {
    test("maps that are cyclical to itself should be shown correctly", function (assert) {
      let circularA = new Map();
      let circularB = new Map();
      circularA.set("abc", circularA);
      circularB.set("abc", circularB);

      assert.deepEqual(getCyclicalReferences(circularA), { abc: circularA });
      assert.deepEqual(getCyclicalReferences(circularB), { abc: circularB });
    });

    test("objects that are cyclical to another object should be shown correctly", function (assert) {
      let circularA = new Map();
      let circularB = new Map();
      circularA.set("abc", circularB);
      circularB.set("abc", circularA);

      assert.deepEqual(getCyclicalReferences(circularA), { abc: circularB });
      assert.deepEqual(getCyclicalReferences(circularB), { abc: circularA });
    });

    test("objects that are not cyclical should be shown correctly", function (assert) {
      let obj = new Map();
      let objTwo = makeMap({ abc: null });
      let objThree = makeMap({ id: 1, name: "Izel", records: [] });

      assert.deepEqual(getCyclicalReferences(obj), {});
      assert.deepEqual(getCyclicalReferences(objTwo), {});
      assert.deepEqual(getCyclicalReferences(objThree), {});
    });

    test("objects that has cyclical references to itself in array should be shown correctly", function (assert) {
      let circularA = makeMap({ id: 1, name: "Izel", records: [] });
      let circularB = makeMap({ id: 2, name: "Moris", records: [] });

      circularA.get("records").push(circularA);
      circularB.get("records").push(circularB);

      assert.deepEqual(getCyclicalReferences(circularA), { records: [circularA] });
      assert.deepEqual(getCyclicalReferences(circularB), { records: [circularB] });
    });

    test("objects that has cyclical references to another object in array should be shown correctly", function (assert) {
      let circularA = makeMap({ id: 1, name: "Izel", records: [] });
      let circularB = makeMap({ id: 2, name: "Moris", records: [] });

      circularA.get("records").push(circularB);
      circularB.get("records").push(circularA);

      assert.deepEqual(getCyclicalReferences(circularA), { records: [circularB] });
      assert.deepEqual(getCyclicalReferences(circularB), { records: [circularA] });
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

    test("objects that are cyclical to itself should be shown correctly", function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.relationship = circularA;
      circularB.relationship = circularB;

      assert.deepEqual(getCyclicalReferences(circularA), { relationship: circularA });
      assert.deepEqual(getCyclicalReferences(circularB), { relationship: circularB });
    });

    test("objects that are cyclical to another object should be shown correctly", function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.relationship = circularB;
      circularB.relationship = circularA;

      assert.deepEqual(getCyclicalReferences(circularA), { relationship: circularB });
      assert.deepEqual(getCyclicalReferences(circularB), { relationship: circularA });
    });

    test("objects that are not cyclical should be shown correctly", function (assert) {
      let human = new Human();
      let animal = new Animal();

      assert.deepEqual(getCyclicalReferences(human), {});
      assert.deepEqual(getCyclicalReferences(animal), {});
    });

    test("objects that has cyclical references to itself in array should be shown correctly", function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.records.push(circularA);
      circularB.records.push(circularB);

      assert.deepEqual(getCyclicalReferences(circularA), { records: [circularA] });
      assert.deepEqual(getCyclicalReferences(circularB), { records: [circularB] });
    });

    test("objects that has cyclical references to another object in array should be shown correctly", function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.records.push(circularB);
      circularB.records.push(circularA);

      assert.deepEqual(getCyclicalReferences(circularA), { records: [circularB] });
      assert.deepEqual(getCyclicalReferences(circularB), { records: [circularA] });
    });
  });

  module("array tests", function () {
    test("array that has objects that are cyclical to itself should be shown correctly", function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.relationship = circularA;
      circularB.relationship = circularB;

      assert.deepEqual(getCyclicalReferences([circularA]), [{ relationship: circularA }]);
      assert.deepEqual(getCyclicalReferences([circularB]), [{ relationship: circularB }]);
      assert.deepEqual(getCyclicalReferences([circularA, circularA]), [
        { relationship: circularA },
        { relationship: circularA },
      ]);
    });

    test("array that has objects objects that are cyclical to another object should be shown correctly", function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.relationship = circularB;
      circularB.relationship = circularA;

      assert.deepEqual(getCyclicalReferences([circularA]), [{ relationship: circularB }]);
      assert.deepEqual(getCyclicalReferences([circularB]), [{ relationship: circularA }]);
    });

    test("array that doesnt have cyclical objects should be shown correctly", function (assert) {
      let obj = {};
      let objTwo = { abc: null };
      let objThree = { id: 1, name: "Izel", records: [] };
      let objFour = { abc: objTwo };

      assert.deepEqual(getCyclicalReferences([obj]), []);
      assert.deepEqual(getCyclicalReferences([objTwo]), []);
      assert.deepEqual(getCyclicalReferences([objThree]), []);
      assert.deepEqual(getCyclicalReferences([obj, objTwo, objThree]), []);
      assert.deepEqual(getCyclicalReferences([obj, obj, objTwo, objThree]), []);
      assert.deepEqual(getCyclicalReferences([obj, obj, objTwo, objThree, objFour]), []);
    });

    test("array that has objects that has cyclical references to itself in array should be shown correctly", function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.records.push(circularA);
      circularB.records.push(circularB);

      assert.deepEqual(getCyclicalReferences([circularA]), [{ records: [circularA] }]);
      assert.deepEqual(getCyclicalReferences([circularB]), [{ records: [circularB] }]);
      assert.deepEqual(getCyclicalReferences([circularA, circularB]), [
        { records: [circularA] },
        { records: [circularB] },
      ]);
    });

    test("array element duplication circular references should be shown correctly", function (assert) {
      let obj = { abc: null };
      let objTwo = { abc: obj };

      let array = [objTwo, objTwo, objTwo, [objTwo, objTwo, [objTwo, objTwo, objTwo], objTwo]];

      assert.deepEqual(getCyclicalReferences(array), []);

      array.push(Array.from(array));

      assert.deepEqual(getCyclicalReferences(array), []);

      array.push(array);

      assert.deepEqual(getCyclicalReferences(array), [array]);
    });

    test("utmost parent array circular reference should be shown correctly", function (assert) {
      let obj = {};

      assert.deepEqual(getCyclicalReferences(obj), {});

      obj.foo = obj;

      assert.deepEqual(getCyclicalReferences(obj), { foo: obj });

      let array = [];

      assert.deepEqual(getCyclicalReferences(array), []);

      array[0] = array;

      assert.deepEqual(getCyclicalReferences(array), [array]);
    });

    test("array that has objects that has cyclical references to another object in array should be shown correctly", function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.records.push(circularB);
      circularB.records.push(circularA);

      assert.deepEqual(getCyclicalReferences([circularA]), [{ records: [circularB] }]);
      assert.deepEqual(getCyclicalReferences([circularB]), [{ records: [circularA] }]);
      assert.deepEqual(getCyclicalReferences([circularA, circularB]), [
        { records: [circularB] },
        { records: [circularA] },
      ]);
    });

    test("array inside array that has objects that are cyclical to itself should be shown correctly", function (assert) {
      let circularA = new Human();
      let circularB = new Animal();
      let obj = {};
      let objTwo = { abc: null };
      let objThree = { id: 1, name: "Izel", records: [] };

      circularA.relationship = circularA;

      assert.deepEqual(getCyclicalReferences([obj, objTwo, objThree, [obj, [circularA]]]), [
        [[{ relationship: circularA }]],
      ]);
      assert.deepEqual(getCyclicalReferences([obj, objTwo, objThree, [obj, circularB, [circularB, circularB]]]), []);
    });
  });

  module("set tests", function () {
    test("array that has objects that are cyclical to itself should be shown correctly", function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.relationship = circularA;
      circularB.relationship = circularB;

      assert.deepEqual(getCyclicalReferences(new Set([circularA])), [{ relationship: circularA }]);
      assert.deepEqual(getCyclicalReferences(new Set([circularB])), [{ relationship: circularB }]);
    });

    test("array that has objects objects that are cyclical to another object should be shown correctly", function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.relationship = circularB;
      circularB.relationship = circularA;

      assert.deepEqual(getCyclicalReferences(new Set([circularA])), [{ relationship: circularB }]);
      assert.deepEqual(getCyclicalReferences(new Set([circularB])), [{ relationship: circularA }]);
      assert.deepEqual(getCyclicalReferences(new Set([circularA, circularB])), [
        { relationship: circularB },
        { relationship: circularA },
      ]);
    });

    test("array that doesnt have cyclical objects should be shown correctly", function (assert) {
      let obj = {};
      let objTwo = { abc: null };
      let objThree = { id: 1, name: "Izel", records: [] };
      let objFour = { abc: objTwo };

      assert.deepEqual(getCyclicalReferences(new Set([obj])), []);
      assert.deepEqual(getCyclicalReferences(new Set([objTwo])), []);
      assert.deepEqual(getCyclicalReferences(new Set([objThree])), []);
      assert.deepEqual(getCyclicalReferences(new Set([obj, objTwo, objThree])), []);
      assert.deepEqual(getCyclicalReferences(new Set([obj, obj, objTwo, objThree])), []);
      assert.deepEqual(getCyclicalReferences(new Set([obj, obj, objTwo, objThree, objFour])), []);
    });

    test("array that has objects that has cyclical references to itself twice in array should be shown correctly", function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.records = new Set([circularA]);
      circularB.records = new Set([circularB]);

      assert.deepEqual(getCyclicalReferences(new Set([circularA])), [{ records: new Set([circularA]) }]);
      assert.deepEqual(getCyclicalReferences([circularB]), [{ records: new Set([circularB]) }]);
      assert.deepEqual(getCyclicalReferences(new Set([circularA, circularB])), [
        { records: new Set([circularA]) },
        { records: new Set([circularB]) },
      ]);

      let anotherA = { id: 1, name: "Izel", records: [] };
      let anotherB = { id: 2, name: "Moris", records: [] };

      anotherA.records.push(anotherA);
      anotherB.records.push(anotherB);

      assert.deepEqual(getCyclicalReferences(anotherA), { records: [anotherA] });
      assert.deepEqual(getCyclicalReferences(anotherB), { records: [anotherB] });

      anotherA.records.push(anotherA);
      anotherB.records.push(anotherB);

      assert.deepEqual(getCyclicalReferences(anotherA), { records: [anotherA, anotherA] });
      assert.deepEqual(getCyclicalReferences(anotherB), { records: [anotherB, anotherB] });
    });

    test("array element duplication circular references should be shown correctly", function (assert) {
      let obj = { abc: null };
      let objTwo = { abc: obj };

      let array = new Set([objTwo, objTwo, objTwo, [objTwo, objTwo, [objTwo, objTwo, objTwo], objTwo]]);

      assert.deepEqual(getCyclicalReferences(array), []);

      array.add(Array.from(array));

      assert.deepEqual(getCyclicalReferences(array), []);

      array.add(array);

      assert.deepEqual(getCyclicalReferences(array), [array]);
    });

    test("utmost parent array circular reference should be shown correctly", function (assert) {
      let obj = {};

      assert.deepEqual(getCyclicalReferences(obj), {});

      obj.foo = obj;

      assert.deepEqual(getCyclicalReferences(obj), { foo: obj });

      let array = new Set([]);

      assert.deepEqual(getCyclicalReferences(array), []);

      array.add(array);

      assert.deepEqual(getCyclicalReferences(array), [array]);
    });

    test("array that has objects that has cyclical references to another object in array should be shown correctly", function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.records = new Set([circularB]);
      circularB.records = new Set([circularA]);

      assert.deepEqual(getCyclicalReferences([circularA]), [{ records: new Set([circularB]) }]);
      assert.deepEqual(getCyclicalReferences([circularB]), [{ records: new Set([circularA]) }]);
      assert.deepEqual(getCyclicalReferences([circularA, circularB]), [
        { records: new Set([circularB]) },
        { records: new Set([circularA]) },
      ]);
    });

    test("array inside array that has objects that are cyclical to itself should be shown correctly", function (assert) {
      let circularA = new Human();
      let circularB = new Animal();
      let obj = {};
      let objTwo = { abc: null };
      let objThree = { id: 1, name: "Izel", records: [] };

      circularA.relationship = circularA;

      assert.deepEqual(getCyclicalReferences(new Set([obj, objTwo, objThree, new Set([obj, new Set([circularA])])])), [
        [[{ relationship: circularA }]],
      ]);
      assert.deepEqual(
        getCyclicalReferences(new Set([obj, objTwo, objThree, [obj, circularB, [circularB, circularB]]])),
        []
      );
    });
  });

  module("Edge cases", function () {
    test("array with object creation inside works correctly", function (assert) {
      let circularA = { id: 1, name: "Izel", records: [] };
      let circularB = { id: 2, name: "Moris", records: [] };

      circularA.records.push(circularA);
      circularB.records.push(circularB);

      assert.deepEqual(getCyclicalReferences(circularA), { records: [circularA] });
      assert.deepEqual(getCyclicalReferences([{ records: [circularA] }]), [{ records: [{ records: [circularA] }] }]);
      assert.deepEqual(getCyclicalReferences([{ records: [circularB] }]), [{ records: [{ records: [circularB] }] }]);

      circularA.records.push(circularA);
      circularB.records.push(circularB);

      assert.deepEqual(getCyclicalReferences([{ records: [circularA, circularA] }]), [
        { records: [{ records: [circularA, circularA] }, { records: [circularA, circularA] }] },
      ]);
      assert.deepEqual(getCyclicalReferences([{ records: [circularB, circularB] }]), [
        { records: [{ records: [circularB, circularB] }, { records: [circularB, circularB] }] },
      ]);
      assert.deepEqual(getCyclicalReferences([circularA, circularA]), [
        { records: [circularA, circularA] },
        { records: [circularA, circularA] },
      ]);
      assert.deepEqual(getCyclicalReferences([circularB, circularB]), [
        { records: [circularB, circularB] },
        { records: [circularB, circularB] },
      ]);
    });
  });
});

function makeMap(object) {
  return Object.keys(object).reduce((map, key) => {
    map.set(key, object[key]);

    return map;
  }, new Map());
}
