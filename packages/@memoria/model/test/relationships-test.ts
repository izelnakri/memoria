import { RelationshipSchema, HasManyArray } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "./helpers/setup-memoria.js";
import generateModels from "./helpers/relationship-test-models/index.js";

module("@memoria/model | $Model.relationships", function (hooks) {
  setupMemoria(hooks);

  test("relationships get registered correctly on Schema", async function (assert) {
    const { Photo, PhotoComment, Group, User } = generateModels();

    assert.propEqual(RelationshipSchema.relationshipsSummary, {
      Photo: {
        comments: [PhotoComment],
        owner: User,
        group: Group,
      },
      PhotoComment: {
        photo: Photo,
        user: User,
      },
      User: {
        photos: [Photo],
        photoComments: [PhotoComment],
        ownedGroups: [Group],
        // groups: [Group],
      },
      Group: {
        owner: User,
        // users: [User], // through:
        photo: Photo,
        photoComments: [PhotoComment],
      },
    });
  });

  test("can query hasOne relationships correctly on model class", async function (assert) {
    const { Photo, PhotoComment, Group, User } = generateModels();

    assert.propEqual(RelationshipSchema.getRelationshipTable(User, "OneToOne"), {});
    assert.propEqual(RelationshipSchema.getRelationshipTable(Photo, "OneToOne"), {});
    assert.propEqual(RelationshipSchema.getRelationshipTable(PhotoComment, "OneToOne"), {});
    assert.propEqual(Object.keys(RelationshipSchema.getRelationshipTable(Group, "OneToOne")), ["photo"]);
  });

  test("can query belongsTo relationships correctly on model class", async function (assert) {
    const { Photo, PhotoComment, Group, User } = generateModels();

    assert.propEqual(RelationshipSchema.getRelationshipTable(User, "BelongsTo"), {});
    assert.propEqual(Object.keys(RelationshipSchema.getRelationshipTable(Photo, "BelongsTo")), ["owner", "group"]);
    assert.propEqual(Object.keys(RelationshipSchema.getRelationshipTable(PhotoComment, "BelongsTo")), [
      "user",
      "photo",
    ]);
    assert.propEqual(Object.keys(RelationshipSchema.getRelationshipTable(Group, "BelongsTo")), ["owner"]);
  });

  test("can query hasMany relationships correctly on model class", async function (assert) {
    const { Photo, PhotoComment, Group, User } = generateModels();

    assert.propEqual(Object.keys(RelationshipSchema.getRelationshipTable(User, "HasMany")), [
      "photos",
      "photoComments",
      "ownedGroups"
    ]);
    assert.propEqual(Object.keys(RelationshipSchema.getRelationshipTable(Photo, "HasMany")), ["comments"]);
    assert.propEqual(RelationshipSchema.getRelationshipTable(PhotoComment, "HasMany"), {});
    assert.propEqual(Object.keys(RelationshipSchema.getRelationshipTable(Group, "HasMany")), ["photoComments"]);
  });

  // test("can query manyToMany correctly on model class", async function (assert) {
  //   const { Photo, PhotoComment, Group, User } = generateModels();

  //   assert.propEqual(Object.keys(RelationshipSchema.getRelationshipTable(User, "ManyToMany")), ["groups"]);
  //   assert.propEqual(RelationshipSchema.getRelationshipTable(Photo, "ManyToMany"), {});
  //   assert.propEqual(RelationshipSchema.getRelationshipTable(PhotoComment, "ManyToMany"), {});
  //   assert.propEqual(Object.keys(RelationshipSchema.getRelationshipTable(Group, "ManyToMany")), ["users"]);
  // });

  module("HasMany relationships", function (hooks) {
    test("new model can be built and its hasMany relationship can be mutated", async function (assert) {
      "use strict";

      let { Photo, User } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let user = User.build({ first_name: "Izel", last_name: "Nakri" });
      let secondPhoto = Photo.build({ name: "Second photo" });
      let thirdPhoto = Photo.build({ name: "Third photo" });
      let fourthPhoto = Photo.build({ name: "Fourth photo" });

      user.photos = [];

      assert.deepEqual(user.photos, []);

      assert.strictEqual(await firstPhoto.owner, null);
      assert.strictEqual(await fourthPhoto.owner, null);

      user.photos[0] = firstPhoto;

      assert.deepEqual(user.photos, [firstPhoto]);
      assert.strictEqual(firstPhoto.owner, user);

      user.photos.push(secondPhoto);

      assert.deepEqual(user.photos, [firstPhoto, secondPhoto]);
      assert.strictEqual(firstPhoto.owner, user);
      assert.strictEqual(secondPhoto.owner, user);

      user.photos[0] = thirdPhoto;

      assert.deepEqual(user.photos, [thirdPhoto, secondPhoto]);
      assert.strictEqual(firstPhoto.owner, null);
      assert.strictEqual(secondPhoto.owner, user);
      assert.strictEqual(thirdPhoto.owner, user);

      user.photos[2] = fourthPhoto;

      assert.deepEqual(user.photos, [thirdPhoto, secondPhoto, fourthPhoto]);
      assert.strictEqual(firstPhoto.owner, null);
      assert.strictEqual(secondPhoto.owner, user);
      assert.strictEqual(thirdPhoto.owner, user);
      assert.strictEqual(fourthPhoto.owner, user);
    });

    test("new model can be built with hasMany array relationship and can be mutated", async function (assert) {
      "use strict";

      let { Photo, User } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ name: "Second photo" });
      let thirdPhoto = Photo.build({ name: "Third photo" });
      let fourthPhoto = Photo.build({ name: "Fourth photo" });
      let user = User.build({ id: 22, first_name: "Izel", last_name: "Nakri", photos: [firstPhoto, secondPhoto] });

      assert.deepEqual(user.photos, [firstPhoto, secondPhoto]);
      assert.true(user.photos instanceof HasManyArray);
      assert.strictEqual(firstPhoto.owner, user);
      assert.strictEqual(secondPhoto.owner, user);
      assert.strictEqual(fourthPhoto.owner, null);
      assert.equal(firstPhoto.owner_id, user.id);
      assert.equal(secondPhoto.owner_id, user.id);

      user.photos[0] = fourthPhoto;

      assert.deepEqual(user.photos, [fourthPhoto, secondPhoto]);
      assert.strictEqual(firstPhoto.owner, null);
      assert.strictEqual(secondPhoto.owner, user);
      assert.strictEqual(fourthPhoto.owner, user);
      assert.strictEqual(firstPhoto.owner_id, null);
      assert.equal(secondPhoto.owner_id, user.id);
      assert.equal(thirdPhoto.owner_id, null);
      assert.equal(fourthPhoto.owner_id, user.id);

      user.photos[2] = thirdPhoto;

      assert.deepEqual(user.photos, [fourthPhoto, secondPhoto, thirdPhoto]);
      assert.strictEqual(secondPhoto.owner, user);
      assert.equal(secondPhoto.owner_id, user.id);
      assert.strictEqual(thirdPhoto.owner, user);
      assert.equal(thirdPhoto.owner_id, user.id);

      user.photos[0] = firstPhoto;
      user.photos.push(fourthPhoto);

      assert.deepEqual(user.photos, [firstPhoto, secondPhoto, thirdPhoto, fourthPhoto]);
      assert.strictEqual(firstPhoto.owner, user);
      assert.strictEqual(secondPhoto.owner, user);
      assert.strictEqual(thirdPhoto.owner, user);
      assert.strictEqual(fourthPhoto.owner, user);
      assert.strictEqual(firstPhoto.owner_id, user.id);
      assert.strictEqual(secondPhoto.owner_id, user.id);
      assert.strictEqual(thirdPhoto.owner_id, user.id);
      assert.strictEqual(fourthPhoto.owner_id, user.id);
    });

    test("new model can be built with hasMany relationship and that array can be replaced with new array assignment", async function (assert) {
      "use strict";

      let { Photo, User } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ name: "Second photo" });
      let thirdPhoto = Photo.build({ name: "Third photo" });
      let fourthPhoto = Photo.build({ name: "Fourth photo" });
      let user = User.build({ id: 22, first_name: "Izel", last_name: "Nakri", photos: [firstPhoto, secondPhoto] });

      assert.deepEqual(user.photos, [firstPhoto, secondPhoto]);

      user.photos = [thirdPhoto, fourthPhoto];

      assert.deepEqual(user.photos, [thirdPhoto, fourthPhoto]);
      assert.strictEqual(firstPhoto.owner, null);
      assert.strictEqual(secondPhoto.owner, null);
      assert.strictEqual(thirdPhoto.owner, user);
      assert.strictEqual(fourthPhoto.owner, user);
      assert.strictEqual(firstPhoto.owner_id, null);
      assert.strictEqual(secondPhoto.owner_id, null);
      assert.strictEqual(thirdPhoto.owner_id, user.id);
      assert.strictEqual(fourthPhoto.owner_id, user.id);

      user.photos = [];

      assert.deepEqual(user.photos, []);
      assert.strictEqual(firstPhoto.owner, null);
      assert.strictEqual(thirdPhoto.owner, null);
      assert.strictEqual(fourthPhoto.owner, null);

      user.photos.push(firstPhoto);
      user.photos[1] = secondPhoto;

      assert.deepEqual(user.photos, [firstPhoto, secondPhoto]);
      assert.strictEqual(firstPhoto.owner, user);
      assert.strictEqual(secondPhoto.owner, user);
      assert.strictEqual(thirdPhoto.owner, null);
      assert.strictEqual(fourthPhoto.owner, null);
      assert.strictEqual(firstPhoto.owner_id, user.id);
      assert.strictEqual(secondPhoto.owner_id, user.id);
      assert.strictEqual(thirdPhoto.owner_id, null);
      assert.strictEqual(fourthPhoto.owner_id, null);
    });

    test("new model build should throw when referenced belongsTo models are invalid values", async function (assert) {
      let { Photo, User } = generateModels();

      class SomeClass {}

      let firstPhoto = Photo.build({ name: "First photo" });
      let invalidValuesArray = [true, 1, "a", 100, {}, SomeClass, new SomeClass()];

      invalidValuesArray.forEach((invalidValue) => {
        try {
          User.build({ id: 22, first_name: "Izel", last_name: "Nakri", photos: [firstPhoto, invalidValue] });
        } catch (error) {
          assert.equal(error.message, "HasManyArray cannot have non memoria Model instance inside!");
        }
      });
    });

    test("model hasMany assignment should throw when referenced belongsTo models is invalid type", async function (assert) {
      "use strict";

      let { Photo, User, Group } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let group = Group.build();
      let user = User.build({ id: 22, first_name: "Izel", last_name: "Nakri" });

      try {
        user.photos = [group];
      } catch (error) {
        assert.equal(
          error.message,
          "HasManyArray cannot be instantiated or added with model types different than one another!"
        );
      }

      class Something {}

      try {
        user.photos = [new Something()];
      } catch (error) {
        assert.equal(error.message, "HasManyArray cannot have non memoria Model instance inside!");
      }

      assert.ok(user.photos instanceof Promise);

      user.photos = [];

      assert.deepEqual(user.photos, []);

      try {
        user.photos[0] = group;
      } catch (error) {
        assert.equal(error.message, "This HasManyArray accepts Photo instances, you tried to assign Group instance!");
      }

      assert.deepEqual(user.photos, []);

      try {
        user.photos.push(group);
      } catch (error) {
        assert.equal(error.message, "This HasManyArray accepts Photo instances, you tried to assign Group instance!");
      }

      user.photos.push(firstPhoto);

      assert.deepEqual(user.photos, [firstPhoto]);

      try {
        user.photos.push(new Something());
      } catch (error) {
        assert.equal(
          error.message,
          "HasManyArray accepts memoria Models or falsy values for assignment, not [object Object]"
        );
      }

      assert.deepEqual(user.photos, [firstPhoto]);
    });

    test("model hasMany assignment should throw when referenced belongsTo models isnt in relationship cache", function (assert) {
      "use strict";

      assert.expect(7);

      let { Photo, User } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let user = User.build({ id: 22, first_name: "Izel", last_name: "Nakri" });

      try {
        user.photos[0] = firstPhoto;
      } catch (error) {
        assert.equal(error.name, "TypeError");
        assert.equal(error.message, "Cannot add property 0, object is not extensible");
      }

      assert.notOk("0" in user.photos);
      assert.ok(user.photos instanceof Promise);

      try {
        user.photos.push(firstPhoto);
      } catch (error) {
        assert.equal(error.name, "TypeError");
        assert.equal(error.message, "user.photos.push is not a function");
      }

      assert.ok(user.photos instanceof Promise);
    });

    test("new model can be built with hasMany relationship and then setting it to null clears the array", async function (assert) {
      "use strict";

      let { Photo, User } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ name: "Second photo" });
      let user = User.build({ id: 22, first_name: "Izel", last_name: "Nakri", photos: [firstPhoto, secondPhoto] });

      assert.deepEqual(user.photos, [firstPhoto, secondPhoto]);
      assert.strictEqual(firstPhoto.owner, user);
      assert.equal(firstPhoto.owner_id, user.id);
      assert.strictEqual(secondPhoto.owner, user);
      assert.equal(secondPhoto.owner_id, user.id);

      user.photos = null;

      assert.deepEqual(user.photos, []);
      assert.ok(user.photos instanceof HasManyArray);
      assert.equal(firstPhoto.owner, null);
      assert.equal(firstPhoto.owner_id, null);
      assert.equal(secondPhoto.owner, null);
      assert.equal(secondPhoto.owner_id, null);
    });

    test("new model can be built with hasMany relationship and then setting it to undefined removes the relationship", async function (assert) {
      "use strict";

      let { Photo, User } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ name: "Second photo" });
      let thirdPhoto = Photo.build({ name: "Third photo" });
      let user = User.build({
        id: 22,
        first_name: "Izel",
        last_name: "Nakri",
        photos: [firstPhoto, secondPhoto, thirdPhoto],
      });

      assert.deepEqual(user.photos, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.strictEqual(firstPhoto.owner, user);
      assert.equal(firstPhoto.owner_id, user.id);
      assert.strictEqual(secondPhoto.owner, user);
      assert.equal(secondPhoto.owner_id, user.id);

      user.photos[1] = undefined;

      assert.deepEqual(user.photos, [firstPhoto, thirdPhoto]);
      assert.strictEqual(firstPhoto.owner, user);
      assert.equal(firstPhoto.owner_id, user.id);
      assert.equal(secondPhoto.owner, null);
      assert.equal(secondPhoto.owner_id, null);

      user.photos = undefined;

      assert.notDeepEqual(user.photos, []);
      assert.notOk(user.photos instanceof HasManyArray);
      assert.ok(user.photos instanceof Promise);
      assert.equal(firstPhoto.owner, null);
      assert.equal(firstPhoto.owner_id, null);
      assert.equal(secondPhoto.owner, null);
      assert.equal(secondPhoto.owner_id, null);
    });

    test("new model can be built with hasMany relationship and then delete to property does nothing", async function (assert) {
      "use strict";

      let { Photo, User } = generateModels();

      let firstPhoto = Photo.build({ name: "First photo" });
      let secondPhoto = Photo.build({ name: "Second photo" });
      let thirdPhoto = Photo.build({ name: "Third photo" });
      let user = User.build({
        id: 22,
        first_name: "Izel",
        last_name: "Nakri",
        photos: [firstPhoto, secondPhoto, thirdPhoto],
      });

      assert.deepEqual(user.photos, [firstPhoto, secondPhoto, thirdPhoto]);
      assert.strictEqual(firstPhoto.owner, user);
      assert.equal(firstPhoto.owner_id, user.id);
      assert.strictEqual(secondPhoto.owner, user);
      assert.equal(secondPhoto.owner_id, user.id);

      delete user.photos[1];

      assert.deepEqual(user.photos, [firstPhoto, thirdPhoto]);
      assert.strictEqual(firstPhoto.owner, user);
      assert.equal(firstPhoto.owner_id, user.id);
      assert.equal(secondPhoto.owner, null);
      assert.equal(secondPhoto.owner_id, null);

      try {
        delete user.photos;
      } catch (error) {
        assert.equal(error.message, "Cannot delete property 'photos' of #<User>");
      }

      assert.deepEqual(user.photos, [firstPhoto, thirdPhoto]);
      assert.ok(user.photos instanceof HasManyArray);
      assert.strictEqual(firstPhoto.owner, user);
      assert.equal(firstPhoto.owner_id, user.id);
      assert.equal(secondPhoto.owner, null);
      assert.equal(secondPhoto.owner_id, null);
    });
  });
});
