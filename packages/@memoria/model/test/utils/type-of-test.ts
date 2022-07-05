import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";
import Model, { typeOf, PrimaryGeneratedColumn, HasManyArray } from "@memoria/model";

module("@memoria/model | Utils | typeOf", function (hooks) {
  setupMemoria(hooks);

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
    assert.equal(typeOf(Human), 'class'); // 'class'
    assert.equal(typeOf(User), 'class'); // 'class'
    assert.equal(typeOf(HasManyArray), 'class');
    assert.equal(typeOf(new Human()), 'instance'); // 'instance'
    assert.equal(typeOf(new User()), 'instance'); // 'instance'
    assert.equal(typeOf(User.build()), 'instance'); // 'instance'
    assert.equal(typeOf(new Error('teamocil')), 'error');
    assert.equal(typeOf({ a: 'b' }), 'object');
    assert.equal(typeOf(NaN), 'nan');
    assert.equal(typeOf(new Map()), 'map');
    assert.equal(typeOf(new Set()), 'set');
    assert.equal(typeOf(Symbol('a')), 'symbol');
  });
});
