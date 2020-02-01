import qs from "qs";
import chalk from "ansi-colors";
import Inflector from "i";
import stringUtils from "ember-cli-string-utils";

const { classify } = stringUtils;
const { singularize } = Inflector();
const targetNamespace = typeof global === "object" ? global : window;

// HACK START: Pretender Request Parameter Type Casting Hack: Because types are important.
window.Pretender.prototype._handlerFor = function(verb, url, request) {
  var registry = this.hosts.forURL(url)[verb];

  var matches = registry.recognize(window.Pretender.parseURL(url).fullpath);
  var match = matches ? matches[0] : null;
  var headers = request.requestHeaders || {};

  if (match) {
    request.headers = headers;
    request.params = Object.keys(match.params).reduce((result, key) => {
      var value = castCorrectType(match.params[key]);

      return Object.assign(result, { [key]: value });
    }, {});
    request.queryParams = Object.keys(matches.queryParams).reduce((result, key) => {
      var targetValue = castCorrectType(matches.queryParams[key]);

      return Object.assign(result, { [key]: targetValue });
    }, {});

    var contentHeader = request.headers["Content-Type"] || request.headers["content-type"];

    if (request.requestBody && contentHeader && contentHeader.includes("application/json")) {
      request.params = nilifyStrings(
        Object.assign(request.params, JSON.parse(request.requestBody))
      );
    } else {
      request.params = nilifyStrings(Object.assign(request.params, qs.parse(request.requestBody)));
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
  }

  return nilifyStrings(value);
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
window.Pretender.prototype.handleRequest = function(request) {
  var pretender = this;
  var verb = request.method.toUpperCase();
  var path = request.url;
  var handler = pretender._handlerFor(verb, path, request);

  var _handleRequest = function(result) {
    var statusCode, headers, body;

    if (Array.isArray(result) && result.length === 3) {
      statusCode = result[0];
      headers = pretender.prepareHeaders(result[1]);
      body = pretender.prepareBody(result[2], headers);

      return pretender.handleResponse(request, async, function() {
        request.respond(statusCode, headers, body);
        pretender.handledRequest(verb, path, request);
      });
    } else if (!result) {
      headers = pretender.prepareHeaders({ "Content-Type": "application/json" });

      if (verb === "DELETE") {
        return pretender.handleResponse(request, async, function() {
          request.respond(204, headers, pretender.prepareBody("{}", headers));
          pretender.handledRequest(verb, path, request);
        });
      }

      return pretender.handleResponse(request, async, function() {
        request.respond(
          500,
          headers,
          pretender.prepareBody(
            JSON.stringify({
              error: `[Memserver] ${verb} ${path} route handler did not return anything to respond to the request!`
            }),
            headers
          )
        );
        pretender.handledRequest(verb, path, request);
      });
    }

    statusCode = getDefaultStatusCode(verb);
    headers = pretender.prepareHeaders({ "Content-Type": "application/json" });
    var targetResult = typeof result === "string" ? result : JSON.stringify(result);
    body = pretender.prepareBody(targetResult, headers);

    return pretender.handleResponse(request, async, function() {
      request.respond(statusCode, headers, body);
      pretender.handledRequest(verb, path, request);
    });
  };

  if (handler) {
    var async = handler.handler.async;
    handler.handler.numberOfCalls++;
    this.handledRequests.push(request);

    var result = handler.handler(request);

    if (result && typeof result.then === "function") {
      // `result` is a promise, resolve it
      result.then(function(resolvedResult) {
        _handleRequest(resolvedResult);
      });
    } else {
      _handleRequest(result);
    }
  } else {
    if (!this.disableUnhandled) {
      this.unhandledRequests.push(request);
      this.unhandledRequest(verb, path, request);
    }
  }
};

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
  window.Pretender.prototype[verb] = function(path, handler, async) {
    const fullPath = (this.urlPrefix || "") + (this.namespace ? "/" + this.namespace : "") + path;
    const targetHandler = handler || getDefaultRouteHandler(verb.toUpperCase(), fullPath);
    const timing = async ? async.timing || this.timing : this.timing;
    // console.log('timing is', timing);
    // console.log('async is', async);
    return this.register(verb.toUpperCase(), fullPath, targetHandler, timing);
  };
});
// END: Pretender REST default hack: For better UX

function getDefaultRouteHandler(verb, path) {
  const paths = path.split(/\//g);
  const lastPath = paths[paths.length - 1];
  const pluralResourceName = lastPath.includes(":") ? paths[paths.length - 2] : lastPath;
  const resourceName = singularize(pluralResourceName);
  const ResourceModel = targetNamespace[classify(resourceName)];

  if (!ResourceModel) {
    throw new Error(
      chalk.red(
        `[Memserver] ${verb} ${path} route handler cannot be generated automatically: ${classify(
          resourceName
        )} is not on your window.${classify(
          resourceName
        )}, also please check that your route name matches the model reference or create a custom handler function`
      )
    );
  } else if (verb === "GET") {
    if (lastPath.includes(":")) {
      return (request) => {
        return { [resourceName]: ResourceModel.serializer(ResourceModel.find(request.params.id)) };
      };
    }

    return () => {
      return { [pluralResourceName]: ResourceModel.serializer(ResourceModel.findAll()) };
    };
  } else if (verb === "POST") {
    return (request) => {
      const resourceParams = request.params[resourceName];

      return { [resourceName]: ResourceModel.serializer(ResourceModel.insert(resourceParams)) };
    };
  } else if (verb === "PUT") {
    return (request) => {
      const resourceParams = request.params[resourceName];

      return { [resourceName]: ResourceModel.serializer(ResourceModel.update(resourceParams)) };
    };
  } else if (verb === "DELETE") {
    return (request) => {
      ResourceModel.delete({ id: request.params.id });
    };
  }
}
