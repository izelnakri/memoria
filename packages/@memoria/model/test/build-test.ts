import setupRESTModels from "@memoria/adapters/test/helpers/models-with-relations/rest/id/index.js";
import Model, { Changeset, PrimaryGeneratedColumn, Column, InstanceDB } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "./helpers/setup-memoria.js";

module("@memoria/model | $Model.build() tests", function (hooks) {
  setupMemoria(hooks);

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

  module("metadata tests", function () {
    test("default metadata assignments are correct", function (assert) {
      let { Post } = prepare();

      let emptyModel = Post.build();

      assert.propEqual(emptyModel, { id: null, isPublic: null, name: "Imported photo" });
      assert.ok(Object.isSealed(emptyModel));
      assert.equal(emptyModel.isNew, true);
      assert.equal(emptyModel.isPersisted, false);
      assert.equal(emptyModel.isDeleted, false);
      assert.equal(emptyModel.isDirty, false);
      assert.equal(emptyModel.inTransit, false);

      emptyModel.name = "something";

      assert.propEqual(emptyModel, { id: null, isPublic: null, name: "something" });

      let model = Post.build({ isPublic: false }, { isNew: false });

      assert.propEqual(model, { id: null, isPublic: false, name: "Imported photo" });
      assert.ok(Object.isSealed(model));
      assert.equal(model.isNew, false);
      assert.equal(model.isPersisted, false);
      assert.equal(model.isDeleted, false);
      assert.equal(model.isDirty, false);
      assert.equal(model.inTransit, false);

      model.name = "something";

      assert.propEqual(model, { id: null, isPublic: false, name: "something" });

      let anotherModel = Post.build({ isPublic: false, name: "something else" }, { isNew: false, isDeleted: true });

      assert.propEqual(anotherModel, { id: null, isPublic: false, name: "something else" });
      assert.equal(anotherModel.isNew, false);
      assert.equal(anotherModel.isPersisted, false);
      assert.equal(anotherModel.isDeleted, true);
      assert.equal(anotherModel.isDirty, false);
      assert.equal(anotherModel.inTransit, false);

      anotherModel.name = "something";

      assert.propEqual(anotherModel, { id: null, isPublic: false, name: "something" });
    });

    test("can freeze the model", function (assert) {
      let { Post } = prepare();

      let newModel = Post.build({ isPublic: false, name: "something else" }, { freeze: true });

      assert.propEqual(newModel, { id: null, isPublic: false, name: "something else" });
      assert.ok(Object.isFrozen(newModel));

      let persistentModel = Post.build({ isPublic: null }, { isNew: false, freeze: true });

      assert.propEqual(persistentModel, { id: null, isPublic: null, name: "Imported photo" });
      assert.ok(Object.isFrozen(persistentModel));
    });
  });

  module("instantiation/casting attribute tests", function () {
    test("it can cast dates and undefined value correctly", function (assert) {
      class Book extends Model {
        @PrimaryGeneratedColumn("uuid")
        uuid: number;

        @Column("boolean", { default: true })
        isPublic: boolean;

        @Column({ type: "varchar", default: "Imported Photo" })
        name: string = "Imported photo";

        @Column("datetime", { default: true })
        publishedDate: Date = new Date("2021-10-07T01:59:59.956Z");
      }

      let emptyBook = Book.build();
      assert.propEqual(emptyBook, {
        uuid: null,
        isPublic: null,
        name: "Imported photo",
        publishedDate: new Date("2021-10-07T01:59:59.956Z"),
      });
      assert.ok(Object.isSealed(emptyBook));
      assert.equal(emptyBook.isNew, true);
      assert.notOk(emptyBook.isDirty);
      assert.deepEqual(emptyBook.revisionHistory, [
        {
          uuid: null,
          isPublic: null,
          name: "Imported photo",
          publishedDate: new Date("2021-10-07T01:59:59.956Z"),
        },
      ]);
      assert.deepEqual(emptyBook.revision, {
        uuid: null,
        isPublic: null,
        name: "Imported photo",
        publishedDate: new Date("2021-10-07T01:59:59.956Z"),
      });

      let secondBook = Book.build({ publishedDate: new Date("2022-04-21T01:59:59.956Z") });
      assert.propEqual(secondBook, {
        uuid: null,
        isPublic: null,
        name: "Imported photo",
        publishedDate: new Date("2022-04-21T01:59:59.956Z"),
      });
      assert.notOk(secondBook.isDirty);
      assert.deepEqual(secondBook.revisionHistory, [
        {
          uuid: null,
          isPublic: null,
          name: "Imported photo",
          publishedDate: new Date("2022-04-21T01:59:59.956Z"),
        },
      ]);
      assert.deepEqual(secondBook.revision, {
        uuid: null,
        isPublic: null,
        name: "Imported photo",
        publishedDate: new Date("2022-04-21T01:59:59.956Z"),
      });

      let thirdBook = Book.build({ name: undefined, publishedDate: "2011-05-21T01:59:59.956Z" });
      assert.propEqual(thirdBook, {
        uuid: null,
        isPublic: null,
        name: null,
        publishedDate: new Date("2011-05-21T01:59:59.956Z"),
      });
      assert.notOk(thirdBook.isDirty);
      assert.deepEqual(thirdBook.revisionHistory, [
        {
          uuid: null,
          isPublic: null,
          name: null,
          publishedDate: new Date("2011-05-21T01:59:59.956Z"),
        },
      ]);
      assert.deepEqual(thirdBook.revision, {
        uuid: null,
        isPublic: null,
        name: null,
        publishedDate: new Date("2011-05-21T01:59:59.956Z"),
      });
    });

    test("$Model.build(modelInstance) copies relationships when instance provided and failed relationships fetches correctly", async function (assert) {
      let { Server, RESTPhoto, MemoryPhoto, RESTUser } = setupRESTModels();
      this.Server = Server;

      this.Server.get("/users/:id", async (request) => {
        return {
          errors: [
            {
              id: 44,
              modelName: "MemoryPhoto",
              attribute: "id",
              message: "not found",
            },
          ],
        };
      });

      let photo = RESTPhoto.build({ name: "Dinner photo", owner_id: 44 });
      let ownerPromise = photo.owner;
      try {
        await ownerPromise;
      } catch (error) {
        assert.ok(error.message.includes(`Web server responds with an error for GET`));
        assert.ok(error.message.includes("/users/44"));
      }

      RESTPhoto.build(photo);

      let insertedUser = await RESTUser.insert({ id: 44, first_name: "Izel", last_name: "Nakri" });

      assert.propContains(insertedUser.toJSON(), { id: 44, first_name: "Izel", last_name: "Nakri" });
      assert.propEqual(photo.owner, insertedUser);
    });

    test("$Model.build(objectWithModel) sets foreign key relationships correctly", async function (assert) {
      let { Server, MemoryUser, MemoryPhoto } = setupRESTModels();
      this.Server = Server;

      let users = await MemoryUser.insertAll([{ first_name: "Izel" }, { first_name: "Moris" }]);
      let firstPhoto = MemoryPhoto.build({ name: "Family photo", owner: users[0] });
      let secondPhoto = MemoryPhoto.build({ name: "Trip photo", owner: users[1] });

      assert.equal(firstPhoto.owner_id, users[0].id);
      assert.propEqual(firstPhoto.owner, users[0]);
      assert.equal(secondPhoto.owner_id, users[1].id);
      assert.propEqual(secondPhoto.owner, users[1]);
    });

    test('When $Model.build() is provided with a foreign key and the reference as pure object it sets it correctly', async function (assert) {
      let { Server, RESTUser, RESTPhoto } = setupRESTModels();
      this.Server = Server;

      let user = await RESTUser.insert({ first_name: "Izel" });
      let copiedUser = RESTUser.build(user);

      assert.notStrictEqual(user, copiedUser);
      assert.deepEqual(user.toJSON(), copiedUser.toJSON());

      let builtPhoto = RESTPhoto.build({ name: "Dinner photo", owner: user, owner_id: user.id });

      assert.equal(builtPhoto.owner_id, 1);
      assert.strictEqual(builtPhoto.owner, user);

      let anotherBuiltPhoto = RESTPhoto.build({
        name: "Dinner photo",
        owner: { id: 1, first_name: "Izel", last_name: null },
        owner_id: user.id
      });

      assert.equal(anotherBuiltPhoto.owner_id, 1);
      assert.notStrictEqual(anotherBuiltPhoto.owner, user);
      assert.deepEqual(anotherBuiltPhoto.owner.toJSON(), user.toJSON());
    });

    // NOTE: Move this to validation tests along with other validation tests.
    test('When $Model.build() is provided with mismatched foreign key and reference with wrong primary key it throws!', async function (assert) {
      let { Server, RESTUser, RESTPhoto } = setupRESTModels();
      this.Server = Server;

      let user = await RESTUser.insert({ first_name: "Izel" });
      let copiedUser = RESTUser.build(user);

      assert.notStrictEqual(user, copiedUser);
      assert.deepEqual(user.toJSON(), copiedUser.toJSON());

      try {
        RESTPhoto.build({ name: "Dinner photo", owner: user, owner_id: 99 });
      } catch (error) {
        assert.equal(error.message, 'You cannot provide different owner_id: 99 and owner.id: 1 for RESTPhoto partial!');
      }

      try {
        RESTPhoto.build({
          name: "Dinner photo",
          owner: { id: 55, first_name: "Izel", last_name: null },
          owner_id: user.id
        });
      } catch (error) {
        assert.equal(error.message, 'You cannot provide different owner_id: 1 and owner.id: 55 for RESTPhoto partial!');
      }

      assert.equal(InstanceDB.getAllUnknownInstances(RESTPhoto).length, 2); // NOTE: Make this 0 in future
      assert.ok(InstanceDB.getAllUnknownInstances(RESTPhoto).every((set) => set.size === 0));

      let builtPhoto = RESTPhoto.build({ name: "Dinner photo", owner: user, owner_id: user.id });

      assert.equal(InstanceDB.getAllUnknownInstances(RESTPhoto).length, 3); // NOTE: Make this 1 in future
      assert.deepEqual(InstanceDB.getAllUnknownInstances(RESTPhoto)[2], new Set([builtPhoto]));
      assert.equal(builtPhoto.owner_id, 1);
      assert.strictEqual(builtPhoto.owner, user);
    });
  });

  module("dirty tracking & revision tests", function () {
    test("model tracking works correctly for empty builds", function (assert) {
      let { Post } = prepare();

      let emptyModel = Post.build();

      assert.notOk(emptyModel.isDirty);
      assert.deepEqual(emptyModel.changes, {});
      assert.matchChangeset(emptyModel.changeset, new Changeset(emptyModel));
      assert.deepEqual(emptyModel.revisionHistory, [{ id: null, isPublic: null, name: "Imported photo" }]);
      assert.deepEqual(emptyModel.revision, { id: null, isPublic: null, name: "Imported photo" });
      assert.deepEqual(emptyModel.changedAttributes(), {});

      emptyModel.name = "some new name";

      assert.ok(emptyModel.isDirty);
      assert.deepEqual(emptyModel.changes, { name: "some new name" });
      assert.matchChangeset(emptyModel.changeset, new Changeset(emptyModel, { name: "some new name" }));
      assert.deepEqual(emptyModel.revisionHistory, [{ id: null, isPublic: null, name: "Imported photo" }]);
      assert.deepEqual(emptyModel.revision, { id: null, isPublic: null, name: "Imported photo" });
      assert.deepEqual(emptyModel.changedAttributes(), {
        name: ["Imported photo", "some new name"],
      });

      emptyModel.isPublic = true;

      assert.ok(emptyModel.isDirty);
      assert.deepEqual(emptyModel.changes, { name: "some new name", isPublic: true });
      assert.matchChangeset(emptyModel.changeset, new Changeset(emptyModel, { name: "some new name", isPublic: true }));
      assert.deepEqual(emptyModel.revisionHistory, [{ id: null, isPublic: null, name: "Imported photo" }]);
      assert.deepEqual(emptyModel.revision, { id: null, isPublic: null, name: "Imported photo" });
      assert.deepEqual(emptyModel.changedAttributes(), {
        name: ["Imported photo", "some new name"],
        isPublic: [null, true],
      });

      emptyModel.name = "another new name";

      assert.ok(emptyModel.isDirty);
      assert.deepEqual(emptyModel.changes, { name: "another new name", isPublic: true });
      assert.matchChangeset(
        emptyModel.changeset,
        new Changeset(emptyModel, { name: "another new name", isPublic: true })
      );
      assert.deepEqual(emptyModel.revisionHistory, [{ id: null, isPublic: null, name: "Imported photo" }]);
      assert.deepEqual(emptyModel.revision, { id: null, isPublic: null, name: "Imported photo" });
      assert.deepEqual(emptyModel.changedAttributes(), {
        name: ["Imported photo", "another new name"],
        isPublic: [null, true],
      });

      emptyModel.isPublic = null;

      assert.ok(emptyModel.isDirty);
      assert.deepEqual(emptyModel.changes, { name: "another new name" });
      assert.matchChangeset(emptyModel.changeset, new Changeset(emptyModel, { name: "another new name" }));
      assert.deepEqual(emptyModel.changedAttributes(), {
        name: ["Imported photo", "another new name"],
      });

      emptyModel.name = "Imported photo";

      assert.notOk(emptyModel.isDirty);
      assert.deepEqual(emptyModel.changes, {});
      assert.matchChangeset(emptyModel.changeset, new Changeset(emptyModel, {}));
      assert.deepEqual(emptyModel.changedAttributes(), {});
    });

    test("model tracking works correctly for built models with provided data", function (assert) {
      let { Post } = prepare();

      let model = Post.build({ name: "Izel Nakri" });

      assert.notOk(model.isDirty);
      assert.deepEqual(model.changes, {});
      assert.matchChangeset(model.changeset, new Changeset(model, {}));
      assert.deepEqual(model.revisionHistory, [{ id: null, isPublic: null, name: "Izel Nakri" }]);
      assert.deepEqual(model.revision, { id: null, isPublic: null, name: "Izel Nakri" });
      assert.deepEqual(model.changedAttributes(), {});

      model.name = "some new name";

      assert.ok(model.isDirty);
      assert.deepEqual(model.changes, { name: "some new name" });
      assert.matchChangeset(model.changeset, new Changeset(model, { name: "some new name" }));
      assert.deepEqual(model.revisionHistory, [{ id: null, isPublic: null, name: "Izel Nakri" }]);
      assert.deepEqual(model.revision, { id: null, isPublic: null, name: "Izel Nakri" });
      assert.deepEqual(model.changedAttributes(), {
        name: ["Izel Nakri", "some new name"],
      });

      model.isPublic = true;

      assert.ok(model.isDirty);
      assert.deepEqual(model.changes, { name: "some new name", isPublic: true });
      assert.matchChangeset(model.changeset, new Changeset(model, { name: "some new name", isPublic: true }));
      assert.deepEqual(model.revisionHistory, [{ id: null, isPublic: null, name: "Izel Nakri" }]);
      assert.deepEqual(model.revision, { id: null, isPublic: null, name: "Izel Nakri" });
      assert.deepEqual(model.changedAttributes(), {
        name: ["Izel Nakri", "some new name"],
        isPublic: [null, true],
      });

      model.name = "another new name";

      assert.ok(model.isDirty);
      assert.deepEqual(model.changes, { name: "another new name", isPublic: true });
      assert.matchChangeset(model.changeset, new Changeset(model, { name: "another new name", isPublic: true }));
      assert.deepEqual(model.revisionHistory, [{ id: null, isPublic: null, name: "Izel Nakri" }]);
      assert.deepEqual(model.revision, { id: null, isPublic: null, name: "Izel Nakri" });
      assert.deepEqual(model.changedAttributes(), {
        name: ["Izel Nakri", "another new name"],
        isPublic: [null, true],
      });

      model.isPublic = null;

      assert.ok(model.isDirty);
      assert.deepEqual(model.changes, { name: "another new name" });
      assert.matchChangeset(model.changeset, new Changeset(model, { name: "another new name" }));
      assert.deepEqual(model.changedAttributes(), {
        name: ["Izel Nakri", "another new name"],
      });

      model.name = "Izel Nakri";

      assert.notOk(model.isDirty);
      assert.deepEqual(model.changes, {});
      assert.matchChangeset(model.changeset, new Changeset(model, {}));
      assert.deepEqual(model.changedAttributes(), {});
    });

    test("model tracking works correctly for built models with provided data and class default fields", function (assert) {
      let { Post } = prepare();

      let model = Post.build({ id: 5, isPublic: true });

      assert.notOk(model.isDirty);
      assert.ok(model.isNew);
      assert.deepEqual(model.changes, {});
      assert.matchChangeset(model.changeset, new Changeset(model, {}));
      assert.deepEqual(model.revisionHistory, [{ id: 5, isPublic: true, name: "Imported photo" }]);
      assert.deepEqual(model.revision, { id: 5, isPublic: true, name: "Imported photo" });
      assert.deepEqual(model.changedAttributes(), {});

      model.isPublic = false;
      model.name = "some new name";

      assert.ok(model.isDirty);
      assert.deepEqual(model.changes, { isPublic: false, name: "some new name" });
      assert.matchChangeset(model.changeset, new Changeset(model, { isPublic: false, name: "some new name" }));
      assert.deepEqual(model.revisionHistory, [{ id: 5, isPublic: true, name: "Imported photo" }]);
      assert.deepEqual(model.revision, { id: 5, isPublic: true, name: "Imported photo" });
      assert.deepEqual(model.changedAttributes(), {
        isPublic: [true, false],
        name: ["Imported photo", "some new name"],
      });

      model.isPublic = true;

      assert.ok(model.isDirty);
      assert.deepEqual(model.changes, { name: "some new name" });
      assert.matchChangeset(model.changeset, new Changeset(model, { name: "some new name" }));
      assert.deepEqual(model.revisionHistory, [{ id: 5, isPublic: true, name: "Imported photo" }]);
      assert.deepEqual(model.revision, { id: 5, isPublic: true, name: "Imported photo" });
      assert.deepEqual(model.changedAttributes(), {
        name: ["Imported photo", "some new name"],
      });

      model.name = "Imported photo";

      assert.notOk(model.isDirty);
      assert.ok(model.isNew);
      assert.deepEqual(model.changes, {});
      assert.matchChangeset(model.changeset, new Changeset(model, {}));
      assert.deepEqual(model.revisionHistory, [{ id: 5, isPublic: true, name: "Imported photo" }]);
      assert.deepEqual(model.revision, { id: 5, isPublic: true, name: "Imported photo" });
      assert.deepEqual(model.changedAttributes(), {});
    });
  });

  module(".rollbackAttributes() tests", function () {
    test(".rollbackAttributes() work for empty built models", function (assert) {
      let { Post } = prepare();

      let emptyModel = Post.build();

      assert.notOk(emptyModel.isDirty);
      assert.deepEqual(emptyModel.revisionHistory, [{ id: null, isPublic: null, name: "Imported photo" }]);
      assert.deepEqual(emptyModel.revision, { id: null, isPublic: null, name: "Imported photo" });
      assert.deepEqual(emptyModel.changedAttributes(), {});

      emptyModel.name = "some new name";
      emptyModel.id = 22;
      emptyModel.isPublic = null;

      assert.ok(emptyModel.isDirty);
      assert.deepEqual(emptyModel.changes, { id: 22, name: "some new name" });
      assert.matchChangeset(emptyModel.changeset, new Changeset(emptyModel, { id: 22, name: "some new name" }));
      assert.deepEqual(emptyModel.revisionHistory, [{ id: null, isPublic: null, name: "Imported photo" }]);
      assert.deepEqual(emptyModel.revision, { id: null, isPublic: null, name: "Imported photo" });
      assert.deepEqual(emptyModel.changedAttributes(), {
        id: [null, 22],
        name: ["Imported photo", "some new name"],
      });

      emptyModel.rollbackAttributes();

      assert.notOk(emptyModel.isDirty);
      assert.deepEqual(emptyModel.changes, {});
      assert.matchChangeset(emptyModel.changeset, new Changeset(emptyModel, {}));
      assert.deepEqual(emptyModel.revisionHistory, [{ id: null, isPublic: null, name: "Imported photo" }]);
      assert.deepEqual(emptyModel.revision, { id: null, isPublic: null, name: "Imported photo" });
      assert.deepEqual(emptyModel.changedAttributes(), {});

      emptyModel.name = "some new name";

      assert.ok(emptyModel.isDirty);
      assert.deepEqual(emptyModel.changes, { name: "some new name" });
      assert.matchChangeset(emptyModel.changeset, new Changeset(emptyModel, { name: "some new name" }));
      assert.deepEqual(emptyModel.revisionHistory, [{ id: null, isPublic: null, name: "Imported photo" }]);
      assert.deepEqual(emptyModel.revision, { id: null, isPublic: null, name: "Imported photo" });
      assert.deepEqual(emptyModel.changedAttributes(), {
        name: ["Imported photo", "some new name"],
      });
    });

    test(".rollbackAttributes() works for works correctly for built models with provided data and class default fields", function (assert) {
      let { Post } = prepare();

      let model = Post.build({ id: 5, isPublic: true });

      assert.notOk(model.isDirty);
      assert.ok(model.isNew);
      assert.deepEqual(model.changes, {});
      assert.matchChangeset(model.changeset, new Changeset(model, {}));
      assert.deepEqual(model.revisionHistory, [{ id: 5, isPublic: true, name: "Imported photo" }]);
      assert.deepEqual(model.revision, { id: 5, isPublic: true, name: "Imported photo" });
      assert.deepEqual(model.changedAttributes(), {});

      model.isPublic = false;
      model.name = "some new name";

      assert.ok(model.isDirty);
      assert.deepEqual(model.changes, { isPublic: false, name: "some new name" });
      assert.matchChangeset(model.changeset, new Changeset(model, { isPublic: false, name: "some new name" }));
      assert.deepEqual(model.revisionHistory, [{ id: 5, isPublic: true, name: "Imported photo" }]);
      assert.deepEqual(model.revision, { id: 5, isPublic: true, name: "Imported photo" });
      assert.deepEqual(model.changedAttributes(), {
        isPublic: [true, false],
        name: ["Imported photo", "some new name"],
      });

      model.rollbackAttributes();

      assert.notOk(model.isDirty);
      assert.ok(model.isNew);
      assert.deepEqual(model.changes, {});
      assert.matchChangeset(model.changeset, new Changeset(model, {}));
      assert.deepEqual(model.revisionHistory, [{ id: 5, isPublic: true, name: "Imported photo" }]);
      assert.deepEqual(model.revision, { id: 5, isPublic: true, name: "Imported photo" });
      assert.deepEqual(model.changedAttributes(), {});

      model.name = "some new name";

      assert.ok(model.isDirty);
      assert.deepEqual(model.changes, { name: "some new name" });
      assert.matchChangeset(model.changeset, new Changeset(model, { name: "some new name" }));
      assert.deepEqual(model.revisionHistory, [{ id: 5, isPublic: true, name: "Imported photo" }]);
      assert.deepEqual(model.revision, { id: 5, isPublic: true, name: "Imported photo" });
      assert.deepEqual(model.changedAttributes(), {
        name: ["Imported photo", "some new name"],
      });
    });
  });
});
