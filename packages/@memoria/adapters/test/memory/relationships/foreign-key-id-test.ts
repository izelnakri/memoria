// TODO: implement in-memory(non peek lookups for last 4 tests) with adjustment
// TODO: also needed for belongsTo tests this in-memory lookup!!!!
import Model, { PrimaryGeneratedColumn, Column, RuntimeError, Serializer, InstanceDB, RelationshipPromise } from "@memoria/model";
import { module, test, skip } from "qunitx";
import setupMemoria from "../../helpers/setup-memoria.js";
import generateModels from "../../helpers/models-with-relations/memory/id/index.js";

// make both tests for id and uuid(?)
module(
  "@memoria/adapters | MemoryAdapter | Relationships | Foreign key mutation tests(id)",
  function (hooks) {
    setupMemoria(hooks);

    // Photo.group through group_id
    module('BelongsTo mutations for OneToOne', function () {
      async function setupTargetModels(context, modelOptions = {}) {
        let { MemoryPhoto, MemoryGroup } = context;

        let targetPhoto = MemoryPhoto.build({ name: 'Target photo', ...modelOptions });
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
        let thirdUpdatedGroup = await MemoryGroup.update({ id: thirdCopiedGroup.id, name: "Third Updated Group" });

        assert.strictEqual(await group.photo, null);
        assert.strictEqual(targetPhoto.group_id, null);
        assert.strictEqual(targetPhoto.group, null);

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

        assert.strictEqual(targetPhoto.group_id, null);
        assert.strictEqual(targetPhoto.group, null);
      });

      test("set model with null fkey to instance key fkey (that exists) and then to null works correctly", async function (assert) {
        let context = generateModels();
        let { MemoryPhoto, MemoryGroup } = context;

        let group = MemoryGroup.build({ name: "First Group" });
        let insertedGroup = await MemoryGroup.insert(group);

        let secondGroup = MemoryGroup.build({ name: "Second Group" });
        let copiedSecondGroup = MemoryGroup.build(secondGroup);

        let thirdInsertedGroup = await MemoryGroup.insert({ name: "Third Group" });
        let thirdCopiedGroup = MemoryGroup.build(thirdInsertedGroup);
        let thirdUpdatedGroup = await MemoryGroup.update({ id: thirdCopiedGroup.id, name: "Third Updated Group" });

        let { targetPhoto, targetPhotoCopy } = await setupTargetModels(context);

        assert.strictEqual(await group.photo, null);
        assert.strictEqual(targetPhoto.group_id, null);
        assert.strictEqual(targetPhotoCopy.group_id, null);
        assert.strictEqual(targetPhoto.group, null);
        assert.deepEqual(targetPhotoCopy.group, null);

        await Promise.all([
          group, insertedGroup, secondGroup, copiedSecondGroup, thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup
        ].map(async (targetGroup) => {
          assert.strictEqual(await targetGroup.photo, null);
        }));

        targetPhoto.group_id = thirdCopiedGroup.id;

        assert.strictEqual(targetPhoto.group_id, thirdCopiedGroup.id);
        assert.deepEqual(targetPhoto.group.toJSON(), thirdUpdatedGroup.toJSON());
        assert.notEqual(targetPhoto.group, thirdUpdatedGroup);
        assert.strictEqual(targetPhoto.group.photo, targetPhoto);
        assert.strictEqual(targetPhoto.group.photo.group, targetPhoto.group);
        assert.strictEqual(targetPhotoCopy.group_id, null);
        assert.equal(targetPhotoCopy.group, null);

        await Promise.all([
          group, insertedGroup, secondGroup, copiedSecondGroup, thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup
        ].map(async (targetGroup) => {
          assert.strictEqual(await targetGroup.photo, null);
        }));

        let associatedGroup = targetPhoto.group;
        targetPhoto.group_id = null;

        assert.strictEqual(targetPhoto.group_id, null);
        assert.strictEqual(targetPhotoCopy.group_id, null);
        assert.deepEqual(targetPhoto.group, null);
        assert.deepEqual(targetPhotoCopy.group, null);
        assert.ok(associatedGroup.photo instanceof RelationshipPromise);
        assert.strictEqual(await associatedGroup.photo, null);

        await Promise.all([
          group, insertedGroup, secondGroup, copiedSecondGroup, thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup
        ].map(async (targetGroup) => {
          assert.strictEqual(await targetGroup.photo, null);
        }));
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
          group: thirdInsertedGroup
        });

        let thirdCopiedGroup = MemoryGroup.build(thirdInsertedGroup);
        let thirdUpdatedGroup = await MemoryGroup.update({ id: thirdCopiedGroup.id, name: "Third Updated Group" });

        assert.strictEqual(await group.photo, null);

        assert.strictEqual(targetPhoto.group_id, thirdInsertedGroup.id);
        assert.strictEqual(targetPhoto.group, thirdUpdatedGroup);
        assert.deepEqual(targetPhoto.group.photo, updatedTargetPhoto);

        assert.strictEqual(targetPhotoCopy.group_id, thirdUpdatedGroup.id);
        assert.strictEqual(targetPhotoCopy.group, thirdUpdatedGroup);

        await Promise.all([group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.strictEqual(await targetGroup.photo, null);
        }));

        await Promise.all([thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.deepEqual(await targetGroup.photo, updatedTargetPhoto);
        }));

        targetPhoto.group_id = null;

        assert.strictEqual(targetPhoto.group_id, null);
        assert.strictEqual(targetPhoto.group, null);
        assert.strictEqual(targetPhotoCopy.group_id, thirdUpdatedGroup.id);
        assert.strictEqual(targetPhotoCopy.group, thirdUpdatedGroup);

        await Promise.all([group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.strictEqual(await targetGroup.photo, null);
        }));

        let oldUpdatedGroupPhoto = updatedTargetPhoto.toJSON();
        await Promise.all([thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.deepEqual(await targetGroup.photo, updatedTargetPhoto);
        }));

        assert.strictEqual(updatedTargetPhoto.group_id, thirdUpdatedGroup.id);
        assert.strictEqual(updatedTargetPhoto.group, thirdUpdatedGroup);

        updatedTargetPhoto.group_id = null;

        assert.strictEqual(updatedTargetPhoto.group_id, null);
        assert.strictEqual(updatedTargetPhoto.group, null);

        await Promise.all([thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.notStrictEqual(targetGroup.photo, oldUpdatedGroupPhoto);
          assert.deepEqual(targetGroup.photo.toJSON(), oldUpdatedGroupPhoto);
        }));

        let cachedTargetPhoto = MemoryPhoto.Cache.get(updatedTargetPhoto.id);
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
        let context = generateModels();
        let { MemoryPhoto, MemoryGroup } = context;

        let group = MemoryGroup.build({ name: "First Group" });
        let insertedGroup = await MemoryGroup.insert(group);

        let secondGroup = MemoryGroup.build({ name: "Second Group" });
        let copiedSecondGroup = MemoryGroup.build(secondGroup);

        let thirdInsertedGroup = await MemoryGroup.insert({ name: "Third Group" });

        let { targetPhoto, targetPhotoCopy, insertedTargetPhoto, updatedTargetPhoto } = await setupTargetModels(context, {
          group: thirdInsertedGroup
        });

        let thirdCopiedGroup = MemoryGroup.build(thirdInsertedGroup);
        let thirdUpdatedGroup = await MemoryGroup.update({ id: thirdCopiedGroup.id, name: "Third Updated Group" });

        assert.strictEqual(await group.photo, null);

        assert.strictEqual(targetPhoto.group_id, thirdInsertedGroup.id);
        assert.strictEqual(targetPhoto.group, thirdUpdatedGroup);
        assert.strictEqual(targetPhotoCopy.group_id, thirdUpdatedGroup.id);
        assert.strictEqual(targetPhotoCopy.group, thirdUpdatedGroup);

        await Promise.all([group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.strictEqual(await targetGroup.photo, null);
        }));

        await Promise.all([thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.deepEqual(await targetGroup.photo, updatedTargetPhoto);
        }));

        targetPhoto.group_id = insertedGroup.id;

        assert.strictEqual(targetPhoto.group_id, insertedGroup.id);
        assert.notEqual(await targetPhoto.group, insertedGroup);
        assert.notEqual(await targetPhoto.group, group);
        assert.deepEqual((await targetPhoto.group).toJSON(), insertedGroup.toJSON());
        assert.strictEqual(targetPhoto.group.photo, targetPhoto);
        assert.strictEqual(targetPhoto.group.photo.group, targetPhoto.group);

        assert.strictEqual(targetPhotoCopy.group_id, thirdUpdatedGroup.id);
        assert.strictEqual(targetPhotoCopy.group, thirdUpdatedGroup);
        assert.strictEqual(updatedTargetPhoto.group_id, thirdUpdatedGroup.id);
        assert.strictEqual(updatedTargetPhoto.group, thirdUpdatedGroup);

        await Promise.all([secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.strictEqual(await targetGroup.photo, null);
        }));

        await Promise.all([group, insertedGroup].map(async (targetGroup) => {
          assert.deepEqual(await targetGroup.photo, null);
        }));

        await Promise.all([thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.deepEqual(await targetGroup.photo, updatedTargetPhoto);
        }));

        let lastPhoto = await MemoryPhoto.update(targetPhoto);

        await Promise.all([group, insertedGroup].map(async (targetGroup) => {
          assert.deepEqual(await targetGroup.photo, targetPhoto);
        }));

        await Promise.all([thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.deepEqual(await targetGroup.photo, null);
        }));
      });

      // TODO: this needs update eventually
      test("set model with instance fkey (that exists) to another instance key (that doesnt exist) works correctly", async function (assert) {
        let context = generateModels();
        let { MemoryPhoto, MemoryGroup } = context;
        let group = MemoryGroup.build({ name: "First Group" });
        let insertedGroup = await MemoryGroup.insert(group);

        let secondGroup = MemoryGroup.build({ name: "Second Group" });
        let copiedSecondGroup = MemoryGroup.build(secondGroup);

        let thirdInsertedGroup = await MemoryGroup.insert({ name: "Third Group" });

        let { targetPhoto, targetPhotoCopy, insertedTargetPhoto, updatedTargetPhoto } = await setupTargetModels(context, {
          group: thirdInsertedGroup
        });

        let thirdCopiedGroup = MemoryGroup.build(thirdInsertedGroup);
        let thirdUpdatedGroup = await MemoryGroup.update({ id: thirdCopiedGroup.id, name: "Third Updated Group" });

        assert.strictEqual(await group.photo, null);

        assert.strictEqual(targetPhoto.group_id, thirdInsertedGroup.id);
        assert.strictEqual(targetPhoto.group, thirdUpdatedGroup);
        assert.strictEqual(targetPhotoCopy.group_id, thirdUpdatedGroup.id);
        assert.strictEqual(targetPhotoCopy.group, thirdUpdatedGroup);

        await Promise.all([group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.strictEqual(await targetGroup.photo, null);
        }));

        await Promise.all([thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.deepEqual(await targetGroup.photo, updatedTargetPhoto);
        }));

        targetPhoto.group_id = 999999;

        assert.strictEqual(targetPhoto.group_id, 999999);
        assert.ok(targetPhoto.group instanceof RelationshipPromise);
        assert.strictEqual(await targetPhoto.group, null);
        assert.strictEqual(targetPhotoCopy.group_id, thirdUpdatedGroup.id);
        assert.strictEqual(targetPhotoCopy.group, thirdUpdatedGroup);
        assert.strictEqual(updatedTargetPhoto.group_id, thirdUpdatedGroup.id);
        assert.strictEqual(updatedTargetPhoto.group, thirdUpdatedGroup);

        await Promise.all([group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.strictEqual(await targetGroup.photo, null);
        }));

        await Promise.all([thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.deepEqual(await targetGroup.photo, updatedTargetPhoto);
        }));

        assert.ok(targetPhoto.group instanceof RelationshipPromise);
        assert.strictEqual(await targetPhoto.group, null);
        assert.strictEqual(targetPhoto.group_id, 999999);

        let mockGroup = MemoryGroup.build({ id: 999999, name: "Mock Group" });

        assert.ok(targetPhoto.group instanceof RelationshipPromise);
        assert.strictEqual(await targetPhoto.group, null); // NOTE: BelongsTo in-memory registration would be helpful, because peek() doesnt return // NOTE:: should this be mockGroup reference(?) very tricky to implement
        assert.strictEqual(targetPhoto.group_id, 999999);

        let insertedMockGroup = await MemoryGroup.insert(mockGroup);

        assert.deepEqual((await targetPhoto.group).toJSON(), insertedMockGroup.toJSON());
        assert.strictEqual(targetPhoto.group_id, 999999);
      });

      // TODO: this needs update eventually
      test("set model with instance fkey (that doesnt exist) to null works", async function (assert) {
        let context = generateModels();
        let { MemoryPhoto, MemoryGroup } = context;
        let group = MemoryGroup.build({ name: "First Group" });
        let insertedGroup = await MemoryGroup.insert(group);

        let secondGroup = MemoryGroup.build({ name: "Second Group" });
        let copiedSecondGroup = MemoryGroup.build(secondGroup);

        let thirdInsertedGroup = await MemoryGroup.insert({ name: "Third Group" });

        let { targetPhoto, targetPhotoCopy, insertedTargetPhoto, updatedTargetPhoto } = await setupTargetModels(context, {
          group_id: 999999
        });

        assert.strictEqual(targetPhoto.group_id, 999999);
        assert.strictEqual(await targetPhoto.group, null);

        targetPhoto.group_id = null;

        await Promise.all([group, insertedGroup, secondGroup, copiedSecondGroup, thirdInsertedGroup].map(async (targetGroup) => {
          assert.strictEqual(await targetGroup.photo, null);
        }));

        assert.strictEqual(targetPhoto.group_id, null);
        assert.strictEqual(targetPhoto.group, null);
      });

      // TODO: this needs update eventually
      test("set model with instance fkey (that doesnt exist) to another instance key (that exist) works correctly", async function (assert) {
        let context = generateModels();
        let { MemoryPhoto, MemoryGroup } = context;
        let group = MemoryGroup.build({ name: "First Group" });
        let insertedGroup = await MemoryGroup.insert(group);

        let secondGroup = MemoryGroup.build({ name: "Second Group" });
        let copiedSecondGroup = MemoryGroup.build(secondGroup);

        let thirdInsertedGroup = await MemoryGroup.insert({ name: "Third Group" });

        let { targetPhoto, targetPhotoCopy, insertedTargetPhoto, updatedTargetPhoto } = await setupTargetModels(context, {
          group_id: 999999
        });

        let thirdCopiedGroup = MemoryGroup.build(thirdInsertedGroup);
        let thirdUpdatedGroup = await MemoryGroup.update({ id: thirdCopiedGroup.id, name: "Third Updated Group" });

        assert.strictEqual(await group.photo, null);

        assert.strictEqual(targetPhoto.group_id, 999999);
        assert.strictEqual(await targetPhoto.group, null);
        assert.strictEqual(targetPhotoCopy.group_id, 999999);
        assert.strictEqual(await targetPhotoCopy.group, null);

        await Promise.all([group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.strictEqual(await targetGroup.photo, null);
        }));

        await Promise.all([thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.deepEqual(await targetGroup.photo, null);
        }));

        targetPhoto.group_id = insertedGroup.id; // NOTE: if they were null now should they be reflectively done?

        assert.strictEqual(targetPhoto.group_id, insertedGroup.id);
        assert.notEqual(await targetPhoto.group, insertedGroup);
        assert.notEqual(await targetPhoto.group, group);
        assert.deepEqual((await targetPhoto.group).toJSON(), insertedGroup.toJSON());
        assert.strictEqual(targetPhotoCopy.group_id, 999999);
        assert.strictEqual(await targetPhotoCopy.group, null);
        assert.strictEqual(updatedTargetPhoto.group_id, 999999);
        assert.strictEqual(await updatedTargetPhoto.group, null);

        await Promise.all([secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.strictEqual(await targetGroup.photo, null);
        }));

        await Promise.all([group, insertedGroup].map(async (targetGroup) => {
          assert.deepEqual(await targetGroup.photo, null); // TODO: Could this be a big problem(?). It creates new instance, OneToOne in-memory registration would be helpful, because peek() doesnt return, it should be targetGroup.photo == targetPhoto
        }));

        let cachedInsertedPhoto = MemoryPhoto.Cache.get(insertedGroup.id);
        let lastInsertedGroupInstance = Array.from(InstanceDB.getReferences(insertedGroup)).pop();

        assert.notStrictEqual(lastInsertedGroupInstance, cachedInsertedPhoto);
        assert.strictEqual(lastInsertedGroupInstance.photo, targetPhoto);
        assert.deepEqual(lastInsertedGroupInstance.photo.toJSON(), targetPhoto.toJSON());

        await Promise.all([thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.deepEqual(await targetGroup.photo, null);
        }));

        let lastPhoto = await MemoryPhoto.update(targetPhoto); // photos group_ids should all be insertedGroup or new cache(?)

        await Promise.all([group, insertedGroup].map(async (targetGroup) => {
          assert.notStrictEqual(await targetGroup.photo, lastPhoto); // in a reactive system, getter gets recalled, otherwise it should be check again(not directly mutated today)
          assert.deepEqual(await targetGroup.photo, targetPhoto);
        }));

        await Promise.all([secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.strictEqual(await targetGroup.photo, null);
        }));

        await Promise.all([thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.deepEqual(await targetGroup.photo, null);
        }));
      });

      // TODO: this needs update eventually
      test("set model with instance fkey (that doesnt exist) to another instance key (that exist) works correctly", async function (assert) {
        let context = generateModels();
        let { MemoryPhoto, MemoryGroup } = context;
        let group = MemoryGroup.build({ name: "First Group" });
        let insertedGroup = await MemoryGroup.insert(group);

        let secondGroup = MemoryGroup.build({ name: "Second Group" });
        let copiedSecondGroup = MemoryGroup.build(secondGroup);

        let thirdInsertedGroup = await MemoryGroup.insert({ name: "Third Group" });

        let { targetPhoto, targetPhotoCopy, insertedTargetPhoto, updatedTargetPhoto } = await setupTargetModels(context, {
          group_id: 999999
        });

        let thirdCopiedGroup = MemoryGroup.build(thirdInsertedGroup);
        let thirdUpdatedGroup = await MemoryGroup.update({ id: thirdCopiedGroup.id, name: "Third Updated Group" });

        assert.strictEqual(await group.photo, null);

        assert.strictEqual(targetPhoto.group_id, 999999);
        assert.strictEqual(await targetPhoto.group, null);
        assert.strictEqual(targetPhotoCopy.group_id, 999999);
        assert.strictEqual(await targetPhotoCopy.group, null);

        await Promise.all([group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.strictEqual(await targetGroup.photo, null);
        }));

        await Promise.all([thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.deepEqual(await targetGroup.photo, null);
        }));

        targetPhoto.group_id = 999998; // NOTE: if they were null now should they be reflectively done?

        assert.strictEqual(await group.photo, null);

        assert.strictEqual(targetPhoto.group_id, 999998);
        assert.strictEqual(await targetPhoto.group, null);

        assert.strictEqual(targetPhotoCopy.group_id, 999999);
        assert.strictEqual(await targetPhotoCopy.group, null);

        await Promise.all([group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.strictEqual(await targetGroup.photo, null);
        }));

        await Promise.all([thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.deepEqual(await targetGroup.photo, null);
        }));
      });
    });
  }
);

// Another approach: target changes should have 3 copies(even ahead of the existing one), change the one in the middle

// OneToOne = Photo.group through group_id
// HasMany = PhotoComment.photo through photo_id

// HOPEFUL Setup
//                                                                        secondGroup
//                                                                        copiedSecondGroup
// firstPhoto                                       group
// firstFetchedPhoto                                insertedGroup

//     secondPhoto
//     copiedPhoto(target)
//     insertedSecondPhoto
//     updatedSecondPhoto

//   insertedThirdPhoto
//   fetchedThirdPhoto

//                                                                       insertedThirdGroup
//                                                                       updatedThirdGroup
//                                                                       copiedThirdGroup

// let context = generateModels();
// let { MemoryPhoto, MemoryGroup } = context;
// let group = MemoryGroup.build({ name: "First Group" });
// let insertedGroup = await MemoryGroup.insert(group);

// let secondGroup = MemoryGroup.build({ name: "Second Group" });
// let copiedSecondGroup = MemoryGroup.build(secondGroup);

// let thirdInsertedGroup = await MemoryGroup.insert({ name: "Third Group" });

// let { targetPhoto, targetPhotoCopy, insertedTargetPhoto, updatedTargetPhoto } = await setupTargetModels(context, {
//   group: thirdInsertedGroup
// });

// let thirdCopiedGroup = MemoryGroup.build(thirdInsertedGroup);
// let thirdUpdatedGroup = await MemoryGroup.update({ id: thirdCopiedGroup.id, name: "Third Updated Group" });

