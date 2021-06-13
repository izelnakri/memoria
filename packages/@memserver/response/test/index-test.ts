import $ from "jquery";
import Model from "@memserver/model";
import Memserver from "@memserver/server";
import Response from "@memserver/response";
import { module, test } from "qunitx";
import setupForTests from "./helpers/setup-for-tests";

module("@memserver/response tests", function (hooks) {
  setupForTests(hooks);

  const PHOTO_FIXTURES = [
    {
      id: 1,
      name: "Ski trip",
      href: "ski-trip.jpeg",
      is_public: false,
    },
    {
      id: 2,
      name: "Family photo",
      href: "family-photo.jpeg",
      is_public: true,
    },
    {
      id: 3,
      name: "Selfie",
      href: "selfie.jpeg",
      is_public: false,
    },
  ];
  const USER_FIXTURES = [
    {
      id: 1,
      first_name: "Izel",
      last_name: "Nakri",
    },
  ];

  function prepare() {
    class Photo extends Model {}
    class User extends Model {}

    let Server = new Memserver({
      routes() {
        this.get("/photos", () => {
          const photos = Photo.findAll();

          return Response(202, { photos: Photo.serializer(photos) });
        });
      },
    });

    return { Photo, Server, User };
  }

  test("Response can be used outside the server file", async function (assert) {
    assert.expect(2);

    let { User, Server } = prepare();

    this.Server = Server;

    USER_FIXTURES.forEach((user) => User.insert(user));

    Server.get("/users/:id", (request) => {
      const user = User.find(Number(request.params.id));

      if (user) {
        return Response(200, { user: User.serializer(user) });
      }
    });

    try {
      await $.ajax({
        type: "GET",
        url: "/users/1",
      }).then((data, textStatus, jqXHR) => {
        assert.equal(jqXHR.status, 200);
        assert.deepEqual(data, { user: { id: 1, first_name: "Izel", last_name: "Nakri" } });
      });
    } catch (error) {
      console.log(error);
    }
  });

  test("Response can be used inside the server file", async function (assert) {
    assert.expect(2);

    let { Photo, Server } = prepare();

    this.Server = Server;

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));

    await $.getJSON("/photos", (data, textStatus, jqXHR) => {
      assert.equal(jqXHR.status, 202);
      assert.deepEqual(data, { photos: Photo.serializer(Photo.findAll()) });
    }).catch((error) => console.log(error));
  });

  test("Response can be used when overwriting an existing server route", async function (assert) {
    assert.expect(2);

    let { Photo, Server } = prepare();

    this.Server = Server;

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));

    this.Server.get("/photos", () => Response(500, { error: "Internal Server Error" }));

    try {
      await $.getJSON("/photos");
    } catch (jqXHR) {
      assert.equal(jqXHR.status, 500);
      assert.deepEqual(jqXHR.responseJSON, { error: "Internal Server Error" });
    }
  });
});
