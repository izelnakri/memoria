// A scratch file for trying the API end to end: `npm run sketchpad` runs it from the sources, nothing built.
//
// Records live in memory by default. `npm run sketchpad -- --sql` runs the same models through the
// SQLAdapter instead, against the postgres from `docker compose up -d` (or wherever PGHOST/PGPORT/... point).
import Model, {
  DB,
  PrimaryGeneratedColumn,
  Generated,
  Column,
  BelongsTo,
  HasMany,
  CreateDateColumn,
} from "@memoria/model";
import { MemoryAdapter } from "@memoria/adapters";

const USE_SQL = process.argv.includes("--sql");

// NOTE: imported only when asked for, so the in-memory run never loads typeorm -- the same reason it is a
// separate entry point, @memoria/adapters/sql, rather than part of @memoria/adapters.
const { default: SQLAdapter } = USE_SQL ? await import("@memoria/adapters/sql") : { default: null };

class CustomSQLAdapter extends (SQLAdapter ?? MemoryAdapter) {
  static logging = false;
}

const Adapter = USE_SQL ? CustomSQLAdapter : MemoryAdapter;

class Photo extends Model {
  static Adapter = Adapter;

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  href: string;

  @Column("bool")
  is_public: boolean;

  @Column("int")
  user_id: number;

  // NOTE: a function returning the class, because User is declared below.
  @BelongsTo(() => User)
  user: User;
}

class User extends Model {
  static Adapter = Adapter;

  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @CreateDateColumn()
  created_at: string;

  @Column("int")
  @Generated()
  points: number;

  @HasMany(() => Photo)
  photos: Photo[];
}

console.log(`Adapter: ${Adapter.name}`);
console.log("User.build() output:");
console.table(User.build().toJSON());

try {
  await DB.resetRecords();

  let user = await User.insert({ first_name: "Izel", last_name: "Nakri" });
  console.log("User insert:");
  console.table(user.toObject());

  let updatedUser = await User.update({ id: user.id, first_name: "Moris" });
  console.log("User update:");
  console.table(updatedUser.toJSON());

  let savedUser = await User.save({ id: user.id, first_name: "Mo" });
  console.log("User save:");
  console.table(savedUser.toJSON());

  let foundUser = await User.find(user.id);
  console.log("foundUser:");
  console.table(foundUser.toJSON());

  let photo = await Photo.insert({ name: "Profile", href: "profile.png", is_public: true, user: foundUser });
  console.log("Photo insert, with its user assigned:");
  console.table(photo.toJSON());
  console.log("(await foundUser.photos).length:", (await foundUser.photos).length);

  console.log("User.count:", await User.count());

  await Photo.delete(photo);
  let deletedUser = await User.delete(foundUser);
  console.log("deletedUser:");
  console.table(deletedUser.toJSON());
  console.log("User.count:", await User.count());

  let insertedUsers = await User.insertAll([
    { first_name: "Yukihiro", last_name: "Matsumoto" },
    { first_name: "Yehuda", last_name: "Katz" },
  ]);
  console.log("insertedUsers:");
  console.table(insertedUsers.map((user) => user.toJSON()));
  console.log("User.count:", await User.count());

  let foundUsers = await User.findAll();
  let changedUsers = await User.updateAll(
    foundUsers.map((foundUser) => {
      foundUser.first_name = "Changed";

      return foundUser;
    }),
  );
  console.log("changedUsers:");
  console.table(changedUsers.map((user) => user.toJSON()));

  let savedUsers = await User.saveAll(
    foundUsers.map((foundUser) => {
      foundUser.first_name = "Changed2";

      return foundUser;
    }),
  );
  console.log("savedUsers:");
  console.table(savedUsers.map((user) => user.toJSON()));
  console.log("User.count:", await User.count());

  let allDeletedUsers = await User.deleteAll(savedUsers);
  console.log("allDeletedUsers:");
  console.table(allDeletedUsers.map((user) => user.toJSON()));
  console.log("User.count:", await User.count());
} catch (error) {
  console.log("error:");
  console.log(error);
} finally {
  // NOTE: an open TypeORM DataSource keeps the process alive.
  if (USE_SQL) {
    await (await CustomSQLAdapter.getConnection()).destroy();
  }
}

console.log("-------------- THE END ---------------");
