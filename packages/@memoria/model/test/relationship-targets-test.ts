import Model, { BelongsTo, Column, HasMany, PrimaryGeneratedColumn, RelationshipSchema } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "./helpers/setup-memoria.js";

// Every other relationship test declares models inside generator functions and passes the *generator*
// to the decorator, so `relation.target` was always a plain function and calling it was safe. The
// README's form -- the class itself -- made RelationshipSchema call a class and throw on the first
// insert/build that touched a relationship.
module("@memoria/model | relationship targets", function (hooks) {
  setupMemoria(hooks);

  function generateModels() {
    class User extends Model {
      @PrimaryGeneratedColumn()
      id: number;

      @Column()
      firstName: string;

      // NOTE: a thunk, because Photo is declared below.
      @HasMany(() => Photo)
      photos;
    }

    class Photo extends Model {
      @PrimaryGeneratedColumn()
      id: number;

      @Column("int")
      owner_id: number;

      @BelongsTo(User)
      owner;
    }

    return { User, Photo };
  }

  test("a decorator accepts the related class itself or a function returning it", async function (assert) {
    const { User, Photo } = generateModels();

    let user = await User.insert({ firstName: "Izel" });
    let photo = await Photo.insert({ owner: user });

    assert.equal(photo.owner_id, user.id);
    assert.deepEqual(
      (await user.photos).map((photo) => photo.id),
      [photo.id],
    );
    assert.propEqual(RelationshipSchema.relationshipsSummary, { User: { photos: [Photo] }, Photo: { owner: User } });
  });
});
