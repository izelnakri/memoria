import { LazyPromise } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "./helpers/setup-memoria.js";

const fixture = Symbol("fixture");

module("@memoria/model | Lazy Promises", function (hooks) {
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

    await wait(50);

    steps.push("then called");

    await lazyPromise.then((value) => {
      assert.equal(value, fixture);
      steps.push("then-handler called");
    });

    assert.deepEqual(steps, [
      "promise created",
      "then called",
      "executor called",
      "then-handler called",
    ]);
  });

  test("executor rejects", async function (assert) {
    let fixtureError = new Error("fixture");
    let steps = [];
    let lazyPromise = new LazyPromise((resolve, reject) => {
      steps.push("executor called");
      reject(fixtureError);
    });

    steps.push("promise created");

    await wait(50);

    steps.push("catch called");

    await lazyPromise.catch((error) => {
      assert.equal(error, fixtureError);
      steps.push("catch-handler called");
    });

    assert.deepEqual(steps, [
      "promise created",
      "catch called",
      "executor called",
      "catch-handler called",
    ]);
  });

  test("executor is never called if no `then`", async function (assert) {
    assert.expect(1);

    new LazyPromise((resolve) => {
      assert.ok(false);
      resolve();
    });

    await wait(50);
    assert.ok(true);
  });

  test("executor is called with only catch handler", async function (assert) {
    let steps = [];
    let lazyPromise = new LazyPromise((resolve) => {
      steps.push("executor called");
      resolve();
    });

    steps.push("promise created");

    await wait(50);

    steps.push("catch called");

    await lazyPromise.catch(() => {});

    assert.deepEqual(steps, ["promise created", "catch called", "executor called"]);
  });

  test("convert promise-returning function to lazy promise", async function (assert) {
    let called = false;

    let lazyPromise = LazyPromise.from(async () => {
      called = true;
      return fixture;
    });

    assert.ok(lazyPromise instanceof LazyPromise);
    assert.ok(lazyPromise instanceof Promise);
    assert.notOk(called);

    assert.equal(await lazyPromise, fixture);
    assert.ok(called);
  });

  test("should have static method `reject` that returns a lazy rejected promise", async function (assert) {
    let fixtureError = new Error("fixture");
    let steps = [];
    let lazyPromise = LazyPromise.reject(fixtureError);

    steps.push("promise created");

    await wait(50);

    steps.push("catch called");

    await lazyPromise.catch((error) => {
      assert.equal(error, fixtureError);
      steps.push("catch-handler called");
    });

    assert.deepEqual(steps, ["promise created", "catch called", "catch-handler called"]);
  });

  test("should have static method `resolve` that returns a lazy resolved promise", async function (assert) {
    let lazyPromise = LazyPromise.resolve(fixture);

    assert.ok(lazyPromise instanceof LazyPromise);
    assert.ok(lazyPromise instanceof Promise);

    assert.equal(await lazyPromise, fixture);
  });
});
