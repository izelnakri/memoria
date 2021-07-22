import $ from "jquery";
import Model, { PrimaryGeneratedColumn, Column } from "@memoria/model";
import Memoria from "@memoria/server";
import Response from "@memoria/response";
import { module, test } from "qunitx";
import setupForTests from "./helpers/setup-for-tests.js";
import sinon from "sinon/pkg/sinon.js";

module("@memoria/server | passthrough tests", function (hooks) {
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
    class Photo extends Model {
      @PrimaryGeneratedColumn()
      id: number;

      @Column()
      name: string;

      @Column()
      href: string;

      @Column("boolean")
      is_public: boolean;

      @Column("int")
      user_id: number;
    }

    let Server = new Memoria({
      routes() {
        this.get("/photos", () => {
          const photos = Photo.peekAll();

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

  test("throws an error when memoria tried to intercept an undeclared route", async function (assert) {
    let { Photo, Server } = prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));

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

  test("[Memoria.Server] can create global passthrough via this.passthrough()", async function (assert) {
    assert.expect(6);

    let { Photo, Server } = prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));

    this.Server = Server;
    this.Server.unhandledRequest = sinon.spy();

    await $.ajax({
      type: "GET",
      url: "/photos",
      headers: { "Content-Type": "application/json" },
    }).then((data, textStatus, jqXHR) => {
      assert.equal(jqXHR.status, 200);
      assert.deepEqual(jqXHR.responseJSON, { photos: Photo.serializer(Photo.peekAll()) });
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
