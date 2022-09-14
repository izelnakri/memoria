import Model, {
  ManyToMany,
  HasOne,
  ManyToOne,
  HasMany,
  BelongsTo,
  Schema,
  RelationshipSchema,
  PrimaryGeneratedColumn,
  Column,
  Serializer,
} from "@memoria/model";
import { module, test, skip } from "qunitx";
import setupMemoria from "./helpers/setup-memoria.js";
import generateModels from "./helpers/relationship-test-models/index.js";

module("@memoria/model | $Model.relationships", function (hooks) {
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
  const PHOTO_COMMENT_FIXTURES = [
    {
      uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
      content: "What a nice photo!",
      photo_id: 1,
      user_id: 1,
    },
    {
      uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
      content: "I agree",
      photo_id: 1,
      user_id: 2,
    },
    {
      uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
      content: "I was kidding",
      photo_id: 1,
      user_id: 1,
    },
    {
      uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
      content: "Interesting indeed",
      photo_id: 2,
      user_id: 1,
    },
  ];
  const USER_FIXTURES = [
    {
      id: 1,
      first_name: "Izel",
      last_name: "Nakri",
    },
  ];

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
        groups: [Group],
      },
      Group: {
        owner: User,
        users: [User], // through:
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
    ]);
    assert.propEqual(Object.keys(RelationshipSchema.getRelationshipTable(Photo, "HasMany")), ["comments"]);
    assert.propEqual(RelationshipSchema.getRelationshipTable(PhotoComment, "HasMany"), {});
    assert.propEqual(Object.keys(RelationshipSchema.getRelationshipTable(Group, "HasMany")), ["photoComments"]);
  });

  test("can query manyToMany correctly on model class", async function (assert) {
    const { Photo, PhotoComment, Group, User } = generateModels();

    assert.propEqual(Object.keys(RelationshipSchema.getRelationshipTable(User, "ManyToMany")), ["groups"]);
    assert.propEqual(RelationshipSchema.getRelationshipTable(Photo, "ManyToMany"), {});
    assert.propEqual(RelationshipSchema.getRelationshipTable(PhotoComment, "ManyToMany"), {});
    assert.propEqual(Object.keys(RelationshipSchema.getRelationshipTable(Group, "ManyToMany")), ["users"]);
  });
});
