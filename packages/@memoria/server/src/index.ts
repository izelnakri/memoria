declare global {
  interface Window {
    MemserverModel: any;
    MemServer: any;
  }
}

import kleur from "kleur";
import "./set-pretender-context.js";
import Pretender from "pretender/dist/pretender.js";
import hackPretender from "./pretender-hacks.js"; // NOTE: check this

const DEFAULT_PASSTHROUGHS = [
  "http://localhost:0/chromecheckurl",
  "http://localhost:30820/socket.io",
];

interface MemserverOptions {
  logging?: boolean;
  initializer?: () => any | void;
  routes?: () => any | void;
  [propName: string]: any;
}

interface Memserver {
  get: (urlPath, any?) => any;
  put: (urlPath, any?) => any;
  delete: (urlPath, any?) => any;
  post: (urlPath, any?) => any;
  patch: (urlPath, any?) => any;
  shutdown: () => any;
}

// NOTE: Test for
// globalizeModules: true,
// globalizeModels: true,
class Memserver {
  constructor(options: MemserverOptions = { logging: true }) {
    hackPretender(Pretender as any);
    const initializer = options.initializer || async function () {};
    const routes = options.routes || function () {};
    const logging = options.hasOwnProperty("logging") ? options.logging : true;

    const initializerReturn = initializer();

    return startPretender(routes, Object.assign(options, { logging }));
  }
}

export default Memserver;

function startPretender(routes, options) {
  Pretender.prototype.namespace = options.namespace;
  Pretender.prototype.urlPrefix = options.urlPrefix;
  Pretender.prototype.timing = options.timing;

  let pretender = new Pretender(
    function () {
      const Memserver = kleur.cyan("[Memoria]");

      if (options.logging) {
        this.handledRequest = function (verb, path, request) {
          const method = verb.toUpperCase();

          console.log(Memserver, colorStatusCode(request.status), method, request.url);

          if (["POST", "PUT"].includes(method)) {
            console.log(`${method} REQUEST BODY IS:`, request.params);
          }

          console.log(JSON.parse(request.responseText));
        };
        this.passthroughRequest = function (verb, path, request) {
          console.log(Memserver, kleur.yellow("[PASSTHROUGH]"), verb, request.url);
        };
      }

      this.unhandledRequest = function (verb, path, request) {
        console.log(Memserver, kleur.red("[UNHANDLED REQUEST]"), verb, path);
        console.log(kleur.red("UNHANDLED REQUEST WAS:\n"), request);
        console.log(request);
      };
    },
    { trackRequests: false }
  );

  // HACK: Pretender this.passthrough for better UX
  // TODO: this doesnt passthrough full http:// https://
  pretender.passthrough = function (url) {
    const parent = Pretender.prototype;
    const verbs = ["get", "post", "put", "delete"];

    if (!url) {
      ["/**", "/", "/*"].forEach((path) => {
        verbs.forEach((verb) => pretender[verb](path, parent.passthrough));
      });

      return;
    }

    const fullUrl = (this.urlPrefix || "") + (this.namespace ? "/" + this.namespace : "") + url;

    verbs.forEach((verb) => pretender[verb](fullUrl, parent.passthrough));
  };

  DEFAULT_PASSTHROUGHS.forEach((url) => pretender.passthrough(url));
  // END: Pretender this.passthrough for better UX

  routes.apply(pretender, []);

  return pretender;
}

function colorStatusCode(statusCode) {
  if (statusCode === 200 || statusCode === 201) {
    return kleur.green(statusCode);
  } else if (statusCode === 404 || statusCode === 204) {
    return kleur.cyan(statusCode);
  }

  return kleur.red(statusCode);
}
