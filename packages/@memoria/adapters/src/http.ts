import type RESTAdapter from "./rest/index.js";
import MemoriaModel, { InsertError, UpdateError, DeleteError } from "@memoria/model";

interface JSObject {
  [keyName: string]: any;
}

export interface HTTPHeaders {
  Accept: "application/json";
  [headerKey: string]: any;
}
export type HTTPMethods = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export interface HTTPOptions {
  headers: HTTPHeaders;
  url: string;
  body?: JSObject;
}

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
      "GET",
      {
        headers: this.buildHeaders(headers),
        url: this.buildURL(url),
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
      "POST",
      {
        headers: this.buildHeaders(headers),
        url: this.buildURL(url),
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
      "PUT",
      {
        headers: this.buildHeaders(headers),
        url: this.buildURL(url),
        body: body,
      },
      Model
    );
  }

  static async delete(url: string, headers: JSObject = {}, Model?: typeof MemoriaModel) {
    return await makeFetchRequest(
      "DELETE",
      {
        headers: this.buildHeaders(headers),
        url: this.buildURL(url),
      },
      Model
    );
  }
}

// TODO: make this working
async function makeFetchRequest(
  method: HTTPMethods,
  httpOptions: HTTPOptions,
  Model?: typeof MemoriaModel
): Promise<JSObject | MemoriaModel | MemoriaModel[]> {
  let response, json;
  try {
    response = await fetch(httpOptions.url, {
      method,
      body: JSON.stringify(httpOptions.body),
    });
    if (!response.ok) {
      throw new Error(`TODO: HTTP Request Server Error case`);
    }

    json = await response.json();
  } catch (error) {
    debugger;
    throw new Error(`TODO: HTTP Request Error case`);
  }

  if (Model) {
    handleServerModelErrorResponse(method, json, Model, httpOptions.body);

    let keyName = (Model.Adapter as typeof RESTAdapter).keyNameFromPayload(Model);
    let results = json[keyName] || json[pluralize(keyName)];

    if (Array.isArray(results)) {
      debugger;
      return results.map((result) => Model.push(result)) as MemoriaModel[];
    }

    return Model.push(results) as MemoriaModel;
  }

  return json;
}

// extractErrors in ember apparently
function handleServerModelErrorResponse(
  method: string,
  json: JSObject,
  Model: typeof MemoriaModel,
  record?: JSObject
) {
  if (method === "GET") {
    return;
  } else if (json && "errors" in json) {
    if (method === "POST") {
      throw new InsertError(Model.build(record), json.errors);
    } else if (method === "DELETE") {
      throw new DeleteError(Model.build(record), json.errors);
    } else if (method === "PUT" || method === "PATCH") {
      throw new UpdateError(Model.build(record), json.errors);
    }
  }
}
