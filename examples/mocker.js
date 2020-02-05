// import Server from "./memserver/index";
// import $ from "$";

import users from "./memserver/fixtures/users";
// window.MyMockSever = Server;

// window.$.getJSON("/users").then((users) => {
users.forEach((user) => {
  let pTag = document.createElement("p");

  document.querySelector(".users").append(`${user.first_name} ${user.last_name}`, pTag);
});
// });
