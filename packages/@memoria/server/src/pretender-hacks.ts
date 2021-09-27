import kleur from "kleur";
import { classify, singularize } from "inflected";
import Model from "@memoria/model";

export default function hackPretender(Pretender) {
  // HACK START: Pretender Request Parameter Type Casting Hack: Because types are important.
  Pretender.prototype._handlerFor = function (verb, url, request) {
    let registry = this.hosts.forURL(url)[verb];
    let fullRequestPath = Pretender.parseURL(url).fullpath;
    let matches = registry.recognize(fullRequestPath);
    let match = matches ? matches[0] : null;
    let headers = request.requestHeaders || {};

    if (match) {
      request.headers = headers;
      request.params = Object.keys(match.params).reduce((result, key) => {
        return Object.assign(result, { [key]: castCorrectType(match.params[key]) });
      }, {});
      request.queryParams = Object.keys(matches.queryParams).reduce((result, key) => {
        return Object.assign(result, { [key]: castCorrectType(matches.queryParams[key]) });
      }, {});

      let newParamsFromBody =
        tryConvertingJSONStringToObject(request.requestBody) ||
        tryConvertingQueryStringToObject(request.requestBody);
      if (newParamsFromBody) {
        request.params = Object.assign(request.params, castCorrectType(newParamsFromBody));
      }
    }

    return match;
  };

  function castCorrectType(value) {
    if (Array.isArray(value)) {
      return value.map((element) => castCorrectType(element));
    } else if (Number(value) && parseInt(value, 10)) {
      return Number(value);
    } else if (value === "false") {
      return false;
    } else if (value === "true") {
      return true;
    } else if (value && typeof value === "object") {
      return Object.keys(value).reduce((result, keyName) => {
        return Object.assign(result, { [keyName]: castCorrectType(value[keyName]) });
      }, {});
    }

    return nilifyStrings(value);
  }

  function tryConvertingJSONStringToObject(string) {
    try {
      let object = JSON.parse(string);

      if (typeof object === "object" && object !== null) {
        return object;
      }
    } catch (error) {}
  }

  function tryConvertingQueryStringToObject(queryString) {
    if (queryString) {
      let entries = Array.from(new URLSearchParams(queryString));
      if (entries.length > 0) {
        return entries.reduce((result, entry) => {
          result[entry[0]] = entry[1];

          return result;
        }, {});
      }
    }
  }

  function nilifyStrings(value) {
    if (value !== null && typeof value === "object") {
      return Object.keys(value).reduce((object, key) => {
        return Object.assign(object, { [key]: nilifyStrings(value[key]) });
      }, {});
    } else if (value === "") {
      return null;
    }

    return value;
  }
  // END: Pretender Request Parameter Type Casting Hack

  // HACK START: Pretender Response Defaults UX Hack: Because Pretender Response types suck UX-wise.
  Pretender.prototype.handleRequest = async function (request) {
    let pretender = this;
    let verb = request.method.toUpperCase();
    let path = request.url.startsWith("localhost")
      ? `/${request.url.split("/").slice(1, request.url.length).join("/")}`
      : request.url;
    let handler = pretender._handlerFor(verb, path, request);
    if (handler) {
      handler.handler.numberOfCalls++;
      this.handledRequests.push(request);

      try {
        await _handleRequest(pretender, verb, path, request, handler);
      } catch (error) {
        request.respond(500, {}, "");
        throw error;
      }
    } else {
      if (!this.disableUnhandled) {
        this.unhandledRequests.push(request);
        this.unhandledRequest(verb, path, request);
      }
    }
  };

  async function _handleRequest(pretender, verb, path, request, handler) {
    let isAsync = handler.handler.async;
    let result = await handler.handler(request);
    let statusCode, headers, body;

    if (Array.isArray(result) && result.length === 3) {
      statusCode = result[0];
      headers = pretender.prepareHeaders(result[1]);
      body = pretender.prepareBody(result[2], headers);

      return pretender.handleResponse(request, isAsync, function () {
        request.respond(statusCode, headers, body);
        pretender.handledRequest(verb, path, request);
      });
    } else if (!result) {
      headers = pretender.prepareHeaders({ "Content-Type": "application/json" });

      if (verb === "DELETE") {
        return pretender.handleResponse(request, isAsync, function () {
          request.respond(204, headers, pretender.prepareBody("{}", headers));
          pretender.handledRequest(verb, path, request);
        });
      }

      return pretender.handleResponse(request, isAsync, function () {
        request.respond(
          500,
          headers,
          pretender.prepareBody(
            JSON.stringify({
              error: `[Memoria] ${verb} ${path} route handler did not return anything to respond to the request!`,
            }),
            headers
          )
        );
        pretender.handledRequest(verb, path, request);
      });
    }

    statusCode = getDefaultStatusCode(verb);
    headers = pretender.prepareHeaders({ "Content-Type": "application/json" });

    let targetResult = typeof result === "string" ? result : JSON.stringify(result);
    body = pretender.prepareBody(targetResult, headers);

    return pretender.handleResponse(request, isAsync, function () {
      request.respond(statusCode, headers, body);
      pretender.handledRequest(verb, path, request);
    });
  }

  function getDefaultStatusCode(verb) {
    if (["GET", "PUT", "PATCH"].includes(verb)) {
      return 200;
    } else if (verb === "POST") {
      return 201;
    } else if (verb === "DELETE") {
      return 204;
    }

    return 500;
  }
  // END: Pretender Response Defaults UX Hack

  // HACK: Pretender REST defaults hack: For better UX
  ["get", "put", "post", "delete"].forEach((verb) => {
    Pretender.prototype[verb] = function (path, handler, async) {
      let initialPart = (this.urlPrefix || "") + (this.namespace ? `/${this.namespace}` : "");
      let fullUrl = path.startsWith("http") ? path : initialPart + path;
      let targetHandler = Model.isPrototypeOf(handler)
        ? getDefaultRouteHandler(verb.toUpperCase(), fullUrl, this, handler)
        : handler;
      if (!targetHandler) {
        this.shutdown();
        throw new Error(
          kleur.red(`[Memoria] ${verb} ${path} route handler cannot be generated automatically`)
        );
      }
      const timing = async ? async.timing || this.timing : this.timing;

      return this.register(verb.toUpperCase(), fullUrl, targetHandler, timing);
    };
  });
  // END: Pretender REST default hack: For better UX

  function getDefaultRouteHandler(verb, path, serverContext, ResourceModel) {
    const paths = path.split(/\//g);
    const lastPath = paths[paths.length - 1];
    const pluralResourceName = lastPath.includes(":") ? paths[paths.length - 2] : lastPath;
    const resourceName = singularize(pluralResourceName);
    const resourceClassName = classify(resourceName);

    if (verb === "GET") {
      if (lastPath.includes(":")) {
        return async (request) => {
          return {
            [resourceName]: ResourceModel.serializer(await ResourceModel.find(request.params.id)),
          };
        };
      }

      return async () => {
        return { [pluralResourceName]: ResourceModel.serializer(await ResourceModel.findAll()) };
      };
    } else if (verb === "POST") {
      return async (request) => {
        const resourceParams = request.params[resourceName];

        return {
          [resourceName]: ResourceModel.serializer(await ResourceModel.insert(resourceParams)),
        };
      };
    } else if (verb === "PUT") {
      return async (request) => {
        const resourceParams = request.params[resourceName];

        return {
          [resourceName]: ResourceModel.serializer(await ResourceModel.update(resourceParams)),
        };
      };
    } else if (verb === "DELETE") {
      return async (request) => {
        await ResourceModel.delete({ id: request.params.id });
      };
    }
  }

  return Pretender;
}
