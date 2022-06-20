import { HasManyArray } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "./helpers/setup-memoria.js";
import generateModels from "./helpers/relationship-test-models/index.js";

module("@memoria/model | HasManyArray", function (hooks) {
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
      href: "selfie.jpeg",
      is_public: false,
    },
  ];

  test('can instantiate a correct HasManyArray that behaves like an instance set', async function (assert) {
    const { Photo } = generateModels();

    let firstPhoto = Photo.build({ name: "Ski trip" });
    let anotherPhoto = Photo.build({ name: "Another photo" });

    let firstArray = new HasManyArray();
    let secondArray = new HasManyArray([firstPhoto]);
    window.secondArray = secondArray;

    console.log('HasManyArray');
    console.log(secondArray);

    assert.deepEqual(firstArray, []);
    assert.deepEqual(secondArray, [firstPhoto]);

    secondArray[0] = firstPhoto;

    assert.deepEqual(secondArray, [firstPhoto]);
    assert.deepEqual(Array.from(secondArray), [firstPhoto]);
    console.log(secondArray);
    console.log(Array.from(secondArray));

    secondArray.push(anotherPhoto);

    assert.deepEqual(secondArray, [firstPhoto, anotherPhoto]);

    debugger;
    // firstArray.push('a');
    // firstArray.push('a');

    // assert.deepEqual(firstArray, secondArray);
  });

  // test('has correct methods')
});
