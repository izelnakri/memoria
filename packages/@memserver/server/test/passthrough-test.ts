import $ from "jquery";
import Model from "@memserver/model";
import Memserver from "@memserver/server";
import Response from "@memserver/response";
import { module, test } from "qunitx";
import setupForTests from "./helpers/setup-for-tests";
import sinon from "sinon/pkg/sinon.js";

module("@memserver/server | passthrough tests", function (hooks) {
  setupForTests(hooks);

  const AUTHENTICATION_TOKEN = "ec25fc7b-6ee2-4bda-b57c-6c9867b30ff4";
  const AJAX_AUTHORIZATION_HEADERS = {
    "Content-Type": "application/json",
    Authorization: `Token ${AUTHENTICATION_TOKEN}`,
  };
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
    class Photo extends Model {}

    let Server = new Memserver({
      routes() {
        this.get("/photos", () => {
          const photos = Photo.findAll();

          if (!photos || photos.length === 0) {
            return Response(404, { error: "Not found" });
          }

          return { photos: Photo.serializer(photos) };
        });

        this.passthrough("/films");
        this.passthrough("http://localhost:4000/films");
        this.passthrough("http://localhost:4000/movies/*");
      },
    });

    return { Photo, Server };
  }

  test("throws an error when Memserver tried to intercept an undeclared route", async function (assert) {
    let { Photo, Server } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));

    this.Server = Server;
    this.Server.unhandledRequest = sinon.spy();

    $.ajax({
      type: "GET",
      url: "/izelnakri",
      headers: { "Content-Type": "application/json" },
    });

    assert.ok(this.Server.unhandledRequest.calledOnce, "Server.unhandledRequest called once");
  });

  test("this.passthrough(url) shortcut works", async function (assert) {
    assert.expect(2);

    let { Server } = prepare();

    this.Server = Server;

    await $.ajax({
      type: "GET",
      url: "http://localhost:4000/films",
      headers: { "Content-Type": "application/json" },
    }).then((data, textStatus, jqXHR) => {
      assert.equal(jqXHR.status, 200);
      assert.deepEqual(jqXHR.responseJSON, { film: "responsed correctly" });
    });
  });

  test("this.passthrough(url) shortcut works with wild cards", async function (assert) {
    assert.expect(2);

    let { Server } = prepare();

    this.Server = Server;

    await $.ajax({
      type: "GET",
      url: "http://localhost:4000/movies/too-big-to-fail",
      headers: { "Content-Type": "application/json" },
    }).then((data, textStatus, jqXHR) => {
      assert.equal(jqXHR.status, 200);
      assert.deepEqual(jqXHR.responseJSON, { movie: "is too-big-to-fail" });
    });
  });

  test("[MemServer.Server] can create global passthrough via this.passthrough()", async function (assert) {
    assert.expect(6);

    let { Photo, Server } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));

    this.Server = Server;
    this.Server.unhandledRequest = sinon.spy();

    await $.ajax({
      type: "GET",
      url: "/photos",
      headers: { "Content-Type": "application/json" },
    }).then((data, textStatus, jqXHR) => {
      assert.equal(jqXHR.status, 200);
      assert.deepEqual(jqXHR.responseJSON, { photos: Photo.serializer(Photo.findAll()) });
    });
    await $.ajax({
      type: "GET",
      url: "http://localhost:4000/films",
      headers: { "Content-Type": "application/json" },
    }).then((data, textStatus, jqXHR) => {
      assert.equal(jqXHR.status, 200);
      assert.deepEqual(jqXHR.responseJSON, { film: "responsed correctly" });
    });
    await $.ajax({
      type: "GET",
      url: "http://localhost:4000/movies/too-big-to-fail",
      headers: { "Content-Type": "application/json" },
    }).then((data, textStatus, jqXHR) => {
      assert.equal(jqXHR.status, 200);
      assert.deepEqual(jqXHR.responseJSON, { movie: "is too-big-to-fail" });
    });
  });
});

// TODO: TEST BELOW ISNT WORKING: has beforeEach!! afterwards
// TODO: test this.passthrough('/something') when there is this.namespace;
