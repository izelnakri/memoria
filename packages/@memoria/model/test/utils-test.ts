import Model, {
  PrimaryGeneratedColumn,
  Column,
  Serializer,
  get,
  set,
  getProperties,
  setProperties,
} from "@memoria/model";
import { module, test } from "qunitx";

module("@memoria/model | Util functions", function (hooks) {
  const PHOTO_FIXTURES = [
    {
      id: 1,
      name: "Ski trip",
      href: "ski-trip.jpeg",
      is_public: false,
    },
    {
      id: 2,
      name: "Family photo",
      href: "family-photo.jpeg",
      is_public: true,
    },
    {
      id: 3,
      name: "Selfie",
      href: "selfie.jpeg",
      is_public: false,
    },
  ];
  const PHOTO_COMMENT_FIXTURES = [
    {
      uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
      content: "What a nice photo!",
      photo_id: 1,
      user_id: 1,
    },
    {
      uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
      content: "I agree",
      photo_id: 1,
      user_id: 2,
    },
    {
      uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
      content: "I was kidding",
      photo_id: 1,
      user_id: 1,
    },
    {
      uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
      content: "Interesting indeed",
      photo_id: 2,
      user_id: 1,
    },
  ];

  function prepare() {
    class Photo extends Model {
      static Serializer = class PhotoSerializer extends Serializer {};

      @PrimaryGeneratedColumn()
      id: number;

      @Column()
      name: string;

      @Column()
      href: string;

      @Column("boolean")
      is_public: boolean;
    }
    class PhotoComment extends Model {
      static Serializer = class PhotoCommentSerializer extends Serializer {};

      @PrimaryGeneratedColumn("uuid")
      uuid: string;

      @Column()
      content: string;

      @Column("int")
      photo_id: number;

      @Column("int")
      user_id: number;
    }
    class User extends Model {
      static Serializer = class UserSerializer extends Serializer {};

      @PrimaryGeneratedColumn()
      id: number;

      @Column()
      first_name: string;

      @Column()
      last_name: string;
    }
    [Photo, PhotoComment, User].forEach((Model) => (Model.Serializer.embeds = {})); // TODO: REMOVE THIS REGISTRATION BY IMPLEMENTING SERIALIZER

    let obj = {
      foo: {
        bar: {
          baz: { biff: "BIFF" },
        },
      },
      foothis: {
        bar: {
          baz: { biff: "BIFF" },
        },
      },
      falseValue: false,
      emptyString: "",
      Wuz: {
        nar: "foo",
      },
      nullValue: null,
    };

    return { obj, User, Photo, PhotoComment };
  }

  test("get() works", async function (assert) {
    const { obj, Photo, PhotoComment } = prepare();

    assert.deepEqual(get(obj, "foo"), obj.foo);
    assert.deepEqual(get(obj, "foo.bar"), obj.foo.bar);
    assert.deepEqual(get(obj, "foothis.bar"), obj.foothis.bar);
    assert.strictEqual(get(obj, "falseValue.notDefined"), undefined);
    assert.strictEqual(get(obj, "emptyString.length"), 0);
    assert.strictEqual(get(obj, "nullValue.notDefined"), undefined);

    assert.deepEqual(get(obj, "Wuz"), obj.Wuz);
    assert.deepEqual(get(obj, "Wuz.nar"), obj.Wuz.nar);
    assert.strictEqual(get(obj, "Foo"), undefined);
    assert.strictEqual(get(obj, "Foo.bar"), undefined);

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    let photo = (await Photo.find(1)) as object;

    assert.equal(get(photo, "foo"), undefined);
    assert.equal(get(photo, "foo.bar"), undefined);
    assert.equal(get(photo, "id"), 1);
    assert.equal(get(photo, "name"), photo.name);
    assert.equal(get(photo, "is_public"), photo.is_public);

    let arr = ["first", "second"];

    assert.equal(get(arr, 0), "first");
    assert.equal(get(arr, 1), "second");

    let anotherObj = { "": "empty-string" };

    assert.equal(get(anotherObj, ""), "empty-string");

    let someObject = { tomster: true };

    assert.equal(get(someObject, ""), undefined);

    let count = 0;
    let computedObject = {
      get id() {
        return ++count;
      },
    };

    get(computedObject, "id");

    assert.equal(count, 1);

    let func = function () {};
    func.bar = "awesome";

    assert.equal(get({ foo: null }, "foo.bar"), undefined);
    assert.equal(get({ foo: { bar: "hello" } }, "foo.bar.length"), 5);
    assert.equal(get({ foo: func }, "foo.bar"), "awesome");
    assert.equal(get({ foo: func }, "foo.bar.length"), 7);
    assert.equal(get({}, "foo.bar.length"), undefined);
    assert.equal(
      get(function () {}, "foo.bar.length"),
      undefined
    );
    assert.equal(get("", "foo.bar.length"), undefined);
  });

  test("set() works", async function (assert) {
    let obj = {
      string: "string",
      number: 23,
      boolTrue: true,
      boolFalse: false,
      nullValue: null,
      undefinedValue: undefined,
    };

    let newObj = {};

    for (let key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) {
        continue;
      }

      assert.equal(set(newObj, key, obj[key]), obj[key], "should return value");
      assert.ok(key in newObj, "should have key");
      assert.ok(Object.prototype.hasOwnProperty.call(newObj, key), "should have key");
      assert.equal(get(newObj, key), obj[key], "should set value");
    }

    let numberedObject = {};

    set(numberedObject, 1, "first");
    assert.equal(numberedObject[1], "first");

    let arr = ["first", "second"];

    set(arr, 1, "lol");
    assert.deepEqual(arr, ["first", "lol"]);

    let count = 0;

    class Foo {
      __foo = "";

      get foo() {
        return this.__foo;
      }

      set foo(value) {
        count++;
        this.__foo = `computed ${value}`;
      }
    }

    let instance = new Foo();

    assert.equal(set(instance, "foo", "bar"), "bar", "should return set value");
    assert.equal(count, 1, "should have native setter");
    assert.equal(get(instance, "foo"), "computed bar", "should return new value");
  });

  test("set() should respect prototypical inheritance when subclasses override CPs", function (assert) {
    let ParentClass = class ParentClass {
      set prop(val) {
        assert.ok(false, "incorrect setter called");
        this._val = val;
      }
    };

    let SubClass = class SubClass extends ParentClass {
      set prop(val) {
        assert.ok(true, "correct setter called");
        this._val = val;
      }
    };

    let instance = new SubClass();

    instance.prop = 123;
  });

  test("getProperties() works", async function (assert) {
    let obj = {
      firstName: "Steve",
      lastName: "Jobs",
      companyName: "Apple, Inc.",
    };

    assert.deepEqual(getProperties(obj, ["lastName"]), { lastName: "Jobs" });
    assert.deepEqual(getProperties(obj), {});
    assert.deepEqual(getProperties(obj, ["firstName", "lastName"]), {
      firstName: "Steve",
      lastName: "Jobs",
    });
    assert.deepEqual(getProperties(obj, ["firstName"]), {
      firstName: "Steve",
    });
    assert.deepEqual(getProperties(obj, []), {});
  });

  test("setProperties() works", async function (assert) {
    assert.deepEqual(setProperties(null, null), null, 'noop for null properties and null object');
    assert.deepEqual(
      setProperties(undefined, undefined),
      undefined,
      'noop for undefined properties and undefined object'
    );

    assert.deepEqual(setProperties({}), undefined, 'noop for no properties');
    assert.deepEqual(setProperties({}, undefined), undefined, 'noop for undefined');
    assert.deepEqual(setProperties({}, null), null, 'noop for null');
    assert.deepEqual(setProperties({}, NaN), NaN, 'noop for NaN');
    assert.deepEqual(setProperties({}, {}), {}, 'meh');

    let props = setProperties({}, { foo: undefined });
    assert.deepEqual(props, { foo: undefined }, 'Setting undefined value');
    assert.ok('foo' in props, 'Setting undefined value');
    assert.deepEqual(Object.keys(props), ['foo'], 'Setting undefined value');

    assert.deepEqual(setProperties({}, { foo: 1 }), { foo: 1 }, 'Set a single property');

    assert.deepEqual(
      setProperties({}, { foo: 1, bar: 1 }),
      { foo: 1, bar: 1 },
      'Set multiple properties'
    );

    assert.deepEqual(
      setProperties({ foo: 2, baz: 2 }, { foo: 1 }),
      { foo: 1 },
      'Set one of multiple properties'
    );

    assert.deepEqual(
      setProperties({ foo: 2, baz: 2 }, { bar: 2 }),
      {
        bar: 2,
      },
      'Set an additional, previously unset property'
    );
  });
});
