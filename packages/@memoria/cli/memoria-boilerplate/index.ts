import Memoria from "@memoria/server";
import initializer from "./initializer";
import routes from "./routes";

export default new Memoria({
  initializer: initializer,
  routes: routes,
});
