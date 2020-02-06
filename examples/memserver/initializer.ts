declare global {
  interface Window {
    User: any;
  }
}

import users from "./fixtures/users";
import User from "./models/user";

export default function() {
  window.User = User;
  User.resetDatabase(users);
}
