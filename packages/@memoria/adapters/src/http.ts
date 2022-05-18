import MemoriaModel, {
  ErrorMetadata,
  Changeset,
  AbortError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ServerError,
  TimeoutError,
  UnauthorizedError,
  InsertError,
  UpdateError,
  DeleteError,
  RuntimeError,
} from "@memoria/model";
import type { ModelBuildOptions } from "@memoria/model";
import { pluralize } from "inflected";

interface JSObject {
  [keyName: string]: any;
}

export interface HTTPHeaders {
  Accept: "application/json";
  [headerKey: string]: any;
}
export type HTTPMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export interface HTTPOptions {
  headers: HTTPHeaders;
  method: HTTPMethod;
  url: string;
  logging: boolean;
  timeout: number;
  body?: JSObject;
}

interface HTTPMemoriaOptions extends ModelBuildOptions {
  Model?: typeof MemoriaModel;
}

const DEFAULT_TIMEOUT_IN_MS = 30000;

export default class HTTP {
  static host: string =
    typeof window === "undefined" ? "http://localhost:3000" : window.location.origin;
  static headers: HTTPHeaders = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  static logging = false;
  static timeout = 0;

  static buildURL(url: string) {
    return url.startsWith("/") ? `${this.host}${url}` : url;
  }

  static buildHeaders(headers: JSObject) {
    return Object.assign(
      { Accept: "application/json", "Content-Type": "application/json" },
      this.headers,
      headers
    );
  }

  static async get(url: string, headers: JSObject = {}, options?: HTTPMemoriaOptions) {
    return await makeFetchRequest(
      {
        headers: this.buildHeaders(headers),
        method: "GET",
        url: this.buildURL(url),
        logging: this.logging,
        timeout: this.timeout,
      },
      options || {}
    );
  }

  static async post(
    url: string,
    body: JSObject = {},
    headers: JSObject = {},
    options?: HTTPMemoriaOptions
  ) {
    return await makeFetchRequest(
      {
        headers: this.buildHeaders(headers),
        method: "POST",
        url: this.buildURL(url),
        logging: this.logging,
        timeout: this.timeout,
        body,
      },
      options || {}
    );
  }

  static async put(
    url: string,
    body: JSObject = {},
    headers: JSObject = {},
    options?: HTTPMemoriaOptions
  ) {
    return await makeFetchRequest(
      {
        headers: this.buildHeaders(headers),
        method: "PUT",
        url: this.buildURL(url),
        logging: this.logging,
        timeout: this.timeout,
        body: body,
      },
      options || {}
    );
  }

  static async delete(
    url: string,
    body: JSObject = {},
    headers: JSObject = {},
    options?: HTTPMemoriaOptions
  ) {
    return await makeFetchRequest(
      {
        headers: this.buildHeaders(headers),
        method: "DELETE",
        url: this.buildURL(url),
        logging: this.logging,
        timeout: this.timeout,
        body: body,
      },
      options || {}
    );
  }
}

async function makeFetchRequest(
  httpOptions: HTTPOptions,
  options: HTTPMemoriaOptions
): Promise<JSObject | MemoriaModel | MemoriaModel[]> {
  // TODO: could have the requestTime metadata
  // TODO: could implement logging
  let { Model } = options;
  let response, json, timedOut;
  let timeoutController = new AbortController();
  let timeoutFunction = setTimeout(
    () => {
      timedOut = true;
      timeoutController.abort();
    },
    httpOptions.timeout ? httpOptions.timeout : DEFAULT_TIMEOUT_IN_MS
  );
  let inputBody = httpOptions.body as JSObject;

  try {
    response = await fetch(httpOptions.url, {
      signal: timeoutController.signal,
      headers: buildHeaders(httpOptions.headers),
      method: httpOptions.method,
      body: JSON.stringify(inputBody),
    });
  } finally {
    clearTimeout(timeoutFunction);
  }

  try {
    if (timedOut) {
      throw new TimeoutError(httpOptions);
    } else if (response.status === 0 || response.type === "error") {
      throw new AbortError(`Web request aborted for ${httpOptions.method} ${httpOptions.url}`);
    }

    json = await parseJSON(response);

    if (response.status === 401) {
      throw new UnauthorizedError(httpOptions);
    } else if (response.status === 403) {
      throw new ForbiddenError(httpOptions);
    } else if (response.status === 404) {
      throw new NotFoundError(httpOptions);
    }

    let errors = getErrorsIfExists(json, httpOptions);
    if (errors || response.status >= 223) {
      let ErrorInterface = getErrorInterface(httpOptions, response, Model);

      throw new ErrorInterface(
        new Changeset(Model ? getModelFromPayload(httpOptions.body as JSObject, Model) : undefined),
        errors as ErrorMetadata[],
        getErrorMessage(ErrorInterface, httpOptions)
      );
    }

    if (httpOptions.method !== "DELETE" && Model) {
      let Adapter = Model.Adapter;
      let modelRequestKeyName = Model.Serializer.modelKeyNameForPayload(Model);
      let input = inputBody
        ? inputBody[modelRequestKeyName] || inputBody[pluralize(modelRequestKeyName)]
        : inputBody;
      let modelResponseKeyName = Model.Serializer.modelKeyNameFromPayload(Model);
      let results = json[modelResponseKeyName] || json[pluralize(modelResponseKeyName)];
      let deserializedResponse = deserializeModel(Model, input, results);

      // TODO: if result is empty throw an error
      if (Array.isArray(results)) {
        return deserializedResponse.map((result) => {
          return Adapter.cache(
            Model as typeof MemoriaModel,
            result,
            options
          );
        }) as MemoriaModel[];
      }

      return Adapter.cache(
        Model,
        deserializedResponse,
        options
      ) as MemoriaModel;
    }

    return json;
  } catch (error) {
    throw error;
  }
}

async function parseJSON(response) {
  let json;
  try {
    json = await response.json();
  } finally {
    return json;
  }
}

function buildHeaders(headerObject: HTTPHeaders): Headers {
  let headers = new Headers();

  Object.keys(headerObject).forEach((keyName) => {
    headers.append(keyName, headerObject[keyName]);
  });

  return headers;
}

// extractErrors in ember apparently
function getErrorsIfExists(json: JSObject, httpOptions): void | ErrorMetadata[] {
  if (json && "errors" in json) {
    if (Array.isArray(json.errors) && json.errors.every((error) => "message" in error)) {
      return json.errors as ErrorMetadata[]; // TODO: maybe typecheck here that 4 keys are present
    }

    throw new RuntimeError(
      `${httpOptions.method} ${httpOptions.url} Response jsonBody.errors[] missing "message" for each error!`
    );
  } else if (json && "error" in json) {
    if (isObject(json.error) && "message" in json.error) {
      return [json.error] as ErrorMetadata[];
    }

    throw new RuntimeError(
      `${httpOptions.method} ${httpOptions.url} Response jsonBody.error missing "message" property!`
    );
  }
}

function isObject(value) {
  return typeof value === "object" && !Array.isArray(value) && value !== null;
}

function getModelFromPayload(
  jsonBody: JSObject,
  Model: typeof MemoriaModel
): undefined | MemoriaModel {
  if (!jsonBody) {
    return;
  } else if (!Model.Serializer.modelKeyNameForPayload) {
    throw new RuntimeError(
      "You provided a Model to your http operation but Model.Serializer misses keyNameForPayload()"
    );
  }

  return Model.build(jsonBody[Model.Serializer.modelKeyNameForPayload(Model)]);
}

function getErrorInterface(httpOptions, response, Model) {
  if (response.status === 409) {
    return ConflictError;
  } else if (!Model) {
    return ServerError;
  } else if (httpOptions.method === "POST") {
    return InsertError;
  } else if (httpOptions.method === "DELETE") {
    return DeleteError;
  } else if (httpOptions.method === "PUT" || httpOptions.method === "PATCH") {
    return UpdateError;
  }

  return ServerError;
}

function getErrorMessage(ErrorInterface, httpOptions) {
  if (ErrorInterface === ConflictError) {
    return `Web server responds with a conflict error for ${httpOptions.method} ${httpOptions.url}`;
  } else if (ErrorInterface === ServerError) {
    return `Web server responds with an error for ${httpOptions.method} ${httpOptions.url}`;
  }
}

function deserializeModel(Model, input, results) {
  return Array.isArray(results)
    ? results.map((result, index) => synchronizePayloadForBuild(Model, input ? input[index] : input, result))
    : synchronizePayloadForBuild(Model, input, results);
}

function synchronizePayloadForBuild(Model, input, result) {
  debugger;
  return Model && result && input instanceof Model
    ? Model.assign(input, result)
    : result;
}
