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

    assert.propEqual(User.hasOneRelationships, {});
    assert.propEqual(Photo.hasOneRelationships, {});
    assert.propEqual(PhotoComment.hasOneRelationships, {});
    assert.propEqual(Group.hasOneRelationships, { photo: Photo });
  });

  test("can query belongsTo relationships correctly on model class", async function (assert) {
    const { Photo, PhotoComment, Group, User } = generateModels();

    assert.propEqual(User.belongsToRelationships, {});
    assert.propEqual(Photo.belongsToRelationships, { owner: User, group: Group });
    assert.propEqual(PhotoComment.belongsToRelationships, { user: User, photo: Photo });
    assert.propEqual(Group.belongsToRelationships, { owner: User });
  });

  test("can query hasMany relationships correctly on model class", async function (assert) {
    const { Photo, PhotoComment, Group, User } = generateModels();

    assert.propEqual(User.hasManyRelationships, { photos: Photo, photoComments: PhotoComment });
    assert.propEqual(Photo.hasManyRelationships, { comments: PhotoComment });
    assert.propEqual(PhotoComment.hasManyRelationships, {});
    assert.propEqual(Group.hasManyRelationships, { photoComments: PhotoComment });
  });

  test("can query manyToMany correctly on model class", async function (assert) {
    const { Photo, PhotoComment, Group, User } = generateModels();

    assert.propEqual(User.manyToManyRelationships, { groups: Group });
    assert.propEqual(Photo.manyToManyRelationships, {});
    assert.propEqual(PhotoComment.manyToManyRelationships, {});
    assert.propEqual(Group.manyToManyRelationships, { users: User });
  });
});
