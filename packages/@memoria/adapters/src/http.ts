import RESTAdapter from "./rest/index.js";
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

const DEFAULT_TIMEOUT_IN_MS = 30000;

// TODO: temporary
function pluralize(string) {
  return string + "s";
}

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

  static async get(url: string, headers: JSObject = {}, Model?: typeof MemoriaModel) {
    return await makeFetchRequest(
      {
        headers: this.buildHeaders(headers),
        method: "GET",
        url: this.buildURL(url),
        logging: this.logging,
        timeout: this.timeout,
      },
      Model
    );
  }

  static async post(
    url: string,
    body: JSObject = {},
    headers: JSObject = {},
    Model?: typeof MemoriaModel
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
      Model
    );
  }

  static async put(
    url: string,
    body: JSObject = {},
    headers: JSObject = {},
    Model?: typeof MemoriaModel
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
      Model
    );
  }

  static async delete(
    url: string,
    body: JSObject = {},
    headers: JSObject = {},
    Model?: typeof MemoriaModel
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
      Model
    );
  }
}

async function makeFetchRequest(
  httpOptions: HTTPOptions,
  Model?: typeof MemoriaModel
): Promise<JSObject | MemoriaModel | MemoriaModel[]> {
  // TODO: could have the requestTime metadata
  let response, json, timedOut;
  let timeoutController = new AbortController();
  let timeoutFunction = setTimeout(
    () => {
      timedOut = true;
      timeoutController.abort();
    },
    httpOptions.timeout ? httpOptions.timeout : DEFAULT_TIMEOUT_IN_MS
  );

  try {
    response = await fetch(httpOptions.url, {
      signal: timeoutController.signal,
      headers: buildHeaders(httpOptions.headers),
      method: httpOptions.method,
      body: JSON.stringify(httpOptions.body),
    });
  } finally {
    clearTimeout(timeoutFunction); // NOTE: move to try?
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
      let errorMessage = getErrorMessage(ErrorInterface, httpOptions);

      throw new ErrorInterface(
        new Changeset(Model ? getModelFromPayload(httpOptions.body as JSObject, Model) : undefined),
        errors as ErrorMetadata[],
        errorMessage
      );
    }

    if (Model) {
      let keyName = (Model.Adapter as typeof RESTAdapter).keyNameFromPayload(Model);
      let results = json[keyName] || json[pluralize(keyName)];

      if (Array.isArray(results)) {
        return results.map((result) => Model.push(result)) as MemoriaModel[];
      }

      return Model.push(results) as MemoriaModel;
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
  } else if (Model.Adapter instanceof RESTAdapter) {
    let keyName = (Model.Adapter as typeof RESTAdapter).keyNameForPayload(Model);

    return Model.build(jsonBody[keyName]);
  }

  throw new RuntimeError(
    "You provided a Model to your http operation but Model misses an Adapter with keyNameForPayload()"
  );
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
