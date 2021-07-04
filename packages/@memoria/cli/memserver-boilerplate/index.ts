import Memserver from "@memserver/server";
import initializer from "./initializer";
import routes from "./routes";

export default new Memserver({
  initializer: initializer,
  routes: routes,
});
