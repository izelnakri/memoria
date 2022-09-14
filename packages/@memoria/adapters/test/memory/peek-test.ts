import Model, { Column, PrimaryGeneratedColumn, RuntimeError } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";
import generateModels from "../helpers/models-with-relations/memory/mix/index.js";
import FIXTURES from "../helpers/fixtures/mix/index.js";

const { PHOTOS, PHOTO_COMMENTS } = FIXTURES;

module("@memoria/adapters | MemoryAdapter | Peek API", function (hooks) {
  setupMemoria(hooks);

  module("$Model.peek() tests", function () {
    test("$Model.peek() throws without a number id or ids", async function (assert) {
      const { MemoryPhoto, MemoryPhotoComment } = generateModels();

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => MemoryPhotoComment.insert(photoComment)));

      const array = [null, undefined, "", "1", true, {}];

      await Promise.all(
        array.map((param) => {
          try {
            MemoryPhoto.peek(param);
          } catch (error) {
            assert.ok(error instanceof RuntimeError);
          }
          try {
            MemoryPhotoComment.peek(param);
          } catch (error) {
            assert.ok(error instanceof RuntimeError);
          }
        })
      );
    });

    test("$Model.peek(id) works for different models", async function (assert) {
      const { MemoryPhoto } = generateModels();

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));

      assert.propContains(MemoryPhoto.peek(1), {
        id: 1,
        name: "Ski trip",
        href: "ski-trip.jpeg",
        is_public: false,
        owner_id: null,
        group_uuid: null,
      });
      assert.propContains(MemoryPhoto.peek(3), {
        id: 3,
        name: "Selfie",
        href: "selfie.jpeg",
        is_public: false,
        owner_id: null,
        group_uuid: null,
      });
    });

    test("$Model.peek(id) gets a new instance each time", async function (assert) {
      const { MemoryPhoto } = generateModels();

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));

      let firstModel = MemoryPhoto.peek(1);
      assert.propEqual(
        firstModel,
        MemoryPhoto.build({
          id: 1,
          name: "Ski trip",
          href: "ski-trip.jpeg",
          is_public: false,
        })
      );
      assert.deepEqual([firstModel.isNew, firstModel.isPersisted], [false, true]);

      let secondModel = MemoryPhoto.peek(1);
      assert.notEqual(firstModel, secondModel);
      assert.deepEqual([secondModel.isNew, secondModel.isPersisted], [false, true]);

      secondModel.name = "Some name";

      let thirdModel = MemoryPhoto.peek(1);
      assert.propEqual(
        thirdModel,
        MemoryPhoto.build({
          id: 1,
          name: "Ski trip",
          href: "ski-trip.jpeg",
          is_public: false,
        })
      );
      assert.propEqual(
        secondModel,
        MemoryPhoto.build({
          id: 1,
          name: "Some name",
          href: "ski-trip.jpeg",
          is_public: false,
        })
      );
      assert.notEqual(secondModel, thirdModel);
      assert.deepEqual([thirdModel.isNew, thirdModel.isPersisted], [false, true]);
    });

    test("$Model.peek(ids) works for multiple ids", async function (assert) {
      const { MemoryPhoto } = generateModels();

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));

      assert.propEqual(MemoryPhoto.peek([1, 3]), [
        MemoryPhoto.build({ id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false }),
        MemoryPhoto.build({ id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false }),
      ]);

      assert.propEqual(MemoryPhoto.peek([2, 3]), [
        MemoryPhoto.build({ id: 2, name: "Family photo", href: "family-photo.jpeg", is_public: true }),
        MemoryPhoto.build({ id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false }),
      ]);
    });

    test("$Model.peek(ids) get a new instances each time", async function (assert) {
      const { MemoryPhoto } = generateModels();

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));

      let firstModels = MemoryPhoto.peek([1, 3]);
      assert.deepEqual(firstModels, [
        MemoryPhoto.build({ id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false }),
        MemoryPhoto.build({ id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false }),
      ]);
      assert.deepEqual([firstModels[0].isNew, firstModels[0].isPersisted], [false, true]);
      assert.deepEqual([firstModels[1].isNew, firstModels[1].isPersisted], [false, true]);

      let secondModels = MemoryPhoto.peek([1, 3]);
      assert.notEqual(firstModels, secondModels);
      assert.propEqual(secondModels, [
        MemoryPhoto.build({ id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false }),
        MemoryPhoto.build({ id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false }),
      ]);
      assert.deepEqual([secondModels[0].isNew, secondModels[0].isPersisted], [false, true]);
      assert.deepEqual([secondModels[1].isNew, secondModels[1].isPersisted], [false, true]);

      secondModels[0].name = "Some name";

      let thirdModels = MemoryPhoto.peek([1, 3]);
      assert.deepEqual(secondModels, [
        MemoryPhoto.build({ id: 1, name: "Some name", href: "ski-trip.jpeg", is_public: false }),
        MemoryPhoto.build({ id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false }),
      ]);
      assert.deepEqual(thirdModels, [
        MemoryPhoto.build({ id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false }),
        MemoryPhoto.build({ id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false }),
      ]);
      assert.notDeepEqual(secondModels, thirdModels);
      assert.deepEqual([thirdModels[0].isNew, thirdModels[0].isPersisted], [false, true]);
      assert.deepEqual([thirdModels[1].isNew, thirdModels[1].isPersisted], [false, true]);
    });
  });

  module("$Model.peekBy() tests", function () {
    test("$Model.peekBy(attributes) returns a single model for the options", async function (assert) {
      const { MemoryPhoto, MemoryPhotoComment } = generateModels();

      const firstPhoto = {
        id: 1,
        name: "Ski trip",
        href: "ski-trip.jpeg",
        is_public: false,
        owner_id: null,
        group_uuid: null,
      };

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => MemoryPhotoComment.insert(photoComment)));

      assert.propContains(MemoryPhoto.peekBy({ is_public: false }), firstPhoto);
      assert.propContains(MemoryPhoto.peekBy(firstPhoto), firstPhoto);
      assert.propContains(MemoryPhoto.peekBy({ name: "Family photo", href: "family-photo.jpeg" }), {
        id: 2,
        name: "Family photo",
        href: "family-photo.jpeg",
        is_public: true,
        owner_id: null,
        group_uuid: null,
      });
      assert.propContains(
        MemoryPhotoComment.peekBy({ uuid: "d351963d-e725-4092-a37c-1ca1823b57d3" }),
        MemoryPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          is_important: true,
          photo_id: 1,
          user_id: 1,
        })
      );
    });

    test("$Model.peekBy(attributes) returns a new instance from the actual cache each time", async function (assert) {
      const { MemoryPhoto, MemoryPhotoComment } = generateModels();

      const firstPhoto = MemoryPhoto.build({
        id: 1,
        name: "Ski trip",
        href: "ski-trip.jpeg",
        is_public: false,
        owner_id: null,
        group_uuid: null,
      });

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => MemoryPhotoComment.insert(photoComment)));

      let firstResponse = MemoryPhoto.peekBy({ name: "Ski trip" });
      assert.propContains(firstResponse, firstPhoto);
      assert.deepEqual([firstResponse.isNew, firstResponse.isPersisted], [false, true]);

      let secondResponse = MemoryPhoto.peekBy({ name: "Ski trip" });
      assert.notEqual(firstResponse, secondResponse);
      assert.propContains(secondResponse, firstPhoto);
      assert.deepEqual([secondResponse.isNew, secondResponse.isPersisted], [false, true]);

      secondResponse.name = "Some unique name";

      assert.equal(MemoryPhoto.peekBy({ name: "Some unique name" }), null);

      let thirdResponse = MemoryPhoto.peekBy({ name: "Ski trip" });
      assert.notEqual(thirdResponse, firstPhoto);
      assert.propContains(thirdResponse, firstPhoto);
      assert.propContains(thirdResponse, firstResponse);
      assert.deepEqual([thirdResponse.isNew, thirdResponse.isPersisted], [false, true]);
    });
  });

  module("$Model.peekAll() tests", function () {
    test("$Model.peekAll() without parameters returns all the models in the cache", async function (assert) {
      const { MemoryPhoto, MemoryPhotoComment } = generateModels();

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => MemoryPhotoComment.insert(photoComment)));

      assert.propEqual(MemoryPhoto.peekAll(), [
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
      assert.propEqual(MemoryPhotoComment.peekAll(), [
        MemoryPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        MemoryPhotoComment.build({
          uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
          content: "I agree",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 2,
        }),
        MemoryPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        MemoryPhotoComment.build({
          uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
          content: "Interesting indeed",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 2,
          user_id: 1,
        }),
      ]);
    });

    test("$Model.peekAll(attributes) returns right models in the database", async function (assert) {
      const { MemoryPhoto, MemoryPhotoComment } = generateModels();

      await Promise.all(PHOTOS.map((photo) => MemoryPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => MemoryPhotoComment.insert(photoComment)));

      assert.propEqual(MemoryPhoto.peekAll({ is_public: false }), [
        MemoryPhoto.build({
          id: 1,
          name: "Ski trip",
          href: "ski-trip.jpeg",
          is_public: false,
          owner_id: null,
          group_uuid: null,
        }),
        MemoryPhoto.build({
          id: 3,
          name: "Selfie",
          href: "selfie.jpeg",
          is_public: false,
          owner_id: null,
          group_uuid: null,
        }),
      ]);
      assert.propEqual(MemoryPhotoComment.peekAll({ photo_id: 1, user_id: 1 }), [
        MemoryPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        MemoryPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
      ]);
      assert.propEqual(MemoryPhotoComment.peekAll({ user_id: 1 }), [
        MemoryPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        MemoryPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        MemoryPhotoComment.build({
          uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
          content: "Interesting indeed",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 2,
          user_id: 1,
        }),
      ]);
    });

    test("$Model.peekAll(attributes) returns a new instance from the actual cache each time", async function (assert) {
      const { MemoryPhotoComment } = generateModels();

      await Promise.all(PHOTO_COMMENTS.map((photo) => MemoryPhotoComment.insert(photo)));

      let firstModels = MemoryPhotoComment.peekAll({ photo_id: 1, user_id: 1 });
      assert.deepEqual(firstModels, [
        MemoryPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        MemoryPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
      ]);
      assert.deepEqual([firstModels[0].isNew, firstModels[0].isPersisted], [false, true]);
      assert.deepEqual([firstModels[1].isNew, firstModels[1].isPersisted], [false, true]);

      let secondModels = MemoryPhotoComment.peekAll({ photo_id: 1, user_id: 1 });
      assert.notEqual(firstModels, secondModels);
      assert.propEqual(secondModels, [
        MemoryPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        MemoryPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
      ]);
      assert.deepEqual([secondModels[0].isNew, secondModels[0].isPersisted], [false, true]);
      assert.deepEqual([secondModels[1].isNew, secondModels[1].isPersisted], [false, true]);

      secondModels[0].content = "Whatever";

      let thirdModels = MemoryPhotoComment.peekAll({ photo_id: 1, user_id: 1 });
      assert.deepEqual(secondModels, [
        MemoryPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "Whatever",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        MemoryPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
      ]);
      assert.deepEqual(thirdModels, [
        MemoryPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        MemoryPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
      ]);
      assert.notDeepEqual(secondModels, thirdModels);
      assert.deepEqual([thirdModels[0].isNew, thirdModels[0].isPersisted], [false, true]);
      assert.deepEqual([thirdModels[1].isNew, thirdModels[1].isPersisted], [false, true]);
    });
  });
});
