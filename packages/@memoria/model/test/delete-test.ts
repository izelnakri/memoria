import Model, { PrimaryGeneratedColumn, Column } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "./helpers/setup-memoria.js";

module("@memoria/model | $Model.delete()", function (hooks) {
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
    class User extends Model {
      @PrimaryGeneratedColumn("increment")
      id: number;
    }
    class Photo extends Model {
      @PrimaryGeneratedColumn()
      id: number;

      @Column("varchar")
      name: string;

      @Column()
      href: string;

      @Column("boolean")
      is_public: boolean;
    }
    class PhotoComment extends Model {
      @PrimaryGeneratedColumn("uuid")
      uuid: string;

      @Column()
      content: string;

      @Column("bigint")
      photo_id: number;

      @Column("bigint")
      user_id: number;
    }

    return { User, Photo, PhotoComment };
  }

  test("$Model.delete() can delete existing items", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    const deletedPhoto = await Photo.delete({ id: 2 });
    const deletedComment = await PhotoComment.delete({
      uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
    });

    await PhotoComment.delete({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29" });

    assert.propEqual(deletedPhoto, {
      id: 2,
      name: "Family photo",
      href: "family-photo.jpeg",
      is_public: true,
    });
    assert.propEqual(deletedComment, {
      uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
      content: "What a nice photo!",
      photo_id: 1,
      user_id: 1,
    });
    assert.propEqual(await Photo.findAll(), [
      {
        id: 1,
        name: "Ski trip",
        href: "ski-trip.jpeg",
        is_public: false,
      },
      {
        id: 3,
        name: "Selfie",
        href: "selfie.jpeg",
        is_public: false,
      },
    ]);
    assert.propEqual(await PhotoComment.findAll(), [
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
    ]);
  });

  test("$Model.delete(model) throws when the model primaryKey doesnt exist in the database", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    try {
      await Photo.delete({ id: 1 });
    } catch (error) {
      assert.ok(
        /\[Memoria\] Photo has no records in the database to delete\. Photo\.delete\(\{ id: 1 \}\) failed/.test(
          error.message
        )
      );
    }
    try {
      await PhotoComment.delete({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5111" });
    } catch (error) {
      assert.ok(
        /\[Memoria\] PhotoComment has no records in the database to delete\. PhotoComment\.delete\(\{ uuid: '374c7f4a-85d6-429a-bf2a-0719525f5111' \}\) failed/.test(
          error.message
        )
      );
    }

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    await Photo.delete({ id: 1 });

    try {
      await Photo.delete({ id: 1 });
    } catch (error) {
      assert.ok(
        /\[Memoria\] Could not find Photo with id: 1 to delete\. Photo\.delete\(\{ id: 1 \}\) failed/.test(
          error.message
        )
      );
    }
    try {
      await PhotoComment.delete({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5111" });
    } catch (error) {
      assert.ok(
        /\[Memoria\] Could not find PhotoComment with uuid: 374c7f4a-85d6-429a-bf2a-0719525f5111 to delete\. PhotoComment\.delete\(\{ uuid: '374c7f4a-85d6-429a-bf2a-0719525f5111' \}\) failed/.test(
          error.message
        )
      );
    }
  });

  test("$Model.delete() throws when called without a parameter", async function (assert) {
    const { Photo, PhotoComment } = prepare();

    await Promise.all(PHOTO_FIXTURES.map((photo) => Photo.insert(photo)));
    await Promise.all(
      PHOTO_COMMENT_FIXTURES.map((photoComment) => PhotoComment.insert(photoComment))
    );

    try {
      await Photo.delete();
    } catch (error) {
      assert.ok(
        /\[Memoria\] Photo\.delete\(model\) model object parameter required to delete a model/.test(
          error.message
        )
      );
    }
    try {
      await PhotoComment.delete();
    } catch (error) {
      assert.ok(
        /\[Memoria\] PhotoComment\.delete\(model\) model object parameter required to delete a model/.test(
          error.message
        )
      );
    }
  });
});

// NOTE: $Model.delete(primaryKey) feature ?
