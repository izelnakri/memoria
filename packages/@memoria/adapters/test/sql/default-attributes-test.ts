import Model, { DB, PrimaryGeneratedColumn, Column } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";
import SQLAdapter from "../helpers/sql-adapter.js";
import FIXTURES from "../helpers/fixtures/mix/index.js";

module("@memoria/adapters | SQLAdapter | Default Attributes", function (hooks) {
  setupMemoria(hooks);

  const PHOTOS = FIXTURES.PHOTOS.concat([
    {
      id: 4,
      is_public: false,
    },
  ]);

  async function prepare() {
    class Photo extends Model {
      static Adapter = SQLAdapter;

      @PrimaryGeneratedColumn()
      id: number;

      @Column("bool", { nullable: true, default: true })
      is_public: boolean;

      @Column("varchar", { default: "Imported photo" })
      name: string;

      @Column("varchar", { nullable: true })
      href: string;
    }
    await DB.resetRecords();

    return { Photo };
  }

  test("$Model.insert() sets default attributes when target attribute doesnt exist", async function (assert) {
    const { Photo } = await prepare();

    await Promise.all(PHOTOS.map((photo) => Photo.insert(photo)));

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
        href: "selfie.jpeg",
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
    assert.notOk(target.isNew);
    assert.ok(target.isPersisted);
    assert.notOk(target.isDeleted);
    assert.notOk(target.isDirty);
    assert.deepEqual(target.changes, {});
    assert.deepEqual(target.revision, {
      id: 5,
      name: "Izel",
      href: null,
      is_public: true,
    });
    assert.deepEqual(target.revisionHistory, [
      {
        id: 5,
        name: "Izel",
        href: null,
        is_public: true,
      },
    ]);

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
