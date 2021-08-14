import Model, { Config, PrimaryGeneratedColumn, Column } from "@memoria/model";
import { SQLAdapter } from "@memoria/adapters";
import { module, test } from "qunitx";
import setupMemoria from "./helpers/setup-memoria.js";

module("@memoria/model | Default Attributes", function (hooks) {
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

  async function prepare() {
    class Photo extends Model {
      static Adapter = SQLAdapter;

      @PrimaryGeneratedColumn()
      id: number;

      @Column("bool", { default: true })
      is_public: boolean;

      @Column("varchar", { default: "Imported photo" })
      name: string;

      @Column("varchar", { nullable: true })
      href: string;
    }

    await Config.resetForTests();

    return { Photo };
  }

  test("$Model.insert() sets default attributes when target attribute doesnt exist", async function (assert) {
    const { Photo } = await prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));

    assert.propEqual(
      (await Photo.findAll()).sort((a, b) => a.id < b.id),
      [
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
      ]
    );

    let target = await Photo.insert({ name: "Izel" });

    console.log('insert result is:');
    console.log(target);
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

    let thirdTarget = await Photo.insert({ name: "Izel", href: null });

    assert.propEqual(thirdTarget, {
      id: 7,
      name: "Izel",
      href: null,
      is_public: true,
    });
    assert.deepEqual(thirdTarget, await Photo.find(thirdTarget.id));
  });
});
