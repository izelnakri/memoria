import Model, { PrimaryGeneratedColumn, Column, RuntimeError, Serializer, InstanceDB, RelationshipPromise } from "@memoria/model";
import { module, test, skip } from "qunitx";
import setupMemoria from "../../helpers/setup-memoria.js";
import setupRESTModels from "../../helpers/models-with-relations/sql/id/index.js";

module(
  "@memoria/adapters | SQLAdapter | Relationships | Foreign key mutation tests(id)",
  function (hooks) {
    setupMemoria(hooks);

    module('BelongsTo mutations for OneToOne', function () {
      async function setupTargetModels(context, modelOptions = {}) {
        let { SQLPhoto, SQLGroup } = context;

        let targetPhoto = SQLPhoto.build({ name: 'Target photo', ...modelOptions });
        let targetPhotoCopy = SQLPhoto.build(targetPhoto);
        let insertedTargetPhoto = await SQLPhoto.insert(targetPhoto);
        let updatedTargetPhoto = await SQLPhoto.update(insertedTargetPhoto);

        return { targetPhoto, targetPhotoCopy, insertedTargetPhoto, updatedTargetPhoto };
      }

      test("set model with null fkey for a model with null fkey shouldn't do anything", async function (assert) {
        let context = setupRESTModels();
        let { SQLPhoto, SQLGroup } = context;
        let { targetPhoto, targetPhotoCopy } = await setupTargetModels(context);

        let group = SQLGroup.build({ name: "First Group" });
        let insertedGroup = await SQLGroup.insert(group);

        let secondGroup = SQLGroup.build({ name: "Second Group" });
        let copiedSecondGroup = SQLGroup.build(secondGroup);

        let thirdInsertedGroup = await SQLGroup.insert({ name: "Third Group" });
        let thirdCopiedGroup = SQLGroup.build(thirdInsertedGroup);
        let thirdUpdatedGroup = await SQLGroup.update({ id: thirdCopiedGroup.id, name: "Third Updated Group" });

        assert.equal(await group.photo, null);
        assert.equal(targetPhoto.group_id, null);
        assert.equal(targetPhoto.group, null);

        await Promise.all([
          group, insertedGroup, secondGroup, copiedSecondGroup, thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup
        ].map(async (targetGroup) => {
          assert.strictEqual(await targetGroup.photo, null);
        }));

        targetPhoto.group_id = null;

        await Promise.all([
          group, insertedGroup, secondGroup, copiedSecondGroup, thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup
        ].map(async (targetGroup) => {
          assert.strictEqual(await targetGroup.photo, null);
        }));

        assert.equal(targetPhoto.group_id, null);
        assert.equal(targetPhoto.group, null);
      });

      test("set model with null fkey to instance key fkey (that exists) works correctly", async function (assert) {
        let context = setupRESTModels();
        let { SQLPhoto, SQLGroup } = context;

        let group = SQLGroup.build({ name: "First Group" });
        let insertedGroup = await SQLGroup.insert(group);

        let secondGroup = SQLGroup.build({ name: "Second Group" });
        let copiedSecondGroup = SQLGroup.build(secondGroup);

        let thirdInsertedGroup = await SQLGroup.insert({ name: "Third Group" });
        let thirdCopiedGroup = SQLGroup.build(thirdInsertedGroup);
        let thirdUpdatedGroup = await SQLGroup.update({ id: thirdCopiedGroup.id, name: "Third Updated Group" });

        let { targetPhoto, targetPhotoCopy } = await setupTargetModels(context);

        assert.equal(await group.photo, null);
        assert.equal(targetPhoto.group_id, null);
        assert.equal(targetPhotoCopy.group_id, null);
        assert.equal(targetPhoto.group, null);
        assert.equal(targetPhotoCopy.group, null);

        await Promise.all([
          group, insertedGroup, secondGroup, copiedSecondGroup, thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup
        ].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        }));

        targetPhoto.group_id = thirdCopiedGroup.id;

        assert.equal(targetPhoto.group_id, thirdCopiedGroup.id);
        assert.deepEqual(targetPhoto.group.toJSON(), thirdUpdatedGroup.toJSON());
        assert.notStrictEqual(targetPhoto.group, thirdUpdatedGroup);
        assert.strictEqual(targetPhoto.group.photo, targetPhoto);
        assert.strictEqual(targetPhoto.group.photo.group, targetPhoto.group);
        assert.equal(targetPhotoCopy.group_id, null);
        assert.equal(targetPhotoCopy.group, null);

        await Promise.all([thirdInsertedGroup, thirdUpdatedGroup, thirdCopiedGroup].map(async (targetGroup) => {
          assert.strictEqual(targetGroup.photo, targetPhoto);
        }));
        await Promise.all([group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        }));
      });

      test("set model with instance fkey (that exists) to null works correctly", async function (assert) {
        let context = setupRESTModels();
        let { SQLPhoto, SQLGroup } = context;

        let group = SQLGroup.build({ name: "First Group" });
        let insertedGroup = await SQLGroup.insert(group);

        let secondGroup = SQLGroup.build({ name: "Second Group" });
        let copiedSecondGroup = SQLGroup.build(secondGroup);

        let thirdInsertedGroup = await SQLGroup.insert({ name: "Third Group" });

        let { targetPhoto, targetPhotoCopy, insertedTargetPhoto, updatedTargetPhoto } = await setupTargetModels(context, {
          group: thirdInsertedGroup
        });

        let thirdCopiedGroup = SQLGroup.build(thirdInsertedGroup);
        let thirdUpdatedGroup = await SQLGroup.update({ id: thirdCopiedGroup.id, name: "Third Updated Group" });

        assert.equal(await group.photo, null);

        assert.equal(targetPhoto.group_id, thirdInsertedGroup.id);
        assert.strictEqual(targetPhoto.group, thirdUpdatedGroup);
        assert.deepEqual(targetPhoto.group.photo, updatedTargetPhoto);

        assert.equal(targetPhotoCopy.group_id, thirdUpdatedGroup.id);
        assert.strictEqual(targetPhotoCopy.group, thirdUpdatedGroup);

        await Promise.all([group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        }));

        await Promise.all([thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.deepEqual(await targetGroup.photo, updatedTargetPhoto);
        }));

        targetPhoto.group_id = null;

        assert.equal(targetPhoto.group_id, null);
        assert.equal(targetPhoto.group, null);
        assert.equal(targetPhotoCopy.group_id, thirdUpdatedGroup.id);
        assert.strictEqual(targetPhotoCopy.group, thirdUpdatedGroup);

        await Promise.all([group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        }));

        let oldUpdatedGroupPhoto = updatedTargetPhoto.toJSON();
        await Promise.all([thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.deepEqual(targetGroup.photo, updatedTargetPhoto);
        }));

        assert.equal(updatedTargetPhoto.group_id, thirdUpdatedGroup.id);
        assert.strictEqual(updatedTargetPhoto.group, thirdUpdatedGroup);

        updatedTargetPhoto.group_id = null;

        assert.equal(updatedTargetPhoto.group_id, null);
        assert.equal(updatedTargetPhoto.group, null);

        await Promise.all([thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.notStrictEqual(targetGroup.photo, oldUpdatedGroupPhoto);
          assert.deepEqual(targetGroup.photo.toJSON(), oldUpdatedGroupPhoto);
        }));

        let cachedTargetPhoto = SQLPhoto.Cache.get(updatedTargetPhoto.id);
        let targetPhotosToNullify = Array.from(InstanceDB.getReferences(updatedTargetPhoto)).filter((targetPhoto) => {
          return targetPhoto !== cachedTargetPhoto;
        });

        targetPhotosToNullify.forEach((targetPhoto) => {
          targetPhoto.group_id = null;
        });

        await Promise.all([thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.notStrictEqual(targetGroup.photo, cachedTargetPhoto);
          assert.deepEqual(targetGroup.photo.toJSON(), oldUpdatedGroupPhoto);
        }));
      });

      test("set model with instance fkey (that exists) to another instance key (that exists) works correctly", async function (assert) {
        let context = setupRESTModels();
        let { SQLPhoto, SQLGroup } = context;

        let group = SQLGroup.build({ name: "First Group" });
        let insertedGroup = await SQLGroup.insert(group);

        let secondGroup = SQLGroup.build({ name: "Second Group" });
        let copiedSecondGroup = SQLGroup.build(secondGroup);

        let thirdInsertedGroup = await SQLGroup.insert({ name: "Third Group" });

        let { targetPhoto, targetPhotoCopy, insertedTargetPhoto, updatedTargetPhoto } = await setupTargetModels(context, {
          group: thirdInsertedGroup
        });

        let thirdCopiedGroup = SQLGroup.build(thirdInsertedGroup);
        let thirdUpdatedGroup = await SQLGroup.update({ id: thirdCopiedGroup.id, name: "Third Updated Group" });

        assert.equal(await group.photo, null);

        assert.equal(targetPhoto.group_id, thirdInsertedGroup.id);
        assert.strictEqual(targetPhoto.group, thirdUpdatedGroup);
        assert.equal(targetPhotoCopy.group_id, thirdUpdatedGroup.id);
        assert.strictEqual(targetPhotoCopy.group, thirdUpdatedGroup);

        await Promise.all([group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.strictEqual(await targetGroup.photo, null);
        }));

        await Promise.all([thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.deepEqual(await targetGroup.photo, updatedTargetPhoto);
        }));

        targetPhoto.group_id = insertedGroup.id;

        assert.equal(targetPhoto.group_id, insertedGroup.id);
        assert.notEqual(await targetPhoto.group, insertedGroup);
        assert.notEqual(await targetPhoto.group, group);
        assert.deepEqual((await targetPhoto.group).toJSON(), insertedGroup.toJSON());
        assert.strictEqual(targetPhoto.group.photo, targetPhoto);
        assert.strictEqual(targetPhoto.group.photo.group, targetPhoto.group);

        assert.equal(targetPhotoCopy.group_id, thirdUpdatedGroup.id);
        assert.strictEqual(targetPhotoCopy.group, thirdUpdatedGroup);
        assert.equal(updatedTargetPhoto.group_id, thirdUpdatedGroup.id);
        assert.strictEqual(updatedTargetPhoto.group, thirdUpdatedGroup);

        await Promise.all([secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        }));

        await Promise.all([group, insertedGroup].map(async (targetGroup) => {
          assert.strictEqual(targetGroup.photo, targetPhoto);
        }));

        await Promise.all([thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.deepEqual(await targetGroup.photo, updatedTargetPhoto);
        }));

        let lastPhoto = await SQLPhoto.update(targetPhoto);

        await Promise.all([group, insertedGroup].map(async (targetGroup) => {
          assert.deepEqual(await targetGroup.photo, targetPhoto);
        }));

        await Promise.all([thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        }));
      });

      test("set model with instance fkey (that exists) to another instance key (that doesnt exist) works correctly", async function (assert) {
        let context = setupRESTModels();
        let { SQLPhoto, SQLGroup } = context;

        let group = SQLGroup.build({ name: "First Group" });
        let insertedGroup = await SQLGroup.insert(group);

        let secondGroup = SQLGroup.build({ name: "Second Group" });
        let copiedSecondGroup = SQLGroup.build(secondGroup);

        let thirdInsertedGroup = await SQLGroup.insert({ name: "Third Group" });

        let { targetPhoto, targetPhotoCopy, insertedTargetPhoto, updatedTargetPhoto } = await setupTargetModels(context, {
          group: thirdInsertedGroup
        });

        let thirdCopiedGroup = SQLGroup.build(thirdInsertedGroup);
        let thirdUpdatedGroup = await SQLGroup.update({ id: thirdCopiedGroup.id, name: "Third Updated Group" });

        assert.equal(await group.photo, null);

        assert.equal(targetPhoto.group_id, thirdInsertedGroup.id);
        assert.strictEqual(targetPhoto.group, thirdUpdatedGroup);
        assert.equal(targetPhotoCopy.group_id, thirdUpdatedGroup.id);
        assert.strictEqual(targetPhotoCopy.group, thirdUpdatedGroup);

        await Promise.all([group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        }));

        await Promise.all([thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.deepEqual(await targetGroup.photo, updatedTargetPhoto);
        }));

        targetPhoto.group_id = 999999;

        assert.equal(targetPhoto.group_id, 999999);
        assert.ok(targetPhoto.group instanceof RelationshipPromise);
        assert.equal(await targetPhoto.group, null);
        assert.equal(targetPhotoCopy.group_id, thirdUpdatedGroup.id);
        assert.strictEqual(targetPhotoCopy.group, thirdUpdatedGroup);
        assert.equal(updatedTargetPhoto.group_id, thirdUpdatedGroup.id);
        assert.strictEqual(updatedTargetPhoto.group, thirdUpdatedGroup);

        await Promise.all([group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        }));

        await Promise.all([thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.deepEqual(await targetGroup.photo, updatedTargetPhoto);
        }));

        assert.ok(targetPhoto.group instanceof RelationshipPromise);
        assert.equal(await targetPhoto.group, null);
        assert.equal(targetPhoto.group_id, 999999);

        let mockGroup = SQLGroup.build({ id: 999999, name: "Mock Group" });

        assert.strictEqual(targetPhoto.group, mockGroup);
        assert.equal(targetPhoto.group_id, 999999);

        let insertedMockGroup = await SQLGroup.insert(mockGroup);

        assert.deepEqual(targetPhoto.group.toJSON(), insertedMockGroup.toJSON());
        assert.equal(targetPhoto.group_id, 999999);
      });

      test("set model with instance fkey (that doesnt exist) to null works", async function (assert) {
        let context = setupRESTModels();
        let { SQLPhoto, SQLGroup } = context;

        let group = SQLGroup.build({ name: "First Group" });
        let insertedGroup = await SQLGroup.insert(group);

        let secondGroup = SQLGroup.build({ name: "Second Group" });
        let copiedSecondGroup = SQLGroup.build(secondGroup);

        let thirdInsertedGroup = await SQLGroup.insert({ name: "Third Group" });

        let { targetPhoto, targetPhotoCopy, insertedTargetPhoto, updatedTargetPhoto } = await setupTargetModels(context, {
          group_id: 999999
        });

        assert.equal(targetPhoto.group_id, 999999);
        assert.equal(await targetPhoto.group, null);

        targetPhoto.group_id = null;

        await Promise.all([group, insertedGroup, secondGroup, copiedSecondGroup, thirdInsertedGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        }));

        assert.equal(targetPhoto.group_id, null);
        assert.equal(targetPhoto.group, null);
      });

      test("set model with instance fkey (that doesnt exist) to another instance key (that exist) works correctly", async function (assert) {
        let context = setupRESTModels();
        let { SQLPhoto, SQLGroup } = context;

        let group = SQLGroup.build({ name: "First Group" });
        let insertedGroup = await SQLGroup.insert(group);

        let secondGroup = SQLGroup.build({ name: "Second Group" });
        let copiedSecondGroup = SQLGroup.build(secondGroup);

        let thirdInsertedGroup = await SQLGroup.insert({ name: "Third Group" });

        let { targetPhoto, targetPhotoCopy, insertedTargetPhoto, updatedTargetPhoto } = await setupTargetModels(context, {
          group_id: 999999
        });

        let thirdCopiedGroup = SQLGroup.build(thirdInsertedGroup);
        let thirdUpdatedGroup = await SQLGroup.update({ id: thirdCopiedGroup.id, name: "Third Updated Group" });

        assert.equal(await group.photo, null);

        assert.equal(targetPhoto.group_id, 999999);
        assert.equal(await targetPhoto.group, null);
        assert.equal(targetPhotoCopy.group_id, 999999);
        assert.equal(await targetPhotoCopy.group, null);

        await Promise.all([group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        }));

        await Promise.all([thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        }));

        targetPhoto.group_id = insertedGroup.id;

        assert.equal(targetPhoto.group_id, insertedGroup.id);
        assert.deepEqual((await targetPhoto.group).toJSON(), insertedGroup.toJSON());
        assert.deepEqual(insertedGroup.photo, targetPhoto);
        assert.notEqual(await targetPhoto.group, insertedGroup);
        assert.notEqual(await targetPhoto.group, group);
        assert.equal(targetPhotoCopy.group_id, 999999);
        assert.equal(await targetPhotoCopy.group, null);
        assert.equal(updatedTargetPhoto.group_id, 999999);
        assert.equal(await updatedTargetPhoto.group, null);

        await Promise.all([secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        }));

        await Promise.all([group, insertedGroup].map(async (targetGroup) => {
          assert.strictEqual(targetGroup.photo, targetPhoto);
        }));

        let cachedInsertedPhoto = SQLPhoto.Cache.get(insertedGroup.id);
        let lastInsertedGroupInstance = Array.from(InstanceDB.getReferences(insertedGroup)).pop();

        assert.notStrictEqual(lastInsertedGroupInstance, cachedInsertedPhoto);
        assert.strictEqual(lastInsertedGroupInstance.photo, targetPhoto);
        assert.deepEqual(lastInsertedGroupInstance.photo.toJSON(), targetPhoto.toJSON());

        await Promise.all([thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        }));

        let lastPhoto = await SQLPhoto.update(targetPhoto);

        await Promise.all([group, insertedGroup].map(async (targetGroup) => {
          assert.strictEqual(await targetGroup.photo, lastPhoto);
        }));

        await Promise.all([secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        }));

        await Promise.all([thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        }));
      });

      test("set model with instance fkey (that doesnt exist) to another instance key (that doesnt exist) works correctly", async function (assert) {
        let context = setupRESTModels();
        let { SQLPhoto, SQLGroup } = context;

        let group = SQLGroup.build({ name: "First Group" });
        let insertedGroup = await SQLGroup.insert(group);

        let secondGroup = SQLGroup.build({ name: "Second Group" });
        let copiedSecondGroup = SQLGroup.build(secondGroup);

        let thirdInsertedGroup = await SQLGroup.insert({ name: "Third Group" });

        let { targetPhoto, targetPhotoCopy, insertedTargetPhoto, updatedTargetPhoto } = await setupTargetModels(context, {
          group_id: 999999
        });

        let thirdCopiedGroup = SQLGroup.build(thirdInsertedGroup);
        let thirdUpdatedGroup = await SQLGroup.update({ id: thirdCopiedGroup.id, name: "Third Updated Group" });

        assert.equal(await group.photo, null);

        assert.equal(targetPhoto.group_id, 999999);
        assert.equal(await targetPhoto.group, null);
        assert.equal(targetPhotoCopy.group_id, 999999);
        assert.equal(await targetPhotoCopy.group, null);

        await Promise.all([group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        }));

        await Promise.all([thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        }));

        targetPhoto.group_id = 999998;

        assert.equal(await group.photo, null);

        assert.equal(targetPhoto.group_id, 999998);
        assert.equal(await targetPhoto.group, null);

        assert.equal(targetPhotoCopy.group_id, 999999);
        assert.equal(await targetPhotoCopy.group, null);

        await Promise.all([group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        }));

        await Promise.all([thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        }));
      });
    });
  }
);
