import users from "./fixtures/users";
import User from "./models/user";

export default async function () {
  User.resetDatabase[
    {
      id: 1,
      firstName: "Izel",
      lastName: "Nakri",
    }
  ];
}
