import Model, { PrimaryGeneratedColumn, Column } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "./helpers/setup-memoria.js";

module("@memoria/model | Stores | $Model.build() InstanceDB references", function (hooks) {
  setupMemoria(hooks);

  const { InstanceDB } = Model.DEBUG;

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

  module('InstanceCache location tests', function() {
    test("$Model.build() without ids appends correct unknownInstances cache", async function (assert) {
      const { Post } = prepare();

      let builtPost = Post.build({ name: "Some post" });

      assert.equal(InstanceDB.getReferences(builtPost).size, 1);
      assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 1);
      assert.equal(InstanceDB.getAllKnownReferences(Post).size, 0);

      let anotherPost = Post.build({ name: "Another post" });

      assert.equal(InstanceDB.getReferences(builtPost).size, 1);
      assert.equal(InstanceDB.getReferences(anotherPost).size, 1);
      assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 2);
      assert.equal(InstanceDB.getAllKnownReferences(Post).size, 0);
      assert.deepEqual(InstanceDB.getAllUnknownInstances(Post), [new Set([builtPost]), new Set([anotherPost])]);
    });

    test("$Model.build() without ids but instance appends to existing unknownInstances cache", async function (assert) {
      const { Post } = prepare();

      let builtPost = Post.build({ name: "Some post" });

      assert.equal(InstanceDB.getReferences(builtPost).size, 1);
      assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 1);
      assert.equal(InstanceDB.getAllKnownReferences(Post).size, 0);

      let anotherPost = Post.build(builtPost);

      assert.equal(InstanceDB.getReferences(builtPost).size, 2);
      assert.strictEqual(InstanceDB.getReferences(builtPost), InstanceDB.getReferences(anotherPost));
      assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 1);
      assert.equal(InstanceDB.getAllKnownReferences(Post).size, 0);
      assert.deepEqual(InstanceDB.getAllUnknownInstances(Post), [new Set([builtPost, anotherPost])]);
    });

    test("$Model.build() with id in an object appends to existing knownInstances cache", async function (assert) {
      const { Post } = prepare();

      let builtPost = Post.build({ id: 999, name: "Some post" });

      assert.equal(InstanceDB.getReferences(builtPost).size, 1);
      assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 0);
      assert.equal(InstanceDB.getAllKnownReferences(Post).size, 1);
      assert.deepEqual(InstanceDB.getAllKnownReferences(Post).get(builtPost.id), new Set([builtPost]));

      let anotherPost = Post.build({ id: 999, name: "Another post" });

      assert.equal(InstanceDB.getReferences(builtPost).size, 2);
      assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 0);
      assert.equal(InstanceDB.getAllKnownReferences(Post).size, 1);
      assert.deepEqual(InstanceDB.getAllKnownReferences(Post).get(builtPost.id), new Set([builtPost, anotherPost]));
    });

    test("$Model.build() with id in an object appends to existing knownInstances cache", async function (assert) {
      const { Post } = prepare();

      let builtPost = Post.build({ name: "Some post" });

      assert.equal(InstanceDB.getReferences(builtPost).size, 1);
      assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 1);
      assert.equal(InstanceDB.getAllKnownReferences(Post).size, 0);

      let savedPost = await Post.insert(builtPost);

      assert.equal(InstanceDB.getReferences(builtPost).size, 3);
      assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 0);
      assert.equal(InstanceDB.getAllKnownReferences(Post).size, 1);
      assert.equal(InstanceDB.getAllKnownReferences(Post).get(savedPost.id).size, 3);
      assert.deepEqual(Array.from(InstanceDB.getReferences(builtPost)), [
        builtPost, Post.Cache.get(savedPost.id), savedPost
      ]);

      let postCopy = Post.build({ id: savedPost.id, name: "Something else" });

      assert.deepEqual(Array.from(InstanceDB.getReferences(builtPost)), [
        builtPost, Post.Cache.get(savedPost.id), savedPost, postCopy
      ]);
      assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 0);
      assert.equal(InstanceDB.getAllKnownReferences(Post).size, 1);
      assert.equal(InstanceDB.getAllKnownReferences(Post).get(savedPost.id).size, 4);
    });

    test("$Model.build() with an instance(that is persisted) appends to existing knownInstances cache", async function (assert) {
      const { Post } = prepare();

      let builtPost = Post.build({ name: "Some post" });

      assert.equal(InstanceDB.getReferences(builtPost).size, 1);
      assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 1);
      assert.equal(InstanceDB.getAllKnownReferences(Post).size, 0);

      let savedPost = await Post.insert(builtPost);

      assert.equal(InstanceDB.getReferences(builtPost).size, 3);
      assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 0);
      assert.equal(InstanceDB.getAllKnownReferences(Post).size, 1);
      assert.equal(InstanceDB.getAllKnownReferences(Post).get(savedPost.id).size, 3);
      assert.deepEqual(Array.from(InstanceDB.getReferences(builtPost)), [
        builtPost, Post.Cache.get(savedPost.id), savedPost
      ]);

      let postCopy = Post.build(savedPost);

      assert.deepEqual(Array.from(InstanceDB.getReferences(builtPost)), [
        builtPost, Post.Cache.get(savedPost.id), savedPost, postCopy
      ]);
      assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 0);
      assert.equal(InstanceDB.getAllKnownReferences(Post).size, 1);
      assert.equal(InstanceDB.getAllKnownReferences(Post).get(savedPost.id).size, 4);
    });
  });

  module('PrimaryKey mutation & its InstanceCache impact tests', function () {
    test("$Model.build() without ids but then an id copy puts them to knownInstances cache", async function (assert) {
      const { Post } = prepare();

      let builtPost = Post.build({ name: "Some post" });

      assert.equal(InstanceDB.getReferences(builtPost).size, 1);
      assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 1);
      assert.equal(InstanceDB.getAllKnownReferences(Post).size, 0);

      let anotherPost = Post.build(builtPost);
      anotherPost.id = 5;

      assert.equal(InstanceDB.getReferences(builtPost).size, 2);
      assert.strictEqual(InstanceDB.getReferences(builtPost), InstanceDB.getReferences(anotherPost));
      assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 0);
      assert.equal(InstanceDB.getAllKnownReferences(Post).size, 1);

      assert.deepEqual(InstanceDB.getAllKnownReferences(Post).get(anotherPost.id), new Set([builtPost, anotherPost]));

      let finalPost = Post.build(anotherPost);

      assert.equal(InstanceDB.getReferences(builtPost).size, 3);
      assert.strictEqual(InstanceDB.getReferences(anotherPost), InstanceDB.getReferences(finalPost));
      assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 0);
      assert.equal(InstanceDB.getAllKnownReferences(Post).size, 1);
      assert.deepEqual(InstanceDB.getAllKnownReferences(Post).get(anotherPost.id), new Set([builtPost, anotherPost, finalPost]));

      InstanceDB.getAllKnownReferences(Post).get(anotherPost.id).forEach((post) => {
        assert.equal(post.id, 5);
      });
    });

    test('changing a persisted models id to null or another id without clearing the cache throws!', async function (assert) {
      const { Post } = prepare();

      let builtPost = Post.build({ name: "Some post" });
      let insertedPost = await Post.insert(builtPost);

      assert.ok(insertedPost.id);

      assert.equal(InstanceDB.getReferences(insertedPost).size, 3);
      assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 0);
      assert.strictEqual(InstanceDB.getAllKnownReferences(Post).get(insertedPost.id), InstanceDB.getReferences(insertedPost));

      try {
        insertedPost.id = null;
      } catch (error) {
        assert.ok(error instanceof Error);
      }

      let copiedInsertedPost = await Post.build(insertedPost);
      try {
        copiedInsertedPost.id = null;
      } catch (error) {
        assert.ok(error instanceof Error);
      }

      assert.equal(InstanceDB.getReferences(insertedPost).size, 4);
      assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 0);
      assert.strictEqual(InstanceDB.getAllKnownReferences(Post).get(insertedPost.id), InstanceDB.getReferences(insertedPost));

      assert.ok(insertedPost.id);
      InstanceDB.getReferences(insertedPost).forEach((instance) => {
        assert.equal(instance.id, insertedPost.id);
      });
    });

    test("$Model.build() with ids but then clearing the id puts them to unknownInstances cache", async function (assert) {
      const { Post } = prepare();

      let builtPost = Post.build({ id: 1, name: "Some post" });

      assert.equal(InstanceDB.getReferences(builtPost).size, 1);
      assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 0);
      assert.deepEqual(InstanceDB.getAllKnownReferences(Post).get(1), new Set([builtPost]));

      let anotherPost = Post.build(builtPost);

      assert.equal(InstanceDB.getReferences(builtPost).size, 2);
      assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 0);
      assert.deepEqual(InstanceDB.getAllKnownReferences(Post).get(1), new Set([builtPost, anotherPost]));

      anotherPost.id = null;

      assert.equal(InstanceDB.getReferences(builtPost).size, 2);
      assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 1);
      assert.equal(InstanceDB.getAllKnownReferences(Post).get(1), undefined);
      assert.deepEqual(InstanceDB.getReferences(builtPost), new Set([builtPost, anotherPost]));

      InstanceDB.getReferences(builtPost).forEach((post) => {
        assert.equal(post.id, null);
      });

      let lastPost = Post.build(anotherPost);

      assert.equal(InstanceDB.getReferences(builtPost).size, 3);
      assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 1);
      assert.equal(InstanceDB.getAllKnownReferences(Post).get(1), undefined);
      assert.deepEqual(InstanceDB.getAllUnknownInstances(Post), [new Set([builtPost, anotherPost, lastPost])]);
      assert.deepEqual(InstanceDB.getReferences(builtPost), new Set([builtPost, anotherPost, lastPost]));

      InstanceDB.getReferences(builtPost).forEach((post) => {
        assert.equal(post.id, null);
      });
    });

    test("$Model.build() with ids puts them to knownInstances then changing id puts them to different cache location & ids", async function (assert) {
      const { Post } = prepare();

      let builtPost = Post.build({ id: 1, name: "Some post" });

      assert.equal(InstanceDB.getReferences(builtPost).size, 1);
      assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 0);
      assert.deepEqual(InstanceDB.getAllKnownReferences(Post).get(1), new Set([builtPost]));

      let anotherPost = Post.build(builtPost);

      assert.equal(InstanceDB.getReferences(builtPost).size, 2);
      assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 0);
      assert.deepEqual(InstanceDB.getAllKnownReferences(Post).get(1), new Set([builtPost, anotherPost]));

      anotherPost.id = 5;

      assert.equal(InstanceDB.getReferences(builtPost).size, 2);
      assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 0);
      assert.equal(InstanceDB.getAllKnownReferences(Post).get(1), undefined);
      assert.deepEqual(InstanceDB.getAllKnownReferences(Post).get(5), new Set([builtPost, anotherPost]));
      assert.deepEqual(InstanceDB.getReferences(builtPost), new Set([builtPost, anotherPost]));

      InstanceDB.getReferences(builtPost).forEach((post) => {
        assert.equal(post.id, 5);
      });

      let lastPost = Post.build(anotherPost);

      assert.equal(InstanceDB.getReferences(builtPost).size, 3);
      assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 0);
      assert.deepEqual(InstanceDB.getAllKnownReferences(Post).get(5), new Set([builtPost, anotherPost, lastPost]));
      assert.deepEqual(InstanceDB.getReferences(builtPost), new Set([builtPost, anotherPost, lastPost]));

      InstanceDB.getReferences(builtPost).forEach((post) => {
        assert.equal(post.id, 5);
      });
    });

    module('mutation to existing primaryKey cache scenarios', async function (assert) {
      test("$Model.build() with ids changing id throws if existing cache already exists on that primaryKey", async function (assert) {
        const { Post } = prepare();

        let firstInsert = await Post.insert({ id: 1, name: "Some name" });
        let builtPost = Post.build({ name: "Some post" });

        assert.equal(InstanceDB.getReferences(firstInsert).size, 2);
        assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 1);
        assert.deepEqual(InstanceDB.getReferences(builtPost), new Set([builtPost]));
        assert.deepEqual(InstanceDB.getAllUnknownInstances(Post), [InstanceDB.getReferences(builtPost)]);
        assert.deepEqual(InstanceDB.getAllKnownReferences(Post).get(1), new Set([
          Post.Cache.get(firstInsert.id), firstInsert
        ]));

        try {
          builtPost.id = 1;
        } catch (error) {
          assert.ok(error instanceof Error);
        }

        assert.notOk(builtPost.id);
        assert.equal(InstanceDB.getReferences(firstInsert).size, 2);
        assert.equal(InstanceDB.getReferences(builtPost).size, 1);
        assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 1);
        assert.deepEqual(InstanceDB.getReferences(builtPost), new Set([builtPost]));
        assert.deepEqual(InstanceDB.getAllUnknownInstances(Post), [InstanceDB.getReferences(builtPost)]);
        assert.deepEqual(InstanceDB.getAllKnownReferences(Post).get(1), new Set([
          Post.Cache.get(firstInsert.id), firstInsert
        ]));
      });

      test("$Model.build() without ids but then putting them to new id throws if existing cache exists(?)", async function (assert) {
        const { Post } = prepare();

        let firstInsert = await Post.insert({ id: 1, name: "Some name" });
        let secondInsert = await Post.insert({ id: 2, name: "Some post" });

        assert.equal(InstanceDB.getReferences(firstInsert).size, 2);
        assert.equal(InstanceDB.getReferences(secondInsert).size, 2);
        assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 0);
        assert.deepEqual(InstanceDB.getReferences(firstInsert), new Set([
          Post.Cache.get(firstInsert.id), firstInsert
        ]));
        assert.strictEqual(InstanceDB.getAllKnownReferences(Post).get(1), InstanceDB.getReferences(firstInsert));

        try {
          secondInsert.id = 1;
        } catch (error) {
          assert.ok(error instanceof Error);
        }

        assert.equal(secondInsert.id, 2);
        assert.equal(InstanceDB.getReferences(firstInsert).size, 2);
        assert.equal(InstanceDB.getReferences(secondInsert).size, 2);
        assert.equal(InstanceDB.getAllUnknownInstances(Post).length, 0);
        assert.deepEqual(InstanceDB.getReferences(firstInsert), new Set([
          Post.Cache.get(firstInsert.id), firstInsert
        ]));
        assert.strictEqual(InstanceDB.getAllKnownReferences(Post).get(1), InstanceDB.getReferences(firstInsert));
        assert.deepEqual(InstanceDB.getReferences(secondInsert), new Set([
          Post.Cache.get(secondInsert.id), secondInsert
        ]));
        assert.strictEqual(InstanceDB.getAllKnownReferences(Post).get(2), InstanceDB.getReferences(secondInsert));
      });
    });
  });

  // NOTE: Check this for unload and delete: Deleting a model should delete all copies from the InstanceDB
});
