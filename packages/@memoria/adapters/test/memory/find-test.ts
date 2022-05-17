// TODO: also check for isBuilt, isNew, isPersisted
import Model, { Column, PrimaryGeneratedColumn, RuntimeError } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";
import generateModels from "../helpers/models-with-relations/memory/mix/index.js";
import FIXTURES from "../helpers/fixtures/mix/index.js"

const { PHOTOS, PHOTO_COMMENTS } = FIXTURES;

module("@memoria/adapters | MemoryAdapter | Find API", function (hooks) {
  setupMemoria(hooks);

  module('$Model.find() tests', function() {
    test("$Model.find() throws without a number id or ids", async function (assert) {
      const { MemoryPhoto, MemoryPhotoComment } = generateModels();

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => MemoryPhotoComment.insert(photoComment)));

      const array = [null, undefined, "", "1", true, {}];

      await Promise.all(
        array.map(async (param) => {
          try {
            await MemoryPhoto.find(param);
          } catch (error) {
            assert.ok(error instanceof RuntimeError);
          }
          try {
            await MemoryPhotoComment.find(param);
          } catch (error) {
            assert.ok(error instanceof RuntimeError);
          }
        })
      );
    });

    test("$Model.find(id) works for different models", async function (assert) {
      const { MemoryPhoto } = generateModels();

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));

      assert.propContains(await MemoryPhoto.find(1), {
        id: 1,
        name: "Ski trip",
        href: "ski-trip.jpeg",
        is_public: false,
        owner_id: null,
        group_uuid: null
      });
      assert.propContains(await MemoryPhoto.find(3), {
        id: 3,
        name: "Selfie",
        href: "selfie.jpeg",
        is_public: false,
        owner_id: null,
        group_uuid: null
      });
    });

    test("$Model.find(id) gets a new instance each time", async function (assert) {
      const { MemoryPhoto } = generateModels();

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));

      let firstModel = await MemoryPhoto.find(1);
      assert.propEqual(firstModel, MemoryPhoto.build({
        id: 1,
        name: "Ski trip",
        href: "ski-trip.jpeg",
        is_public: false,
      }));
      assert.deepEqual([firstModel.isNew, firstModel.isPersisted], [false, true]);

      let secondModel = await MemoryPhoto.find(1);
      assert.notEqual(firstModel, secondModel);
      assert.deepEqual([secondModel.isNew, secondModel.isPersisted], [false, true]);

      secondModel.name = 'Some name';

      assert.equal(secondModel.name, 'Some name');

      let thirdModel = await MemoryPhoto.find(1);
      assert.deepEqual([thirdModel.isNew, thirdModel.isPersisted], [false, true]);
      assert.propEqual(thirdModel, MemoryPhoto.build({
        id: 1,
        name: "Ski trip",
        href: "ski-trip.jpeg",
        is_public: false,
      }));
      assert.deepEqual(secondModel, MemoryPhoto.build({
        id: 1,
        name: "Ski trip",
        href: "ski-trip.jpeg",
        is_public: false,
      }));
      assert.notEqual(secondModel, thirdModel);
    });

    test("$Model.find(ids) works for multiple ids", async function (assert) {
      const { MemoryPhoto } = generateModels();

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));

      assert.propEqual(await MemoryPhoto.find([1, 3]), [
        MemoryPhoto.build({ id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false }),
        MemoryPhoto.build({ id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false })
      ]);

      assert.propEqual(await MemoryPhoto.find([2, 3]), [
        MemoryPhoto.build({ id: 2, name: "Family photo", href: "family-photo.jpeg", is_public: true }),
        MemoryPhoto.build({ id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false })
      ]);
    });

    test("$Model.find(ids) get a new instances each time", async function (assert) {
      const { MemoryPhoto } = generateModels();

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));

      let firstModels = await MemoryPhoto.find([1, 3]);
      assert.deepEqual(firstModels, [
        MemoryPhoto.build({ id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false }),
        MemoryPhoto.build({ id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false })
      ]);
      assert.deepEqual([firstModels[0].isNew, firstModels[0].isPersisted], [false, true]);
      assert.deepEqual([firstModels[1].isNew, firstModels[1].isPersisted], [false, true]);

      let secondModels = await MemoryPhoto.find([1, 3]);
      assert.notEqual(firstModels, secondModels);
      assert.propEqual(secondModels, [
        MemoryPhoto.build({ id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false }),
        MemoryPhoto.build({ id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false })
      ]);
      assert.deepEqual([secondModels[0].isNew, secondModels[0].isPersisted], [false, true]);
      assert.deepEqual([secondModels[1].isNew, secondModels[1].isPersisted], [false, true]);

      secondModels[0].name = 'Some name';
      assert.deepEqual(secondModels[0], MemoryPhoto.build({
        id: 1, name: "Some name", href: "ski-trip.jpeg", is_public: false
      }));

      let thirdModels = await MemoryPhoto.find([1, 3]);
      assert.deepEqual(secondModels, [
        MemoryPhoto.build({ id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false }),
        MemoryPhoto.build({ id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false })
      ]);
      assert.deepEqual(thirdModels, [
        MemoryPhoto.build({ id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false }),
        MemoryPhoto.build({ id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false })
      ]);
      assert.notEqual(secondModels, thirdModels);
      assert.deepEqual([thirdModels[0].isNew, thirdModels[0].isPersisted], [false, true]);
      assert.deepEqual([thirdModels[1].isNew, thirdModels[1].isPersisted], [false, true]);
    });
  });

  module('$Model.findBy() tests', function() {
    test("$Model.findBy(attributes) returns a single model for the options", async function (assert) {
      const { MemoryPhoto, MemoryPhotoComment } = generateModels();

      const firstPhoto = {
        id: 1,
        name: "Ski trip",
        href: "ski-trip.jpeg",
        is_public: false,
        owner_id: null,
        group_uuid: null
      };

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => MemoryPhotoComment.insert(photoComment)));

      assert.propContains(await MemoryPhoto.findBy({ is_public: false }), firstPhoto);
      assert.propContains(await MemoryPhoto.findBy(firstPhoto), firstPhoto);
      assert.propContains(await MemoryPhoto.findBy({ name: "Family photo", href: "family-photo.jpeg" }), {
        id: 2,
        name: "Family photo",
        href: "family-photo.jpeg",
        is_public: true,
        owner_id: null,
        group_uuid: null
      });
      assert.propContains(await MemoryPhotoComment.findBy({ uuid: "d351963d-e725-4092-a37c-1ca1823b57d3" }), {
        uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
        content: "I was kidding",
        photo_id: 1,
        user_id: 1,
      });
    });

    test("$Model.findBy(attributes) returns a new instance from the actual cache each time", async function (assert) {
      const { MemoryPhoto } = generateModels();

      const firstPhoto = MemoryPhoto.build({
        id: 1,
        name: "Ski trip",
        href: "ski-trip.jpeg",
        is_public: false,
        owner_id: null,
        group_uuid: null
      });

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));

      let firstResponse = await MemoryPhoto.findBy({ name: "Ski trip" });
      assert.propContains(firstResponse, firstPhoto);
      assert.deepEqual([firstResponse.isNew, firstResponse.isPersisted], [false, true]);

      let secondResponse = await MemoryPhoto.findBy({ name: "Ski trip" });

      assert.notEqual(firstResponse, secondResponse);
      assert.propContains(secondResponse, firstPhoto);
      assert.deepEqual([secondResponse.isNew, secondResponse.isPersisted], [false, true]);

      secondResponse.name = 'Some unique name';

      assert.equal(await MemoryPhoto.findBy({ name: "Some unique name" }), null);

      let thirdResponse = await MemoryPhoto.findBy({ name: "Ski trip" });

      assert.notEqual(thirdResponse, firstPhoto);
      assert.deepEqual(thirdResponse, firstPhoto);
      assert.deepEqual(thirdResponse, firstResponse);
      assert.deepEqual([thirdResponse.isNew, thirdResponse.isPersisted], [false, true]);
    });
  });

  module('$Model.findAll() tests', function() {
    test("$Model.findAll() without parameters returns all the models in the database", async function (assert) {
      const { MemoryPhoto, MemoryPhotoComment } = generateModels();

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => MemoryPhotoComment.insert(photoComment)));

      assert.propEqual(await MemoryPhoto.findAll(), [
        MemoryPhoto.build({
          id: 1,
          name: "Ski trip",
          href: "ski-trip.jpeg",
          is_public: false,
        }),
        MemoryPhoto.build({
          id: 2,
          name: "Family photo",
          href: "family-photo.jpeg",
          is_public: true,
        }),
        MemoryPhoto.build({
          id: 3,
          name: "Selfie",
          href: "selfie.jpeg",
          is_public: false,
        }),
      ]);
      assert.propEqual(await MemoryPhotoComment.findAll(), [
        MemoryPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        MemoryPhotoComment.build({
          uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
          content: "I agree",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 2,
        }),
        MemoryPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        MemoryPhotoComment.build({
          uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
          content: "Interesting indeed",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          photo_id: 2,
          user_id: 1,
        }),
      ]);
    });

    test("$Model.findAll(attributes) returns right models in the database", async function (assert) {
      const { MemoryPhoto, MemoryPhotoComment } = generateModels();

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => MemoryPhotoComment.insert(photoComment)));

      assert.propEqual(await MemoryPhoto.findAll({ is_public: false }), [
        MemoryPhoto.build({
          id: 1,
          name: "Ski trip",
          href: "ski-trip.jpeg",
          is_public: false,
          owner_id: null,
          group_uuid: null
        }),
        MemoryPhoto.build({
          id: 3,
          name: "Selfie",
          href: "selfie.jpeg",
          is_public: false,
          owner_id: null,
          group_uuid: null
        }),
      ]);
      assert.propEqual(await MemoryPhotoComment.findAll({ photo_id: 1, user_id: 1 }), [
        MemoryPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        MemoryPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
      ]);
      assert.propEqual(await MemoryPhotoComment.findAll({ user_id: 1 }), [
        MemoryPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        MemoryPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        MemoryPhotoComment.build({
          uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
          content: "Interesting indeed",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          photo_id: 2,
          user_id: 1,
        }),
      ]);
    });

    test("$Model.findAll(attributes) returns a new instance from the actual cache each time", async function (assert) {
      const { MemoryPhotoComment } = generateModels();

      await Promise.all(PHOTO_COMMENTS.map((photo) => MemoryPhotoComment.insert(photo)));

      let firstModels = await MemoryPhotoComment.findAll({ photo_id: 1, user_id: 1 });
      assert.deepEqual(firstModels, [
        MemoryPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        MemoryPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
      ]);
      assert.deepEqual([firstModels[0].isNew, firstModels[0].isPersisted], [false, true]);
      assert.deepEqual([firstModels[1].isNew, firstModels[1].isPersisted], [false, true]);

      let secondModels = await MemoryPhotoComment.findAll({ photo_id: 1, user_id: 1 });
      assert.notEqual(firstModels, secondModels);
      assert.propEqual(secondModels, [
        MemoryPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        MemoryPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        })
      ]);
      assert.deepEqual([secondModels[0].isNew, secondModels[0].isPersisted], [false, true]);
      assert.deepEqual([secondModels[1].isNew, secondModels[1].isPersisted], [false, true]);

      secondModels[0].content = 'Whatever';

      assert.equal(secondModels[0].content, 'Whatever');

      let thirdModels = await MemoryPhotoComment.findAll({ photo_id: 1, user_id: 1 });
      assert.deepEqual(secondModels, [
        MemoryPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        MemoryPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        })
      ]);
      assert.deepEqual(thirdModels, [
        MemoryPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        MemoryPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        })
      ]);
      assert.deepEqual(secondModels, thirdModels);
      assert.deepEqual([thirdModels[0].isNew, thirdModels[0].isPersisted], [false, true]);
      assert.deepEqual([thirdModels[1].isNew, thirdModels[1].isPersisted], [false, true]);
    });
  });
});
