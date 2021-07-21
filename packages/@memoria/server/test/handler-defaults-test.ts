import $ from "jquery";
import Model from "@memoria/model";
import Memoria from "@memoria/server";
import Response from "@memoria/response";
import { module, test } from "qunitx";
import setupForTests from "./helpers/setup-for-tests.js";

module("@memoria/server| handler defaults", function (hooks) {
  setupForTests(hooks);

  const PHOTO_FIXTURES = [
    {
      id: 1,
      name: "Ski trip",
      href: "ski-trip.jpeg",
      is_public: false,
      user_id: 1,
    },
    {
      id: 2,
      name: "Family photo",
      href: "family-photo.jpeg",
      is_public: true,
      user_id: 1,
    },
    {
      id: 3,
      name: "Selfie",
      href: "selfie.jpeg",
      is_public: false,
      user_id: 1,
    },
  ];

  function prepare() {
    class Photo extends Model {
      static defaultAttributes = {
        is_public: true,
        name() {
          return "Some default name";
        },
      };
    }

    return { Photo };
  }

  test("POST /resources work with shortcut", async function (assert) {
    assert.expect(5);

    const { Photo } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));

    this.Server = new Memoria({
      routes() {
        this.post("/photos");
        this.get("/photos");
        this.get("/photos/:id");
        this.put("/photos/:id");
        this.delete("/photos/:id");
      },
    });

    assert.equal(Photo.count(), 3);

    await $.ajax({
      type: "POST",
      url: "/photos",
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({ photo: { name: "Izel Nakri" } }),
    }).then((data, textStatus, jqXHR) => {
      assert.equal(jqXHR.status, 201);
      assert.deepEqual(data, { photo: Photo.serializer(Photo.find(4)) });
      assert.equal(Photo.count(), 4);
      assert.deepEqual(Photo.find(4), {
        id: 4,
        name: "Izel Nakri",
        is_public: true,
        href: undefined,
        user_id: undefined,
      });
    });
  });

  test("GET /resources works with shortcut", async function (assert) {
    assert.expect(4);

    const { Photo } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));

    this.Server = new Memoria({
      routes() {
        this.post("/photos");
        this.get("/photos");
        this.get("/photos/:id");
        this.put("/photos/:id");
        this.delete("/photos/:id");
      },
    });

    assert.equal(Photo.count(), 3);

    await $.ajax({
      type: "GET",
      url: "/photos",
      headers: { "Content-Type": "application/json" },
    }).then((data, textStatus, jqXHR) => {
      assert.equal(jqXHR.status, 200);
      assert.deepEqual(data, { photos: Photo.serializer(Photo.findAll()) });
      assert.equal(Photo.count(), 3);
    });
  });

  test("GET /resources/:id works with shortcut", async function (assert) {
    assert.expect(2);

    const { Photo } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));

    this.Server = new Memoria({
      routes() {
        this.post("/photos");
        this.get("/photos");
        this.get("/photos/:id");
        this.put("/photos/:id");
        this.delete("/photos/:id");
      },
    });

    await $.ajax({
      type: "GET",
      url: "/photos/1",
      headers: { "Content-Type": "application/json" },
    }).then((data, textStatus, jqXHR) => {
      assert.equal(jqXHR.status, 200);
      assert.deepEqual(data, { photo: Photo.serializer(Photo.find(1)) });
    });
  });

  test("PUT /resources/:id works with shortcut", async function (assert) {
    assert.expect(4);

    const { Photo } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));

    this.Server = new Memoria({
      routes() {
        this.post("/photos");
        this.get("/photos");
        this.get("/photos/:id");
        this.put("/photos/:id");
        this.delete("/photos/:id");
      },
    });

    assert.equal(Photo.find(1).name, "Ski trip");

    await $.ajax({
      type: "PUT",
      url: "/photos/1",
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({ photo: { id: 1, name: "New custom title" } }),
    }).then((data, textStatus, jqXHR) => {
      const photo = Photo.find(1);

      assert.equal(jqXHR.status, 200);
      assert.deepEqual(data, { photo: Photo.serializer(photo) });
      assert.equal(photo.name, "New custom title");
    });
  });

  test("DELETE /resources/:id works with shortcut", async function (assert) {
    assert.expect(5);

    const { Photo } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));

    this.Server = new Memoria({
      routes() {
        this.post("/photos");
        this.get("/photos");
        this.get("/photos/:id");
        this.put("/photos/:id");
        this.delete("/photos/:id");
      },
    });

    assert.equal(Photo.count(), 3);

    await $.ajax({
      type: "DELETE",
      url: "/photos/1",
      headers: { "Content-Type": "application/json" },
    }).then((data, textStatus, jqXHR) => {
      assert.equal(jqXHR.status, 204);
      assert.deepEqual(data, undefined);
      assert.equal(Photo.count(), 2);
      assert.equal(Photo.find(1), undefined);
    });
  });

  test("throws an helpful error message when shortcuts model is not found", async function (assert) {
    const { Photo } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));

    assert.throws(
      () =>
        new Memoria({
          routes() {
            this.post("/photos");
            this.get("/photos");
            this.get("/photos/:id");
            this.put("/photos/:id");
            this.delete("/photos/:id");

            this.get("/houses");
          },
        }),
      /\[Memoria\] GET \/houses route handler cannot be generated automatically: House is not on your window.House, also please check that your route name matches the model reference or create a custom handler function/
    );
  });

  test("GET /houses could use Photo model for its default route generation", async function (assert) {
    assert.expect(4);

    const { Photo } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));

    this.Server = new Memoria({
      routes() {
        this.post("/photos");
        this.get("/photos");
        this.get("/photos/:id");
        this.put("/photos/:id");
        this.delete("/photos/:id");

        this.get("/houses", Photo);
      },
    });

    assert.equal(Photo.count(), 3);

    await $.ajax({
      type: "GET",
      url: "/photos",
      headers: { "Content-Type": "application/json" },
    }).then((data, textStatus, jqXHR) => {
      assert.equal(jqXHR.status, 200);
      assert.deepEqual(data, { photos: Photo.serializer(Photo.findAll()) });
      assert.equal(Photo.count(), 3);
    });
  });

  test("POST /resources works correctly with undefined handler response", async function (assert) {
    assert.expect(4);

    const { Photo } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));

    this.Server = new Memoria({
      routes() {
        this.post("/photos", () => {});
        this.get("/photos", () => {});
        this.get("/photos/:id", () => {});
        this.put("/photos/:id", () => {});
        this.delete("/photos/:id", () => {});
      },
    });

    assert.equal(Photo.count(), 3);

    await $.ajax({
      type: "POST",
      url: "/photos",
      headers: { "Content-Type": "application/json" },
    }).catch((jqXHR) => {
      assert.equal(jqXHR.status, 500);
      assert.deepEqual(jqXHR.responseJSON, {
        error:
          "[Memoria] POST /photos route handler did not return anything to respond to the request!",
      });
      assert.equal(Photo.count(), 3);
    });
  });

  test("GET /resources works correctly with undefined handler response", async function (assert) {
    assert.expect(2);

    const { Photo } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));

    this.Server = new Memoria({
      routes() {
        this.post("/photos", () => {});
        this.get("/photos", () => {});
        this.get("/photos/:id", () => {});
        this.put("/photos/:id", () => {});
        this.delete("/photos/:id", () => {});
      },
    });

    await $.ajax({
      type: "GET",
      url: "/photos",
      headers: { "Content-Type": "application/json" },
    }).catch((jqXHR) => {
      assert.equal(jqXHR.status, 500);
      assert.deepEqual(jqXHR.responseJSON, {
        error:
          "[Memoria] GET /photos route handler did not return anything to respond to the request!",
      });
    });
  });

  test("GET /resources/:id works correctly with undefined handler response", async function (assert) {
    assert.expect(2);

    const { Photo } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));

    this.Server = new Memoria({
      routes() {
        this.post("/photos", () => {});
        this.get("/photos", () => {});
        this.get("/photos/:id", () => {});
        this.put("/photos/:id", () => {});
        this.delete("/photos/:id", () => {});
      },
    });

    await $.ajax({
      type: "GET",
      url: "/photos/1",
      headers: { "Content-Type": "application/json" },
    }).catch((jqXHR) => {
      assert.equal(jqXHR.status, 500);
      assert.deepEqual(jqXHR.responseJSON, {
        error:
          "[Memoria] GET /photos/1 route handler did not return anything to respond to the request!",
      });
    });
  });

  test("PUT /resources/:id works correctly with undefined handler response", async function (assert) {
    assert.expect(2);

    const { Photo } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));

    this.Server = new Memoria({
      routes() {
        this.post("/photos", () => {});
        this.get("/photos", () => {});
        this.get("/photos/:id", () => {});
        this.put("/photos/:id", () => {});
        this.delete("/photos/:id", () => {});
      },
    });

    await $.ajax({
      type: "PUT",
      url: "/photos/1",
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({ photo: { id: 1, name: "New Name" } }),
    }).catch((jqXHR) => {
      assert.equal(jqXHR.status, 500);
      assert.deepEqual(jqXHR.responseJSON, {
        error:
          "[Memoria] PUT /photos/1 route handler did not return anything to respond to the request!",
      });
    });
  });

  test("DELETE /resources/:id works correctly with undefined handler response", async function (assert) {
    assert.expect(2);

    const { Photo } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));

    this.Server = new Memoria({
      routes() {
        this.post("/photos", () => {});
        this.get("/photos", () => {});
        this.get("/photos/:id", () => {});
        this.put("/photos/:id", () => {});
        this.delete("/photos/:id", () => {});
      },
    });

    await $.ajax({
      type: "DELETE",
      url: "/photos/1",
      headers: { "Content-Type": "application/json" },
    }).then((data, textStatus, jqXHR) => {
      assert.equal(jqXHR.status, 204);
      assert.deepEqual(jqXHR.responseJSON, {});
    });
  });
});
