import Server from "./memserver/index";
import $ from "jquery";

window.$ = $;
window.MyMockSever = Server;

window.$.getJSON("/users").then((data) => {
  debugger;
  data.users.forEach((user) => {
    let pTag = document.createElement("p");

    document.querySelector(".users").append(`${user.first_name} ${user.last_name}`, pTag);
  });
});
