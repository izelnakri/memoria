import { RESTAdapter, MemoryAdapter } from "@memoria/adapters";
import Model, { PrimaryGeneratedColumn, Column } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";
import Memoria from "@memoria/server";

module("@memoria/adapters | RESTAdapter | Default Attributes", function (hooks) {
  setupMemoria(hooks);

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
      href: null,
      is_public: false,
    },
    {
      id: 4,
      is_public: false,
    },
  ];

  function prepare() {
    class Photo extends Model {
      static Adapter = RESTAdapter;

      @PrimaryGeneratedColumn()
      id: number;

      @Column("bool", { nullable: true, default: true })
      is_public: boolean;

      @Column("varchar", { default: "Imported photo" })
      name: string;

      @Column("varchar", { nullable: true })
      href: string;
    }

    return { Photo };
  }

  function prepareServer() {
    class ServerPhoto extends Model {
      // NOTE: extending from another model doesnt work yet!
      static Adapter = MemoryAdapter;

      @PrimaryGeneratedColumn()
      id: number;

      @Column("bool", { nullable: true, default: true })
      is_public: boolean;

      @Column("varchar", { default: "Imported photo" })
      name: string;

      @Column("varchar", { nullable: true })
      href: string;
    }

    return new Memoria({
      routes() {
        this.post("/photos", async (request) => {
          let photo = await ServerPhoto.insert(request.params.photo);

          return { photo: ServerPhoto.serializer(photo) };
        });

        this.get("/photos", async () => {
          let photos = await ServerPhoto.findAll();

          return { photos: ServerPhoto.serializer(photos) };
        });

        this.get("/photos/:id", async (request) => {
          let photo = await ServerPhoto.find(request.params.id);

          return { photo: ServerPhoto.serializer(photo) };
        });
      },
    });
  }

  test("$Model.insert() ignores defaultAttributes and returns whatever POST returns", async function (assert) {
    const { Photo } = prepare();
    this.Server = prepareServer();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));

    assert.propEqual(await Photo.findAll(), [
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
        href: null,
        is_public: false,
      },
      {
        id: 4,
        name: "Imported photo",
        href: null,
        is_public: false,
      },
    ]);

    let target = await Photo.insert({ name: "Izel" });

    assert.propEqual(target, {
      id: 5,
      name: "Izel",
      href: null,
      is_public: true,
    });
    assert.deepEqual(target, await Photo.find(target.id));

    let secondTarget = await Photo.insert({ name: "Izel", href: "something else" });

    assert.propEqual(secondTarget, {
      id: 6,
      name: "Izel",
      href: "something else",
      is_public: true,
    });
    assert.deepEqual(secondTarget, await Photo.find(secondTarget.id));

    let thirdTarget = await Photo.insert({ name: "Izel", href: null, is_public: false });

    assert.propEqual(thirdTarget, {
      id: 7,
      name: "Izel",
      href: null,
      is_public: false,
    });
    assert.deepEqual(thirdTarget, await Photo.find(thirdTarget.id));
  });
});
