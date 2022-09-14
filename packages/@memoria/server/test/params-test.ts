import $ from "jquery";
import Model, { PrimaryGeneratedColumn, Column } from "@memoria/model";
import Memoria from "@memoria/server";
import Response from "@memoria/response";
import { module, test } from "qunitx";
import setupForTests from "./helpers/setup-for-tests.js";

module("@memoria/server | params, headers, queryParams tests", function (hooks) {
  setupForTests(hooks);

  const AUTHENTICATION_TOKEN = "ec25fc7b-6ee2-4bda-b57c-6c9867b30ff4";
  const AJAX_AUTHORIZATION_HEADERS = {
    "Content-Type": "application/json",
    Authorization: `Token ${AUTHENTICATION_TOKEN}`,
  };

  const ETHEREUM_ACCOUNT_FIXTURES = [
    {
      id: 1,
      address: "0x7be8315acfef37816c9ad4dc5e82195f2a52934c5d0c74883f9978675e26d600",
    },
  ];
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

      static findFromHeaderToken(headers): any | false {
        const authorizationHeader = headers.Authorization;
        const token = authorizationHeader ? authorizationHeader.slice(6) : false;

        return this.peekBy({ authentication_token: token }) || false;
      }
    }

    class Photo extends Model {
      @PrimaryGeneratedColumn()
      id: number;

      @Column({ type: "varchar", default: "Some default name" })
      name: string;

      @Column()
      href: string;

      @Column("boolean", { default: true })
      is_public: boolean;

      @Column("int")
      user_id: number;
    }

    class PhotoComment extends Model {
      @PrimaryGeneratedColumn("uuid")
      uuid: string;

      @Column()
      content: string;

      @Column("int")
      photo_id: number;

      @Column("int")
      user_id: number;

      @Column("boolean", { default: true })
      is_important: boolean;
    }

    return { User, Photo, PhotoComment };
  }

  module("Simple Rest Server", function (hooks) {
    async function prepareRESTServerTest() {
      const { User, Photo } = prepare();

      await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
      await Promise.all(USER_FIXTURES.map((user) => User.insert(user)));

      const Server = new Memoria({
        routes() {
          this.post("/photos", async ({ headers, params, queryParams }) => {
            const user = User.findFromHeaderToken(headers);

            if (!user || !queryParams.is_admin) {
              return Response(401, { error: "Unauthorized" });
            }

            console.log("user is", user);
            const photo = await Photo.insert(Object.assign({}, params.photo, { user_id: user.id }));

            return { photo: Photo.serializer(photo) };
          });

          this.get("/photos", ({ headers, queryParams }) => {
            const user = User.findFromHeaderToken(headers);

            if (!user) {
              return Response(404, { error: "Not found" });
            }

            const photos = Photo.peekAll(Object.assign({}, { user_id: user.id }, queryParams));

            if (!photos || photos.length === 0) {
              return Response(404, { error: "Not found" });
            }

            return { photos: Photo.serializer(photos) };
          });

          this.get("/photos/:id", ({ headers, params, queryParams }) => {
            const user = User.findFromHeaderToken(headers);

            if (!user) {
              return Response(401, { error: "Unauthorized" });
            } else if (queryParams.nonce === 123123123) {
              const photo = Photo.peekBy({ id: params.id, user_id: user.id });

              return photo ? { photo: Photo.serializer(photo) } : Response(404, { error: "Not found" });
            }

            return Response(404, { error: "Not found" });
          });

          this.put("/photos/:id", async ({ headers, params, queryParams }) => {
            const user = User.findFromHeaderToken(headers);
            const validRequest =
              user && queryParams.nonce === 123123123 && (await Photo.findBy({ id: params.id, user_id: user.id }));

            if (validRequest) {
              return { photo: Photo.serializer(await Photo.update(params.photo)) };
            }

            return Response(500, { error: "Unexpected error occured" });
          });

          this.delete("/photos/:id", async ({ headers, params, queryParams }) => {
            const user = User.findFromHeaderToken(headers);

            if (!(queryParams.nonce === 123123123)) {
              return Response(500, { error: "Invalid nonce to delete a photo" });
            } else if (!user || !Photo.peekBy({ id: params.id, user_id: user.id })) {
              return Response(404, { error: "Not found" });
            }

            await Photo.delete({ id: params.id }); // NOTE: what to do with this response
          });
        },
      });

      return { Server, User, Photo };
    }

    test("[Memoria.Server] POST /resources work with custom headers, queryParams and responses", async function (assert) {
      assert.expect(8);

      const { Photo, User, Server } = await prepareRESTServerTest();

      this.Server = Server;

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
      }).catch((jqXHR) => {
        assert.equal(jqXHR.status, 401);
        assert.deepEqual(jqXHR.responseJSON, { error: "Unauthorized" });
      });

      await $.ajax({
        type: "POST",
        url: "/photos?is_admin=true",
        headers: AJAX_AUTHORIZATION_HEADERS,
      }).then((data, textStatus, jqXHR) => {
        assert.equal(jqXHR.status, 201);
        assert.deepEqual(data, { photo: Photo.serializer(Photo.peek(4)) });
        assert.equal(Photo.Cache.size, 4);
      });
    });

    test("[Memoria.Server] GET /resources works with custom headers, queryParams and responses", async function (assert) {
      assert.expect(6);

      const { Photo, User, Server } = await prepareRESTServerTest();

      this.Server = Server;

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
        url: "/photos?is_public=false",
        headers: AJAX_AUTHORIZATION_HEADERS,
      }).then((data, textStatus, jqXHR) => {
        assert.equal(jqXHR.status, 200);
        assert.deepEqual(data, { photos: Photo.serializer(Photo.peekAll({ is_public: false })) });
      });

      await $.ajax({
        type: "GET",
        url: "/photos?href=family-photo.jpeg",
        headers: AJAX_AUTHORIZATION_HEADERS,
      }).then((data, textStatus, jqXHR) => {
        assert.equal(jqXHR.status, 200);
        assert.deepEqual(data, {
          photos: Photo.serializer(Photo.peekAll({ href: "family-photo.jpeg" })),
        });
      });
    });

    test("[Memoria.Server] GET /resources/:id works with custom headers, queryParams and responses", async function (assert) {
      assert.expect(4);

      const { Photo, User, Server } = await prepareRESTServerTest();

      this.Server = Server;

      await $.ajax({
        type: "GET",
        url: "/photos/1",
        headers: AJAX_AUTHORIZATION_HEADERS,
      }).catch((jqXHR) => {
        assert.equal(jqXHR.status, 404);
        assert.deepEqual(jqXHR.responseJSON, { error: "Not found" });
      });

      await $.ajax({
        type: "GET",
        url: "/photos/1?nonce=123123123",
        headers: AJAX_AUTHORIZATION_HEADERS,
      }).then((data, textStatus, jqXHR) => {
        assert.equal(jqXHR.status, 200);
        assert.deepEqual(data, { photo: Photo.serializer(Photo.peek(1)) });
      });
    });

    test("[Memoria.Server] PUT /resources/:id works with custom headers, queryParams and responses", async function (assert) {
      assert.expect(4);

      const { Photo, User, Server } = await prepareRESTServerTest();

      this.Server = Server;

      await $.ajax({
        type: "PUT",
        url: "/photos/1",
        headers: AJAX_AUTHORIZATION_HEADERS,
        data: JSON.stringify({ photo: { id: 1, name: "Life" } }),
      }).catch((jqXHR) => {
        assert.equal(jqXHR.status, 500);
        assert.deepEqual(jqXHR.responseJSON, { error: "Unexpected error occured" });
      });

      await $.ajax({
        type: "PUT",
        url: "/photos/1?nonce=123123123",
        headers: AJAX_AUTHORIZATION_HEADERS,
        data: JSON.stringify({ photo: { id: 1, name: "Life" } }),
      }).then((data, textStatus, jqXHR) => {
        assert.equal(jqXHR.status, 200);
        assert.deepEqual(data, { photo: Photo.serializer(Photo.peek(1)) });
      });
    });

    test("[Memoria.Server] DELETE /resources/:id works with custom headers, queryParams and responses", async function (assert) {
      assert.expect(3);

      const { Photo, User, Server } = await prepareRESTServerTest();

      this.Server = Server;

      await $.ajax({
        type: "DELETE",
        url: "/photos/1",
        headers: AJAX_AUTHORIZATION_HEADERS,
      }).catch((jqXHR) => {
        assert.equal(jqXHR.status, 500);
        assert.deepEqual(jqXHR.responseJSON, { error: "Invalid nonce to delete a photo" });
      });

      await $.ajax({
        type: "DELETE",
        url: "/photos/1?nonce=123123123",
        headers: AJAX_AUTHORIZATION_HEADERS,
      }).then((data, textStatus, jqXHR) => {
        assert.equal(jqXHR.status, 204);
      });
    });
  });

  module("Edge-case Server tests", function () {
    async function prepareEdgeCaseServerTests() {
      const { User, Photo, PhotoComment } = prepare();

      class EthereumAccount extends Model {
        @PrimaryGeneratedColumn()
        id: number;

        @Column()
        address: string;
      }

      await Promise.all(ETHEREUM_ACCOUNT_FIXTURES.map((ethereumAccount) => EthereumAccount.insert(ethereumAccount)));
      await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
      await Promise.all(USER_FIXTURES.map((user) => User.insert(user)));
      await Promise.all(PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment)));

      const Server = new Memoria({
        routes() {
          this.get("/ethereum-accounts", ({ queryParams }) => {
            const ethereumAccounts = EthereumAccount.peekAll({ address: queryParams.address });

            return { ethereum_accounts: EthereumAccount.serializer(ethereumAccounts) };
          });

          this.get("/ethereum-accounts/:address", ({ params }) => {
            const ethereumAccount = EthereumAccount.peekBy({ address: params.address });

            return { ethereum_account: EthereumAccount.serializer(ethereumAccount) };
          });

          this.get("/photos", ({ queryParams }) => {
            const photos = Photo.peek(queryParams.ids || []);

            if (!photos || photos.length === 0) {
              return Response(404, { error: "Not found" });
            }

            return { photos: Photo.serializer(photos) };
          });

          this.get("/photo-comments/:uuid", ({ params }) => {
            const photoComment = PhotoComment.peekBy({ uuid: params.uuid });

            return { photo_comment: PhotoComment.serializer(photoComment) };
          });

          this.get("/photo-comments", ({ queryParams }) => {
            const photoComments = PhotoComment.peekAll({ uuid: queryParams.uuid });

            return { photo_comments: PhotoComment.serializer(photoComments) };
          });
        },
      });

      return { EthereumAccount, Server, User, Photo, PhotoComment };
    }

    test("[Memoria.Server Edge cases] Server works for coalasceFindRequests routes", async function (assert) {
      assert.expect(6);

      const { Photo, PhotoComment, Server } = await prepareEdgeCaseServerTests();

      this.Server = Server;

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
        url: "/photos?ids[]=1&ids[]=2",
        headers: { "Content-Type": "application/json" },
      }).then((data, textStatus, jqXHR) => {
        assert.equal(jqXHR.status, 200);
        assert.deepEqual(jqXHR.responseJSON, { photos: Photo.serializer(Photo.peek([1, 2])) });
      });

      await $.ajax({
        type: "GET",
        url: "/photos?ids[]=2&ids[]=3",
        headers: { "Content-Type": "application/json" },
      }).then((data, textStatus, jqXHR) => {
        assert.equal(jqXHR.status, 200);
        assert.deepEqual(jqXHR.responseJSON, { photos: Photo.serializer(Photo.peek([2, 3])) });
      });
    });

    test("[Memoria.Server Edge cases] Server converts empty strings to null during a request and formats query params", async function (assert) {
      assert.expect(4);

      const { Photo, Server } = await prepareEdgeCaseServerTests();

      this.Server = Server;
      this.Server.post("/photos", async ({ params, queryParams }) => {
        assert.deepEqual(params, { name: null, title: "Cool" });
        assert.deepEqual(queryParams, { is_important: true, filter: 32 });

        return { photo: Photo.serializer(await Photo.insert(params)) };
      });

      await $.ajax({
        type: "POST",
        url: "/photos?is_important=true&filter=32",
        data: { name: "", title: "Cool" },
      }).then((data, textStatus, jqXHR) => {
        assert.equal(jqXHR.status, 201);
        assert.equal(Photo.Cache.size, 4);
      });
    });

    test("[Memoria.Server Edge cases] Server casts uuids correctly as params", async function (assert) {
      assert.expect(2);

      const { Photo, PhotoComment, Server } = await prepareEdgeCaseServerTests();

      this.Server = Server;

      const targetComment = await PhotoComment.findBy({
        uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
      });

      await $.ajax({
        type: "GET",
        url: "/photo-comments/499ec646-493f-4eea-b92e-e383d94182f4",
      }).then((data, textStatus, jqXHR) => {
        assert.equal(jqXHR.status, 200);
        assert.deepEqual(data, { photo_comment: PhotoComment.serializer(targetComment) });
      });
    });

    test("[Memoria.Server Edge cases] Server casts uuids correct as queryParams", async function (assert) {
      assert.expect(2);

      const { Photo, PhotoComment, Server } = await prepareEdgeCaseServerTests();

      this.Server = Server;

      const targetComments = await PhotoComment.findAll({
        uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
      });

      await $.ajax({
        type: "GET",
        url: "/photo-comments?uuid=499ec646-493f-4eea-b92e-e383d94182f4",
      }).then((data, textStatus, jqXHR) => {
        assert.equal(jqXHR.status, 200);
        assert.deepEqual(data, { photo_comments: PhotoComment.serializer(targetComments) });
      });
    });

    test("[Memoria.Server Edga cases] Server casts ethereum adresses correctly as string request.params", async function (assert) {
      assert.expect(2);

      const { EthereumAccount, Photo, PhotoComment, Server } = await prepareEdgeCaseServerTests();

      this.Server = Server;

      const targetAccount = await EthereumAccount.findBy({
        address: "0x7be8315acfef37816c9ad4dc5e82195f2a52934c5d0c74883f9978675e26d600",
      });

      await $.ajax({
        type: "GET",
        url: "/ethereum-accounts/0x7be8315acfef37816c9ad4dc5e82195f2a52934c5d0c74883f9978675e26d600",
      }).then((data, textStatus, jqXHR) => {
        assert.equal(jqXHR.status, 200);
        assert.deepEqual(data, { ethereum_account: EthereumAccount.serializer(targetAccount) });
      });
    });

    test("[Memoria.Server Edge cases] Server casts ethereum addresses correctly as string in request.queryParams", async function (assert) {
      assert.expect(2);

      const { EthereumAccount, Photo, PhotoComment, Server } = await prepareEdgeCaseServerTests();

      this.Server = Server;

      const targetAccounts = await EthereumAccount.findAll({
        address: "0x7be8315acfef37816c9ad4dc5e82195f2a52934c5d0c74883f9978675e26d600",
      });

      await $.ajax({
        type: "GET",
        url: "/ethereum-accounts?address=0x7be8315acfef37816c9ad4dc5e82195f2a52934c5d0c74883f9978675e26d600",
      }).then((data, textStatus, jqXHR) => {
        assert.equal(jqXHR.status, 200);
        assert.deepEqual(data, { ethereum_accounts: EthereumAccount.serializer(targetAccounts) });
      });
    });
  });
});
