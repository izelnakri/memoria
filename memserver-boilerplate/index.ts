import Memserver from "memserver";
import initializer from "./initializer";
import routes from "./routes";
import User from "../models/user";

const MemServer = new Memserver({
  models: [User],
  initializer: initializer,
  routes: routes
});

export default MemServer;
