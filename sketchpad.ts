import Model, {
  Config,
  PrimaryGeneratedColumn,
  Generated,
  PrimaryColumn,
  Column,
  BelongsTo,
  HasMany,
  CreateDateColumn,
} from "@memoria/model";
// import { SQLAdapter } from "@memoria/adapters"; // NOTE: this has to come AFTER @memoria/model import

// class CustomSQLAdapter extends SQLAdapter {
//   static logging = false;
// }

class Photo extends Model {
  // static Adapter = CustomSQLAdapter;

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  href: string;

  @Column("bool")
  is_public: boolean;

  @BelongsTo((type) => User, (user) => user.photos)
  user: User;
}

class User extends Model {
  // static Adapter = CustomSQLAdapter;

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

  @HasMany((type) => Photo, (photo) => photo.user)
  photos: Photo[];
}

let a = new User();
console.log("new User() output:");
console.log(a);

async function main() {
  try {
    await Config.resetForTests();
    // console.log(Config.Schemas[1].relations);
    let user = await User.insert({ first_name: "Izel", last_name: "Nakri" });
    console.log("User insert:");
    console.log(user.toObject());

    let updatedUser = await User.update({ id: user.id, first_name: "Moris" });

    console.log("User update:");
    console.log(updatedUser.toJSON());

    let savedUser = await User.update({ id: user.id, first_name: "Mo" });
    console.log("User save:");
    console.log(savedUser);

    let foundUser = await User.find(user.id);

    console.log("foundUser:");
    console.log(foundUser);

    console.log("User.count:", await User.count());

    let deletedUser = await User.delete(user);

    console.log("deletedUser:");
    console.log(deletedUser);
    console.log("User.count:", await User.count());

    let insertedUsers = await User.insertAll([
      { first_name: "Yukihiro", last_name: "Matsumoto" },
      { first_name: "Yehuda", last_name: "Katz" },
    ]);
    console.log("insertedUsers:");
    console.log(insertedUsers);

    console.log("User.count:", await User.count());

    let foundUsers = await User.findAll();
    console.log("foundUsers:");
    console.log(foundUsers);

    let changedUsers = await User.updateAll(
      foundUsers.map((foundUser) => {
        foundUser.first_name = "Changed";
        return foundUser;
      })
    );
    console.log("changedUsers:");
    console.log(changedUsers);

    let savedUsers = await User.saveAll(
      foundUsers.map((foundUser) => {
        foundUser.first_name = "Changed2";
        return foundUser;
      })
    );
    console.log("savedUsers:");
    console.log(savedUsers);

    console.log("User.count:", await User.count());

    let allDeletedUsers = await User.deleteAll(changedUsers);
    console.log("allDeletedUsers:");
    console.log(allDeletedUsers);
    console.log("User.count:", await User.count());

    // Relationships
  } catch (error) {
    console.log("error:");
    console.log(error);
  }

  console.log("-------------- THE END ---------------");
}

main();

// TODO: save, saveAll, insertAll, updateAll, deleteAll, resetRecords, push, cache,
