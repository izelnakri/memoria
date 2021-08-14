import Model, { Column, CreateDateColumn, PrimaryGeneratedColumn } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "./helpers/setup-memoria.js";

module("@memoria/model | $Model.push()", function (hooks) {
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

  function prepare() {
    class User extends Model {}
    class Photo extends Model {
      @PrimaryGeneratedColumn()
      id: number;

      @Column("bool", { default: true })
      is_public: boolean;

      @Column("varchar", { default: "Some default name" })
      name: string;
    }
    class PhotoComment extends Model {
      @PrimaryGeneratedColumn("uuid")
      uuid: string;

      @CreateDateColumn()
      inserted_at: Date;

      @Column("bool", { default: true })
      is_important: boolean;
    }

    return { Photo, PhotoComment, User };
  }

  test("$Model.insert() inserts model records or updates existing records correctly", async function (assert) {
    // const { Photo, PhotoComment } = prepare();
    // await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    // await Promise.all(
    //   PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    // );
    // assert.deepEqual(
    //   (await Photo.findAll()).map((photo) => photo.id),
    //   [1, 2, 3]
    // );
    // await Photo.insert();
    // assert.deepEqual(
    //   (await Photo.findAll()).map((photo) => photo.id),
    //   [1, 2, 3, 4]
    // );
    // await Photo.insert();
    // assert.equal(await Photo.count(), 5);
    // assert.propEqual(await Photo.findAll(), [
    //   {
    //     id: 1,
    //     name: "Ski trip",
    //     is_public: false,
    //   },
    //   {
    //     id: 2,
    //     name: "Family photo",
    //     is_public: true,
    //   },
    //   {
    //     id: 3,
    //     name: "Selfie",
    //     is_public: false,
    //   },
    //   {
    //     id: 4,
    //     is_public: true,
    //     name: "Some default name",
    //   },
    //   {
    //     id: 5,
    //     is_public: true,
    //     name: "Some default name",
    //   },
    // ]);
    // const initialCommentUUIDs = (await PhotoComment.findAll()).map(
    //   (photoComment) => photoComment.uuid
    // );
    // assert.deepEqual(initialCommentUUIDs, [
    //   "499ec646-493f-4eea-b92e-e383d94182f4",
    //   "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
    //   "d351963d-e725-4092-a37c-1ca1823b57d3",
    //   "374c7f4a-85d6-429a-bf2a-0719525f5f29",
    // ]);
    // await PhotoComment.insert();
    // const allPhotoComments = await PhotoComment.findAll();
    // const lastPhotoComment = allPhotoComments[allPhotoComments.length - 1];
    // assert.equal(await PhotoComment.count(), 5);
    // assert.ok(!initialCommentUUIDs[lastPhotoComment.uuid], "inserted comment has a unique uuid");
  });

  test("$Model.push(model) sets non-embed relationships correctly", async function (assert) {});

  test("$Model.push(model) sets embed relationships many layers correctly", async function (assert) {});

  test("$Model.push(model) sets null relationships correctly", async function (assert) {});
});
