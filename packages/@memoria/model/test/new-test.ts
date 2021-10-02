import Model, { PrimaryGeneratedColumn, Column, Serializer } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "./helpers/setup-memoria.js";

// check isExtensible, Object.isFrozen
module("@memoria/model | new $Model() tests", function (hooks) {
  function prepare() {
    class Post extends Model {
      @PrimaryGeneratedColumn()
      id: number;

      @Column("boolean", { default: true })
      isPublic: boolean;

      @Column({ type: "varchar", default: "Imported Photo" })
      name: string;
    }

    return { Post };
  }

  test("default metadata assignments are correct", function (assert) {
    let { Post } = prepare();

    let emptyModel = new Post();

    assert.propEqual(emptyModel, { id: undefined, isPublic: undefined, name: undefined });
    assert.notOk(Object.isSealed(emptyModel));
    assert.notOk(Object.isFrozen(emptyModel));
    assert.equal(emptyModel.isNew, true);
    assert.equal(emptyModel.isPersisted, false);
    assert.equal(emptyModel.isDeleted, false);
    assert.equal(emptyModel.isDirty, false);
    assert.equal(emptyModel.inFlight, false);

    let model = new Post({ isNew: false });

    assert.propEqual(model, { id: undefined, isPublic: undefined, name: undefined });
    assert.notOk(Object.isSealed(model));
    assert.notOk(Object.isFrozen(model));
    assert.equal(model.isNew, false);
    assert.equal(model.isPersisted, true);
    assert.equal(model.isDeleted, false);
    assert.equal(model.isDirty, false);
    assert.equal(model.inFlight, false);

    let anotherModel = new Post({ isNew: false, isDeleted: true });

    assert.propEqual(anotherModel, { id: undefined, isPublic: undefined, name: undefined });
    assert.notOk(Object.isSealed(anotherModel));
    assert.notOk(Object.isFrozen(anotherModel));
    assert.equal(anotherModel.isNew, false);
    assert.equal(anotherModel.isPersisted, true);
    assert.equal(anotherModel.isDeleted, true);
    assert.equal(anotherModel.isDirty, false);
    assert.equal(anotherModel.inFlight, false);
  });
});
