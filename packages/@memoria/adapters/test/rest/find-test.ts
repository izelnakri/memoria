import Memoria from "@memoria/server";
import Model, {
  DB,
  CreateDateColumn,
  Column,
  PrimaryGeneratedColumn,
  RuntimeError,
  UpdateDateColumn,
} from "@memoria/model";
import { RESTAdapter, MemoryAdapter } from "@memoria/adapters";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";
import generateModels from "../helpers/models-with-relations/rest/mix/index.js";
import FIXTURES from "../helpers/fixtures/mix/index.js"

const { PHOTOS, PHOTO_COMMENTS } = FIXTURES;

module("@memoria/adapters | RESTAdapter | Find API", function (hooks) {
  setupMemoria(hooks);

  module('$Model.find() tests', function() {
    test("$Model.find() throws without a number id or ids", async function (assert) {
      const { RESTPhoto, RESTPhotoComment, Server } = generateModels();
      this.Server = Server

      await Promise.all(PHOTOS.map((photo) => RESTPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => RESTPhotoComment.insert(photoComment)));

      const array = [null, undefined, "", "1", true, {}];

      await Promise.all(
        array.map(async (param) => {
          try {
            await RESTPhoto.find(param);
          } catch (error) {
            assert.ok(error instanceof RuntimeError);
          }
          try {
            await RESTPhotoComment.find(param);
          } catch (error) {
            assert.ok(error instanceof RuntimeError);
          }
        })
      );
    });

    test("$Model.find(id) works correctly for different models", async function (assert) {
      const { RESTPhoto, Server } = generateModels();
      this.Server = Server

      await Promise.all(PHOTOS.map((photo) => RESTPhoto.insert(photo)));

      assert.propEqual(await RESTPhoto.find(1), RESTPhoto.build({
        id: 1,
        name: "Ski trip",
        href: "ski-trip.jpeg",
        is_public: false,
      }));
      assert.propEqual(await RESTPhoto.find(3), RESTPhoto.build({
        id: 3,
        name: "Selfie",
        href: "selfie.jpeg",
        is_public: false,
      }));
    });

    test("$Model.find(id) gets a new instance each time", async function (assert) {
      const { RESTPhoto, Server } = generateModels();
      this.Server = Server

      await Promise.all(PHOTOS.map((photo) => RESTPhoto.insert(photo)));

      let firstModel = await RESTPhoto.find(1);
      assert.propEqual(firstModel, RESTPhoto.build({
        id: 1,
        name: "Ski trip",
        href: "ski-trip.jpeg",
        is_public: false,
      }));
      assert.deepEqual([firstModel.isNew, firstModel.isPersisted], [false, true]);

      let secondModel = await RESTPhoto.find(1);
      assert.notEqual(firstModel, secondModel);
      assert.deepEqual([secondModel.isNew, secondModel.isPersisted], [false, true]);

      secondModel.name = 'Some name';

      assert.equal(secondModel.name, 'Some name');

      let thirdModel = await RESTPhoto.find(1);
      assert.deepEqual([thirdModel.isNew, thirdModel.isPersisted], [false, true]);
      assert.propEqual(thirdModel, RESTPhoto.build({
        id: 1,
        name: "Ski trip",
        href: "ski-trip.jpeg",
        is_public: false,
      }));
      assert.propEqual(secondModel, RESTPhoto.build({
        id: 1,
        name: "Ski trip",
        href: "ski-trip.jpeg",
        is_public: false,
      }));
      assert.notEqual(secondModel, thirdModel);
    });

    test("$Model.find(ids) works for multiple ids", async function (assert) {
      const { RESTPhoto, Server } = generateModels();
      this.Server = Server

      await Promise.all(PHOTOS.map((photo) => RESTPhoto.insert(photo)));

      assert.propEqual(await RESTPhoto.find([1, 3]), [
        RESTPhoto.build({ id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false }),
        RESTPhoto.build({ id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false })
      ]);
      assert.propEqual(await RESTPhoto.find([2, 3]), [
        RESTPhoto.build({ id: 2, name: "Family photo", href: "family-photo.jpeg", is_public: true }),
        RESTPhoto.build({ id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false })
      ]);
    });

    test("$Model.find(ids) get a new instances each time", async function (assert) {
      const { RESTPhoto, Server } = generateModels();
      this.Server = Server;

      await Promise.all(PHOTOS.map((photo) => RESTPhoto.insert(photo)));

      let firstModels = await RESTPhoto.find([1, 3]);
      assert.deepEqual(firstModels, [
        RESTPhoto.build({ id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false }),
        RESTPhoto.build({ id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false })
      ]);
      assert.deepEqual([firstModels[0].isNew, firstModels[0].isPersisted], [false, true]);
      assert.deepEqual([firstModels[1].isNew, firstModels[1].isPersisted], [false, true]);

      let secondModels = await RESTPhoto.find([1, 3]);
      assert.notEqual(firstModels, secondModels);
      assert.propEqual(secondModels, [
        RESTPhoto.build({ id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false }),
        RESTPhoto.build({ id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false })
      ]);
      assert.deepEqual([secondModels[0].isNew, secondModels[0].isPersisted], [false, true]);
      assert.deepEqual([secondModels[1].isNew, secondModels[1].isPersisted], [false, true]);

      secondModels[0].name = 'Some name';
      assert.deepEqual(secondModels[0], RESTPhoto.build({
        id: 1, name: "Some name", href: "ski-trip.jpeg", is_public: false
      }));

      let thirdModels = await RESTPhoto.find([1, 3]);
      assert.deepEqual(secondModels, [
        RESTPhoto.build({ id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false }),
        RESTPhoto.build({ id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false })
      ]);
      assert.deepEqual(thirdModels, [
        RESTPhoto.build({ id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false }),
        RESTPhoto.build({ id: 3, name: "Selfie", href: "selfie.jpeg", is_public: false })
      ]);
      assert.notEqual(secondModels, thirdModels);
      assert.deepEqual([thirdModels[0].isNew, thirdModels[0].isPersisted], [false, true]);
      assert.deepEqual([thirdModels[1].isNew, thirdModels[1].isPersisted], [false, true]);
    });
  });

  module('$Model.findBy() tests', function() {
    test("$Model.findBy(attributes) returns a single model for the options", async function (assert) {
      const { RESTPhoto, RESTPhotoComment, Server } = generateModels();
      this.Server = Server

      const firstPhoto = RESTPhoto.build({ id: 1, name: "Ski trip", href: "ski-trip.jpeg", is_public: false });

      await Promise.all(PHOTOS.map((photo) => RESTPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => RESTPhotoComment.insert(photoComment)));

      assert.propEqual(await RESTPhoto.findBy({ is_public: false }), firstPhoto);
      assert.propEqual(await RESTPhoto.findBy({ id: firstPhoto.id }), firstPhoto);
      assert.propEqual(await RESTPhoto.findBy({ name: "Family photo", href: "family-photo.jpeg" }), RESTPhoto.build({
        id: 2,
        name: "Family photo",
        href: "family-photo.jpeg",
        is_public: true,
      }));
      assert.propEqual(await RESTPhotoComment.findBy({ uuid: "d351963d-e725-4092-a37c-1ca1823b57d3" }), RESTPhotoComment.build({
        uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
        content: "I was kidding",
        is_important: true,
        inserted_at: "2015-10-25T20:54:04.447Z",
        updated_at: "2015-10-25T20:54:04.447Z",
        photo_id: 1,
        user_id: 1,
      }));
    });

    test("$Model.findBy(attributes) returns a new instance from the actual cache each time", async function (assert) {
      const { RESTPhoto, Server } = generateModels();
      this.Server = Server;

      const firstPhoto = RESTPhoto.build({
        id: 1,
        name: "Ski trip",
        href: "ski-trip.jpeg",
        is_public: false,
        owner_id: null,
        group_uuid: null
      });

      await Promise.all(PHOTOS.map((photo) => RESTPhoto.insert(photo)));

      let firstResponse = await RESTPhoto.findBy({ name: "Ski trip" });
      assert.propContains(firstResponse, firstPhoto);
      assert.deepEqual([firstResponse.isNew, firstResponse.isPersisted], [false, true]);

      let secondResponse = await RESTPhoto.findBy({ name: "Ski trip" });

      assert.notEqual(firstResponse, secondResponse);
      assert.propContains(secondResponse, firstPhoto);
      assert.deepEqual([secondResponse.isNew, secondResponse.isPersisted], [false, true]);

      secondResponse.name = 'Some unique name';

      assert.equal(await RESTPhoto.findBy({ name: "Some unique name" }), null);

      let thirdResponse = await RESTPhoto.findBy({ name: "Ski trip" });
      assert.notEqual(thirdResponse, firstPhoto);
      assert.deepEqual(thirdResponse, firstPhoto);
      assert.deepEqual(thirdResponse, firstResponse);
      assert.deepEqual([thirdResponse.isNew, thirdResponse.isPersisted], [false, true]);
    });
  });

  module('$Model.findAll() tests', function() {
    test("$Model.findAll() without parameters returns all the models in the database", async function (assert) {
      const { RESTPhoto, RESTPhotoComment, Server } = generateModels();
      this.Server = Server

      await Promise.all(PHOTOS.map((photo) => RESTPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => RESTPhotoComment.insert(photoComment)));

      assert.propEqual(await RESTPhoto.findAll(), [
        RESTPhoto.build({
          id: 1,
          name: "Ski trip",
          href: "ski-trip.jpeg",
          is_public: false,
        }),
        RESTPhoto.build({
          id: 2,
          name: "Family photo",
          href: "family-photo.jpeg",
          is_public: true,
        }),
        RESTPhoto.build({
          id: 3,
          name: "Selfie",
          href: "selfie.jpeg",
          is_public: false,
        }),
      ]);
      assert.propEqual(await RESTPhotoComment.findAll(), [
        RESTPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        RESTPhotoComment.build({
          uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
          content: "I agree",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 2,
        }),
        RESTPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        RESTPhotoComment.build({
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

    test("$Model.findAll(attributes) returns right models in the database", async function (assert) {
      const { RESTPhoto, RESTPhotoComment, Server } = generateModels();
      this.Server = Server

      await Promise.all(PHOTOS.map((photo) => RESTPhoto.insert(photo)));
      await Promise.all(PHOTO_COMMENTS.map((photoComment) => RESTPhotoComment.insert(photoComment)));

      assert.propEqual(await RESTPhoto.findAll({ is_public: false }), [
        RESTPhoto.build({
          id: 1,
          name: "Ski trip",
          href: "ski-trip.jpeg",
          is_public: false,
        }),
        RESTPhoto.build({
          id: 3,
          name: "Selfie",
          href: "selfie.jpeg",
          is_public: false,
        }),
      ]);
      assert.propEqual(await RESTPhotoComment.findAll({ photo_id: 1, user_id: 1 }), [
        RESTPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        RESTPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
      ]);
      assert.propEqual(await RESTPhotoComment.findAll({ user_id: 1 }), [
        RESTPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        RESTPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        RESTPhotoComment.build({
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

    test("$Model.findAll(attributes) returns a new instance from the actual cache each time", async function (assert) {
      const { RESTPhotoComment, Server } = generateModels();
      this.Server = Server;

      await Promise.all(PHOTO_COMMENTS.map((photo) => RESTPhotoComment.insert(photo)));

      let firstModels = await RESTPhotoComment.findAll({ photo_id: 1, user_id: 1 });
      assert.deepEqual(firstModels, [
        RESTPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        RESTPhotoComment.build({
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

      let secondModels = await RESTPhotoComment.findAll({ photo_id: 1, user_id: 1 });
      assert.notEqual(firstModels, secondModels);
      assert.propEqual(secondModels, [
        RESTPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        RESTPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        })
      ]);
      assert.deepEqual([secondModels[0].isNew, secondModels[0].isPersisted], [false, true]);
      assert.deepEqual([secondModels[1].isNew, secondModels[1].isPersisted], [false, true]);

      secondModels[0].content = 'Whatever';

      assert.equal(secondModels[0].content, 'Whatever');

      let thirdModels = await RESTPhotoComment.findAll({ photo_id: 1, user_id: 1 });
      assert.deepEqual(secondModels, [
        RESTPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        RESTPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        })
      ]);
      assert.deepEqual(thirdModels, [
        RESTPhotoComment.build({
          uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
          content: "What a nice photo!",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
          photo_id: 1,
          user_id: 1,
        }),
        RESTPhotoComment.build({
          uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
          content: "I was kidding",
          is_important: true,
          inserted_at: "2015-10-25T20:54:04.447Z",
          updated_at: "2015-10-25T20:54:04.447Z",
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
