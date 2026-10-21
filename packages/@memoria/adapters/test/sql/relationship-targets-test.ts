import Model, { BelongsTo, Column, DB, HasMany, PrimaryGeneratedColumn } from "@memoria/model";
import { module, test } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";
import SQLAdapter from "../helpers/sql-adapter.js";

// The SQLAdapter hands relationship targets to TypeORM's decorators, which call whatever function they get.
// A target given as the class itself -- the README's form -- used to reach them unwrapped and throw.
module("@memoria/adapters | SQLAdapter | relationship targets", function (hooks) {
  setupMemoria(hooks);

  function generateModels() {
    class SQLTargetUser extends Model {
      static Adapter = SQLAdapter;

      @PrimaryGeneratedColumn()
      id: number;

      @Column()
      first_name: string;

      // NOTE: a function returning the class, because SQLTargetPhoto is declared below.
      @HasMany(() => SQLTargetPhoto)
      photos;
    }

    class SQLTargetPhoto extends Model {
      static Adapter = SQLAdapter;

      @PrimaryGeneratedColumn()
      id: number;

      @Column("int")
      owner_id: number;

      @BelongsTo(SQLTargetUser)
      owner;
    }

    return { SQLTargetUser, SQLTargetPhoto };
  }

  test("a decorator accepts the related class itself or a function returning it", async function (assert) {
    const { SQLTargetUser, SQLTargetPhoto } = generateModels();
    await DB.resetRecords();

    let user = await SQLTargetUser.insert({ first_name: "Izel" });
    let photo = await SQLTargetPhoto.insert({ owner: user });

    assert.equal(photo.owner_id, user.id);
    assert.deepEqual(
      (await user.photos).map((photo) => photo.id),
      [photo.id],
    );
  });
});
