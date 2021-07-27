import Model, { PrimaryGeneratedColumn, Column, CreateDateColumn } from "@memoria/model";
import { Entity } from "typeorm";
import { SQLAdapter } from "@memoria/adapters"; // NOTE: this has to come AFTER @memoria/model import

@Entity()
class User extends Model {
  static Adapter = SQLAdapter;

  @PrimaryGeneratedColumn("uuid")
  uuid: string;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @CreateDateColumn()
  created_at: string;
}

let a = new User();
console.log("new User() output:");
console.log(a);

try {
  let user = await User.insert({ first_name: "Izel", last_name: "Nakri" });
  console.log("User insert:");
  console.log(user);

  let updatedUser = await User.update({ uuid: user.uuid, first_name: "Moris" });

  console.log("User update:");
  console.log(updatedUser);

  let foundUser = await User.find(user.uuid);
  let foundUsers = await User.findAll();

  console.log("foundUser:");
  console.log(foundUser);
  console.log("foundUsers:");
  console.log(foundUsers);

  console.log("User.count:", await User.count());

  let deletedUser = await User.delete(user);
  console.log("deletedUser:");
  console.log(deletedUser);
  console.log("User.count:", await User.count());

  let allDeletedUsers = await User.deleteAll(foundUsers);
  console.log("allDeletedUsers:");
  console.log(allDeletedUsers);

  console.log("User.count:", await User.count());
} catch (error) {
  console.log("error:");
  console.log(error);
}
