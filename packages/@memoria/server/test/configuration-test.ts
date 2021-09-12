import $ from "jquery";
import Model, { PrimaryGeneratedColumn, Column, CreateDateColumn } from "@memoria/model";
import Memoria from "@memoria/server";
import Response from "@memoria/response";
import { module, test } from "qunitx";
import setupForTests from "./helpers/setup-for-tests.js";

module("@memoria/server| init configurations", function (hooks) {
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
    class Photo extends Model {
      @PrimaryGeneratedColumn()
      id: number;

      @Column({ default: "Some default name" })
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

      @CreateDateColumn()
      inserted_at: Date;

      @Column("boolean", { default: true })
      is_important: boolean;
    }

    return { Photo, PhotoComment };
  }

  test("namespace configuration option could be passed in during Memoria.start()", async function (assert) {
    assert.expect(2);

    const { Photo } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));

    this.Server = new Memoria({
      namespace: "api/v1",
      routes() {
        this.get("/photos", () => {
          const photos = Photo.peekAll();

          if (!photos || photos.length === 0) {
            return Response(404, { error: "Not found" });
          }

          return { photos: Photo.serializer(photos) };
        });
      },
    });

    await $.ajax({
      type: "GET",
      url: "/api/v1/photos",
      headers: { "Content-Type": "application/json" },
    }).then((data, textStatus, jqXHR) => {
      assert.equal(jqXHR.status, 200);
      assert.deepEqual(data, { photos: Photo.serializer(Photo.peekAll()) });
    });
  });

  test("server this.namespace() configuration can overwrite existing namespace config", async function (assert) {
    assert.expect(2);

    const { Photo } = prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));

    this.Server = new Memoria({
      namespace: "api/v1",
      routes() {
        this.namespace = "api/";

        this.get("/photos", () => {
          const photos = Photo.peekAll();

          if (!photos || photos.length === 0) {
            return Response(404, { error: "Not found" });
          }

          return { photos: Photo.serializer(photos) };
        });
      },
    });

    await $.ajax({
      type: "GET",
      url: "/api/photos",
      headers: { "Content-Type": "application/json" },
    }).then((data, textStatus, jqXHR) => {
      assert.equal(jqXHR.status, 200);
      assert.deepEqual(data, { photos: Photo.serializer(Photo.peekAll()) });
    });
  });

  test("urlPrefix configuration option could be passed in during memoria.start()", async function (assert) {
    assert.expect(2);

    const { Photo } = prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));

    this.Server = new Memoria({
      urlPrefix: "http://twitter.com",
      routes() {
        this.namespace = "api/";
        this.get("/photos", () => {
          const photos = Photo.peekAll();

          if (!photos || photos.length === 0) {
            return Response(404, { error: "Not found" });
          }

          return { photos: Photo.serializer(photos) };
        });
      },
    });

    await $.ajax({
      type: "GET",
      url: "http://twitter.com/api/photos",
      headers: { "Content-Type": "application/json" },
    }).then((data, textStatus, jqXHR) => {
      assert.equal(jqXHR.status, 200);
      assert.deepEqual(data, { photos: Photo.serializer(Photo.peekAll()) });
    });
  });

  test("server this.urlPrefix() configuration can overwrite existing urlPrefix config", async function (assert) {
    assert.expect(2);

    const { Photo } = prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));

    this.Server = new Memoria({
      urlPrefix: "http://twitter.com",
      routes() {
        this.urlPrefix = "http://facebook.com/";
        this.namespace = "api";

        this.get("/photos", () => {
          const photos = Photo.peekAll();

          if (!photos || photos.length === 0) {
            return Response(404, { error: "Not found" });
          }

          return { photos: Photo.serializer(photos) };
        });
      },
    });

    await $.ajax({
      type: "GET",
      url: "http://facebook.com/api/photos",
      headers: { "Content-Type": "application/json" },
    }).then((data, textStatus, jqXHR) => {
      assert.equal(jqXHR.status, 200);
      assert.deepEqual(data, { photos: Photo.serializer(Photo.peekAll()) });
    });
  });

  test("timing configuration option could be passed in during Memoria.start()", async function (assert) {
    assert.expect(3);

    const TIMING = 300;
    const { Photo } = prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));

    this.Server = new Memoria({
      timing: TIMING,
      routes() {
        this.get("/photos", () => {
          const photos = Photo.peekAll();

          if (!photos || photos.length === 0) {
            return Response(404, { error: "Not found" });
          }

          return { photos: Photo.serializer(photos) };
        });
      },
    });

    let twoSecondsPassed = false;

    setTimeout(() => {
      twoSecondsPassed = true;
    }, TIMING);

    await $.ajax({
      type: "GET",
      url: "/photos",
      headers: { "Content-Type": "application/json" },
    }).then((data, textStatus, jqXHR) => {
      assert.ok(twoSecondsPassed);
      assert.equal(jqXHR.status, 200);
      assert.deepEqual(data, { photos: Photo.serializer(Photo.peekAll()) });
    });
  });
});

// test.serial('server this.get(url, timing) configuration can overwrite existing timing config', async () => {
//
// });
