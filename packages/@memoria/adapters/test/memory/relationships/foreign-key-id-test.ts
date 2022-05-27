import Model, { PrimaryGeneratedColumn, Column, RuntimeError, Serializer, RelationshipPromise } from "@memoria/model";
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
        let insertedTargetModel = await MemoryPhoto.insert(targetPhoto);
        let updatedTargetModel = await MemoryPhoto.update(insertedTargetModel);

        return { targetPhoto, targetPhotoCopy, insertedTargetModel, updatedTargetModel };
      }

      test("setting null for a model with null relationship shouldn't do anything", async function (assert) {
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

        assert.notEqual(group.photo, targetPhoto.group);
        assert.equal(targetPhoto.group_id, null);
        assert.equal(targetPhoto.group, null);

        [group, insertedGroup, secondGroup, copiedSecondGroup, thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup]
          .forEach((targetGroup) => {
            assert.ok(targetGroup.photo instanceof RelationshipPromise);
          });

        targetPhoto.group_id = null;

        await Promise.all([
          group, insertedGroup, secondGroup, copiedSecondGroup, thirdInsertedGroup, thirdCopiedGroup, thirdUpdatedGroup
        ].map(async (targetGroup) => {
          assert.equal(await targetGroup.photo, null);
        }));

        assert.equal(targetPhoto.group_id, null);
        assert.equal(targetPhoto.group, null);
      });

      // test("setting null to instance key(that exists) and then to null works correctly", async function (assert) {

      // });
    });

    // belongsTo from null to instance key(that exists)
    // belongsTo from one instance(that exists) to null
    // belongsTo from one instance(that exists) to another instance key(that exists)
    // belongsTo from one instance(that exists) to another instance key that doesnt exist

    // belongsTo from null to instance key(that doesnt exist)
    // belongsTo from one instance(that doesnt exist) to null
    // belongsTo from one instance(that doesnt exist) to another instance key(that exists)
    // belongsTo from one instance(that doesnt exist) to another instance key(that doesnt exist)
  }
);


// target changes should have 3 copies(even ahead of the existing one), change the one in the middle
// (!!) changing a (null) relationship with null foreign key setting should do anything











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
