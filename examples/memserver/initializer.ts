import users from "./fixtures/users";
import User from "./models/user";

export default async function() {
  // window.User = User;
  User.resetDatabase(users);
}
