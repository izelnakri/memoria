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

const HTTP_VERBS = ["get", "post", "put", "delete"];
const DEFAULT_PASSTHROUGHS = ["http://localhost:0/chromecheckurl", "http://localhost:30820/socket.io"];

interface FreeObject {
  [key: string]: any;
}

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

    // NOTE: the initializer's promise is intentionally not awaited -- a constructor cannot be async.
    // Callers that need the initializer to have completed must await it themselves.
    initializer();

    return startPretender(routes, Object.assign(options, { logging }));
  }
}

export default Memserver;

function startPretender(routes, options) {
  Pretender.prototype.namespace = options.namespace;
  Pretender.prototype.urlPrefix = options.urlPrefix;
  Pretender.prototype.timing = options.timing;

  let pretender = new Pretender(
    function (this: FreeObject) {
      let Memserver = kleur.cyan("[Memoria]");

      if (options.logging) {
        this.handledRequest = function (verb, _path, request) {
          let method = verb.toUpperCase();
          let requestURL = request.url.startsWith("localhost/") ? request.url.replace("localhost/", "/") : request.url;

          console.log(Memserver, colorStatusCode(request.status), method, requestURL);

          if (["POST", "PUT"].includes(method)) {
            console.log(`${method} REQUEST BODY IS:`, request.params);
          }

          console.log(JSON.parse(request.responseText));
        };
        this.passthroughRequest = function (verb, _path, request) {
          let requestURL = request.url.startsWith("localhost/") ? request.url.replace("localhost/", "/") : request.url;

          console.log(Memserver, kleur.yellow("[PASSTHROUGH]"), verb, requestURL);
        };
      }

      this.unhandledRequest = function (verb, path, request) {
        console.log(Memserver, kleur.red("[UNHANDLED REQUEST]"), verb, path);
        request.respond(404, {}, "Not found");
        throw new Error(`Memoria.UnhandledRequest: ${request.method} ${request.url}`);
      };
    },
    { trackRequests: false },
  );

  // HACK: Pretender this.passthrough for better UX
  let passthroughRequest = pretender.passthrough;
  pretender.passthrough = function (url) {
    if (!url) {
      ["/**", "/", "/*"].forEach((path) => {
        HTTP_VERBS.forEach((verb) => pretender[verb](path, passthroughRequest));
      });

      return;
    }

    // NOTE: `url` is passed through unresolved on purpose. The patched Pretender.prototype[verb] in
    // pretender-hacks.ts already resolves a relative path against urlPrefix/namespace before
    // registering it, so resolving here as well would be redundant. (This function used to compute
    // an unused `fullUrl` doing exactly that -- dead duplication of the hack, now removed.)
    HTTP_VERBS.forEach((verb) => pretender[verb](url, passthroughRequest));
  };

  DEFAULT_PASSTHROUGHS.forEach((url) => pretender.passthrough(url));
  // END: Pretender this.passthrough for better UX

  HTTP_VERBS.forEach((verb) => {
    pretender[verb] = Pretender.prototype[verb];
  });

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
