import { getConstructor, instanceOf } from "@memoria/model";
import { module, test } from "qunitx";

module("@memoria/model | Utils | constructor", function (hooks) {
  class Human {}
  class Person extends Human {}
  class Student extends Person {}
  class NewArray extends Array {}

  module("getConstructor tests", function () {
    test("getConstructor works for primitive values", async function (assert) {
      assert.strictEqual(getConstructor(true), Boolean);
      assert.strictEqual(getConstructor(false), Boolean);
      assert.strictEqual(getConstructor(undefined), null);
      assert.strictEqual(getConstructor(null), null);
      assert.strictEqual(getConstructor(""), String);
      assert.strictEqual(getConstructor("something"), String);
      assert.strictEqual(getConstructor(-33), Number);
      assert.strictEqual(getConstructor(0), Number);
      assert.strictEqual(getConstructor(5000), Number);
      assert.strictEqual(getConstructor(BigInt(Number.MAX_SAFE_INTEGER) + 2n), BigInt);
      assert.strictEqual(getConstructor(Symbol("")), Symbol);
      assert.strictEqual(getConstructor(Symbol("a")), Symbol);
      assert.strictEqual(getConstructor(Symbol("abc")), Symbol);
    });

    test("getConstructor works for object values", async function (assert) {
      assert.strictEqual(getConstructor(new Date()), Date);
      assert.strictEqual(getConstructor({}), Object);
      assert.strictEqual(getConstructor({ a: "something", exist: true }), Object);
      assert.strictEqual(getConstructor([]), Array);
      assert.strictEqual(getConstructor(["a", true, 55]), Array);
      assert.strictEqual(getConstructor(new Set()), Set);
      assert.strictEqual(getConstructor(new Map()), Map);
      assert.strictEqual(getConstructor(new Error("something")), Error);
      assert.strictEqual(getConstructor(new WeakSet()), WeakSet);
      assert.strictEqual(getConstructor(new WeakMap()), WeakMap);
      assert.strictEqual(
        getConstructor(() => {}),
        Function
      );
      assert.strictEqual(
        getConstructor(function () {}),
        Function
      );

      let obj = Object.create(null);
      obj["a"] = "something";

      assert.strictEqual(getConstructor(obj), Object);

      let map = new Map();
      map.set("a", "something");
      map.set("exist", true);

      assert.strictEqual(getConstructor(map), Map);

      let set = new Set(["a", true, 55]);

      assert.strictEqual(getConstructor(set), Set);
    });

    test("getConstructor works for default classes", async function (assert) {
      assert.strictEqual(getConstructor(Date), Function);
      assert.strictEqual(getConstructor(Object), Function);
      assert.strictEqual(getConstructor(Array), Function);
      assert.strictEqual(getConstructor(Set), Function);
      assert.strictEqual(getConstructor(Map), Function);
      assert.strictEqual(getConstructor(Error), Function);
      assert.strictEqual(getConstructor(WeakSet), Function);
      assert.strictEqual(getConstructor(WeakMap), Function);
      assert.strictEqual(getConstructor(Function), Function); // TODO: this could be problematic
    });

    test("getConstructor works custom inherited instances", async function (assert) {
      assert.strictEqual(getConstructor(new Human()), Human);
      assert.strictEqual(getConstructor(new Person()), Person);
      assert.strictEqual(getConstructor(new Student()), Student);
      assert.strictEqual(getConstructor(new NewArray()), NewArray);
    });

    test("getConstructor works custom inherited classes", async function (assert) {
      assert.strictEqual(getConstructor(Human), Function);
      assert.strictEqual(getConstructor(Person), Function);
      assert.strictEqual(getConstructor(Student), Function);
      assert.strictEqual(getConstructor(NewArray), Function);
    });
  });

  module("instanceOf tests", function () {
    test("instanceOf works for primitive values", async function (assert) {
      assert.true(instanceOf(true, Boolean));
      assert.true(instanceOf(false, Boolean));
      assert.true(instanceOf("", String));
      assert.true(instanceOf("something", String));
      assert.true(instanceOf(-33, Number));
      assert.true(instanceOf(0, Number));
      assert.true(instanceOf(5000, Number));
      assert.true(instanceOf(BigInt(Number.MAX_SAFE_INTEGER) + 2n, BigInt));
      assert.true(instanceOf(Symbol(""), Symbol));
      assert.true(instanceOf(Symbol("a"), Symbol));
      assert.true(instanceOf(Symbol("abc"), Symbol));
    });

    test("instanceOf correctly fails for primitive values", async function (assert) {
      assert.throws(() => instanceOf(null, undefined), /Right-hand side of/);
      assert.throws(() => instanceOf(false, null), /Right-hand side of/);
      assert.throws(() => instanceOf(null, Object), /Left-hand side of/);
      assert.throws(() => instanceOf(undefined, Object), /Left-hand side of/);
      assert.notOk(instanceOf(true, String));
      assert.notOk(instanceOf(false, Number));
      assert.notOk(instanceOf("", Number));
      assert.notOk(instanceOf("something", Boolean));
      assert.notOk(instanceOf(-33, String));
      assert.notOk(instanceOf(0, Boolean));
      assert.notOk(instanceOf(5000, String));
      assert.notOk(instanceOf(BigInt(Number.MAX_SAFE_INTEGER) + 2n, Number));
      assert.notOk(instanceOf(Symbol(""), String));
      assert.notOk(instanceOf(Symbol("a"), Boolean));
    });

    test("instanceOf works for object values", async function (assert) {
      assert.true(instanceOf(new Date(), Date));
      assert.true(instanceOf({}, Object));
      assert.true(instanceOf({ a: "something", exist: true }, Object));
      assert.true(instanceOf([], Array));
      assert.true(instanceOf(["a", true, 55], Array));
      assert.true(instanceOf(new Set(), Set));
      assert.true(instanceOf(new Map(), Map));
      assert.true(instanceOf(new Error("something"), Error));
      assert.true(instanceOf(new WeakSet(), WeakSet));
      assert.true(instanceOf(new WeakMap(), WeakMap));
      assert.true(instanceOf(() => {}, Function));
      assert.true(instanceOf(function () {}, Function));

      let obj = Object.create(null);
      obj["a"] = "something";

      assert.true(instanceOf(obj, Object));

      let map = new Map();
      map.set("a", "something");
      map.set("exist", true);

      assert.true(instanceOf(map, Map));

      let set = new Set(["a", true, 55]);

      assert.true(instanceOf(set, Set));
    });

    test("instanceOf works for object values when constructor is in the chain", async function (assert) {
      assert.true(instanceOf(new Date(), Object));
      assert.true(instanceOf([], Object));
      assert.true(instanceOf(new Set(), Object));
      assert.true(instanceOf(new Map(), Object));
      assert.true(instanceOf(new Error("something"), Object));
      assert.true(instanceOf(new WeakSet(), Object));
      assert.true(instanceOf(new WeakMap(), Object));
      assert.true(instanceOf(() => {}, Object));
      assert.true(instanceOf(function () {}, Object));

      let map = new Map();
      map.set("a", "something");
      map.set("exist", true);

      assert.true(instanceOf(map, Object));

      let set = new Set(["a", true, 55]);

      assert.true(instanceOf(set, Object));
    });

    test("instanceOf correctly fails for object values", async function (assert) {
      assert.notOk(instanceOf(new Date(), String));
      assert.notOk(instanceOf({}, String));
      assert.notOk(instanceOf({ a: "something", exist: true }, Map));
      assert.notOk(instanceOf([], Set));
      assert.notOk(instanceOf(new Map(), Set));
      assert.notOk(instanceOf(new Error("something"), Array));
      assert.notOk(instanceOf(new WeakSet(), Set));
      assert.notOk(instanceOf(new WeakMap(), Map));
      assert.notOk(instanceOf(() => {}, String));
      assert.notOk(instanceOf(function () {}, Boolean));

      let obj = Object.create(null);
      obj["a"] = "something";

      assert.notOk(instanceOf(obj, Array));

      let map = new Map();
      map.set("a", "something");
      map.set("exist", true);

      assert.notOk(instanceOf(map, Array));

      let set = new Set(["a", true, 55]);

      assert.notOk(instanceOf(set, Array));
    });

    test("instanceOf works for default classes", async function (assert) {
      assert.true(instanceOf(Date, Object));
      assert.true(instanceOf(Date, Function));
      assert.true(instanceOf(Object, Function));
      assert.true(instanceOf(Array, Object));
      assert.true(instanceOf(Set, Object));
      assert.true(instanceOf(Map, Object));
      assert.true(instanceOf(Error, Object));
      assert.true(instanceOf(WeakSet, Object));
      assert.true(instanceOf(WeakMap, Object));
      assert.true(instanceOf(Function, Function));
      assert.true(instanceOf(Function, Object));
      assert.true(instanceOf(Boolean, Object));
    });

    test("instanceOf correctly fails for default classes", async function (assert) {
      assert.notOk(instanceOf(Date, Set));
      assert.notOk(instanceOf(Date, Array));
      assert.notOk(instanceOf(Object, Array));
      assert.notOk(instanceOf(Array, Set));
      assert.notOk(instanceOf(Set, Array));
      assert.notOk(instanceOf(Map, WeakMap));
      assert.notOk(instanceOf(Error, WeakSet));
      assert.notOk(instanceOf(WeakSet, Set));
      assert.notOk(instanceOf(WeakMap, Map));
      assert.notOk(instanceOf(Function, Array));
      assert.notOk(instanceOf(Boolean, Number));
    });

    test("instanceOf works custom inherited instances", async function (assert) {
      let human = new Human();
      let person = new Person();
      let student = new Student();
      let newArray = new NewArray();

      assert.true(instanceOf(human, Human));
      assert.true(instanceOf(person, Person));
      assert.true(instanceOf(student, Student));
      assert.true(instanceOf(newArray, NewArray));

      assert.true(instanceOf(human, Object));
      assert.true(instanceOf(person, Object));
      assert.true(instanceOf(person, Human));
      assert.true(instanceOf(student, Object));
      assert.true(instanceOf(student, Human));
      assert.true(instanceOf(student, Student));
      assert.true(instanceOf(newArray, Object));
      assert.true(instanceOf(newArray, Array));
      assert.true(instanceOf(newArray, NewArray));
    });

    test("instanceOf correctly fails for custom inherited instances", async function (assert) {
      let human = new Human();
      let person = new Person();
      let student = new Student();
      let newArray = new NewArray();

      assert.notOk(instanceOf(human, Person));
      assert.notOk(instanceOf(person, Student));
      assert.notOk(instanceOf(student, NewArray));
      assert.notOk(instanceOf(newArray, Person));
      assert.notOk(instanceOf(newArray, Human));
      assert.notOk(instanceOf(newArray, Student));
    });

    test("instanceOf works custom inherited classes", async function (assert) {
      assert.true(instanceOf(Human, Function));
      assert.true(instanceOf(Person, Human));
      assert.true(instanceOf(Human, Object));
      assert.true(instanceOf(Person, Object));
      assert.true(instanceOf(Student, Object));
      assert.true(instanceOf(Student, Person));
      assert.true(instanceOf(Student, Human));
      assert.true(instanceOf(NewArray, Object));
      assert.true(instanceOf(NewArray, Array));
    });

    test("instanceOf correctly fails for custom inherited classes", async function (assert) {
      assert.notOk(instanceOf(Human, Person));
      assert.notOk(instanceOf(Human, Student));
      assert.notOk(instanceOf(Human, Array));
      assert.notOk(instanceOf(NewArray, Human));
      assert.notOk(instanceOf(NewArray, Student));
    });
  });
});
