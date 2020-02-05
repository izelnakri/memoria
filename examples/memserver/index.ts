import Memserver from "memserver/server";
import initializer from "./initializer";
import routes from "./routes";

const MemServer = new Memserver({
  globalizeModels: true,
  initializer: initializer,
  routes: routes
});

export default MemServer;
