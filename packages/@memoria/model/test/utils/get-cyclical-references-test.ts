// TODO: add JS Set() tests to both this test suite and to is-cyclical
import { module, test } from "qunitx";
import { getCyclicalReferences } from "@memoria/model";

// NOTE: also add multiple references of the same type to tests
module("@memoria/model | Utils | getCyclicalReferences", function (hooks) {
  class Human {
    id = 0;
    categoryType = 'human';
    relationship = null;
    records = [];
  }
  class Animal {
    id = 0;
    categoryType = 'animal';
    relationship = null;
    records = [];
  }

  module('normal objects tests', function () {
    test('objects that are cyclical to itself should return true', function (assert) {
      let circularA = { abc: null };
      let circularB = { abc: null, isB: true };
      circularA.abc = circularA;
      circularB.abc = circularB;

      assert.deepEqual(getCyclicalReferences(circularA), { abc: circularA });
      assert.deepEqual(getCyclicalReferences(circularB), { abc: circularB });
    });

    test('objects that are cyclical to another object should return true', function (assert) {
      let circularA = { abc: null };
      let circularB = { abc: null, isB: true };
      circularA.abc = circularB;
      circularB.abc = circularA;

      assert.deepEqual(getCyclicalReferences(circularA), { abc: circularB });
      assert.deepEqual(getCyclicalReferences(circularB), { abc: circularA });
    });

    test('compare structures with multiple references to the same containers', function (assert) {
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

      assert.deepEqual(Object.keys(getCyclicalReferences(x)), ['foo', 'bar', 'baz']);
      // assert.deepEqual(getCyclicalReferences(x), x);
      assert.deepEqual(Object.keys(getCyclicalReferences(y)), ['foo', 'bar', 'baz']);
      // assert.deepEqual(getCyclicalReferences(y), y);
    });

    test('objects that are not cyclical should return false', function (assert) {
      let obj = {};
      let objTwo = { abc: null };
      let objThree = { id: 1, name: 'Izel', records: [] };

      assert.deepEqual(getCyclicalReferences(obj), {});
      assert.deepEqual(getCyclicalReferences(objTwo), {});
      assert.deepEqual(getCyclicalReferences(objThree), {});
    });

    test('objects that has cyclical references to itself in array should return true', function (assert) {
      let circularA = { id: 1, name: 'Izel', records: [] };
      let circularB = { id: 2, name: 'Moris', records: [] };

      circularA.records.push(circularA);
      circularB.records.push(circularB);

      assert.deepEqual(getCyclicalReferences(circularA), { records: [circularA] });
      assert.deepEqual(getCyclicalReferences(circularB), { records: [circularB] });
    });

    test('objects that has cyclical references to another object in array should return true', function (assert) {
      let circularA = { id: 1, name: 'Izel', records: [] };
      let circularB = { id: 2, name: 'Moris', records: [] };

      circularA.records.push(circularB);

      assert.deepEqual(getCyclicalReferences(circularA), {});
      assert.deepEqual(getCyclicalReferences(circularB), {});

      circularA.circularB = circularB;

      assert.deepEqual(getCyclicalReferences(circularA), {});
      assert.deepEqual(getCyclicalReferences(circularB), {});

      circularB.records.push(circularA);

      assert.deepEqual(getCyclicalReferences(circularB), { records: [circularA] });
      assert.deepEqual(getCyclicalReferences(circularA), { records: [circularB], circularB: { records: [circularA] } });
    });
  });

  module('normal objects when Object prototype constructor is null tests', function() {
    test('objects that are cyclical to itself should return true', function (assert) {
      let circularA = Object.create(null);
      let circularB = Object.create(null);
      circularA.abc = circularA;
      circularB.abc = circularB;

      assert.deepEqual(getCyclicalReferences(circularA), { abc: circularA });
      assert.deepEqual(getCyclicalReferences(circularB), { abc: circularB });
    });

    test('objects that are cyclical to another object should return true', function (assert) {
      let circularA = Object.create(null);
      let circularB = Object.create(null);
      circularA.abc = circularB;
      circularB.abc = circularA;

      assert.deepEqual(getCyclicalReferences(circularA), { abc: circularB });
      assert.deepEqual(getCyclicalReferences(circularB), { abc: circularA });
    });

    test('objects that are not cyclical should return false', function (assert) {
      let obj = Object.create(null);
      let objTwo = Object.create(null);
      let objThree = Object.create(null);

      objTwo.abc = null;
      objThree.id = 1;
      objThree.name = 'Izel';
      objThree.records = [];

      assert.deepEqual(getCyclicalReferences(obj), {});
      assert.deepEqual(getCyclicalReferences(objTwo), {});
      assert.deepEqual(getCyclicalReferences(objThree), {});
    });

    test('objects that has cyclical references to itself in array should return true', function (assert) {
      let circularA = Object.create(null, {
        id: { value: 1, enumerable: true },
        name: { value: 'Izel', enumerable: true },
        records: { value: [], enumerable: true }
      });
      let circularB = Object.create(null, {
        id: { value: 1, enumerable: true },
        name: { value: 'Moris', enumerable: true },
        records: { value: [], enumerable: true }
      });

      circularA.records.push(circularA);
      circularB.records.push(circularB);

      assert.deepEqual(getCyclicalReferences(circularA), { records: [circularA] });
      assert.deepEqual(getCyclicalReferences(circularB), { records: [circularB] });
    });

    test('objects that has cyclical references to another object in array should return true', function (assert) {
      let circularA = Object.create(null, {
        id: { value: 1, enumerable: true },
        name: { value: 'Izel', enumerable: true },
        records: { value: [], enumerable: true }
      });
      let circularB = Object.create(null, {
        id: { value: 1, enumerable: true },
        name: { value: 'Moris', enumerable: true },
        records: { value: [], enumerable: true }
      });

      circularA.records.push(circularB);
      circularB.records.push(circularA);

      assert.deepEqual(getCyclicalReferences(circularA), { records: [circularB] });
      assert.deepEqual(getCyclicalReferences(circularB), { records: [circularA] });
    });
  });

  module('Map tests', function () {
    test('maps that are cyclical to itself should return true', function (assert) {
      let circularA = new Map();
      let circularB = new Map()
      circularA.set('abc', circularA);
      circularB.set('abc', circularB);

      assert.deepEqual(getCyclicalReferences(circularA), { abc: circularA });
      assert.deepEqual(getCyclicalReferences(circularB), { abc: circularB });
    });

    test('objects that are cyclical to another object should return true', function (assert) {
      let circularA = new Map();
      let circularB = new Map()
      circularA.set('abc', circularB);
      circularB.set('abc', circularA);

      assert.deepEqual(getCyclicalReferences(circularA), { abc: circularB });
      assert.deepEqual(getCyclicalReferences(circularB), { abc: circularA });
    });

    test('objects that are not cyclical should return false', function (assert) {
      let obj = new Map();
      let objTwo = makeMap({ abc: null });
      let objThree = makeMap({ id: 1, name: 'Izel', records: [] });

      assert.deepEqual(getCyclicalReferences(obj), {});
      assert.deepEqual(getCyclicalReferences(objTwo), {});
      assert.deepEqual(getCyclicalReferences(objThree), {});
    });

    test('objects that has cyclical references to itself in array should return true', function (assert) {
      let circularA = makeMap({ id: 1, name: 'Izel', records: [] });
      let circularB = makeMap({ id: 2, name: 'Moris', records: [] });

      circularA.get('records').push(circularA);
      circularB.get('records').push(circularB);

      assert.deepEqual(getCyclicalReferences(circularA), { records: [circularA] });
      assert.deepEqual(getCyclicalReferences(circularB), { records: [circularB] });
    });

    test('objects that has cyclical references to another object in array should return true', function (assert) {
      let circularA = makeMap({ id: 1, name: 'Izel', records: [] });
      let circularB = makeMap({ id: 2, name: 'Moris', records: [] });

      circularA.get('records').push(circularB);
      circularB.get('records').push(circularA);

      assert.deepEqual(getCyclicalReferences(circularA), { records: [circularB] });
      assert.deepEqual(getCyclicalReferences(circularB), { records: [circularA] });
    });
  });

  module('instance tests', function () {
    class Human {
      id = 0;
      categoryType = 'human';
      relationship = null;
      records = [];
    }
    class Animal {
      id = 0;
      categoryType = 'animal';
      relationship = null;
      records = [];
    }

    test('objects that are cyclical to itself should return true', function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.relationship = circularA;
      circularB.relationship = circularB;

      assert.deepEqual(getCyclicalReferences(circularA), { relationship: circularA });
      assert.deepEqual(getCyclicalReferences(circularB), { relationship: circularB });
    });

    test('objects that are cyclical to another object should return true', function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.relationship = circularB;
      circularB.relationship = circularA;

      assert.deepEqual(getCyclicalReferences(circularA), { relationship: circularB });
      assert.deepEqual(getCyclicalReferences(circularB), { relationship: circularA });
    });

    test('objects that are not cyclical should return false', function (assert) {
      let human = new Human();
      let animal = new Animal();

      assert.deepEqual(getCyclicalReferences(human), {});
      assert.deepEqual(getCyclicalReferences(animal), {});
    });

    test('objects that has cyclical references to itself in array should return true', function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.records.push(circularA);
      circularB.records.push(circularB);

      assert.deepEqual(getCyclicalReferences(circularA), { records: [circularA] });
      assert.deepEqual(getCyclicalReferences(circularB), { records: [circularB] });
    });

    test('objects that has cyclical references to another object in array should return true', function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.records.push(circularB);
      circularB.records.push(circularA);

      assert.deepEqual(getCyclicalReferences(circularA), { records: [circularB] });
      assert.deepEqual(getCyclicalReferences(circularB), { records: [circularA] });
    });
  });

  module('array tests', function () {
    test('array that has objects that are cyclical to itself should return true', function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.relationship = circularA;
      circularB.relationship = circularB;

      assert.deepEqual(getCyclicalReferences([circularA]), [{ relationship: circularA }]);
      assert.deepEqual(getCyclicalReferences([circularB]), [{ relationship: circularB }]);
      assert.deepEqual(getCyclicalReferences([circularA, circularA]), [
        { relationship: circularA },
        { relationship: circularA }
      ]);
    });

    test('array that has objects objects that are cyclical to another object should return true', function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.relationship = circularB;
      circularB.relationship = circularA;

      assert.deepEqual(getCyclicalReferences([circularA]), [{ relationship: circularB }]);
      assert.deepEqual(getCyclicalReferences([circularB]), [{ relationship: circularA }]);
    });

    test('array that doesnt have cyclical objects should return false', function (assert) {
      let obj = {};
      let objTwo = { abc: null };
      let objThree = { id: 1, name: 'Izel', records: [] };
      let objFour = { abc: objTwo };

      assert.deepEqual(getCyclicalReferences([obj]), []);
      assert.deepEqual(getCyclicalReferences([objTwo]), []);
      assert.deepEqual(getCyclicalReferences([objThree]), []);
      assert.deepEqual(getCyclicalReferences([obj, objTwo, objThree]), []);
      assert.deepEqual(getCyclicalReferences([obj, obj, objTwo, objThree]), []);
      assert.deepEqual(getCyclicalReferences([obj, obj, objTwo, objThree, objFour]), []);
    });

    test('array that has objects that has cyclical references to itself in array should return true', function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.records.push(circularA);
      circularB.records.push(circularB);

      assert.deepEqual(getCyclicalReferences([circularA]), [{ records: [circularA] }]);
      assert.deepEqual(getCyclicalReferences([circularB]), [{ records: [circularB] }]);
      assert.deepEqual(getCyclicalReferences([circularA, circularB]), [
        { records: [circularA] },
        { records: [circularB] }
      ]);
    });

    test('array element duplication circular references should be checked correctly', function (assert) {
      let obj = { abc: null };
      let objTwo = { abc: obj };

      let array = [objTwo, objTwo, objTwo, [objTwo, objTwo, [objTwo, objTwo, objTwo], objTwo]];

      assert.deepEqual(getCyclicalReferences(array), []);

      array.push(Array.from(array));

      assert.deepEqual(getCyclicalReferences(array), []);

      array.push(array);

      assert.deepEqual(getCyclicalReferences(array), [array]);
    });

    test('utmost parent array circular reference check works', function (assert) {
      let obj = {};

      assert.deepEqual(getCyclicalReferences(obj), {});

      obj.foo = obj;

      assert.deepEqual(getCyclicalReferences(obj), { foo: obj });

      let array = [];

      assert.deepEqual(getCyclicalReferences(array), []);

      array[0] = array;

      assert.deepEqual(getCyclicalReferences(array), [array]);
    });

    test('array that has objects that has cyclical references to another object in array should return true', function (assert) {
      let circularA = new Human();
      let circularB = new Animal();

      circularA.records.push(circularB);
      circularB.records.push(circularA);

      assert.deepEqual(getCyclicalReferences([circularA]), [{ records: [circularB] }]);
      assert.deepEqual(getCyclicalReferences([circularB]), [{ records: [circularA] }]);
      assert.deepEqual(getCyclicalReferences([circularA, circularB]), [
        { records: [circularB] },
        { records: [circularA] }
      ]);
    });

    test('array inside array that has objects that are cyclical to itself should return true', function (assert) {
      let circularA = new Human();
      let circularB = new Animal();
      let obj = {};
      let objTwo = { abc: null };
      let objThree = { id: 1, name: 'Izel', records: [] };

      circularA.relationship = circularA;

      assert.deepEqual(getCyclicalReferences([obj, objTwo, objThree, [obj, circularA]]), [
        [{ relationship: circularA }],
      ]);
      assert.deepEqual(getCyclicalReferences([obj, objTwo, objThree, [obj, circularB, [circularB, circularB]]]), []);
    });
  });
});

function makeMap(object) {
  return Object.keys(object).reduce((map, key) => {
    map.set(key, object[key]);

    return map;
  }, new Map());
}
