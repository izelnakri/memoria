import Model, { Changeset, PrimaryGeneratedColumn, Column, RuntimeError, Serializer } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "./helpers/setup-memoria.js";

module("@memoria/model | new $Model() tests", function (hooks) {
  setupMemoria(hooks);

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
    assert.equal(emptyModel.inTransit, false);

    let model = new Post({ isNew: false });

    assert.propEqual(model, { id: undefined, isPublic: undefined, name: undefined });
    assert.notOk(Object.isSealed(model));
    assert.notOk(Object.isFrozen(model));

    assert.equal(model.isNew, false);
    assert.equal(model.isPersisted, false);
    assert.equal(model.isDeleted, false);
    assert.equal(model.isDirty, false);
    assert.equal(model.inTransit, false);

    let anotherModel = new Post({ isNew: false, isDeleted: true });

    assert.propEqual(anotherModel, { id: undefined, isPublic: undefined, name: undefined });
    assert.notOk(Object.isSealed(anotherModel));
    assert.notOk(Object.isFrozen(anotherModel));
    assert.equal(anotherModel.isNew, false);
    assert.equal(anotherModel.isPersisted, false);
    assert.equal(anotherModel.isDeleted, true);
    assert.equal(anotherModel.isDirty, false);
    assert.equal(anotherModel.inTransit, false);
  });

  test("model instantiated with new Model() handles attr tracking related methods correctly", function (assert) {
    let trackingProperties = ["isDirty", "changeset", "changedAttributes", "rollbackAttributes"];
    let { Post } = prepare();

    let emptyModel = new Post();

    assert.equal(emptyModel.isDirty, false);
    assert.deepEqual(emptyModel.changes, {});
    assert.matchChangeset(emptyModel.changeset, new Changeset(emptyModel));
    assert.deepEqual(emptyModel.revisionHistory, []);
    assert.deepEqual(emptyModel.revision, {});
    try {
      emptyModel.changedAttributes();
    } catch (error) {
      assert.ok(error instanceof RuntimeError);
    }
    try {
      emptyModel.rollbackAttributes();
    } catch (error) {
      assert.ok(error instanceof RuntimeError);
    }

    emptyModel.name = "some new name";

    assert.equal(emptyModel.isDirty, false);
    assert.deepEqual(emptyModel.changes, {});
    assert.matchChangeset(emptyModel.changeset, new Changeset(emptyModel, {}));
    assert.deepEqual(emptyModel.revisionHistory, []);
    assert.deepEqual(emptyModel.revision, {});

    try {
      emptyModel.changedAttributes();
    } catch (error) {
      assert.ok(error instanceof RuntimeError);
    }
    try {
      emptyModel.rollbackAttributes();
    } catch (error) {
      assert.ok(error instanceof RuntimeError);
    }
  });
});
