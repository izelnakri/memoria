import Model, {
  PrimaryGeneratedColumn,
  Column,
  RuntimeError,
  Serializer,
  InstanceDB,
  RelationshipPromise,
} from "@memoria/model";
import { module, test, skip } from "qunitx";
import setupMemoria from "../../helpers/setup-memoria.js";
import generateModels from "../../helpers/models-with-relations/memory/uuid/index.js";

const RANDOM_GROUP_UUID = "374c7f4a-85d6-429a-bf2a-0719525f5f21";
const SECOND_RANDOM_GROUP_UUID = "374c7f4a-85d6-429a-bf2a-0719525f5f22";

module("@memoria/adapters | MemoryAdapter | Relationships | Foreign key mutation tests(uuid)", function (hooks) {
  setupMemoria(hooks);

  module("BelongsTo mutations for OneToOne", function () {
    async function setupTargetModels(context, modelOptions = {}) {
      let { MemoryPhoto, MemoryGroup } = context;

      let targetPhoto = MemoryPhoto.build({ name: "Target photo", ...modelOptions });
      let targetPhotoCopy = MemoryPhoto.build(targetPhoto);
      let insertedTargetPhoto = await MemoryPhoto.insert(targetPhoto);
      let updatedTargetPhoto = await MemoryPhoto.update(insertedTargetPhoto);

      return { targetPhoto, targetPhotoCopy, insertedTargetPhoto, updatedTargetPhoto };
    }

    test("set model with null fkey for a model with null fkey shouldn't do anything", async function (assert) {
      let context = generateModels();
      let { MemoryPhoto, MemoryGroup } = context;
      let { targetPhoto, targetPhotoCopy } = await setupTargetModels(context);

      let group = MemoryGroup.build({ name: "First Group" });
      let insertedGroup = await MemoryGroup.insert(group);

      let secondGroup = MemoryGroup.build({ name: "Second Group" });
      let copiedSecondGroup = MemoryGroup.build(secondGroup);

      let thirdInsertedGroup = await MemoryGroup.insert({ name: "Third Group" });
      let thirdCopiedGroup = MemoryGroup.build(thirdInsertedGroup);
      let thirdUpdatedGroup = await MemoryGroup.update({ uuid: thirdCopiedGroup.uuid, name: "Third Updated Group" });

      assert.equal(await group.photo, null);
      assert.equal(targetPhoto.group_uuid, null);
      assert.equal(targetPhoto.group, null);

      await Promise.all(
        [
          group,
          insertedGroup,
          secondGroup,
          copiedSecondGroup,
          thirdInsertedGroup,
          thirdCopiedGroup,
          thirdUpdatedGroup,
        ].map(async (targetGroup) => {
          assert.strictEqual(await targetGroup.photo, null);
        })
      );

      targetPhoto.group_uuid = null;

      await Promise.all(
        [
          group,
          insertedGroup,
          secondGroup,
          copiedSecondGroup,
          thirdInsertedGroup,
          thirdCopiedGroup,
          thirdUpdatedGroup,
        ].map(async (targetGroup) => {
          assert.strictEqual(await targetGroup.photo, null);
        })
      );

      assert.equal(targetPhoto.group_uuid, null);
      assert.equal(targetPhoto.group, null);
    });

    test("set model with null fkey to instance key fkey (that exists) works correctly", async function (assert) {
      let context = generateModels();
      let { MemoryPhoto, MemoryGroup } = context;

      let group = MemoryGroup.build({ name: "First Group" });
      let insertedGroup = await MemoryGroup.insert(group);

      let secondGroup = MemoryGroup.build({ name: "Second Group" });
      let copiedSecondGroup = MemoryGroup.build(secondGroup);

      let thirdInsertedGroup = await MemoryGroup.insert({ name: "Third Group" });
      let thirdCopiedGroup = MemoryGroup.build(thirdInsertedGroup);
      let thirdUpdatedGroup = await MemoryGroup.update({ uuid: thirdCopiedGroup.uuid, name: "Third Updated Group" });

      let { targetPhoto, targetPhotoCopy } = await setupTargetModels(context);

      assert.equal(await group.photo, null);
      assert.equal(targetPhoto.group_uuid, null);
      assert.equal(targetPhotoCopy.group_uuid, null);
      assert.equal(targetPhoto.group, null);
      assert.equal(targetPhotoCopy.group, null);

      await Promise.all(
        [
          group,
          insertedGroup,
          secondGroup,
          copiedSecondGroup,
          thirdInsertedGroup,
          thirdCopiedGroup,
          thirdUpdatedGroup,
        ].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        })
      );

      targetPhoto.group_uuid = thirdCopiedGroup.uuid;

      assert.equal(targetPhoto.group_uuid, thirdCopiedGroup.uuid);
      assert.deepEqual(targetPhoto.group.toJSON(), thirdUpdatedGroup.toJSON());
      assert.notStrictEqual(targetPhoto.group, thirdUpdatedGroup);
      assert.strictEqual(targetPhoto.group.photo, targetPhoto);
      assert.strictEqual(targetPhoto.group.photo.group, targetPhoto.group);
      assert.equal(targetPhotoCopy.group_uuid, null);
      assert.equal(targetPhotoCopy.group, null);

      await Promise.all(
        [thirdInsertedGroup, thirdUpdatedGroup, thirdCopiedGroup].map(async (targetGroup) => {
          assert.strictEqual(targetGroup.photo, targetPhoto);
        })
      );
      await Promise.all(
        [group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        })
      );
    });

    test("set model with instance fkey (that exists) to null works correctly", async function (assert) {
      let context = generateModels();
      let { MemoryPhoto, MemoryGroup } = context;
      let group = MemoryGroup.build({ name: "First Group" });
      let insertedGroup = await MemoryGroup.insert(group);

      let secondGroup = MemoryGroup.build({ name: "Second Group" });
      let copiedSecondGroup = MemoryGroup.build(secondGroup);

      let thirdInsertedGroup = await MemoryGroup.insert({ name: "Third Group" });

      let { targetPhoto, targetPhotoCopy, insertedTargetPhoto, updatedTargetPhoto } = await setupTargetModels(context, {
        group: thirdInsertedGroup,
      });

      let thirdCopiedGroup = MemoryGroup.build(thirdInsertedGroup);
      let thirdUpdatedGroup = await MemoryGroup.update({ uuid: thirdCopiedGroup.uuid, name: "Third Updated Group" });

      assert.equal(await group.photo, null);

      assert.equal(targetPhoto.group_uuid, thirdInsertedGroup.uuid);
      assert.strictEqual(targetPhoto.group, thirdUpdatedGroup);
      assert.deepEqual(targetPhoto.group.photo, updatedTargetPhoto);

      assert.equal(targetPhotoCopy.group_uuid, thirdUpdatedGroup.uuid);
      assert.strictEqual(targetPhotoCopy.group, thirdUpdatedGroup);

      await Promise.all(
        [group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        })
      );

      await Promise.all(
        [thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.deepEqual(await targetGroup.photo, updatedTargetPhoto);
        })
      );

      targetPhoto.group_uuid = null;

      assert.equal(targetPhoto.group_uuid, null);
      assert.equal(targetPhoto.group, null);
      assert.equal(targetPhotoCopy.group_uuid, thirdUpdatedGroup.uuid);
      assert.strictEqual(targetPhotoCopy.group, thirdUpdatedGroup);

      await Promise.all(
        [group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        })
      );

      let oldUpdatedGroupPhoto = updatedTargetPhoto.toJSON();
      await Promise.all(
        [thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.deepEqual(targetGroup.photo, updatedTargetPhoto);
        })
      );

      assert.equal(updatedTargetPhoto.group_uuid, thirdUpdatedGroup.uuid);
      assert.strictEqual(updatedTargetPhoto.group, thirdUpdatedGroup);

      updatedTargetPhoto.group_uuid = null;

      assert.equal(updatedTargetPhoto.group_uuid, null);
      assert.equal(updatedTargetPhoto.group, null);

      await Promise.all(
        [thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.notStrictEqual(targetGroup.photo, oldUpdatedGroupPhoto);
          assert.deepEqual(targetGroup.photo.toJSON(), oldUpdatedGroupPhoto);
        })
      );

      let cachedTargetPhoto = MemoryPhoto.Cache.get(updatedTargetPhoto.uuid);
      let targetPhotosToNullify = Array.from(InstanceDB.getReferences(updatedTargetPhoto)).filter((targetPhoto) => {
        return targetPhoto !== cachedTargetPhoto;
      });

      targetPhotosToNullify.forEach((targetPhoto) => {
        targetPhoto.group_uuid = null;
      });

      await Promise.all(
        [thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.notStrictEqual(targetGroup.photo, cachedTargetPhoto);
          assert.deepEqual(targetGroup.photo.toJSON(), oldUpdatedGroupPhoto);
        })
      );
    });

    test("set model with instance fkey (that exists) to another instance key (that exists) works correctly", async function (assert) {
      let context = generateModels();
      let { MemoryPhoto, MemoryGroup } = context;

      let group = MemoryGroup.build({ name: "First Group" });
      let insertedGroup = await MemoryGroup.insert(group);

      let secondGroup = MemoryGroup.build({ name: "Second Group" });
      let copiedSecondGroup = MemoryGroup.build(secondGroup);

      let thirdInsertedGroup = await MemoryGroup.insert({ name: "Third Group" });

      let { targetPhoto, targetPhotoCopy, insertedTargetPhoto, updatedTargetPhoto } = await setupTargetModels(context, {
        group: thirdInsertedGroup,
      });

      let thirdCopiedGroup = MemoryGroup.build(thirdInsertedGroup);
      let thirdUpdatedGroup = await MemoryGroup.update({ uuid: thirdCopiedGroup.uuid, name: "Third Updated Group" });

      assert.equal(await group.photo, null);

      assert.equal(targetPhoto.group_uuid, thirdInsertedGroup.uuid);
      assert.strictEqual(targetPhoto.group, thirdUpdatedGroup);
      assert.equal(targetPhotoCopy.group_uuid, thirdUpdatedGroup.uuid);
      assert.strictEqual(targetPhotoCopy.group, thirdUpdatedGroup);

      await Promise.all(
        [group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.strictEqual(await targetGroup.photo, null);
        })
      );

      await Promise.all(
        [thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.deepEqual(await targetGroup.photo, updatedTargetPhoto);
        })
      );

      targetPhoto.group_uuid = insertedGroup.uuid;

      assert.equal(targetPhoto.group_uuid, insertedGroup.uuid);
      assert.notEqual(await targetPhoto.group, insertedGroup);
      assert.notEqual(await targetPhoto.group, group);
      assert.deepEqual((await targetPhoto.group).toJSON(), insertedGroup.toJSON());
      assert.strictEqual(targetPhoto.group.photo, targetPhoto);
      assert.strictEqual(targetPhoto.group.photo.group, targetPhoto.group);

      assert.equal(targetPhotoCopy.group_uuid, thirdUpdatedGroup.uuid);
      assert.strictEqual(targetPhotoCopy.group, thirdUpdatedGroup);
      assert.equal(updatedTargetPhoto.group_uuid, thirdUpdatedGroup.uuid);
      assert.strictEqual(updatedTargetPhoto.group, thirdUpdatedGroup);

      await Promise.all(
        [secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        })
      );

      await Promise.all(
        [group, insertedGroup].map(async (targetGroup) => {
          assert.strictEqual(targetGroup.photo, targetPhoto);
        })
      );

      await Promise.all(
        [thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.deepEqual(await targetGroup.photo, updatedTargetPhoto);
        })
      );

      let lastPhoto = await MemoryPhoto.update(targetPhoto);

      await Promise.all(
        [group, insertedGroup].map(async (targetGroup) => {
          assert.deepEqual(await targetGroup.photo, targetPhoto);
        })
      );

      await Promise.all(
        [thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        })
      );
    });

    test("set model with instance fkey (that exists) to another instance key (that doesnt exist) works correctly", async function (assert) {
      let context = generateModels();
      let { MemoryPhoto, MemoryGroup } = context;
      let group = MemoryGroup.build({ name: "First Group" });
      let insertedGroup = await MemoryGroup.insert(group);

      let secondGroup = MemoryGroup.build({ name: "Second Group" });
      let copiedSecondGroup = MemoryGroup.build(secondGroup);

      let thirdInsertedGroup = await MemoryGroup.insert({ name: "Third Group" });

      let { targetPhoto, targetPhotoCopy, insertedTargetPhoto, updatedTargetPhoto } = await setupTargetModels(context, {
        group: thirdInsertedGroup,
      });

      let thirdCopiedGroup = MemoryGroup.build(thirdInsertedGroup);
      let thirdUpdatedGroup = await MemoryGroup.update({ uuid: thirdCopiedGroup.uuid, name: "Third Updated Group" });

      assert.equal(await group.photo, null);

      assert.equal(targetPhoto.group_uuid, thirdInsertedGroup.uuid);
      assert.strictEqual(targetPhoto.group, thirdUpdatedGroup);
      assert.equal(targetPhotoCopy.group_uuid, thirdUpdatedGroup.uuid);
      assert.strictEqual(targetPhotoCopy.group, thirdUpdatedGroup);

      await Promise.all(
        [group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        })
      );

      await Promise.all(
        [thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.deepEqual(await targetGroup.photo, updatedTargetPhoto);
        })
      );

      targetPhoto.group_uuid = "374c7f4a-85d6-429a-bf2a-0719525f5f21";

      assert.equal(targetPhoto.group_uuid, RANDOM_GROUP_UUID);
      assert.ok(targetPhoto.group instanceof RelationshipPromise);
      assert.equal(await targetPhoto.group, null);
      assert.equal(targetPhotoCopy.group_uuid, thirdUpdatedGroup.uuid);
      assert.strictEqual(targetPhotoCopy.group, thirdUpdatedGroup);
      assert.equal(updatedTargetPhoto.group_uuid, thirdUpdatedGroup.uuid);
      assert.strictEqual(updatedTargetPhoto.group, thirdUpdatedGroup);

      await Promise.all(
        [group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        })
      );

      await Promise.all(
        [thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.deepEqual(await targetGroup.photo, updatedTargetPhoto);
        })
      );

      assert.ok(targetPhoto.group instanceof RelationshipPromise);
      assert.equal(await targetPhoto.group, null);
      assert.equal(targetPhoto.group_uuid, RANDOM_GROUP_UUID);

      let mockGroup = MemoryGroup.build({ uuid: RANDOM_GROUP_UUID, name: "Mock Group" });

      assert.strictEqual(targetPhoto.group, mockGroup);
      assert.equal(targetPhoto.group_uuid, RANDOM_GROUP_UUID);

      let insertedMockGroup = await MemoryGroup.insert(mockGroup);

      assert.deepEqual(targetPhoto.group.toJSON(), insertedMockGroup.toJSON());
      assert.equal(targetPhoto.group_uuid, RANDOM_GROUP_UUID);
    });

    test("set model with instance fkey (that doesnt exist) to null works", async function (assert) {
      let context = generateModels();
      let { MemoryPhoto, MemoryGroup } = context;
      let group = MemoryGroup.build({ name: "First Group" });
      let insertedGroup = await MemoryGroup.insert(group);

      let secondGroup = MemoryGroup.build({ name: "Second Group" });
      let copiedSecondGroup = MemoryGroup.build(secondGroup);

      let thirdInsertedGroup = await MemoryGroup.insert({ name: "Third Group" });

      let { targetPhoto, targetPhotoCopy, insertedTargetPhoto, updatedTargetPhoto } = await setupTargetModels(context, {
        group_uuid: RANDOM_GROUP_UUID,
      });

      assert.equal(targetPhoto.group_uuid, RANDOM_GROUP_UUID);
      assert.equal(await targetPhoto.group, null);

      targetPhoto.group_uuid = null;

      await Promise.all(
        [group, insertedGroup, secondGroup, copiedSecondGroup, thirdInsertedGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        })
      );

      assert.equal(targetPhoto.group_uuid, null);
      assert.equal(targetPhoto.group, null);
    });

    test("set model with instance fkey (that doesnt exist) to another instance key (that exist) works correctly", async function (assert) {
      let context = generateModels();
      let { MemoryPhoto, MemoryGroup } = context;
      let group = MemoryGroup.build({ name: "First Group" });
      let insertedGroup = await MemoryGroup.insert(group);

      let secondGroup = MemoryGroup.build({ name: "Second Group" });
      let copiedSecondGroup = MemoryGroup.build(secondGroup);

      let thirdInsertedGroup = await MemoryGroup.insert({ name: "Third Group" });

      let { targetPhoto, targetPhotoCopy, insertedTargetPhoto, updatedTargetPhoto } = await setupTargetModels(context, {
        group_uuid: RANDOM_GROUP_UUID,
      });

      let thirdCopiedGroup = MemoryGroup.build(thirdInsertedGroup);
      let thirdUpdatedGroup = await MemoryGroup.update({ uuid: thirdCopiedGroup.uuid, name: "Third Updated Group" });

      assert.equal(await group.photo, null);

      assert.equal(targetPhoto.group_uuid, RANDOM_GROUP_UUID);
      assert.equal(await targetPhoto.group, null);
      assert.equal(targetPhotoCopy.group_uuid, RANDOM_GROUP_UUID);
      assert.equal(await targetPhotoCopy.group, null);

      await Promise.all(
        [group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        })
      );

      await Promise.all(
        [thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        })
      );

      targetPhoto.group_uuid = insertedGroup.uuid;

      assert.equal(targetPhoto.group_uuid, insertedGroup.uuid);
      assert.deepEqual((await targetPhoto.group).toJSON(), insertedGroup.toJSON());
      assert.deepEqual(insertedGroup.photo, targetPhoto);
      assert.notEqual(await targetPhoto.group, insertedGroup);
      assert.notEqual(await targetPhoto.group, group);
      assert.equal(targetPhotoCopy.group_uuid, RANDOM_GROUP_UUID);
      assert.equal(await targetPhotoCopy.group, null);
      assert.equal(updatedTargetPhoto.group_uuid, RANDOM_GROUP_UUID);
      assert.equal(await updatedTargetPhoto.group, null);

      await Promise.all(
        [secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        })
      );

      await Promise.all(
        [group, insertedGroup].map(async (targetGroup) => {
          assert.strictEqual(targetGroup.photo, targetPhoto);
        })
      );

      let cachedInsertedPhoto = MemoryPhoto.Cache.get(insertedGroup.uuid);
      let lastInsertedGroupInstance = Array.from(InstanceDB.getReferences(insertedGroup)).pop();

      assert.notStrictEqual(lastInsertedGroupInstance, cachedInsertedPhoto);
      assert.strictEqual(lastInsertedGroupInstance.photo, targetPhoto);
      assert.deepEqual(lastInsertedGroupInstance.photo.toJSON(), targetPhoto.toJSON());

      await Promise.all(
        [thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        })
      );

      let lastPhoto = await MemoryPhoto.update(targetPhoto);

      await Promise.all(
        [group, insertedGroup].map(async (targetGroup) => {
          assert.strictEqual(await targetGroup.photo, lastPhoto);
        })
      );

      await Promise.all(
        [secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        })
      );

      await Promise.all(
        [thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        })
      );
    });

    test("set model with instance fkey (that doesnt exist) to another instance key (that doesnt exist) works correctly", async function (assert) {
      let context = generateModels();
      let { MemoryPhoto, MemoryGroup } = context;
      let group = MemoryGroup.build({ name: "First Group" });
      let insertedGroup = await MemoryGroup.insert(group);

      let secondGroup = MemoryGroup.build({ name: "Second Group" });
      let copiedSecondGroup = MemoryGroup.build(secondGroup);

      let thirdInsertedGroup = await MemoryGroup.insert({ name: "Third Group" });

      let { targetPhoto, targetPhotoCopy, insertedTargetPhoto, updatedTargetPhoto } = await setupTargetModels(context, {
        group_uuid: RANDOM_GROUP_UUID,
      });

      let thirdCopiedGroup = MemoryGroup.build(thirdInsertedGroup);
      let thirdUpdatedGroup = await MemoryGroup.update({ uuid: thirdCopiedGroup.uuid, name: "Third Updated Group" });

      assert.equal(await group.photo, null);

      assert.equal(targetPhoto.group_uuid, RANDOM_GROUP_UUID);
      assert.equal(await targetPhoto.group, null);
      assert.equal(targetPhotoCopy.group_uuid, RANDOM_GROUP_UUID);
      assert.equal(await targetPhotoCopy.group, null);

      await Promise.all(
        [group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        })
      );

      await Promise.all(
        [thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        })
      );

      targetPhoto.group_uuid = SECOND_RANDOM_GROUP_UUID;

      assert.equal(await group.photo, null);

      assert.equal(targetPhoto.group_uuid, SECOND_RANDOM_GROUP_UUID);
      assert.equal(await targetPhoto.group, null);

      assert.equal(targetPhotoCopy.group_uuid, RANDOM_GROUP_UUID);
      assert.equal(await targetPhotoCopy.group, null);

      await Promise.all(
        [group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        })
      );

      await Promise.all(
        [thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        })
      );
    });
  });
});
