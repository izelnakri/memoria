import Model from "@memserver/model";
import { module, test } from "qunitx";
import setupMemserver from "./helpers/setup-memserver";

module("@memserver/model | Default Attributes", function (hooks) {
  setupMemserver(hooks);

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
      static defaultAttributes = {
        is_public: true,
        name() {
          return "Imported photo";
        },
        href() {
          return this.name;
        },
      };
    }

    return { Photo };
  }

  test("$Model.insert() sets dynamic defaultAttributes when target attribute doest exist", function (assert) {
    const { Photo } = prepare();

    PHOTO_FIXTURES.forEach((photo) => Photo.insert(photo));

    assert.deepEqual(Photo.findAll(), [
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
        href: "Imported photo",
        is_public: false,
      },
    ]);

    const target = Photo.insert({ name: "Izel" });

    assert.deepEqual(target, {
      id: 5,
      name: "Izel",
      href: "Izel",
      is_public: true,
    });
    assert.deepEqual(target, Photo.find(target.id));

    const secondTarget = Photo.insert({ name: "Izel", href: "something else" });

    assert.deepEqual(secondTarget, {
      id: 6,
      name: "Izel",
      href: "something else",
      is_public: true,
    });
    assert.deepEqual(secondTarget, Photo.find(secondTarget.id));

    const thirdTarget = Photo.insert({ name: "Izel", href: null });

    assert.deepEqual(thirdTarget, {
      id: 7,
      name: "Izel",
      href: null,
      is_public: true,
    });
    assert.deepEqual(thirdTarget, Photo.find(thirdTarget.id));
  });
});
