import { Enum } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "./helpers/setup-memoria.js";

const EXAMPLE_ARRAY_OF_OBJECTS = Object.freeze([
  { id: 1, name: "Some", active: true, createdAt: new Date("1985-12-10"), tags: ["teacher", "happy"], meta: {} },
  {
    id: 2,
    name: "Second",
    active: null,
    createdAt: new Date("1985-12-10"),
    tags: ["old", "happy"],
    meta: { new: true },
  },
  {
    id: 3,
    name: "Third",
    active: false,
    createdAt: new Date("1992-12-12"),
    tags: ["teacher", "happy"],
    meta: { new: true },
  },
  { id: 1, name: "Another Some", active: true, createdAt: null, tags: ["teacher", "happy", "young"], meta: undefined },
  { id: 4, name: "Fourth", active: false, createdAt: new Date("1985-12-10"), tags: ["sad"], meta: null },
  { id: null, name: null, active: false, createdAt: new Date("1989-11-10"), tags: ["young"], meta: {} },
  {
    id: 5,
    name: "Some",
    active: false,
    createdAt: new Date("2055-11-10"),
    tags: [],
    meta: { new: true, active: false, admin: true },
  },
  { id: 6, name: "Sixth", active: true, createdAt: new Date("1989-11-10"), tags: undefined, meta: { admin: true } },
  {
    id: 9,
    name: "Ninth",
    active: undefined,
    createdAt: undefined,
    tags: ["teacher", "happy", "young"],
    meta: undefined,
  },
  { id: 7, name: "Seventh", active: true, createdAt: new Date("2055-11-10"), tags: undefined, meta: { age: 33 } },
]);

module("@memoria/model | Enum", function (hooks) {
  setupMemoria(hooks);

  module("Enum.uniqBy", function () {
    test("works correctly for various array of objects", function (assert) {
      assert.deepEqual(Enum.uniqBy([{ id: 1 }, { id: 2 }, { id: 2 }], "id"), [{ id: 1 }, { id: 2 }]);
      assert.propEqual(Enum.uniqBy(EXAMPLE_ARRAY_OF_OBJECTS, "id"), [
        { id: 1, name: "Some", active: true, createdAt: new Date("1985-12-10"), tags: ["teacher", "happy"], meta: {} },
        {
          id: 2,
          name: "Second",
          active: null,
          createdAt: new Date("1985-12-10"),
          tags: ["old", "happy"],
          meta: { new: true },
        },
        {
          id: 3,
          name: "Third",
          active: false,
          createdAt: new Date("1992-12-12"),
          tags: ["teacher", "happy"],
          meta: { new: true },
        },
        { id: 4, name: "Fourth", active: false, createdAt: new Date("1985-12-10"), tags: ["sad"], meta: null },
        { id: null, name: null, active: false, createdAt: new Date("1989-11-10"), tags: ["young"], meta: {} },
        {
          id: 5,
          name: "Some",
          active: false,
          createdAt: new Date("2055-11-10"),
          tags: [],
          meta: { new: true, active: false, admin: true },
        },
        {
          id: 6,
          name: "Sixth",
          active: true,
          createdAt: new Date("1989-11-10"),
          tags: undefined,
          meta: { admin: true },
        },
        {
          id: 9,
          name: "Ninth",
          active: undefined,
          createdAt: undefined,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        { id: 7, name: "Seventh", active: true, createdAt: new Date("2055-11-10"), tags: undefined, meta: { age: 33 } },
      ]);
      assert.propEqual(Enum.uniqBy(EXAMPLE_ARRAY_OF_OBJECTS, "name"), [
        { id: 1, name: "Some", active: true, createdAt: new Date("1985-12-10"), tags: ["teacher", "happy"], meta: {} },
        {
          id: 2,
          name: "Second",
          active: null,
          createdAt: new Date("1985-12-10"),
          tags: ["old", "happy"],
          meta: { new: true },
        },
        {
          id: 3,
          name: "Third",
          active: false,
          createdAt: new Date("1992-12-12"),
          tags: ["teacher", "happy"],
          meta: { new: true },
        },
        {
          id: 1,
          name: "Another Some",
          active: true,
          createdAt: null,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        { id: 4, name: "Fourth", active: false, createdAt: new Date("1985-12-10"), tags: ["sad"], meta: null },
        { id: null, name: null, active: false, createdAt: new Date("1989-11-10"), tags: ["young"], meta: {} },
        {
          id: 6,
          name: "Sixth",
          active: true,
          createdAt: new Date("1989-11-10"),
          tags: undefined,
          meta: { admin: true },
        },
        {
          id: 9,
          name: "Ninth",
          active: undefined,
          createdAt: undefined,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        { id: 7, name: "Seventh", active: true, createdAt: new Date("2055-11-10"), tags: undefined, meta: { age: 33 } },
      ]);
      assert.propEqual(Enum.uniqBy(EXAMPLE_ARRAY_OF_OBJECTS, "active"), [
        { id: 1, name: "Some", active: true, createdAt: new Date("1985-12-10"), tags: ["teacher", "happy"], meta: {} },
        {
          id: 2,
          name: "Second",
          active: null,
          createdAt: new Date("1985-12-10"),
          tags: ["old", "happy"],
          meta: { new: true },
        },
        {
          id: 3,
          name: "Third",
          active: false,
          createdAt: new Date("1992-12-12"),
          tags: ["teacher", "happy"],
          meta: { new: true },
        },
        {
          id: 9,
          name: "Ninth",
          active: undefined,
          createdAt: undefined,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
      ]);
      assert.propEqual(Enum.uniqBy(EXAMPLE_ARRAY_OF_OBJECTS, "createdAt"), [
        { id: 1, name: "Some", active: true, createdAt: new Date("1985-12-10"), tags: ["teacher", "happy"], meta: {} },
        {
          id: 3,
          name: "Third",
          active: false,
          createdAt: new Date("1992-12-12"),
          tags: ["teacher", "happy"],
          meta: { new: true },
        },
        {
          id: 1,
          name: "Another Some",
          active: true,
          createdAt: null,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        { id: null, name: null, active: false, createdAt: new Date("1989-11-10"), tags: ["young"], meta: {} },
        {
          id: 5,
          name: "Some",
          active: false,
          createdAt: new Date("2055-11-10"),
          tags: [],
          meta: { new: true, active: false, admin: true },
        },
        {
          id: 9,
          name: "Ninth",
          active: undefined,
          createdAt: undefined,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
      ]);
      assert.propEqual(Enum.uniqBy(EXAMPLE_ARRAY_OF_OBJECTS, "tags"), [
        { id: 1, name: "Some", active: true, createdAt: new Date("1985-12-10"), tags: ["teacher", "happy"], meta: {} },
        {
          id: 2,
          name: "Second",
          active: null,
          createdAt: new Date("1985-12-10"),
          tags: ["old", "happy"],
          meta: { new: true },
        },
        {
          id: 1,
          name: "Another Some",
          active: true,
          createdAt: null,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        { id: 4, name: "Fourth", active: false, createdAt: new Date("1985-12-10"), tags: ["sad"], meta: null },
        { id: null, name: null, active: false, createdAt: new Date("1989-11-10"), tags: ["young"], meta: {} },
        {
          id: 5,
          name: "Some",
          active: false,
          createdAt: new Date("2055-11-10"),
          tags: [],
          meta: { new: true, active: false, admin: true },
        },
        {
          id: 6,
          name: "Sixth",
          active: true,
          createdAt: new Date("1989-11-10"),
          tags: undefined,
          meta: { admin: true },
        },
      ]);
      assert.propEqual(Enum.uniqBy(EXAMPLE_ARRAY_OF_OBJECTS, "meta"), [
        { id: 1, name: "Some", active: true, createdAt: new Date("1985-12-10"), tags: ["teacher", "happy"], meta: {} },
        {
          id: 2,
          name: "Second",
          active: null,
          createdAt: new Date("1985-12-10"),
          tags: ["old", "happy"],
          meta: { new: true },
        },
        {
          id: 1,
          name: "Another Some",
          active: true,
          createdAt: null,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        { id: 4, name: "Fourth", active: false, createdAt: new Date("1985-12-10"), tags: ["sad"], meta: null },
        {
          id: 5,
          name: "Some",
          active: false,
          createdAt: new Date("2055-11-10"),
          tags: [],
          meta: { new: true, active: false, admin: true },
        },
        {
          id: 6,
          name: "Sixth",
          active: true,
          createdAt: new Date("1989-11-10"),
          tags: undefined,
          meta: { admin: true },
        },
        { id: 7, name: "Seventh", active: true, createdAt: new Date("2055-11-10"), tags: undefined, meta: { age: 33 } },
      ]);
    });

    test("fails when called with an array that has the key missing or has element that is non-object", function (assert) {
      try {
        Enum.uniqBy([{ id: 1 }, 2, { id: 2 }], "id");
      } catch (error) {
        assert.equal(error.message, "Reflect.has called on non-object");
      }

      try {
        Enum.uniqBy([{ id: 1 }, { name: "something" }, { id: 2 }], "id");
      } catch (error) {
        assert.equal(error.message, "Enum.uniqBy: Key id not found in an element of the array.");
      }
    });
  });

  module("Enum.mapBy", function () {
    test("works correctly for various array of objects", function (assert) {
      assert.propEqual(Enum.mapBy(EXAMPLE_ARRAY_OF_OBJECTS, "id"), [1, 2, 3, 1, 4, null, 5, 6, 9, 7]);
      assert.propEqual(Enum.mapBy(EXAMPLE_ARRAY_OF_OBJECTS, "name"), [
        "Some",
        "Second",
        "Third",
        "Another Some",
        "Fourth",
        null,
        "Some",
        "Sixth",
        "Ninth",
        "Seventh",
      ]);
      assert.propEqual(Enum.mapBy(EXAMPLE_ARRAY_OF_OBJECTS, "active"), [
        true,
        null,
        false,
        true,
        false,
        false,
        false,
        true,
        undefined,
        true,
      ]);
      assert.propEqual(Enum.mapBy(EXAMPLE_ARRAY_OF_OBJECTS, "createdAt"), [
        new Date("1985-12-10"),
        new Date("1985-12-10"),
        new Date("1992-12-10"),
        null,
        new Date("1985-12-10"),
        new Date("1989-11-10"),
        new Date("2055-11-10"),
        new Date("1989-11-10"),
        undefined,
        new Date("2055-11-10"),
      ]);
      assert.propEqual(Enum.mapBy(EXAMPLE_ARRAY_OF_OBJECTS, "tags"), [
        ["teacher", "happy"],
        ["old", "happy"],
        ["teacher", "happy"],
        ["teacher", "happy", "young"],
        ["sad"],
        ["young"],
        [],
        undefined,
        ["teacher", "happy", "young"],
        undefined,
      ]);
      assert.propEqual(Enum.mapBy(EXAMPLE_ARRAY_OF_OBJECTS, "meta"), [
        {},
        { new: true },
        { new: true },
        undefined,
        null,
        {},
        {
          active: false,
          admin: true,
          new: true,
        },
        { admin: true },
        undefined,
        { age: 33 },
      ]);
    });

    test("fails when called with an array that has the key missing or has element that is non-object", function (assert) {
      try {
        Enum.mapBy([{ id: 1 }, 2, { id: 2 }], "id");
      } catch (error) {
        assert.equal(error.message, "Reflect.has called on non-object");
      }

      try {
        Enum.mapBy([{ id: 1 }, { name: "something" }, { id: 2 }], "id");
      } catch (error) {
        assert.equal(error.message, "Enum.uniqBy: Key id not found in an element of the array.");
      }
    });
  });

  module("Enum.objectsAt", function () {
    test("usual case works", function (assert) {
      assert.propEqual(Enum.objectsAt(EXAMPLE_ARRAY_OF_OBJECTS, [0, 1, 2]), [
        { id: 1, name: "Some", active: true, createdAt: new Date("1985-12-10"), tags: ["teacher", "happy"], meta: {} },
        {
          id: 2,
          name: "Second",
          active: null,
          createdAt: new Date("1985-12-10"),
          tags: ["old", "happy"],
          meta: { new: true },
        },
        {
          id: 3,
          name: "Third",
          active: false,
          createdAt: new Date("1992-12-12"),
          tags: ["teacher", "happy"],
          meta: { new: true },
        },
      ]);
      assert.propEqual(Enum.objectsAt(EXAMPLE_ARRAY_OF_OBJECTS, [5]), [
        { id: null, name: null, active: false, createdAt: new Date("1989-11-10"), tags: ["young"], meta: {} },
      ]);
      assert.propEqual(Enum.objectsAt(EXAMPLE_ARRAY_OF_OBJECTS, [2, 1, 5, 2, 6, 0]), [
        {
          id: 3,
          name: "Third",
          active: false,
          createdAt: new Date("1992-12-12"),
          tags: ["teacher", "happy"],
          meta: { new: true },
        },
        {
          id: 2,
          name: "Second",
          active: null,
          createdAt: new Date("1985-12-10"),
          tags: ["old", "happy"],
          meta: { new: true },
        },
        { id: null, name: null, active: false, createdAt: new Date("1989-11-10"), tags: ["young"], meta: {} },
        {
          id: 3,
          name: "Third",
          active: false,
          createdAt: new Date("1992-12-12"),
          tags: ["teacher", "happy"],
          meta: { new: true },
        },
        {
          id: 5,
          name: "Some",
          active: false,
          createdAt: new Date("2055-11-10"),
          tags: [],
          meta: { new: true, active: false, admin: true },
        },
        { id: 1, name: "Some", active: true, createdAt: new Date("1985-12-10"), tags: ["teacher", "happy"], meta: {} },
      ]);
      assert.propEqual(Enum.objectsAt(EXAMPLE_ARRAY_OF_OBJECTS, [6, 1]), [
        {
          id: 5,
          name: "Some",
          active: false,
          createdAt: new Date("2055-11-10"),
          tags: [],
          meta: { new: true, active: false, admin: true },
        },
        {
          id: 2,
          name: "Second",
          active: null,
          createdAt: new Date("1985-12-10"),
          tags: ["old", "happy"],
          meta: { new: true },
        },
      ]);
      assert.propEqual(Enum.objectsAt([55, 11, 0, 22], [1, 1, 2, 0]), [11, 11, 0, 55]);
      assert.propEqual(Enum.objectsAt(["a", "b", 22], [2, 0]), [22, "a"]);
    });

    test("case with indexes more than the length of the array works", function (assert) {
      assert.propEqual(Enum.objectsAt(EXAMPLE_ARRAY_OF_OBJECTS, [99, 0, 1, 2, 66]), [
        undefined,
        { id: 1, name: "Some", active: true, createdAt: new Date("1985-12-10"), tags: ["teacher", "happy"], meta: {} },
        {
          id: 2,
          name: "Second",
          active: null,
          createdAt: new Date("1985-12-10"),
          tags: ["old", "happy"],
          meta: { new: true },
        },
        {
          id: 3,
          name: "Third",
          active: false,
          createdAt: new Date("1992-12-12"),
          tags: ["teacher", "happy"],
          meta: { new: true },
        },
        undefined,
      ]);
      assert.propEqual(Enum.objectsAt(EXAMPLE_ARRAY_OF_OBJECTS, [99]), [undefined]);
      assert.propEqual(Enum.objectsAt(EXAMPLE_ARRAY_OF_OBJECTS, [6, 70, 1]), [
        {
          id: 5,
          name: "Some",
          active: false,
          createdAt: new Date("2055-11-10"),
          tags: [],
          meta: { new: true, active: false, admin: true },
        },
        undefined,
        {
          id: 2,
          name: "Second",
          active: null,
          createdAt: new Date("1985-12-10"),
          tags: ["old", "happy"],
          meta: { new: true },
        },
      ]);
      assert.propEqual(Enum.objectsAt([55, 11, 0, 22], [1, 1, 2, 4]), [11, 11, 0, undefined]);
      assert.propEqual(Enum.objectsAt(["a", "b", 22], [99, 2, 0]), [undefined, 22, "a"]);
    });
  });

  module("Enum.sortBy", function () {
    test("it works correctly", function (assert) {
      assert.propEqual(Enum.sortBy([{ a: 2 }, { a: 1 }], "a"), [{ a: 1 }, { a: 2 }]);
      assert.propEqual(Enum.sortBy([{ a: 2 }, { a: 1 }], "b"), [{ a: 2 }, { a: 1 }]);
      assert.propEqual(
        Enum.sortBy(
          [
            { a: 1, b: 2 },
            { a: 1, b: 1 },
          ],
          "b"
        ),
        [
          { a: 1, b: 1 },
          { a: 1, b: 2 },
        ]
      );
      assert.propEqual(Enum.sortBy(EXAMPLE_ARRAY_OF_OBJECTS, "id"), [
        { id: null, name: null, active: false, createdAt: new Date("1989-11-10"), tags: ["young"], meta: {} },
        { id: 1, name: "Some", active: true, createdAt: new Date("1985-12-10"), tags: ["teacher", "happy"], meta: {} },
        {
          id: 1,
          name: "Another Some",
          active: true,
          createdAt: null,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        {
          id: 2,
          name: "Second",
          active: null,
          createdAt: new Date("1985-12-10"),
          tags: ["old", "happy"],
          meta: { new: true },
        },
        {
          id: 3,
          name: "Third",
          active: false,
          createdAt: new Date("1992-12-12"),
          tags: ["teacher", "happy"],
          meta: { new: true },
        },
        { id: 4, name: "Fourth", active: false, createdAt: new Date("1985-12-10"), tags: ["sad"], meta: null },
        {
          id: 5,
          name: "Some",
          active: false,
          createdAt: new Date("2055-11-10"),
          tags: [],
          meta: { new: true, active: false, admin: true },
        },
        {
          id: 6,
          name: "Sixth",
          active: true,
          createdAt: new Date("1989-11-10"),
          tags: undefined,
          meta: { admin: true },
        },
        { id: 7, name: "Seventh", active: true, createdAt: new Date("2055-11-10"), tags: undefined, meta: { age: 33 } },
        {
          id: 9,
          name: "Ninth",
          active: undefined,
          createdAt: undefined,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
      ]);
      assert.propEqual(Enum.sortBy(EXAMPLE_ARRAY_OF_OBJECTS, "name"), [
        { id: null, name: null, active: false, createdAt: new Date("1989-11-10"), tags: ["young"], meta: {} },
        {
          id: 1,
          name: "Another Some",
          active: true,
          createdAt: null,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        { id: 4, name: "Fourth", active: false, createdAt: new Date("1985-12-10"), tags: ["sad"], meta: null },
        {
          id: 9,
          name: "Ninth",
          active: undefined,
          createdAt: undefined,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        {
          id: 2,
          name: "Second",
          active: null,
          createdAt: new Date("1985-12-10"),
          tags: ["old", "happy"],
          meta: { new: true },
        },
        { id: 7, name: "Seventh", active: true, createdAt: new Date("2055-11-10"), tags: undefined, meta: { age: 33 } },
        {
          id: 6,
          name: "Sixth",
          active: true,
          createdAt: new Date("1989-11-10"),
          tags: undefined,
          meta: { admin: true },
        },
        { id: 1, name: "Some", active: true, createdAt: new Date("1985-12-10"), tags: ["teacher", "happy"], meta: {} },
        {
          id: 5,
          name: "Some",
          active: false,
          createdAt: new Date("2055-11-10"),
          tags: [],
          meta: { new: true, active: false, admin: true },
        },
        {
          id: 3,
          name: "Third",
          active: false,
          createdAt: new Date("1992-12-12"),
          tags: ["teacher", "happy"],
          meta: { new: true },
        },
      ]);
      assert.propEqual(Enum.sortBy(EXAMPLE_ARRAY_OF_OBJECTS, "active"), [
        {
          id: 9,
          name: "Ninth",
          active: undefined,
          createdAt: undefined,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        {
          id: 2,
          name: "Second",
          active: null,
          createdAt: new Date("1985-12-10"),
          tags: ["old", "happy"],
          meta: { new: true },
        },
        {
          id: 3,
          name: "Third",
          active: false,
          createdAt: new Date("1992-12-12"),
          tags: ["teacher", "happy"],
          meta: { new: true },
        },
        { id: 4, name: "Fourth", active: false, createdAt: new Date("1985-12-10"), tags: ["sad"], meta: null },
        { id: null, name: null, active: false, createdAt: new Date("1989-11-10"), tags: ["young"], meta: {} },
        {
          id: 5,
          name: "Some",
          active: false,
          createdAt: new Date("2055-11-10"),
          tags: [],
          meta: { new: true, active: false, admin: true },
        },
        { id: 1, name: "Some", active: true, createdAt: new Date("1985-12-10"), tags: ["teacher", "happy"], meta: {} },
        {
          id: 1,
          name: "Another Some",
          active: true,
          createdAt: null,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        {
          id: 6,
          name: "Sixth",
          active: true,
          createdAt: new Date("1989-11-10"),
          tags: undefined,
          meta: { admin: true },
        },
        { id: 7, name: "Seventh", active: true, createdAt: new Date("2055-11-10"), tags: undefined, meta: { age: 33 } },
      ]);
      assert.propEqual(Enum.sortBy(EXAMPLE_ARRAY_OF_OBJECTS, "createdAt"), [
        {
          id: 9,
          name: "Ninth",
          active: undefined,
          createdAt: undefined,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        {
          id: 1,
          name: "Another Some",
          active: true,
          createdAt: null,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        { id: 1, name: "Some", active: true, createdAt: new Date("1985-12-10"), tags: ["teacher", "happy"], meta: {} },
        {
          id: 2,
          name: "Second",
          active: null,
          createdAt: new Date("1985-12-10"),
          tags: ["old", "happy"],
          meta: { new: true },
        },
        { id: 4, name: "Fourth", active: false, createdAt: new Date("1985-12-10"), tags: ["sad"], meta: null },
        { id: null, name: null, active: false, createdAt: new Date("1989-11-10"), tags: ["young"], meta: {} },
        {
          id: 6,
          name: "Sixth",
          active: true,
          createdAt: new Date("1989-11-10"),
          tags: undefined,
          meta: { admin: true },
        },
        {
          id: 3,
          name: "Third",
          active: false,
          createdAt: new Date("1992-12-12"),
          tags: ["teacher", "happy"],
          meta: { new: true },
        },
        {
          id: 5,
          name: "Some",
          active: false,
          createdAt: new Date("2055-11-10"),
          tags: [],
          meta: { new: true, active: false, admin: true },
        },
        { id: 7, name: "Seventh", active: true, createdAt: new Date("2055-11-10"), tags: undefined, meta: { age: 33 } },
      ]);
      assert.propEqual(Enum.sortBy(EXAMPLE_ARRAY_OF_OBJECTS, "tags"), [
        {
          id: 6,
          name: "Sixth",
          active: true,
          createdAt: new Date("1989-11-10"),
          tags: undefined,
          meta: { admin: true },
        },
        { id: 7, name: "Seventh", active: true, createdAt: new Date("2055-11-10"), tags: undefined, meta: { age: 33 } },
        {
          id: 5,
          name: "Some",
          active: false,
          createdAt: new Date("2055-11-10"),
          tags: [],
          meta: { new: true, active: false, admin: true },
        },
        { id: 4, name: "Fourth", active: false, createdAt: new Date("1985-12-10"), tags: ["sad"], meta: null },
        { id: null, name: null, active: false, createdAt: new Date("1989-11-10"), tags: ["young"], meta: {} },
        {
          id: 2,
          name: "Second",
          active: null,
          createdAt: new Date("1985-12-10"),
          tags: ["old", "happy"],
          meta: { new: true },
        },
        { id: 1, name: "Some", active: true, createdAt: new Date("1985-12-10"), tags: ["teacher", "happy"], meta: {} },
        {
          id: 3,
          name: "Third",
          active: false,
          createdAt: new Date("1992-12-12"),
          tags: ["teacher", "happy"],
          meta: { new: true },
        },
        {
          id: 1,
          name: "Another Some",
          active: true,
          createdAt: null,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        {
          id: 9,
          name: "Ninth",
          active: undefined,
          createdAt: undefined,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
      ]);
      assert.propEqual(Enum.sortBy(EXAMPLE_ARRAY_OF_OBJECTS, "meta"), [
        {
          id: 1,
          name: "Another Some",
          active: true,
          createdAt: null,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        {
          id: 9,
          name: "Ninth",
          active: undefined,
          createdAt: undefined,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        { id: 4, name: "Fourth", active: false, createdAt: new Date("1985-12-10"), tags: ["sad"], meta: null },
        { id: 1, name: "Some", active: true, createdAt: new Date("1985-12-10"), tags: ["teacher", "happy"], meta: {} },
        { id: null, name: null, active: false, createdAt: new Date("1989-11-10"), tags: ["young"], meta: {} },
        {
          id: 2,
          name: "Second",
          active: null,
          createdAt: new Date("1985-12-10"),
          tags: ["old", "happy"],
          meta: { new: true },
        },
        {
          id: 3,
          name: "Third",
          active: false,
          createdAt: new Date("1992-12-12"),
          tags: ["teacher", "happy"],
          meta: { new: true },
        },
        {
          id: 6,
          name: "Sixth",
          active: true,
          createdAt: new Date("1989-11-10"),
          tags: undefined,
          meta: { admin: true },
        },
        { id: 7, name: "Seventh", active: true, createdAt: new Date("2055-11-10"), tags: undefined, meta: { age: 33 } },
        {
          id: 5,
          name: "Some",
          active: false,
          createdAt: new Date("2055-11-10"),
          tags: [],
          meta: { new: true, active: false, admin: true },
        },
      ]);
    });

    test("it works correctly for multiple sortBy parameters", function (assert) {
      assert.propEqual(Enum.sortBy(EXAMPLE_ARRAY_OF_OBJECTS, "id", "name"), [
        { id: null, name: null, active: false, createdAt: new Date("1989-11-10"), tags: ["young"], meta: {} },
        {
          id: 1,
          name: "Another Some",
          active: true,
          createdAt: null,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        { id: 1, name: "Some", active: true, createdAt: new Date("1985-12-10"), tags: ["teacher", "happy"], meta: {} },
        {
          id: 2,
          name: "Second",
          active: null,
          createdAt: new Date("1985-12-10"),
          tags: ["old", "happy"],
          meta: { new: true },
        },
        {
          id: 3,
          name: "Third",
          active: false,
          createdAt: new Date("1992-12-12"),
          tags: ["teacher", "happy"],
          meta: { new: true },
        },
        { id: 4, name: "Fourth", active: false, createdAt: new Date("1985-12-10"), tags: ["sad"], meta: null },
        {
          id: 5,
          name: "Some",
          active: false,
          createdAt: new Date("2055-11-10"),
          tags: [],
          meta: { new: true, active: false, admin: true },
        },
        {
          id: 6,
          name: "Sixth",
          active: true,
          createdAt: new Date("1989-11-10"),
          tags: undefined,
          meta: { admin: true },
        },
        { id: 7, name: "Seventh", active: true, createdAt: new Date("2055-11-10"), tags: undefined, meta: { age: 33 } },
        {
          id: 9,
          name: "Ninth",
          active: undefined,
          createdAt: undefined,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
      ]);
      assert.propEqual(Enum.sortBy(EXAMPLE_ARRAY_OF_OBJECTS, "name", "id"), [
        { id: null, name: null, active: false, createdAt: new Date("1989-11-10"), tags: ["young"], meta: {} },
        {
          id: 1,
          name: "Another Some",
          active: true,
          createdAt: null,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        { id: 4, name: "Fourth", active: false, createdAt: new Date("1985-12-10"), tags: ["sad"], meta: null },
        {
          id: 9,
          name: "Ninth",
          active: undefined,
          createdAt: undefined,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        {
          id: 2,
          name: "Second",
          active: null,
          createdAt: new Date("1985-12-10"),
          tags: ["old", "happy"],
          meta: { new: true },
        },
        { id: 7, name: "Seventh", active: true, createdAt: new Date("2055-11-10"), tags: undefined, meta: { age: 33 } },
        {
          id: 6,
          name: "Sixth",
          active: true,
          createdAt: new Date("1989-11-10"),
          tags: undefined,
          meta: { admin: true },
        },
        { id: 1, name: "Some", active: true, createdAt: new Date("1985-12-10"), tags: ["teacher", "happy"], meta: {} },
        {
          id: 5,
          name: "Some",
          active: false,
          createdAt: new Date("2055-11-10"),
          tags: [],
          meta: { new: true, active: false, admin: true },
        },
        {
          id: 3,
          name: "Third",
          active: false,
          createdAt: new Date("1992-12-12"),
          tags: ["teacher", "happy"],
          meta: { new: true },
        },
      ]);
      assert.propEqual(Enum.sortBy(EXAMPLE_ARRAY_OF_OBJECTS, "active", "createdAt"), [
        {
          id: 9,
          name: "Ninth",
          active: undefined,
          createdAt: undefined,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        {
          id: 2,
          name: "Second",
          active: null,
          createdAt: new Date("1985-12-10"),
          tags: ["old", "happy"],
          meta: { new: true },
        },
        { id: 4, name: "Fourth", active: false, createdAt: new Date("1985-12-10"), tags: ["sad"], meta: null },
        { id: null, name: null, active: false, createdAt: new Date("1989-11-10"), tags: ["young"], meta: {} },
        {
          id: 3,
          name: "Third",
          active: false,
          createdAt: new Date("1992-12-12"),
          tags: ["teacher", "happy"],
          meta: { new: true },
        },
        {
          id: 5,
          name: "Some",
          active: false,
          createdAt: new Date("2055-11-10"),
          tags: [],
          meta: { new: true, active: false, admin: true },
        },
        {
          id: 1,
          name: "Another Some",
          active: true,
          createdAt: null,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        { id: 1, name: "Some", active: true, createdAt: new Date("1985-12-10"), tags: ["teacher", "happy"], meta: {} },
        {
          id: 6,
          name: "Sixth",
          active: true,
          createdAt: new Date("1989-11-10"),
          tags: undefined,
          meta: { admin: true },
        },
        { id: 7, name: "Seventh", active: true, createdAt: new Date("2055-11-10"), tags: undefined, meta: { age: 33 } },
      ]);
      assert.propEqual(Enum.sortBy(EXAMPLE_ARRAY_OF_OBJECTS, "createdAt", "active"), [
        {
          id: 9,
          name: "Ninth",
          active: undefined,
          createdAt: undefined,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        {
          id: 1,
          name: "Another Some",
          active: true,
          createdAt: null,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        {
          id: 2,
          name: "Second",
          active: null,
          createdAt: new Date("1985-12-10"),
          tags: ["old", "happy"],
          meta: { new: true },
        },
        { id: 4, name: "Fourth", active: false, createdAt: new Date("1985-12-10"), tags: ["sad"], meta: null },
        { id: 1, name: "Some", active: true, createdAt: new Date("1985-12-10"), tags: ["teacher", "happy"], meta: {} },
        { id: null, name: null, active: false, createdAt: new Date("1989-11-10"), tags: ["young"], meta: {} },
        {
          id: 6,
          name: "Sixth",
          active: true,
          createdAt: new Date("1989-11-10"),
          tags: undefined,
          meta: { admin: true },
        },
        {
          id: 3,
          name: "Third",
          active: false,
          createdAt: new Date("1992-12-12"),
          tags: ["teacher", "happy"],
          meta: { new: true },
        },
        {
          id: 5,
          name: "Some",
          active: false,
          createdAt: new Date("2055-11-10"),
          tags: [],
          meta: { new: true, active: false, admin: true },
        },
        { id: 7, name: "Seventh", active: true, createdAt: new Date("2055-11-10"), tags: undefined, meta: { age: 33 } },
      ]);
    });

    test("it works correctly for array sortBy parameter", function (assert) {
      assert.propEqual(Enum.sortBy(EXAMPLE_ARRAY_OF_OBJECTS, ["id", "name"]), [
        { id: null, name: null, active: false, createdAt: new Date("1989-11-10"), tags: ["young"], meta: {} },
        {
          id: 1,
          name: "Another Some",
          active: true,
          createdAt: null,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        { id: 1, name: "Some", active: true, createdAt: new Date("1985-12-10"), tags: ["teacher", "happy"], meta: {} },
        {
          id: 2,
          name: "Second",
          active: null,
          createdAt: new Date("1985-12-10"),
          tags: ["old", "happy"],
          meta: { new: true },
        },
        {
          id: 3,
          name: "Third",
          active: false,
          createdAt: new Date("1992-12-12"),
          tags: ["teacher", "happy"],
          meta: { new: true },
        },
        { id: 4, name: "Fourth", active: false, createdAt: new Date("1985-12-10"), tags: ["sad"], meta: null },
        {
          id: 5,
          name: "Some",
          active: false,
          createdAt: new Date("2055-11-10"),
          tags: [],
          meta: { new: true, active: false, admin: true },
        },
        {
          id: 6,
          name: "Sixth",
          active: true,
          createdAt: new Date("1989-11-10"),
          tags: undefined,
          meta: { admin: true },
        },
        { id: 7, name: "Seventh", active: true, createdAt: new Date("2055-11-10"), tags: undefined, meta: { age: 33 } },
        {
          id: 9,
          name: "Ninth",
          active: undefined,
          createdAt: undefined,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
      ]);
      assert.propEqual(Enum.sortBy(EXAMPLE_ARRAY_OF_OBJECTS, ["name", "id"]), [
        { id: null, name: null, active: false, createdAt: new Date("1989-11-10"), tags: ["young"], meta: {} },
        {
          id: 1,
          name: "Another Some",
          active: true,
          createdAt: null,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        { id: 4, name: "Fourth", active: false, createdAt: new Date("1985-12-10"), tags: ["sad"], meta: null },
        {
          id: 9,
          name: "Ninth",
          active: undefined,
          createdAt: undefined,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        {
          id: 2,
          name: "Second",
          active: null,
          createdAt: new Date("1985-12-10"),
          tags: ["old", "happy"],
          meta: { new: true },
        },
        { id: 7, name: "Seventh", active: true, createdAt: new Date("2055-11-10"), tags: undefined, meta: { age: 33 } },
        {
          id: 6,
          name: "Sixth",
          active: true,
          createdAt: new Date("1989-11-10"),
          tags: undefined,
          meta: { admin: true },
        },
        { id: 1, name: "Some", active: true, createdAt: new Date("1985-12-10"), tags: ["teacher", "happy"], meta: {} },
        {
          id: 5,
          name: "Some",
          active: false,
          createdAt: new Date("2055-11-10"),
          tags: [],
          meta: { new: true, active: false, admin: true },
        },
        {
          id: 3,
          name: "Third",
          active: false,
          createdAt: new Date("1992-12-12"),
          tags: ["teacher", "happy"],
          meta: { new: true },
        },
      ]);
      assert.propEqual(Enum.sortBy(EXAMPLE_ARRAY_OF_OBJECTS, ["active", "createdAt"]), [
        {
          id: 9,
          name: "Ninth",
          active: undefined,
          createdAt: undefined,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        {
          id: 2,
          name: "Second",
          active: null,
          createdAt: new Date("1985-12-10"),
          tags: ["old", "happy"],
          meta: { new: true },
        },
        { id: 4, name: "Fourth", active: false, createdAt: new Date("1985-12-10"), tags: ["sad"], meta: null },
        { id: null, name: null, active: false, createdAt: new Date("1989-11-10"), tags: ["young"], meta: {} },
        {
          id: 3,
          name: "Third",
          active: false,
          createdAt: new Date("1992-12-12"),
          tags: ["teacher", "happy"],
          meta: { new: true },
        },
        {
          id: 5,
          name: "Some",
          active: false,
          createdAt: new Date("2055-11-10"),
          tags: [],
          meta: { new: true, active: false, admin: true },
        },
        {
          id: 1,
          name: "Another Some",
          active: true,
          createdAt: null,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        { id: 1, name: "Some", active: true, createdAt: new Date("1985-12-10"), tags: ["teacher", "happy"], meta: {} },
        {
          id: 6,
          name: "Sixth",
          active: true,
          createdAt: new Date("1989-11-10"),
          tags: undefined,
          meta: { admin: true },
        },
        { id: 7, name: "Seventh", active: true, createdAt: new Date("2055-11-10"), tags: undefined, meta: { age: 33 } },
      ]);
      assert.propEqual(Enum.sortBy(EXAMPLE_ARRAY_OF_OBJECTS, ["createdAt", "active"]), [
        {
          id: 9,
          name: "Ninth",
          active: undefined,
          createdAt: undefined,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        {
          id: 1,
          name: "Another Some",
          active: true,
          createdAt: null,
          tags: ["teacher", "happy", "young"],
          meta: undefined,
        },
        {
          id: 2,
          name: "Second",
          active: null,
          createdAt: new Date("1985-12-10"),
          tags: ["old", "happy"],
          meta: { new: true },
        },
        { id: 4, name: "Fourth", active: false, createdAt: new Date("1985-12-10"), tags: ["sad"], meta: null },
        { id: 1, name: "Some", active: true, createdAt: new Date("1985-12-10"), tags: ["teacher", "happy"], meta: {} },
        { id: null, name: null, active: false, createdAt: new Date("1989-11-10"), tags: ["young"], meta: {} },
        {
          id: 6,
          name: "Sixth",
          active: true,
          createdAt: new Date("1989-11-10"),
          tags: undefined,
          meta: { admin: true },
        },
        {
          id: 3,
          name: "Third",
          active: false,
          createdAt: new Date("1992-12-12"),
          tags: ["teacher", "happy"],
          meta: { new: true },
        },
        {
          id: 5,
          name: "Some",
          active: false,
          createdAt: new Date("2055-11-10"),
          tags: [],
          meta: { new: true, active: false, admin: true },
        },
        { id: 7, name: "Seventh", active: true, createdAt: new Date("2055-11-10"), tags: undefined, meta: { age: 33 } },
      ]);
    });
  });

  module("Enum.findBy", function () {
    test("it works and finds the element for various keys", function (assert) {
      assert.propEqual(Enum.findBy(EXAMPLE_ARRAY_OF_OBJECTS, "id", 1), EXAMPLE_ARRAY_OF_OBJECTS[0]);
      assert.propEqual(Enum.findBy(EXAMPLE_ARRAY_OF_OBJECTS, "id", null), EXAMPLE_ARRAY_OF_OBJECTS[5]);
      assert.propEqual(Enum.findBy(EXAMPLE_ARRAY_OF_OBJECTS, "id", 9), EXAMPLE_ARRAY_OF_OBJECTS[8]);
      assert.propEqual(Enum.findBy(EXAMPLE_ARRAY_OF_OBJECTS, "active", null), EXAMPLE_ARRAY_OF_OBJECTS[1]);
      assert.propEqual(Enum.findBy(EXAMPLE_ARRAY_OF_OBJECTS, "active", false), {
        id: 3,
        name: "Third",
        active: false,
        createdAt: new Date("1992-12-12"),
        tags: ["teacher", "happy"],
        meta: { new: true },
      });
      assert.propEqual(Enum.findBy(EXAMPLE_ARRAY_OF_OBJECTS, "createdAt", new Date("2055-11-10")), {
        id: 5,
        name: "Some",
        active: false,
        createdAt: new Date("2055-11-10"),
        tags: [],
        meta: { new: true, active: false, admin: true },
      });
      assert.propEqual(Enum.findBy(EXAMPLE_ARRAY_OF_OBJECTS, "createdAt", undefined), {
        id: 9,
        name: "Ninth",
        active: undefined,
        createdAt: undefined,
        tags: ["teacher", "happy", "young"],
        meta: undefined,
      });
      assert.propEqual(Enum.findBy(EXAMPLE_ARRAY_OF_OBJECTS, "tags", ["teacher", "happy"]), {
        id: 1,
        name: "Some",
        active: true,
        createdAt: new Date("1985-12-10"),
        tags: ["teacher", "happy"],
        meta: {},
      });
      assert.propEqual(Enum.findBy(EXAMPLE_ARRAY_OF_OBJECTS, "tags", []), {
        id: 5,
        name: "Some",
        active: false,
        createdAt: new Date("2055-11-10"),
        tags: [],
        meta: { new: true, active: false, admin: true },
      });
      assert.propEqual(Enum.findBy(EXAMPLE_ARRAY_OF_OBJECTS, "tags", ["young"]), {
        id: 1,
        name: "Another Some",
        active: true,
        createdAt: null,
        tags: ["teacher", "happy", "young"],
        meta: undefined,
      });
      assert.propEqual(
        Enum.findBy(EXAMPLE_ARRAY_OF_OBJECTS, "tags", ["happy", "teacher"]),
        EXAMPLE_ARRAY_OF_OBJECTS[0]
      );
      assert.propEqual(Enum.findBy(EXAMPLE_ARRAY_OF_OBJECTS, "meta", { admin: true }), {
        id: 5,
        name: "Some",
        active: false,
        createdAt: new Date("2055-11-10"),
        tags: [],
        meta: { new: true, active: false, admin: true },
      });
      assert.propEqual(Enum.findBy(EXAMPLE_ARRAY_OF_OBJECTS, "meta", {}), EXAMPLE_ARRAY_OF_OBJECTS[0]);
      assert.propEqual(Enum.findBy(EXAMPLE_ARRAY_OF_OBJECTS, "meta", undefined), EXAMPLE_ARRAY_OF_OBJECTS[3]);
      assert.propEqual(Enum.findBy(EXAMPLE_ARRAY_OF_OBJECTS, "meta", { age: 33 }), EXAMPLE_ARRAY_OF_OBJECTS[9]);
    });

    test("it works when it cant find the element for various keys", function (assert) {
      assert.strictEqual(Enum.findBy(EXAMPLE_ARRAY_OF_OBJECTS, "id", 99), null);
      assert.strictEqual(Enum.findBy(EXAMPLE_ARRAY_OF_OBJECTS, "id", "3"), null);
      assert.strictEqual(Enum.findBy(EXAMPLE_ARRAY_OF_OBJECTS, "id", undefined), null);
      assert.strictEqual(Enum.findBy(EXAMPLE_ARRAY_OF_OBJECTS, "active", 11), null);
      assert.strictEqual(Enum.findBy(EXAMPLE_ARRAY_OF_OBJECTS, "createdAt", new Date("2121-11-10")), null);
      assert.strictEqual(Enum.findBy(EXAMPLE_ARRAY_OF_OBJECTS, "createdAt", true), null);
      assert.strictEqual(Enum.findBy(EXAMPLE_ARRAY_OF_OBJECTS, "tags", ["sad", "great"]), null);
      assert.strictEqual(Enum.findBy(EXAMPLE_ARRAY_OF_OBJECTS, "tags", ["great"]), null);
      assert.strictEqual(Enum.findBy(EXAMPLE_ARRAY_OF_OBJECTS, "tags", null), null);
      assert.strictEqual(Enum.findBy(EXAMPLE_ARRAY_OF_OBJECTS, "meta", { age: 33, new: true }), null);
      assert.strictEqual(Enum.findBy(EXAMPLE_ARRAY_OF_OBJECTS, "meta", { great: true }), null);
    });
  });

  module("Enum.filterBy", function () {
    test("it works and filters the element for various keys", function (assert) {
      assert.propEqual(Enum.filterBy(EXAMPLE_ARRAY_OF_OBJECTS, "id", 1), [
        EXAMPLE_ARRAY_OF_OBJECTS[0],
        EXAMPLE_ARRAY_OF_OBJECTS[3],
      ]);
      assert.propEqual(Enum.filterBy(EXAMPLE_ARRAY_OF_OBJECTS, "id", null), [EXAMPLE_ARRAY_OF_OBJECTS[5]]);
      assert.propEqual(Enum.filterBy(EXAMPLE_ARRAY_OF_OBJECTS, "id", 9), [EXAMPLE_ARRAY_OF_OBJECTS[8]]);
      assert.propEqual(Enum.filterBy(EXAMPLE_ARRAY_OF_OBJECTS, "active", null), [EXAMPLE_ARRAY_OF_OBJECTS[1]]);
      assert.propEqual(Enum.filterBy(EXAMPLE_ARRAY_OF_OBJECTS, "active", false), [
        EXAMPLE_ARRAY_OF_OBJECTS[2],
        EXAMPLE_ARRAY_OF_OBJECTS[4],
        EXAMPLE_ARRAY_OF_OBJECTS[5],
        EXAMPLE_ARRAY_OF_OBJECTS[6],
      ]);
      assert.propEqual(Enum.filterBy(EXAMPLE_ARRAY_OF_OBJECTS, "createdAt", new Date("2055-11-10")), [
        EXAMPLE_ARRAY_OF_OBJECTS[6],
        EXAMPLE_ARRAY_OF_OBJECTS[9],
      ]);
      assert.propEqual(Enum.filterBy(EXAMPLE_ARRAY_OF_OBJECTS, "createdAt", undefined), [EXAMPLE_ARRAY_OF_OBJECTS[8]]);
      assert.propEqual(Enum.filterBy(EXAMPLE_ARRAY_OF_OBJECTS, "tags", ["teacher", "happy"]), [
        EXAMPLE_ARRAY_OF_OBJECTS[0],
        EXAMPLE_ARRAY_OF_OBJECTS[2],
        EXAMPLE_ARRAY_OF_OBJECTS[3],
        EXAMPLE_ARRAY_OF_OBJECTS[8],
      ]);
      assert.propEqual(Enum.filterBy(EXAMPLE_ARRAY_OF_OBJECTS, "tags", []), [EXAMPLE_ARRAY_OF_OBJECTS[6]]);
      assert.propEqual(Enum.filterBy(EXAMPLE_ARRAY_OF_OBJECTS, "tags", ["young"]), [
        EXAMPLE_ARRAY_OF_OBJECTS[3],
        EXAMPLE_ARRAY_OF_OBJECTS[5],
        EXAMPLE_ARRAY_OF_OBJECTS[8],
      ]);
      assert.propEqual(Enum.filterBy(EXAMPLE_ARRAY_OF_OBJECTS, "tags", ["happy", "teacher"]), [
        EXAMPLE_ARRAY_OF_OBJECTS[0],
        EXAMPLE_ARRAY_OF_OBJECTS[2],
        EXAMPLE_ARRAY_OF_OBJECTS[3],
        EXAMPLE_ARRAY_OF_OBJECTS[8],
      ]);
      assert.propEqual(Enum.filterBy(EXAMPLE_ARRAY_OF_OBJECTS, "meta", { admin: true }), [
        EXAMPLE_ARRAY_OF_OBJECTS[6],
        EXAMPLE_ARRAY_OF_OBJECTS[7],
      ]);
      assert.propEqual(Enum.filterBy(EXAMPLE_ARRAY_OF_OBJECTS, "meta", {}), [
        EXAMPLE_ARRAY_OF_OBJECTS[0],
        EXAMPLE_ARRAY_OF_OBJECTS[5],
      ]);
      assert.propEqual(Enum.filterBy(EXAMPLE_ARRAY_OF_OBJECTS, "meta", undefined), [
        EXAMPLE_ARRAY_OF_OBJECTS[3],
        EXAMPLE_ARRAY_OF_OBJECTS[8],
      ]);
      assert.propEqual(Enum.filterBy(EXAMPLE_ARRAY_OF_OBJECTS, "meta", { age: 33 }), [EXAMPLE_ARRAY_OF_OBJECTS[9]]);
    });

    test("it returns empty array when it cant find elements for matching value", function (assert) {
      assert.propEqual(Enum.filterBy(EXAMPLE_ARRAY_OF_OBJECTS, "id", 99), []);
      assert.propEqual(Enum.filterBy(EXAMPLE_ARRAY_OF_OBJECTS, "id", "3"), []);
      assert.propEqual(Enum.filterBy(EXAMPLE_ARRAY_OF_OBJECTS, "id", undefined), []);
      assert.propEqual(Enum.filterBy(EXAMPLE_ARRAY_OF_OBJECTS, "active", 11), []);
      assert.propEqual(Enum.filterBy(EXAMPLE_ARRAY_OF_OBJECTS, "createdAt", new Date("2121-11-10")), []);
      assert.propEqual(Enum.filterBy(EXAMPLE_ARRAY_OF_OBJECTS, "createdAt", true), []);
      assert.propEqual(Enum.filterBy(EXAMPLE_ARRAY_OF_OBJECTS, "tags", ["sad", "great"]), []);
      assert.propEqual(Enum.filterBy(EXAMPLE_ARRAY_OF_OBJECTS, "tags", ["great"]), []);
      assert.propEqual(Enum.filterBy(EXAMPLE_ARRAY_OF_OBJECTS, "tags", null), []);
      assert.propEqual(Enum.filterBy(EXAMPLE_ARRAY_OF_OBJECTS, "meta", { age: 33, new: true }), []);
      assert.propEqual(Enum.filterBy(EXAMPLE_ARRAY_OF_OBJECTS, "meta", { great: true }), []);
    });
  });

  module("Enum.getProperties", function () {
    test("it works for various properties", function (assert) {
      assert.propEqual(Enum.getProperties(EXAMPLE_ARRAY_OF_OBJECTS, ["id"]), [
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 1 },
        { id: 4 },
        { id: null },
        { id: 5 },
        { id: 6 },
        { id: 9 },
        { id: 7 },
      ]);
      assert.propEqual(Enum.getProperties(EXAMPLE_ARRAY_OF_OBJECTS, ["createdAt", "id"]), [
        { id: 1, createdAt: new Date("1985-12-10") },
        { id: 2, createdAt: new Date("1985-12-10") },
        { id: 3, createdAt: new Date("1992-12-12") },
        { id: 1, createdAt: null },
        { id: 4, createdAt: new Date("1985-12-10") },
        { id: null, createdAt: new Date("1989-11-10") },
        { id: 5, createdAt: new Date("2055-11-10") },
        { id: 6, createdAt: new Date("1989-11-10") },
        { id: 9, createdAt: undefined },
        { id: 7, createdAt: new Date("2055-11-10") },
      ]);
      assert.propEqual(Enum.getProperties(EXAMPLE_ARRAY_OF_OBJECTS, ["id", "name", "meta", "createdAt"]), [
        { id: 1, name: "Some", createdAt: new Date("1985-12-10"), meta: {} },
        { id: 2, name: "Second", createdAt: new Date("1985-12-10"), meta: { new: true } },
        { id: 3, name: "Third", createdAt: new Date("1992-12-12"), meta: { new: true } },
        { id: 1, name: "Another Some", createdAt: null, meta: undefined },
        { id: 4, name: "Fourth", createdAt: new Date("1985-12-10"), meta: null },
        { id: null, name: null, createdAt: new Date("1989-11-10"), meta: {} },
        { id: 5, name: "Some", createdAt: new Date("2055-11-10"), meta: { new: true, active: false, admin: true } },
        { id: 6, name: "Sixth", createdAt: new Date("1989-11-10"), meta: { admin: true } },
        { id: 9, name: "Ninth", createdAt: undefined, meta: undefined },
        { id: 7, name: "Seventh", createdAt: new Date("2055-11-10"), meta: { age: 33 } },
      ]);
    });

    test("it works when combined with not existing properties", function (assert) {
      assert.propEqual(Enum.getProperties(EXAMPLE_ARRAY_OF_OBJECTS, ["id", "rank"]), [
        { id: 1, rank: undefined },
        { id: 2, rank: undefined },
        { id: 3, rank: undefined },
        { id: 1, rank: undefined },
        { id: 4, rank: undefined },
        { id: null, rank: undefined },
        { id: 5, rank: undefined },
        { id: 6, rank: undefined },
        { id: 9, rank: undefined },
        { id: 7, rank: undefined },
      ]);
      assert.propEqual(Enum.getProperties(EXAMPLE_ARRAY_OF_OBJECTS, ["rank", "city", "hometown", "name"]), [
        { rank: undefined, city: undefined, hometown: undefined, name: "Some" },
        { rank: undefined, city: undefined, hometown: undefined, name: "Second" },
        { rank: undefined, city: undefined, hometown: undefined, name: "Third" },
        { rank: undefined, city: undefined, hometown: undefined, name: "Another Some" },
        { rank: undefined, city: undefined, hometown: undefined, name: "Fourth" },
        { rank: undefined, city: undefined, hometown: undefined, name: null },
        { rank: undefined, city: undefined, hometown: undefined, name: "Some" },
        { rank: undefined, city: undefined, hometown: undefined, name: "Sixth" },
        { rank: undefined, city: undefined, hometown: undefined, name: "Ninth" },
        { rank: undefined, city: undefined, hometown: undefined, name: "Seventh" },
      ]);
    });

    test("it works when all properties not existing", function (assert) {
      assert.propEqual(Enum.getProperties(EXAMPLE_ARRAY_OF_OBJECTS, ["rank"]), [
        { rank: undefined },
        { rank: undefined },
        { rank: undefined },
        { rank: undefined },
        { rank: undefined },
        { rank: undefined },
        { rank: undefined },
        { rank: undefined },
        { rank: undefined },
        { rank: undefined },
      ]);
      assert.propEqual(Enum.getProperties(EXAMPLE_ARRAY_OF_OBJECTS, ["rank", "city", "hometown"]), [
        { rank: undefined, city: undefined, hometown: undefined },
        { rank: undefined, city: undefined, hometown: undefined },
        { rank: undefined, city: undefined, hometown: undefined },
        { rank: undefined, city: undefined, hometown: undefined },
        { rank: undefined, city: undefined, hometown: undefined },
        { rank: undefined, city: undefined, hometown: undefined },
        { rank: undefined, city: undefined, hometown: undefined },
        { rank: undefined, city: undefined, hometown: undefined },
        { rank: undefined, city: undefined, hometown: undefined },
        { rank: undefined, city: undefined, hometown: undefined },
      ]);
    });
  });

  module("Enum.isAny", function () {
    test("it works correctly", function (assert) {
      assert.strictEqual(Enum.isAny(EXAMPLE_ARRAY_OF_OBJECTS, "id", null), true);
      assert.strictEqual(Enum.isAny(EXAMPLE_ARRAY_OF_OBJECTS, "id", 1), true);
      assert.strictEqual(Enum.isAny(EXAMPLE_ARRAY_OF_OBJECTS, "id", 99), false);
      assert.strictEqual(Enum.isAny(EXAMPLE_ARRAY_OF_OBJECTS, "active", undefined), true);
      assert.strictEqual(Enum.isAny(EXAMPLE_ARRAY_OF_OBJECTS, "active", 0), false);
      assert.strictEqual(Enum.isAny(EXAMPLE_ARRAY_OF_OBJECTS, "active", 1), false);
      assert.strictEqual(Enum.isAny(EXAMPLE_ARRAY_OF_OBJECTS, "tags", ["happy"]), true);
      assert.strictEqual(Enum.isAny(EXAMPLE_ARRAY_OF_OBJECTS, "tags", ["terrible"]), false);
      assert.strictEqual(Enum.isAny(EXAMPLE_ARRAY_OF_OBJECTS, "tags", {}), false);
      assert.strictEqual(Enum.isAny(EXAMPLE_ARRAY_OF_OBJECTS, "meta", { age: 33 }), true);
      assert.strictEqual(Enum.isAny(EXAMPLE_ARRAY_OF_OBJECTS, "meta", { active: false }), true);
      assert.strictEqual(Enum.isAny(EXAMPLE_ARRAY_OF_OBJECTS, "meta", { active: true }), false);
      assert.strictEqual(Enum.isAny(EXAMPLE_ARRAY_OF_OBJECTS, "meta", { something: 11 }), false);
    });
  });

  module("Enum.isEvery", function () {
    test("it works correctly", function (assert) {
      const SOME_ARRAY = [
        { id: 1, active: true, city: "Istanbul" },
        { id: 2, active: true, city: "Istanbul" },
        { id: 3, active: true, city: "Istanbul" },
        { id: 4, active: true, city: "Istanbul" },
      ];
      assert.strictEqual(Enum.isEvery(SOME_ARRAY, "id", Number), true);
      assert.strictEqual(Enum.isEvery(SOME_ARRAY, "id", 1), false);
      assert.strictEqual(Enum.isEvery(SOME_ARRAY, "active", true), true);
      assert.strictEqual(Enum.isEvery(SOME_ARRAY, "city", "Istanbul"), true);
      assert.strictEqual(Enum.isEvery(SOME_ARRAY, "city", String), true);
      assert.strictEqual(Enum.isEvery(SOME_ARRAY, "city", Array), false);
      assert.strictEqual(Enum.isEvery(EXAMPLE_ARRAY_OF_OBJECTS, "id", null), false);
      assert.strictEqual(Enum.isEvery(EXAMPLE_ARRAY_OF_OBJECTS, "id", 1), false);
      assert.strictEqual(Enum.isEvery(EXAMPLE_ARRAY_OF_OBJECTS, "id", 99), false);
      assert.strictEqual(Enum.isEvery(EXAMPLE_ARRAY_OF_OBJECTS, "active", undefined), false);
      assert.strictEqual(Enum.isEvery(EXAMPLE_ARRAY_OF_OBJECTS, "active", 0), false);
      assert.strictEqual(Enum.isEvery(EXAMPLE_ARRAY_OF_OBJECTS, "active", 1), false);
      assert.strictEqual(Enum.isEvery(EXAMPLE_ARRAY_OF_OBJECTS, "tags", ["happy"]), false);
      assert.strictEqual(Enum.isEvery(EXAMPLE_ARRAY_OF_OBJECTS, "tags", ["terrible"]), false);
      assert.strictEqual(Enum.isEvery(EXAMPLE_ARRAY_OF_OBJECTS, "tags", {}), false);
      assert.strictEqual(Enum.isEvery(EXAMPLE_ARRAY_OF_OBJECTS, "meta", { age: 33 }), false);
      assert.strictEqual(Enum.isEvery(EXAMPLE_ARRAY_OF_OBJECTS, "meta", { active: false }), false);
      assert.strictEqual(Enum.isEvery(EXAMPLE_ARRAY_OF_OBJECTS, "meta", { active: true }), false);
      assert.strictEqual(Enum.isEvery(EXAMPLE_ARRAY_OF_OBJECTS, "meta", { something: 11 }), false);
    });
  });
});
