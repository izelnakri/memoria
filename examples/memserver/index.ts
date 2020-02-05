import Memserver from "memserver";
import initializer from "./initializer";
import routes from "./routes";

const MemServer = new Memserver({
  initializer: initializer,
  routes: routes
});

export default MemServer;
