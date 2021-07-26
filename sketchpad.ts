import Model, { PrimaryGeneratedColumn, Column, CreateDateColumn } from "@memoria/model";
import { SQLAdapter } from "@memoria/adapters"; // NOTE: this has to come AFTER @memoria/model

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

// let a = new User();

// console.log(a);

try {
  let user = await User.insert({ first_name: "Izel", last_name: "Nakri" });
  console.log("User inserted");
  console.log(user);
} catch (error) {
  console.log("error:");
  console.log(error);
}
