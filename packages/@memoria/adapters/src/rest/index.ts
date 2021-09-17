import { camelize, dasherize } from "@emberx/string"; // NOTE: make ember-inflector included in @emberx/string
import MemoryAdapter from "../memory/index.js";
import type { ModelRef } from "@memoria/model";
import { primaryKeyTypeSafetyCheck } from "../utils.js";
import MemoriaModel, { Changeset, RuntimeError, InsertError } from "@memoria/model";

// TODO: temporary
function pluralize(string) {
  return string + "s";
}

export interface HTTPHeaders {
  Accept: "application/json";
  [headerKey: string]: any;
}

export interface ConnectionOptions {
  host: any;
  headers: HTTPHeaders;
}

type primaryKey = number | string;
type QueryObject = { [key: string]: any };
type ModelRefOrInstance = ModelRef | MemoriaModel;

// TODO: also provide APIActions
export default class RESTAdapter extends MemoryAdapter {
  static CONNECTION_OPTIONS: ConnectionOptions = {
    host: typeof window === "undefined" ? "http://localhost:3000" : window.location.origin,
    headers: {
      Accept: "application/json",
    },
  };

  static get host(): string {
    if (!this.CONNECTION_OPTIONS || !this.CONNECTION_OPTIONS.host) {
      throw new RuntimeError(
        "[Memoria RESTAdapter] host reference is missing![RESTAdapter.CONNECTION_OPTIONS.host]"
      );
    }

    return this.CONNECTION_OPTIONS.host;
  }

  static get headers(): HTTPHeaders {
    return this.CONNECTION_OPTIONS.headers;
  }

  static pathForType(Model: typeof MemoriaModel): string {
    return pluralize(dasherize(Model.name));
  }

  // NOTE: payload(http request body) to instance source key
  static modelNameFromPayloadKey(Model: typeof MemoriaModel): string {
    return Model.name;
    // return singularize(Model.name);
  }

  // NOTE: instance to CRUD payload(http request body) target key
  static payloadKeyFromModelName(Model: typeof MemoriaModel): string {
    return camelize(Model.name);
    // return camelize(Model.name);
  }

  static addHTTPHeader(key, value): HTTPHeaders {
    this.CONNECTION_OPTIONS.headers[key] = value;

    return this.CONNECTION_OPTIONS.headers;
  }

  static assignHTTPHeader(headers = {}): HTTPHeaders {
    return Object.assign(this.CONNECTION_OPTIONS.headers, headers);
  }

  static removeHTTPHeader(headers: any = {}) {
    if (Array.isArray(headers)) {
      headers.forEach((headerName) => delete this.CONNECTION_OPTIONS.headers[headerName]);
    } else if (typeof headers === "object") {
      Object.keys(headers).forEach(
        (headerName) => delete this.CONNECTION_OPTIONS.headers[headerName]
      );
    } else {
      delete this.CONNECTION_OPTIONS.headers[headers];
    }

    return this.CONNECTION_OPTIONS.headers;
  }

  static async resetRecords(
    Model: typeof MemoriaModel,
    targetState?: ModelRefOrInstance[]
  ): Promise<MemoriaModel[]> {
    try {
      let response = await fetch(`${this.host}/${this.pathForType(Model)}/reset`, {
        method: "POST",
        body: JSON.stringify({ [this.modelNameFromPayloadKey(Model)]: targetState }),
      });
      if (!response.ok) {
        throw new Error("TODO: RESTAdapter case");
      }

      this.unloadAll(Model);
      let json = await response.json();

      return this.push(
        Model,
        json[this.payloadKeyFromModelName(Model)].map((model) => model)
      ) as MemoriaModel[];
    } catch (error) {
      throw new Error(`TODO: RESTAdapter case`);
    }
  }

  // GET /people/count, or GET /people/count?keyName=value
  static async count(Model: typeof MemoriaModel, query?: QueryObject): Promise<number> {
    try {
      let response = await fetch(`${this.host}/${this.pathForType(Model)}/count${buildQueryPath(Model, query)}`); // TODO: maybe add options in future
      if (!response.ok) {
        throw new Error("TODO: RESTAdapter case");
      }

      let json = await response.json();

      return json.count;
    } catch (error) {
      throw new Error(`TODO: RESTAdapter case`);
    }
  }

  // GET /people?ids=[], or GET /people/:id
  static async find(
    Model: typeof MemoriaModel,
    primaryKey: primaryKey | primaryKey[]
  ): Promise<MemoriaModel[] | MemoriaModel | void> {
    try {
      if (Array.isArray(primaryKey)) {
        let response = await fetch(
          `${this.host}/${this.pathForType(Model)}${buildQueryPath(Model, { ids: primaryKey })}`
        );
        if (!response.ok) {
          throw new Error("TODO: RESTAdapter case");
        }

        let json = await response.json();

        return this.push(
          Model,
          json[this.payloadKeyFromModelName(Model)].map((model) => model)
        );
      }

      let response = await fetch(`${this.host}/${this.pathForType(Model)}/${primaryKey}`);
      if (!response.ok) {
        throw new Error("TODO: RESTAdapter case");
      }

      let json = await response.json();

      return this.push(Model, json[this.payloadKeyFromModelName(Model)]);
    } catch (error) {
      throw new Error(`TODO: RESTAdapter case`);
    }
  }

  // GET /people?keyName=value, or GET /people/:id (if only primaryKeyName provided)
  static async findBy(
    Model: typeof MemoriaModel,
    query: QueryObject
  ): Promise<MemoriaModel | void> {
    let queryKeys = Object.keys(query);
    let response =
      queryKeys.length === 1 && queryKeys[0] === Model.primaryKeyName
      ? await fetch(`${this.host}/${this.pathForType(Model)}/${queryKeys[0]}`)
      : await fetch(`${this.host}/${this.pathForType(Model)}${buildQueryPath(Model, query)}`);
    if (!response.ok) {
      throw new Error("TODO: RESTAdapter case");
    }

    let json = await response.json();

    // TODO: handle when its plural
    return this.push(Model, json[pluralize(this.payloadKeyFromModelName(Model))][0]);
  }

  // GET /people, or GET /people?keyName=value
  static async findAll(
    Model: typeof MemoriaModel,
    query: QueryObject
  ): Promise<MemoriaModel[] | void> {
    return this.query(Model, query);
  }

  // GET /people, or GET /people?keyName=value
  static async query() {
    Model: typeof MemoriaModel,
    query: QueryObject
  ): Promise<MemoriaModel | void> {
    let response = await fetch(`${this.host}/${this.pathForType(Model)}${buildQueryPath(Model, query)}`);
    if (!response.ok) {
      throw new Error("TODO: RESTAdapter case");
    }

    let json = await response.json();

    // TODO: handle when its plural
    return json[pluralize(this.payloadKeyFromModelName(Model))].map((model) =>
      this.push(Model, model)
    );
  }

  // static async save(
  //   Model: typeof MemoriaModel,
  //   record: QueryObject | ModelRefOrInstance
  // ): Promise<MemoriaModel> {
  //   // POST or UPDATE /people/:id
  // }

  static async insert(
    Model: typeof MemoriaModel,
    record: QueryObject | ModelRefOrInstance
  ): Promise<MemoriaModel> {
    if (record[Model.primaryKeyName]) {
      primaryKeyTypeSafetyCheck(Model.build(record));
    }

    // POST /people
    try {
      let response = await fetch(`${this.host}/${this.pathForType(Model)}`, {
        method: "POST",
        body: JSON.stringify({ [this.payloadKeyFromModelName(Model)]: record }),
      }); // TODO: maybe add options in future

      if (!response.ok) {
        throw new Error("TODO: RESTAdapter case");
      }

      let json = await response.json();
      let payloadKey = this.payloadKeyFromModelName(Model);
      // NOTE: or maybe make a generic handleResponse function

      if (!(payloadKey in json)) {
        throw handleNegativeServerResponse(json, Model, record, InsertError);
      }

      return this.push(Model, json[payloadKey]) as MemoriaModel;
    } catch (error) {
      throw error;
    }
  }

  // static async update(
  //   Model: typeof MemoriaModel,
  //   record: ModelRefOrInstance
  // ): Promise<MemoriaModel> {
  //   // UPDATE /people/:id
  // }

  // static async delete(
  //   Model: typeof MemoriaModel,
  //   record: ModelRefOrInstance
  // ): Promise<MemoriaModel> {
  //   // DELETE /people/:id
  // }

  // static async saveAll(
  //   Model: typeof MemoriaModel,
  //   records: ModelRefOrInstance[]
  // ): Promise<MemoriaModel[]> {
  //   // POST or UPDATE /people/bulk
  // }

  // static async insertAll(
  //   Model: typeof MemoriaModel,
  //   records: ModelRefOrInstance[]
  // ): Promise<MemoriaModel[]> {
  //   // POST /people/bulk
  // }

  // static async updateAll(
  //   Model: typeof MemoriaModel,
  //   records: ModelRefOrInstance[]
  // ): Promise<MemoriaModel[]> {
  //   // UPDATE /people/bulk
  // }

  // static async deleteAll(
  //   Model: typeof MemoriaModel,
  //   records: ModelRefOrInstance[]
  // ): Promise<MemoriaModel[]> {
  //   // DELETE /people/bulk
  // }
}

// extractErrors in ember apparently
function handleNegativeServerResponse(json, Model, record, errorClass) {
  if ("errors" in json) {
    let changeset = new Changeset(Model.build(record));

    json.errors.forEach((error) => changeset.errors.push(error));

    return new errorClass(changeset);
  }
}

function buildQueryPath(Model, queryObject) {
  let findByKeys = Object.keys(queryObject);
  if (findByKeys.length > 0) {
    return '?' + new URLSearchParams(
      findByKeys.reduce((result, key) => {
        // TODO: here we can do a runtime typecheck!
        // typecheck(Model, modelName, value);
        if (queryObject[key] instanceof Date) {
          return Object.assign(result, { [key]: queryObject[key].toJSON() }); // NOTE: URLSearchParams date casting has gotcha
        }

        return Object.assign(result, { [key]: queryObject[key] });
      }, {})
    ).toString();
  }

  return '';
}
