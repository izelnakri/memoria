import { InstanceDB, RelationshipPromise } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../../helpers/setup-memoria.js";
import setupRESTModels from "../../helpers/models-with-relations/rest/id/index.js";

module("@memoria/adapters | RESTAdapter | Relationships | Foreign key mutation tests(id)", function (hooks) {
  setupMemoria(hooks);

  module("BelongsTo mutations for OneToOne", function () {
    async function setupTargetModels(context, modelOptions = {}) {
      let { RESTPhoto, RESTGroup } = context;

      let targetPhoto = RESTPhoto.build({ name: "Target photo", ...modelOptions });
      let targetPhotoCopy = RESTPhoto.build(targetPhoto);
      let insertedTargetPhoto = await RESTPhoto.insert(targetPhoto);
      let updatedTargetPhoto = await RESTPhoto.update({ id: insertedTargetPhoto.id });

      return { targetPhoto, targetPhotoCopy, insertedTargetPhoto, updatedTargetPhoto };
    }

    test("Set model with null fkey for a model with null fkey shouldn't do anything", async function (assert) {
      let context = setupRESTModels();
      let { RESTPhoto, RESTGroup, Server } = context;

      this.Server = Server;

      let { targetPhoto, targetPhotoCopy } = await setupTargetModels(context);

      let group = RESTGroup.build({ name: "First Group" });
      let insertedGroup = await RESTGroup.insert(group);

      let secondGroup = RESTGroup.build({ name: "Second Group" });
      let copiedSecondGroup = RESTGroup.build(secondGroup);

      let thirdInsertedGroup = await RESTGroup.insert({ name: "Third Group" });
      let thirdCopiedGroup = RESTGroup.build(thirdInsertedGroup);
      let thirdUpdatedGroup = await RESTGroup.update({ id: thirdCopiedGroup.id, name: "Third Updated Group" });

      assert.equal(await group.photo, null);
      assert.equal(targetPhoto.group_id, null);
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

      targetPhoto.group_id = null;

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

      assert.equal(targetPhoto.group_id, null);
      assert.equal(targetPhoto.group, null);
    });

    test("Set model with null fkey to instance key fkey (that exists) works correctly", async function (assert) {
      let context = setupRESTModels();
      let { RESTPhoto, RESTGroup, Server } = context;

      this.Server = Server;

      let group = RESTGroup.build({ name: "First Group" });
      let insertedGroup = await RESTGroup.insert(group);

      let secondGroup = RESTGroup.build({ name: "Second Group" });
      let copiedSecondGroup = RESTGroup.build(secondGroup);

      let thirdInsertedGroup = await RESTGroup.insert({ name: "Third Group" });
      let thirdCopiedGroup = RESTGroup.build(thirdInsertedGroup);
      let thirdUpdatedGroup = await RESTGroup.update({ id: thirdCopiedGroup.id, name: "Third Updated Group" });

      assert.notStrictEqual(thirdCopiedGroup, thirdUpdatedGroup);

      let { targetPhoto, targetPhotoCopy } = await setupTargetModels(context);

      assert.equal(await group.photo, null);
      assert.equal(targetPhoto.group_id, null);
      assert.equal(targetPhotoCopy.group_id, null);
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
      assert.equal(targetPhoto.group, null);

      targetPhoto.group_id = thirdCopiedGroup.id;

      assert.equal(targetPhoto.group_id, thirdCopiedGroup.id);
      assert.strictEqual(targetPhoto.group, thirdUpdatedGroup);
      assert.strictEqual(targetPhoto.group.photo, targetPhoto);
      assert.strictEqual(targetPhoto.group.photo.group, targetPhoto.group);
      assert.equal(targetPhotoCopy.group_id, null);
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

    test("Set model with instance fkey (that exists) to null works correctly", async function (assert) {
      let context = setupRESTModels();
      let { RESTPhoto, MemoryPhoto, RESTGroup, MemoryGroup, Server } = context;

      this.Server = Server;

      let group = RESTGroup.build({ name: "First Group" });
      let insertedGroup = await RESTGroup.insert(group.toJSON());

      let secondGroup = RESTGroup.build({ name: "Second Group" });
      let copiedSecondGroup = RESTGroup.build(secondGroup);

      let thirdInsertedGroup = await RESTGroup.insert({ name: "Third Group" });

      let { targetPhoto, targetPhotoCopy, insertedTargetPhoto, updatedTargetPhoto } = await setupTargetModels(context, {
        group: thirdInsertedGroup,
      });

      let thirdCopiedGroup = RESTGroup.build(thirdInsertedGroup);
      let thirdUpdatedGroup = await RESTGroup.update({ id: thirdCopiedGroup.id, name: "Third Updated Group" });

      assert.equal(await group.photo, null);

      assert.equal(targetPhoto.group_id, thirdInsertedGroup.id);
      assert.strictEqual(targetPhoto.group, thirdUpdatedGroup);

      assert.strictEqual(targetPhoto.group.photo, updatedTargetPhoto);

      assert.equal(targetPhotoCopy.group_id, thirdUpdatedGroup.id);
      assert.strictEqual(targetPhotoCopy.group, thirdUpdatedGroup);

      await Promise.all(
        [group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        })
      );

      await Promise.all(
        [thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (thirdGroup) => {
          assert.deepEqual(await thirdGroup.photo, updatedTargetPhoto);
        })
      );

      targetPhoto.group_id = null;

      assert.equal(targetPhoto.group_id, null);
      assert.equal(targetPhoto.group, null);
      assert.equal(targetPhotoCopy.group_id, thirdUpdatedGroup.id);
      assert.strictEqual(targetPhotoCopy.group, thirdUpdatedGroup);

      await Promise.all(
        [group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        })
      );

      await Promise.all(
        [thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (thirdGroup) => {
          assert.strictEqual(thirdGroup.photo, updatedTargetPhoto);
        })
      );

      assert.equal(updatedTargetPhoto.group_id, thirdUpdatedGroup.id);
      assert.strictEqual(updatedTargetPhoto.group, thirdUpdatedGroup);

      updatedTargetPhoto.group_id = null;

      assert.equal(updatedTargetPhoto.group_id, null);
      assert.equal(updatedTargetPhoto.group, null);

      await Promise.all(
        [thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (thirdGroup) => {
          assert.deepEqual(thirdGroup.photo.toJSON(), targetPhotoCopy.toJSON());
        })
      );

      let cachedTargetPhoto = RESTPhoto.Cache.get(updatedTargetPhoto.id);
      Array.from(InstanceDB.getReferences(updatedTargetPhoto)).forEach((targetPhoto) => {
        if (targetPhoto !== cachedTargetPhoto) {
          targetPhoto.group_id = null;
        }
      });

      assert.equal(InstanceDB.getReferences(updatedTargetPhoto).size, 4);
      await Promise.all(
        [thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (thirdGroup) => {
          assert.notStrictEqual(thirdGroup.photo, cachedTargetPhoto);

          let photo = await thirdGroup.photo;

          assert.ok(InstanceDB.getReferences(updatedTargetPhoto).size > 4);
          assert.deepEqual(photo.toJSON(), cachedTargetPhoto.toJSON()); // group_id should not be null

          [cachedTargetPhoto, targetPhoto, targetPhotoCopy, insertedTargetPhoto, updatedTargetPhoto].forEach(
            (targetPhoto) => {
              assert.notStrictEqual(photo, targetPhoto);
            }
          );
        })
      );
    });

    test("Set model with instance fkey (that exists) to another instance key (that exists) works correctly", async function (assert) {
      let context = setupRESTModels();
      let { RESTPhoto, RESTGroup, Server } = context;

      this.Server = Server;

      let group = RESTGroup.build({ name: "First Group" });
      let insertedGroup = await RESTGroup.insert(group);

      let secondGroup = RESTGroup.build({ name: "Second Group" });
      let copiedSecondGroup = RESTGroup.build(secondGroup);

      let thirdInsertedGroup = await RESTGroup.insert({ name: "Third Group" });

      let { targetPhoto, targetPhotoCopy, insertedTargetPhoto, updatedTargetPhoto } = await setupTargetModels(context, {
        group: thirdInsertedGroup,
      });

      let thirdCopiedGroup = RESTGroup.build(thirdInsertedGroup);
      let thirdUpdatedGroup = await RESTGroup.update({ id: thirdCopiedGroup.id, name: "Third Updated Group" });

      assert.equal(await group.photo, null);

      assert.equal(targetPhoto.group_id, thirdInsertedGroup.id);
      assert.strictEqual(targetPhoto.group, thirdUpdatedGroup);
      assert.equal(targetPhotoCopy.group_id, thirdUpdatedGroup.id);
      assert.strictEqual(targetPhotoCopy.group, thirdUpdatedGroup);

      await Promise.all(
        [group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.strictEqual(await targetGroup.photo, null);
        })
      );

      await Promise.all(
        [thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.strictEqual(targetGroup.photo, updatedTargetPhoto);
        })
      );

      targetPhoto.group_id = insertedGroup.id;

      assert.equal(targetPhoto.group_id, insertedGroup.id);
      assert.strictEqual(targetPhoto.group, insertedGroup);

      assert.strictEqual(targetPhoto.group.photo, targetPhoto);
      assert.strictEqual(targetPhoto.group.photo.group, targetPhoto.group);

      assert.equal(targetPhotoCopy.group_id, thirdUpdatedGroup.id);
      assert.strictEqual(targetPhotoCopy.group, thirdUpdatedGroup);
      assert.equal(updatedTargetPhoto.group_id, thirdUpdatedGroup.id);
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
          assert.strictEqual(targetGroup.photo, updatedTargetPhoto);
        })
      );

      let lastPhoto = await RESTPhoto.update(targetPhoto);

      await Promise.all(
        [group, insertedGroup].map(async (targetGroup) => {
          assert.strictEqual(targetGroup.photo, lastPhoto);
        })
      );

      await Promise.all(
        [thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        })
      );
    });

    test("Set model with instance fkey (that exists) to another instance key (that doesnt exist) works correctly", async function (assert) {
      let context = setupRESTModels();
      let { RESTPhoto, RESTGroup, Server } = context;

      this.Server = Server;

      let group = RESTGroup.build({ name: "First Group" });
      let insertedGroup = await RESTGroup.insert(group);

      let secondGroup = RESTGroup.build({ name: "Second Group" });
      let copiedSecondGroup = RESTGroup.build(secondGroup);

      let thirdInsertedGroup = await RESTGroup.insert({ name: "Third Group" });

      let { targetPhoto, targetPhotoCopy, insertedTargetPhoto, updatedTargetPhoto } = await setupTargetModels(context, {
        group: thirdInsertedGroup,
      });

      let thirdCopiedGroup = RESTGroup.build(thirdInsertedGroup);
      let thirdUpdatedGroup = await RESTGroup.update({ id: thirdCopiedGroup.id, name: "Third Updated Group" });

      assert.equal(await group.photo, null);

      assert.equal(targetPhoto.group_id, thirdInsertedGroup.id);
      assert.strictEqual(targetPhoto.group, thirdUpdatedGroup);
      assert.equal(targetPhotoCopy.group_id, thirdUpdatedGroup.id);
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

      targetPhoto.group_id = 999999;

      assert.equal(targetPhoto.group_id, 999999);
      assert.ok(targetPhoto.group instanceof RelationshipPromise);
      assert.equal(await targetPhoto.group, null);
      assert.equal(targetPhotoCopy.group_id, thirdUpdatedGroup.id);
      assert.strictEqual(targetPhotoCopy.group, thirdUpdatedGroup);
      assert.equal(updatedTargetPhoto.group_id, thirdUpdatedGroup.id);
      assert.strictEqual(updatedTargetPhoto.group, thirdUpdatedGroup);

      await Promise.all(
        [group, insertedGroup, secondGroup, copiedSecondGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        })
      );

      await Promise.all(
        [thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.strictEqual(targetGroup.photo, updatedTargetPhoto);
        })
      );

      assert.ok(targetPhoto.group instanceof RelationshipPromise);
      assert.equal(await targetPhoto.group, null);
      assert.equal(targetPhoto.group_id, 999999);

      let mockGroup = RESTGroup.build({ id: 999999, name: "Mock Group" });

      assert.equal(await targetPhoto.group, null);
      assert.equal(targetPhoto.group_id, 999999);

      let insertedMockGroup = await RESTGroup.insert(mockGroup);

      assert.strictEqual(targetPhoto.group, insertedMockGroup);
      assert.equal(targetPhoto.group_id, 999999);
    });

    test("Set model with instance fkey (that doesnt exist) to null works", async function (assert) {
      let context = setupRESTModels();
      let { RESTPhoto, RESTGroup, Server } = context;

      this.Server = Server;

      let group = RESTGroup.build({ name: "First Group" });
      let insertedGroup = await RESTGroup.insert(group);

      let secondGroup = RESTGroup.build({ name: "Second Group" });
      let copiedSecondGroup = RESTGroup.build(secondGroup);

      let thirdInsertedGroup = await RESTGroup.insert({ name: "Third Group" });

      let { targetPhoto, targetPhotoCopy, insertedTargetPhoto, updatedTargetPhoto } = await setupTargetModels(context, {
        group_id: 999999,
      });

      assert.equal(targetPhoto.group_id, 999999);
      assert.equal(await targetPhoto.group, null);

      targetPhoto.group_id = null;

      await Promise.all(
        [group, insertedGroup, secondGroup, copiedSecondGroup, thirdInsertedGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        })
      );

      assert.equal(targetPhoto.group_id, null);
      assert.equal(targetPhoto.group, null);
    });

    test("Set model with instance fkey (that doesnt exist) to another instance key (that exist) works correctly", async function (assert) {
      let context = setupRESTModels();
      let { RESTPhoto, RESTGroup, Server } = context;

      this.Server = Server;

      let group = RESTGroup.build({ name: "First Group" });
      let insertedGroup = await RESTGroup.insert(group);

      let secondGroup = RESTGroup.build({ name: "Second Group" });
      let copiedSecondGroup = RESTGroup.build(secondGroup);

      let thirdInsertedGroup = await RESTGroup.insert({ name: "Third Group" });

      let { targetPhoto, targetPhotoCopy, insertedTargetPhoto, updatedTargetPhoto } = await setupTargetModels(context, {
        group_id: 999999,
      });

      let thirdCopiedGroup = RESTGroup.build(thirdInsertedGroup);
      let thirdUpdatedGroup = await RESTGroup.update({ id: thirdCopiedGroup.id, name: "Third Updated Group" });

      assert.equal(await group.photo, null);

      assert.equal(targetPhoto.group_id, 999999);
      assert.equal(await targetPhoto.group, null);
      assert.equal(targetPhotoCopy.group_id, 999999);
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

      targetPhoto.group_id = insertedGroup.id;

      assert.equal(targetPhoto.group_id, insertedGroup.id);
      assert.strictEqual(targetPhoto.group, insertedGroup);
      assert.strictEqual(insertedGroup.photo, targetPhoto);
      assert.equal(targetPhotoCopy.group_id, 999999);
      assert.equal(await targetPhotoCopy.group, null);
      assert.equal(updatedTargetPhoto.group_id, 999999);
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

      let cachedInsertedPhoto = RESTPhoto.Cache.get(insertedGroup.id);
      let lastInsertedGroupInstance = Array.from(InstanceDB.getReferences(insertedGroup)).pop();

      assert.notStrictEqual(lastInsertedGroupInstance, cachedInsertedPhoto);
      assert.strictEqual(lastInsertedGroupInstance.photo, targetPhoto);

      await Promise.all(
        [thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        })
      );

      let lastPhoto = await RESTPhoto.update(targetPhoto);

      await Promise.all(
        [group, insertedGroup].map(async (targetGroup) => {
          assert.strictEqual(targetGroup.photo, lastPhoto);
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

    test("Set model with instance fkey (that doesnt exist) to another instance key (that doesnt exist) works correctly", async function (assert) {
      let context = setupRESTModels();
      let { RESTPhoto, RESTGroup, Server } = context;

      this.Server = Server;

      let group = RESTGroup.build({ name: "First Group" });
      let insertedGroup = await RESTGroup.insert(group);

      let secondGroup = RESTGroup.build({ name: "Second Group" });
      let copiedSecondGroup = RESTGroup.build(secondGroup);

      let thirdInsertedGroup = await RESTGroup.insert({ name: "Third Group" });

      let { targetPhoto, targetPhotoCopy, insertedTargetPhoto, updatedTargetPhoto } = await setupTargetModels(context, {
        group_id: 999999,
      });

      let thirdCopiedGroup = RESTGroup.build(thirdInsertedGroup);
      let thirdUpdatedGroup = await RESTGroup.update({ id: thirdCopiedGroup.id, name: "Third Updated Group" });

      assert.equal(await group.photo, null);

      assert.equal(targetPhoto.group_id, 999999);
      assert.equal(await targetPhoto.group, null);
      assert.equal(targetPhotoCopy.group_id, 999999);
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

      targetPhoto.group_id = 999998;

      assert.equal(await group.photo, null);

      assert.equal(targetPhoto.group_id, 999998);
      assert.equal(await targetPhoto.group, null);

      assert.equal(targetPhotoCopy.group_id, 999999);
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
