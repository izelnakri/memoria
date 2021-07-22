import $ from "jquery";
import Model, { PrimaryGeneratedColumn, Column, CreateDateColumn } from "@memoria/model";
import Memoria from "@memoria/server";
import Response from "@memoria/response";
import { module, test } from "qunitx";
import setupForTests from "./helpers/setup-for-tests.js";

module("@memoria/server | index - REST/HTTP verbs test", function (hooks) {
  setupForTests(hooks);

  const AUTHENTICATION_TOKEN = "ec25fc7b-6ee2-4bda-b57c-6c9867b30ff4";
  const AJAX_AUTHORIZATION_HEADERS = {
    "Content-Type": "application/json",
    Authorization: `Token ${AUTHENTICATION_TOKEN}`,
  };

  const USER_FIXTURES = [
    {
      id: 1,
      email: "contact@izelnakri.com",
      username: "izelnakri",
      authentication_token: AUTHENTICATION_TOKEN,
    },
  ];
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
  const PHOTO_COMMENT_FIXTURES = [
    {
      uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
      content: "What a nice photo!",
      photo_id: 1,
      user_id: 1,
    },
    {
      uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
      content: "I agree",
      photo_id: 1,
      user_id: 2,
    },
    {
      uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
      content: "I was kidding",
      photo_id: 1,
      user_id: 1,
    },
    {
      uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
      content: "Interesting indeed",
      photo_id: 2,
      user_id: 1,
    },
  ];

  function prepare() {
    class User extends Model {
      @PrimaryGeneratedColumn()
      id: number;

      @Column()
      email: string;

      @Column()
      username: string;

      @Column()
      authentication_token: string;

      static findFromHeaderToken(headers) {
        console.log("headers are", headers);
        const authorizationHeader = headers.Authorization;
        const token = authorizationHeader ? authorizationHeader.slice(6) : false;

        return this.peekBy({ authentication_token: token }) || false;
      }
    }
    class Photo extends Model {
      @PrimaryGeneratedColumn()
      id: number;

      @Column({ default: "Some default name" })
      name: string;

      @Column()
      href: string;

      @Column({ type: "boolean", default: true })
      is_public: boolean;

      @Column("int")
      user_id: number;
    }
    class PhotoComment extends Model {
      @PrimaryGeneratedColumn("uuid")
      uuid: string;

      @Column()
      content: string;

      @Column()
      photo_id: number;

      @Column()
      user_id: number;

      @Column("boolean", { default: true })
      is_important: boolean;

      @CreateDateColumn()
      inserted_at: Date;
    }
    const Server = new Memoria({
      routes() {
        this.post("/photos", async ({ headers }) => {
          const user = User.findFromHeaderToken(headers);

          if (!user) {
            return Response(401, { error: "Unauthorized" });
          }

          const photo = await Photo.insert({ user_id: user.id });

          return { photo: Photo.serializer(photo) };
        });

        this.get("/photos", async ({ headers }) => {
          const user = User.findFromHeaderToken(headers);

          if (!user) {
            return Response(404, { error: "Not found" });
          }

          const photos = await Photo.findAll({ user_id: user.id });

          return { photos: Photo.serializer(photos) };
        });

        this.get("/photos/:id", async ({ headers, params }) => {
          const user = User.findFromHeaderToken(headers);

          if (!user) {
            return Response(401, { error: "Unauthorized" });
          }

          const photo = await Photo.findBy({ id: params.id, user_id: user.id });

          return photo ? { photo: Photo.serializer(photo) } : Response(404, { error: "Not found" });
        });

        this.put("/photos/:id", async ({ headers, params }) => {
          const user = User.findFromHeaderToken(headers);

          if (!user) {
            return Response(401, { error: "Unauthorized" });
          }

          if (await Photo.findBy({ id: params.id, user_id: user.id })) {
            return { photo: await Photo.update(params.photo) };
          }
        });

        this.delete("/photos/:id", async ({ headers, params }) => {
          const user = User.findFromHeaderToken(headers);

          if (user && (await Photo.findBy({ id: params.id, user_id: user.id }))) {
            return await Photo.delete({ id: params.id });
          }
        });

        this.get("http://izelnakri.com", () => {
          return Response(200, { result: "external urls work!!" });
        });
      },
    });

    return { User, Photo, PhotoComment, Server };
  }

  test("POST /resources work with custom headers and responses", async function (assert) {
    assert.expect(5);

    const { Photo, User, Server } = prepare();

    this.Server = Server;

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(USER_FIXTURES.map((user) => User.insert(user)));

    assert.equal(await Photo.count(), 3);

    await $.ajax({
      type: "POST",
      url: "/photos",
      headers: { "Content-Type": "application/json" },
    }).catch((jqXHR) => {
      assert.equal(jqXHR.status, 401);
      assert.deepEqual(jqXHR.responseJSON, { error: "Unauthorized" });
    });
    await $.ajax({
      type: "POST",
      url: "/photos",
      headers: AJAX_AUTHORIZATION_HEADERS,
    }).then((data, textStatus, jqXHR) => {
      assert.equal(jqXHR.status, 201);
      assert.deepEqual(data, {
        photo: { is_public: true, name: "Some default name", id: 4, user_id: 1, href: null },
      });
    });
  });

  test("GET /resources works with custom headers and responses", async function (assert) {
    assert.expect(4);

    const { Photo, User, Server } = prepare();

    this.Server = Server;

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(USER_FIXTURES.map((user) => User.insert(user)));

    await $.ajax({
      type: "GET",
      url: "/photos",
      headers: { "Content-Type": "application/json" },
    }).catch((jqXHR) => {
      assert.equal(jqXHR.status, 404);
      assert.deepEqual(jqXHR.responseJSON, { error: "Not found" });
    });
    await $.ajax({
      type: "GET",
      url: "/photos",
      headers: AJAX_AUTHORIZATION_HEADERS,
    }).then((data, textStatus, jqXHR) => {
      assert.equal(jqXHR.status, 200);
      assert.deepEqual(data, { photos: Photo.serializer(Photo.peekAll()) });
    });
  });

  test("GET /resources/:id works with custom headers and responses", async function (assert) {
    assert.expect(4);

    const { Photo, User, Server } = prepare();

    this.Server = Server;

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(USER_FIXTURES.map((user) => User.insert(user)));

    await $.ajax({
      type: "GET",
      url: "/photos/1",
      headers: { "Content-Type": "application/json" },
    }).catch((jqXHR) => {
      assert.equal(jqXHR.status, 401);
      assert.deepEqual(jqXHR.responseJSON, { error: "Unauthorized" });
    });
    await $.ajax({
      type: "GET",
      url: "/photos/1",
      headers: AJAX_AUTHORIZATION_HEADERS,
    }).then((data, textStatus, jqXHR) => {
      assert.equal(jqXHR.status, 200);
      assert.deepEqual(data, { photo: Photo.serializer(Photo.peek(1)) });
    });
  });

  test("PUT /resources/:id works with custom headers and responses", async function (assert) {
    assert.expect(5);

    const { Photo, User, Server } = prepare();

    this.Server = Server;

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(USER_FIXTURES.map((user) => User.insert(user)));

    await $.ajax({
      type: "PUT",
      url: "/photos/1",
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({ photo: { id: 1, name: "Photo after edit" } }),
    }).catch((jqXHR) => {
      assert.equal(jqXHR.status, 401);
      assert.deepEqual(jqXHR.responseJSON, { error: "Unauthorized" });
    });
    await $.ajax({
      type: "PUT",
      url: "/photos/1",
      headers: AJAX_AUTHORIZATION_HEADERS,
      data: JSON.stringify({ photo: { id: 1, name: "Photo after edit" } }),
    }).then((data, textStatus, jqXHR) => {
      assert.equal(jqXHR.status, 200);
      assert.deepEqual(data, { photo: Photo.serializer(Photo.peek(1)) });
      assert.equal(Photo.peek(1).name, "Photo after edit");
    });
  });

  test("DELETE /resources/:id works with custom headers and responses", async function (assert) {
    assert.expect(4);

    const { Photo, User, Server } = prepare();

    this.Server = Server;

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(USER_FIXTURES.map((user) => User.insert(user)));

    assert.ok(Photo.peek(1), "User id: 1 exists");

    await $.ajax({
      type: "DELETE",
      url: "/photos/1",
      headers: { "Content-Type": "application/json" },
    }).catch((jqXHR) => {
      assert.equal(jqXHR.status, 401);
      assert.deepEqual(jqXHR.responseJSON, { error: "Unauthorized" });
      assert.ok(Photo.peek(1), "User id: 1 exists");
    });
    await $.ajax({
      type: "DELETE",
      url: "/photos/1",
      headers: AJAX_AUTHORIZATION_HEADERS,
    }).then((data, textStatus, jqXHR) => {
      assert.equal(jqXHR.status, 204);
      assert.deepEqual(data, undefined);
      assert.ok(!Photo.peek(1), "User id: 1 gets deleted");
    });
  });

  test("Memoria.Server works for external links", async function (assert) {
    assert.expect(2);

    const { Server } = prepare();

    this.Server = Server;

    await $.ajax({
      type: "GET",
      url: "http://izelnakri.com",
      headers: { "Content-Type": "application/json" },
    }).then((data, textStatus, jqXHR) => {
      assert.equal(jqXHR.status, 200);
      assert.deepEqual(jqXHR.responseJSON, { result: "external urls work!!" });
    });
  });
});
