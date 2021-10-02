import Model, { PrimaryGeneratedColumn, Column, Serializer } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "./helpers/setup-memoria.js";

module("@memoria/model | $Model.build() tests", function (hooks) {
  function prepare() {
    class Post extends Model {
      @PrimaryGeneratedColumn()
      id: number;

      @Column("boolean", { default: true })
      isPublic: boolean;

      @Column({ type: "varchar", default: "Imported Photo" })
      name: string = "Imported photo";
    }

    return { Post };
  }

  test("default metadata assignments are correct", function (assert) {
    let { Post } = prepare();

    let emptyModel = Post.build();

    assert.propEqual(emptyModel, { id: null, isPublic: null, name: "Imported photo" });
    assert.ok(Object.isSealed(emptyModel));
    assert.notOk(Object.isFrozen(emptyModel));
    assert.equal(emptyModel.isNew, true);
    assert.equal(emptyModel.isPersisted, false);
    assert.equal(emptyModel.isDeleted, false);
    assert.equal(emptyModel.isDirty, false);
    assert.equal(emptyModel.inFlight, false);

    let model = Post.build({ isPublic: false }, { isNew: false });

    assert.propEqual(model, { id: null, isPublic: false, name: "Imported photo" });
    assert.ok(Object.isSealed(model));
    assert.notOk(Object.isFrozen(model));
    assert.equal(model.isNew, false);
    assert.equal(model.isPersisted, true);
    assert.equal(model.isDeleted, false);
    assert.equal(model.isDirty, false);
    assert.equal(model.inFlight, false);

    let anotherModel = Post.build(
      { isPublic: false, name: "something else" },
      { isNew: false, isDeleted: true }
    );

    assert.propEqual(anotherModel, { id: null, isPublic: false, name: "something else" });
    assert.ok(Object.isSealed(anotherModel));
    assert.notOk(Object.isFrozen(anotherModel));
    assert.equal(anotherModel.isNew, false);
    assert.equal(anotherModel.isPersisted, true);
    assert.equal(anotherModel.isDeleted, true);
    assert.equal(anotherModel.isDirty, false);
    assert.equal(anotherModel.inFlight, false);
  });
});
