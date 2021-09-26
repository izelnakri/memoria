import { camelize, dasherize } from "@emberx/string"; // NOTE: make ember-inflector included in @emberx/string
import MemoriaModel, { Changeset, RuntimeError } from "@memoria/model";
import type { ModelRef } from "@memoria/model";
import HTTP from "../http.js";
import MemoryAdapter from "../memory/index.js";
import { primaryKeyTypeSafetyCheck } from "../utils.js";

// TODO: temporary
function pluralize(string) {
  return string + "s";
}

export interface HTTPHeaders {
  Accept: "application/json";
  [headerKey: string]: any;
}

type primaryKey = number | string;
type JSObject = { [key: string]: any };
type QueryObject = { [key: string]: any };
type ModelRefOrInstance = ModelRef | MemoriaModel;

// TODO: also provide APIActions
export default class RESTAdapter extends MemoryAdapter {
  static host: string =
    typeof window === "undefined" ? "http://localhost:3000" : window.location.origin;
  static headers: HTTPHeaders = {
    Accept: "application/json",
  };
  static logging: boolean = false;
  static timeout: number = 0;

  static #_http: void | typeof HTTP;
  static get http() {
    this.#_http = this.#_http || HTTP;
    this.#_http.host = this.host;
    this.#_http.headers = this.headers;
    this.#_http.logging = this.logging;
    this.#_http.timeout = this.timeout;

    return this.#_http as typeof HTTP;
  }

  static removeHTTPHeader(headers: any = {}) {
    if (Array.isArray(headers)) {
      headers.forEach((headerName) => delete this.headers[headerName]);
    } else if (typeof headers === "object") {
      Object.keys(headers).forEach((headerName) => delete this.headers[headerName]);
    } else {
      delete this.headers[headers];
    }

    return this.headers;
  }

  static pathForType(Model: typeof MemoriaModel): string {
    return pluralize(dasherize(Model.name));
  }

  static keyNameForPayload(Model: typeof MemoriaModel): string {
    return camelize(Model.name); // return singularize(Model.name);
  }

  static keyNameFromPayload(Model: typeof MemoriaModel): string {
    return camelize(Model.name);
  }

  static async resetRecords(
    Model: typeof MemoriaModel,
    targetState?: ModelRefOrInstance[]
  ): Promise<MemoriaModel[]> {
    let allRecords = Model.peekAll();

    try {
      Model.unloadAll();
      return (await this.http.post(
        `${this.host}/${this.pathForType(Model)}/reset`,
        { [pluralize(this.keyNameForPayload(Model))]: targetState },
        this.headers,
        Model
      )) as MemoriaModel[];
    } catch (error) {
      allRecords.forEach((record) => this.push(Model, record));
      throw error;
    }
  }

  // GET /people/count, or GET /people/count?keyName=value
  static async count(Model: typeof MemoriaModel, query?: QueryObject): Promise<number> {
    let result = (await this.http.get(
      `${this.host}/${this.pathForType(Model)}/count${buildQueryPath(query)}`,
      this.headers
    )) as JSObject;

    return result.count as number;
  }

  // GET /people?ids=[], or GET /people/:id
  static async find(
    Model: typeof MemoriaModel,
    primaryKey: primaryKey | primaryKey[]
  ): Promise<MemoriaModel[] | MemoriaModel | void> {
    if (Array.isArray(primaryKey)) {
      return (await this.http.get(
        `${this.host}/${this.pathForType(Model)}${buildQueryPath({ ids: primaryKey })}`,
        this.headers,
        Model
      )) as MemoriaModel[];
    }

    let keyType = Model.primaryKeyType;
    if (
      (keyType === "id" && typeof primaryKey === "number") ||
      (keyType === "uuid" && typeof primaryKey === "string" && primaryKey.length > 25)
    ) {
      return (await this.http.get(
        `${this.host}/${this.pathForType(Model)}/${primaryKey}`,
        this.headers,
        Model
      )) as MemoriaModel;
    }

    throw new RuntimeError(`${Model.name}.find() called without a valid primaryKey`);
  }

  // GET /people?keyName=value, or GET /people/:id (if only primaryKeyName provided)
  static async findBy(
    Model: typeof MemoriaModel,
    query: QueryObject
  ): Promise<MemoriaModel | void> {
    return (
      await this.http.get(
        `${this.host}/${this.pathForType(Model)}${buildQueryPath(query)}`,
        this.headers,
        Model
      )
    )[0] as MemoriaModel | void;
  }

  // GET /people, or GET /people?keyName=value
  static async findAll(
    Model: typeof MemoriaModel,
    query: QueryObject
  ): Promise<MemoriaModel[] | void> {
    return (await this.query(Model, query)) as MemoriaModel[] | void;
  }

  // GET /people, or GET /people?keyName=value
  static async query(
    Model: typeof MemoriaModel,
    query: QueryObject
  ): Promise<MemoriaModel[] | MemoriaModel | void> {
    return (await this.http.get(
      `${this.host}/${this.pathForType(Model)}${buildQueryPath(query)}`,
      this.headers,
      Model
    )) as MemoriaModel[] | MemoriaModel | void;
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

    return (await this.http.post(
      `${this.host}/${this.pathForType(Model)}`,
      { [this.keyNameForPayload(Model)]: record },
      this.headers,
      Model
    )) as MemoriaModel;
  }

  static async update(
    Model: typeof MemoriaModel,
    record: ModelRefOrInstance
  ): Promise<MemoriaModel> {
    if (!record || !record[Model.primaryKeyName]) {
      throw new RuntimeError(
        new Changeset(Model.build(record)),
        "$Model.update() called without a record with primaryKey"
      );
    }

    primaryKeyTypeSafetyCheck(Model.build(record));

    return (await this.http.put(
      `${this.host}/${this.pathForType(Model)}/${record[Model.primaryKeyName]}`,
      { [this.keyNameForPayload(Model)]: record },
      this.headers,
      Model
    )) as MemoriaModel;
  }

  static async delete(
    Model: typeof MemoriaModel,
    record: ModelRefOrInstance
  ): Promise<MemoriaModel> {
    if (!record || !record[Model.primaryKeyName]) {
      throw new RuntimeError(
        new Changeset(Model.build(record)),
        "$Model.delete() called without a record with primaryKey"
      );
    }

    primaryKeyTypeSafetyCheck(Model.build(record));

    await this.http.delete(
      `${this.host}/${this.pathForType(Model)}/${record[Model.primaryKeyName]}`,
      { [this.keyNameForPayload(Model)]: record },
      this.headers,
      Model
    );

    return this.unload(Model, record);
  }

  // static async saveAll(
  //   Model: typeof MemoriaModel,
  //   records: ModelRefOrInstance[]
  // ): Promise<MemoriaModel[]> {
  //   // POST or UPDATE /people/bulk
  // }

  // POST /people/bulk
  static async insertAll(
    Model: typeof MemoriaModel,
    records: ModelRefOrInstance[]
  ): Promise<MemoriaModel[]> {
    if (!records || records.length === 0) {
      throw new RuntimeError("$Model.insertAll(records) called without records");
    }

    records.forEach((record) => {
      if (record[Model.primaryKeyName]) {
        primaryKeyTypeSafetyCheck(Model.build(record));
      }
    });

    return (await this.http.post(
      `${this.host}/${this.pathForType(Model)}/bulk`,
      { [pluralize(this.keyNameForPayload(Model))]: records },
      this.headers,
      Model
    )) as MemoriaModel[];
  }

  // UPDATE /people/bulk
  static async updateAll(
    Model: typeof MemoriaModel,
    records: ModelRefOrInstance[]
  ): Promise<MemoriaModel[]> {
    if (!records || records.length === 0) {
      throw new RuntimeError("$Model.updateAll(records) called without records");
    }

    records.forEach((record) => {
      if (!record[Model.primaryKeyName]) {
        throw new RuntimeError(
          new Changeset(Model.build(record)),
          "$Model.updateAll() called without records having primaryKey"
        );
      }

      primaryKeyTypeSafetyCheck(Model.build(record));
    });

    return (await this.http.put(
      `${this.host}/${this.pathForType(Model)}/bulk`,
      { [pluralize(this.keyNameForPayload(Model))]: records },
      this.headers,
      Model
    )) as MemoriaModel[];
  }

  // DELETE /people/bulk
  static async deleteAll(
    Model: typeof MemoriaModel,
    records: ModelRefOrInstance[]
  ): Promise<MemoriaModel[]> {
    if (!records || records.length === 0) {
      throw new RuntimeError("$Model.deleteAll(records) called without records");
    }

    records.forEach((record) => {
      if (!record[Model.primaryKeyName]) {
        throw new RuntimeError(
          new Changeset(Model.build(record)),
          "$Model.deleteAll() called without records having primaryKey"
        );
      }

      primaryKeyTypeSafetyCheck(Model.build(record));
    });

    await this.http.delete(
      `${this.host}/${this.pathForType(Model)}/bulk`,
      { [pluralize(this.keyNameForPayload(Model))]: records },
      this.headers,
      Model
    );

    return this.unloadAll(Model, records);
  }
}

function buildQueryPath(queryObject?: JSObject) {
  if (!queryObject) {
    return "";
  }

  let findByKeys = Object.keys(queryObject);
  if (findByKeys.length > 0) {
    let arrayParams = {};
    let queryParams = new URLSearchParams(
      findByKeys.reduce((result, key) => {
        // TODO: here we can do a runtime typecheck!
        // typecheck(Model, modelName, value);
        if (queryObject[key] instanceof Date) {
          return Object.assign(result, { [key]: queryObject[key].toJSON() }); // NOTE: URLSearchParams date casting has gotcha
        } else if (queryObject[key] instanceof Array) {
          arrayParams[key] = queryObject[key];

          return result;
        }

        return Object.assign(result, { [key]: queryObject[key] });
      }, {})
    );
    Object.keys(arrayParams).forEach((keyName) => {
      arrayParams[keyName].forEach((value) => {
        queryParams.append(`${keyName}[]`, value);
      });
    });
    queryParams.sort();

    return "?" + queryParams.toString();
  }

  return "";
}
