import { ServerError, hash, LazyPromise, RuntimeError } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "./helpers/setup-memoria.js";
import setupRESTModels from "@memoria/adapters/test/helpers/models-with-relations/rest/id/index.js";
import Response from "@memoria/response";

const fixture = Symbol("fixture");

module("@memoria/model | LazyPromise", function (hooks) {
  setupMemoria(hooks);

  async function wait(ms) {
    return new Promise((resolve) => setTimeout(() => resolve(null), ms));
  }

  test("executor resolves", async function (assert) {
    let steps = [];
    let lazyPromise = new LazyPromise((resolve) => {
      steps.push("executor called");
      resolve(fixture);
    });

    steps.push("promise created");

    assert.propContains(lazyPromise, {
      isStarted: false,
      isLoading: false,
      isLoaded: false,
      isError: false,
    });

    let promise = lazyPromise.then((value) => {
      assert.propContains(lazyPromise, {
        isStarted: true,
        isLoading: false,
        isLoaded: true,
        isError: false,
      });
      assert.equal(value, fixture);

      steps.push("then-handler called");
    });
    let promiseTwo = lazyPromise.then((value) => {
      steps.push("then-handler-2 called");
    });

    assert.propContains(lazyPromise, {
      isStarted: true,
      isLoading: true,
      isLoaded: false,
      isError: false,
    });

    await promise;
    await promiseTwo;

    assert.propContains(lazyPromise, {
      isStarted: true,
      isLoading: false,
      isLoaded: true,
      isError: false,
    });
    assert.deepEqual(steps, ["promise created", "executor called", "then-handler called", "then-handler-2 called"]);
  });

  test("executor rejects", async function (assert) {
    let steps = [];
    let lazyPromise = new LazyPromise((resolve, reject) => {
      steps.push("executor called");
      reject("fixture");
    });

    steps.push("promise created");

    assert.propContains(lazyPromise, {
      isStarted: false,
      isLoading: false,
      isLoaded: false,
      isError: false,
    });

    lazyPromise.catch((error) => {
      assert.propContains(lazyPromise, {
        isStarted: true,
        isLoading: false,
        isLoaded: false,
        isError: true,
      });
      assert.equal(error, "fixture");
      steps.push("catch-handler called");
    });
    lazyPromise.catch((error) => {
      assert.propContains(lazyPromise, {
        isStarted: true,
        isLoading: false,
        isLoaded: false,
        isError: true,
      });
      assert.equal(error, "fixture");
      steps.push("catch-handler2 called");
    });

    steps.push("catch registered");

    assert.propContains(lazyPromise, {
      isStarted: false,
      isLoading: false,
      isLoaded: false,
      isError: false,
    });

    try {
      await lazyPromise;
    } catch (error) {
      assert.propContains(lazyPromise, {
        isStarted: true,
        isLoading: false,
        isLoaded: false,
        isError: true,
      });
      assert.deepEqual(steps, [
        "promise created",
        "catch registered",
        "executor called",
        "catch-handler called",
        "catch-handler2 called",
      ]);
    }

    assert.propContains(lazyPromise, {
      isStarted: true,
      isLoading: false,
      isLoaded: false,
      isError: true,
    });
  });

  test("executor and catch is never called if there is no `then` or await", async function (assert) {
    assert.expect(1);

    let promise = new LazyPromise((resolve) => {
      assert.ok(false);
      resolve();
    });

    promise.catch((error) => {
      assert.ok(false);
    });

    assert.ok(true);
  });

  test("LazyPromise.from(): returned promise can be lazily resolved until await", async function (assert) {
    let called = false;
    let lazyPromise = LazyPromise.from(async () => {
      await wait(250);

      assert.propContains(lazyPromise, {
        isStarted: true,
        isLoading: true,
        isLoaded: false,
        isError: false,
        isAborted: false,
      });

      called = true;
      return fixture;
    });

    assert.ok(lazyPromise instanceof LazyPromise);
    assert.ok(lazyPromise instanceof Promise);
    assert.notOk(called);
    assert.propContains(lazyPromise, {
      isStarted: false,
      isLoading: false,
      isLoaded: false,
      isError: false,
      isAborted: false,
    });

    assert.equal(await lazyPromise, fixture);
    assert.ok(called);
    assert.propContains(lazyPromise, {
      isStarted: true,
      isLoading: false,
      isLoaded: true,
      isError: false,
      isAborted: false,
    });
  });

  test("LazyPromise.reject(): should have static method `reject` that returns a lazy rejected promise", async function (assert) {
    let fixtureError = new Error("fixture");
    let steps = [];
    let catchFinished = 0;
    let done = assert.async();
    let lazyPromise = LazyPromise.reject(fixtureError);

    steps.push("promise created");

    lazyPromise.catch(async (error) => {
      await wait(250);

      assert.equal(error, fixtureError);
      assert.propContains(lazyPromise, {
        isStarted: true,
        isLoading: false,
        isLoaded: false,
        isError: true,
        isAborted: false,
      });

      steps.push("catch-handler called");
      catchFinished++;
    });
    lazyPromise.catch(async (error) => {
      await wait(250);

      assert.equal(error, fixtureError);
      assert.propContains(lazyPromise, {
        isStarted: true,
        isLoading: false,
        isLoaded: false,
        isError: true,
        isAborted: false,
      });

      steps.push("catch-handler2 called");
      catchFinished++;

      if (catchFinished === 2) {
        assert.deepEqual(steps, [
          "promise created",
          "catch handlers registered",
          "lazyPromise await finish",
          "catch-handler called",
          "catch-handler2 called",
        ]);
        done();
      }
    });

    steps.push("catch handlers registered");
    assert.propContains(lazyPromise, {
      isStarted: false,
      isLoading: false,
      isLoaded: false,
      isError: false,
      isAborted: false,
    });

    try {
      await lazyPromise;
    } catch (error) {
      assert.propContains(lazyPromise, {
        isStarted: true,
        isLoading: false,
        isLoaded: false,
        isError: true,
        isAborted: false,
      });
      assert.equal(error, fixtureError);
      assert.deepEqual(steps, ["promise created", "catch handlers registered"]);
    }

    steps.push("lazyPromise await finish");

    assert.deepEqual(steps, ["promise created", "catch handlers registered", "lazyPromise await finish"]);
    assert.propContains(lazyPromise, {
      isStarted: true,
      isLoading: false,
      isLoaded: false,
      isError: true,
      isAborted: false,
    });
  });

  test("should have static method `resolve` that returns a lazy resolved promise", async function (assert) {
    let lazyPromise = LazyPromise.resolve(fixture);

    assert.ok(lazyPromise instanceof LazyPromise);
    assert.ok(lazyPromise instanceof Promise);
    assert.propContains(lazyPromise, {
      isStarted: false,
      isLoading: false,
      isLoaded: false,
      isError: false,
      isAborted: false,
    });
    assert.equal(await lazyPromise, fixture);
    assert.propContains(lazyPromise, {
      isStarted: true,
      isLoading: false,
      isLoaded: true,
      isError: false,
      isAborted: false,
    });
  });

  module(".abort() cases", async function () {
    test("promise can be aborted before awaited", async function (assert) {
      assert.expect(7);

      let done = assert.async();
      let lazyPromise = new LazyPromise((resolve) => {
        resolve(null);
      });

      assert.propContains(lazyPromise, {
        isStarted: false,
        isLoading: false,
        isLoaded: false,
        isError: false,
        isAborted: false,
      });

      lazyPromise.catch((error) => {
        assert.equal(error.constructor, Error);
        assert.equal(error.message, "Promise aborted!");
        assert.propContains(lazyPromise, {
          isStarted: false,
          isLoading: false,
          isLoaded: false,
          isError: false,
          isAborted: true,
        });
        done();
      });

      let result = await lazyPromise.abort();

      assert.equal(result.constructor, Error);
      assert.equal(result.message, "Promise aborted!");
      assert.propContains(lazyPromise, {
        isStarted: false,
        isLoading: false,
        isLoaded: false,
        isError: false,
        isAborted: true,
      });
    });

    test("promise can be aborted while running", async function (assert) {
      assert.expect(6);

      let done = assert.async();
      let lazyPromise = new LazyPromise(async (resolve) => {
        await wait(250);

        resolve(true);
      });

      // TODO: this runs before abort thats why
      lazyPromise.catch((error) => {
        assert.equal(error.constructor, Error);
        assert.equal(error.message, "Promise aborted!");
        assert.propContains(lazyPromise, {
          isStarted: true,
          isLoading: false,
          isLoaded: false,
          isError: false,
          isAborted: true,
        });
        done();
      });

      assert.propContains(lazyPromise, {
        isStarted: false,
        isLoading: false,
        isLoaded: false,
        isError: false,
        isAborted: false,
      });

      lazyPromise.then(() => {});

      assert.propContains(lazyPromise, {
        isStarted: true,
        isLoading: true,
        isLoaded: false,
        isError: false,
        isAborted: false,
      });

      await lazyPromise.abort();

      assert.propContains(lazyPromise, {
        isStarted: true,
        isLoading: false,
        isLoaded: false,
        isError: false,
        isAborted: true,
      });
    });

    test("promise cant be aborted when its ended", async function (assert) {
      let lazyPromise = new LazyPromise(async (resolve) => {
        resolve(true);
      });

      await lazyPromise;

      try {
        await lazyPromise.abort();
      } catch (error) {
        assert.equal(error.constructor, RuntimeError);
        assert.equal(error.message, "Tried to abort an already finished promise!");
      }
    });
  });

  module("Promise.defer() cases:", function () {
    test("deferred promise can be aborted before running", async function (assert) {
      assert.expect(5);

      let deferred = LazyPromise.defer();

      deferred.promise.catch((result) => assert.ok(true));
      assert.propContains(deferred.promise, {
        isStarted: false,
        isLoading: false,
        isLoaded: false,
        isError: false,
        isAborted: false,
      });

      let error = await deferred.promise.abort();

      assert.equal(error.constructor, Error);
      assert.equal(error.message, "Promise aborted!");
      assert.propContains(deferred.promise, {
        isStarted: false,
        isLoading: false,
        isLoaded: false,
        isError: false,
        isAborted: true,
      });
    });

    test("deferred promise cant be aborted when its already succeeded", async function (assert) {
      assert.expect(7);

      let deferred = LazyPromise.defer();

      assert.propContains(deferred.promise, {
        isStarted: false,
        isLoading: false,
        isLoaded: false,
        isError: false,
        isAborted: false,
      });

      deferred.promise.then((result) => assert.equal(result, "something")).catch((result) => assert.notOk(true));

      await deferred.resolve("something");

      assert.propContains(deferred.promise, {
        isStarted: true,
        isLoading: false,
        isLoaded: true,
        isError: false,
        isAborted: false,
      });

      try {
        await deferred.promise.abort();
      } catch (error) {
        assert.equal(error.constructor, RuntimeError);
        assert.equal(error.message, "Tried to abort an already finished promise!");
        assert.propContains(deferred.promise, {
          isStarted: true,
          isLoading: false,
          isLoaded: true,
          isError: false,
          isAborted: false,
        });
      }

      assert.propContains(deferred.promise, {
        isStarted: true,
        isLoading: false,
        isLoaded: true,
        isError: false,
        isAborted: false,
      });
    });

    test("deferred promise cant be aborted when its already failed", async function (assert) {
      assert.expect(7);

      let deferred = LazyPromise.defer();

      assert.propContains(deferred.promise, {
        isStarted: false,
        isLoading: false,
        isLoaded: false,
        isError: false,
        isAborted: false,
      });

      deferred.promise
        .then((result) => assert.notOk(true))
        .catch((result) => {
          assert.equal(result, "something");
        });

      await deferred.reject("something");

      assert.propContains(deferred.promise, {
        isStarted: true,
        isLoading: false,
        isLoaded: false,
        isError: true,
        isAborted: false,
      });

      try {
        await deferred.promise.abort();
      } catch (error) {
        assert.equal(error.constructor, RuntimeError);
        assert.equal(error.message, "Tried to abort an already finished promise!");
        assert.propContains(deferred.promise, {
          isStarted: true,
          isLoading: false,
          isLoaded: false,
          isError: true,
          isAborted: false,
        });
      }

      assert.propContains(deferred.promise, {
        isStarted: true,
        isLoading: false,
        isLoaded: false,
        isError: true,
        isAborted: false,
      });
    });

    test("reloaded promise can be aborted when running", async function (assert) {
      assert.expect(13);

      let lazyPromise = new LazyPromise(async (resolve) => {
        await wait(250);

        resolve(true);
      });

      assert.propContains(lazyPromise, {
        isStarted: false,
        isLoading: false,
        isLoaded: false,
        isError: false,
        isAborted: false,
      });

      await lazyPromise;

      assert.propContains(lazyPromise, {
        isStarted: true,
        isLoading: false,
        isLoaded: true,
        isError: false,
        isAborted: false,
      });

      let promise = lazyPromise.reload();

      assert.deepEqual(promise, lazyPromise);
      assert.propContains(lazyPromise, {
        isStarted: true,
        isLoading: true,
        isLoaded: false,
        isError: false,
        isAborted: false,
      });

      promise
        .then(() => assert.notOk(true))
        .catch(() => {
          assert.step("first promise catch handler call");
          assert.ok(true);
        });

      assert.propContains(lazyPromise, {
        isStarted: true,
        isLoading: true,
        isLoaded: false,
        isError: false,
        isAborted: false,
      });

      let error = await lazyPromise.abort();

      assert.equal(error.constructor, Error);
      assert.equal(error.message, "Promise aborted!");
      assert.propContains(lazyPromise, {
        isStarted: true,
        isLoading: false,
        isLoaded: false,
        isError: false,
        isAborted: true,
      });

      let done = assert.async();
      let reloadingPromise = lazyPromise.reload();

      reloadingPromise.catch(() => {
        assert.propContains(lazyPromise, {
          isStarted: true,
          isLoading: false,
          isLoaded: false,
          isError: false,
          isAborted: true,
        });
        assert.verifySteps(["first promise catch handler call"]);
        done();
      });

      assert.propContains(lazyPromise, {
        isStarted: true,
        isLoading: true,
        isLoaded: false,
        isError: false,
        isAborted: false,
      });

      lazyPromise.abort();
    });

    test("reloaded promise cant be aborted when finalized", async function (assert) {
      assert.expect(9);

      let lazyPromise = new LazyPromise((resolve) => {
        resolve(true);
      });

      assert.propContains(lazyPromise, {
        isStarted: false,
        isLoading: false,
        isLoaded: false,
        isError: false,
        isAborted: false,
      });

      await lazyPromise;

      assert.propContains(lazyPromise, {
        isStarted: true,
        isLoading: false,
        isLoaded: true,
        isError: false,
        isAborted: false,
      });

      let promise = lazyPromise.reload();

      assert.deepEqual(promise, lazyPromise);

      await promise;

      assert.propContains(lazyPromise, {
        isStarted: true,
        isLoading: false,
        isLoaded: true,
        isError: false,
        isAborted: false,
      });

      promise.then(() => assert.ok(true)).catch(() => assert.notOk(true));

      try {
        await lazyPromise.abort();
      } catch (error) {
        assert.equal(error.constructor, RuntimeError);
        assert.equal(error.message, "Tried to abort an already finished promise!");
        assert.propContains(lazyPromise, {
          isStarted: true,
          isLoading: false,
          isLoaded: true,
          isError: false,
          isAborted: false,
        });
      }

      assert.propContains(lazyPromise, {
        isStarted: true,
        isLoading: false,
        isLoaded: true,
        isError: false,
        isAborted: false,
      });
    });
  });

  module("Promise.hash() test cases", function () {
    test("Promise.hash() can resolve correctly", async function (assert) {
      let { Server, RESTPhoto, RESTUser, MemoryPhoto, MemoryUser } = setupRESTModels();
      this.Server = Server;

      let users = await MemoryUser.insertAll([{ first_name: "Izel" }, { first_name: "Moris" }]);
      // TODO: this should make owner_id not null before inserting data to store!!
      debugger;
      let photos = await MemoryPhoto.insertAll([
        { name: "Family photo", owner: users[0] },
        { name: "Trip photo", owner: users[1] },
      ]);
      debugger;

      try {
        // TODO: this owner relationship is not working
        let result = await LazyPromise.hash({
          photos: RESTPhoto.findAll(),
          users: RESTUser.findAll(),
        });

        debugger;
        console.log(result.photos.owner);
        debugger;

        assert.propEqual(result, { users, photos });
        assert.equal(photos.length, 2);
        assert.equal(users.length, 2);
        assert.propContains(users[0], { id: 1, first_name: "Izel" });
        assert.propContains(users[1], { id: 2, first_name: "Moris" });
        assert.propEqual(result.photos[0].owner, users[0]);
        assert.propEqual(result.photos[1].owner, users[1]);
      } catch (error) {
        assert.ok(false);
      }
    });

    test("Promise.hash() can catch the first error even if the first promise resolves", async function (assert) {
      let { Server, RESTPhoto, RESTUser, MemoryPhoto, MemoryUser } = setupRESTModels();
      this.Server = Server;

      let users = await MemoryUser.insertAll([{ first_name: "Izel" }, { first_name: "Moris" }]);
      let photos = await MemoryPhoto.insertAll([
        { name: "Family photo", owner: users[0] },
        { name: "Trip photo", owner: users[1] },
      ]);
      let errors = [
        { id: 1, modelName: "User", attribute: "name", message: "is missing" },
        { id: 2, modelName: "User", attribute: "name", message: "is missing" },
      ];

      this.Server.get("/users", () => {
        return Response(422, { errors });
      });

      try {
        let result = await LazyPromise.hash({
          photos: RESTPhoto.findAll(),
          users: RESTUser.findAll(),
        });

        assert.ok(false);
      } catch (error) {
        assert.ok(error instanceof ServerError);
        assert.propEqual(error.errors, errors);
      }
    });
  });
});
