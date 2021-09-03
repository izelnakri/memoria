import { camelize, dasherize } from "@emberx/string"; // NOTE: make ember-inflector included in @emberx/string
import MemoryAdapter from "../memory/index.js";
import type { ModelRef } from "@memoria/model";
import MemoriaModel from "@memoria/model";

// NOTE: temporary
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

// NOTE: also provide APIActions
export default class RESTAdapter extends MemoryAdapter {
  static CONNECTION_OPTIONS: ConnectionOptions = {
    host: "localhost",
    headers: {
      Accept: "application/json",
    },
  };

  static get host(): string {
    if (!this.CONNECTION_OPTIONS || !this.CONNECTION_OPTIONS.host) {
      throw new Error(
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

  // payload to instance source key
  static modelNameFromPayloadKey(Model: typeof MemoriaModel): string {
    return Model.name;
    // return singularize(Model.name);
  }

  // instance to post payload target key
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

  // static async query() {
  //   Model: typeof MemoriaModel,
  //   query: QueryObject
  // ): Promise<MemoriaModel | void> {
  // }

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

  static async count(Model: typeof MemoriaModel, query?: QueryObject): Promise<number> {
    try {
      let response = await fetch(`${this.host}/${this.pathForType(Model)}/count`); // TODO: maybe add options in future
      if (!response.ok) {
        throw new Error("TODO: RESTAdapter case");
      }

      let json = await response.json();

      return json.count;
    } catch (error) {
      throw new Error(`TODO: RESTAdapter case`);
    }
  }

  static async find(
    Model: typeof MemoriaModel,
    primaryKey: primaryKey | primaryKey[]
  ): Promise<MemoriaModel[] | MemoriaModel | void> {
    try {
      // GET /people?ids=[], or GET /people/:id
      if (Array.isArray(primaryKey)) {
        let response = await fetch(`${this.host}/${this.pathForType(Model)}`); // TODO: make this /people?ids
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

  // static async findBy(
  //   Model: typeof MemoriaModel,
  //   queryObject: object
  // ): Promise<MemoriaModel | void> {
  //   // GET /people?keyName=value
  // }

  static async findAll(
    Model: typeof MemoriaModel,
    queryObject: object = {}
  ): Promise<MemoriaModel[] | void> {
    // GET /people?keyName=value
    let response = await fetch(`${this.host}/${this.pathForType(Model)}`);
    if (!response.ok) {
      throw new Error("TODO: RESTAdapter case");
    }

    let json = await response.json();

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
    // POST /people/:id
    try {
      let response = await fetch(`${this.host}/${this.pathForType(Model)}`, {
        method: "POST",
        body: JSON.stringify({ [this.payloadKeyFromModelName(Model)]: record }),
      }); // TODO: maybe add options in future
      debugger;
      if (!response.ok) {
        throw new Error("TODO: RESTAdapter case");
      }

      let json = await response.json();

      return this.push(Model, json[this.payloadKeyFromModelName(Model)]) as MemoriaModel;
    } catch (error) {
      throw new Error(`TODO: RESTAdapter case`);
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
