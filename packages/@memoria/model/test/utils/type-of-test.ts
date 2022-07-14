import { module, test } from "qunitx";
import Model, { typeOf, PrimaryGeneratedColumn, HasManyArray } from "@memoria/model";

module("@memoria/model | Utils | typeOf", function (hooks) {
  test('typeof() works for different types of values', function (assert) {
    function someFunction() {

    }

    class Human {}
    class User extends Model {
      @PrimaryGeneratedColumn()
      id: number;
    }

    assert.equal(typeOf(), 'undefined');
    assert.equal(typeOf(null), 'null');
    assert.equal(typeOf(undefined), 'undefined');
    assert.equal(typeOf('michael'), 'string');
    assert.equal(typeOf(new String('michael')), 'string');
    assert.equal(typeOf(101), 'number');
    assert.equal(typeOf(new Number(101)), 'number');
    assert.equal(typeOf(true), 'boolean');
    assert.equal(typeOf(new Boolean(true)), 'boolean');
    assert.equal(typeOf(someFunction), 'function');
    assert.equal(typeOf(new HasManyArray()), 'array');
    assert.equal(typeOf(new HasManyArray([])), 'array');
    assert.equal(typeOf([1, 2, 90]), 'array');
    assert.equal(typeOf(/abc/), 'regexp');
    assert.equal(typeOf(new Date()), 'date');
    assert.equal(typeOf(Human), 'class');
    assert.equal(typeOf(User), 'class');
    assert.equal(typeOf(HasManyArray), 'class');
    assert.equal(typeOf(new Human()), 'instance');
    assert.equal(typeOf(new User()), 'instance');
    assert.equal(typeOf(User.build()), 'instance');
    assert.equal(typeOf(new Error('teamocil')), 'error');
    assert.equal(typeOf({ a: 'b' }), 'object');
    assert.equal(typeOf(NaN), 'nan');
    assert.equal(typeOf(new Map()), 'map');
    assert.equal(typeOf(new Set()), 'set');
    assert.equal(typeOf(Symbol('a')), 'symbol');
    assert.equal(typeOf(() => {}), 'function');
  });

  test('typeof() basic primative classes should return class type', function (assert) {
    assert.equal(typeOf(Boolean), 'class');
    assert.equal(typeOf(Number), 'class');
    assert.equal(typeOf(Object), 'class');
    assert.equal(typeOf(Map), 'class');
    assert.equal(typeOf(Array), 'class');
    assert.equal(typeOf(Set), 'class');
    assert.equal(typeOf(Date), 'class');
    assert.equal(typeOf(Symbol), 'class');
    assert.equal(typeOf(Function), 'class');
    assert.equal(typeOf(BigInt), 'class');
    assert.equal(typeOf(NaN), 'nan');
    assert.equal(typeOf(Promise), 'class');
    assert.equal(typeOf(RegExp), 'class');
    assert.equal(typeOf(Error), 'class');
    assert.equal(typeOf(WeakMap), 'class');
    assert.equal(typeOf(WeakSet), 'class');
  });
});
