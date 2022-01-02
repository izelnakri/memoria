import { dasherize, pluralize, underscore } from "inflected"; // NOTE: make ember-inflector included in @emberx/string
import MemoriaModel, {
  RuntimeError,
  RelationshipPromise,
  RelationshipSchema,
} from "@memoria/model";
import type {
  PrimaryKey,
  ModelReference,
  ModelBuildOptions,
  RelationshipMetadata,
} from "@memoria/model";
import HTTP from "../http.js";
import MemoryAdapter from "../memory/index.js";

export interface HTTPHeaders {
  Accept: "application/json";
  [headerKey: string]: any;
}

type JSObject = { [key: string]: any };
type QueryObject = { [key: string]: any };
type ModelRefOrInstance = ModelReference | MemoriaModel;

// TODO: also provide APIActions
export default class RESTAdapter extends MemoryAdapter {
  static host: string =
    typeof window === "undefined" ? "http://localhost:3000" : window.location.origin;
  static headers: HTTPHeaders = {
    Accept: "application/json",
  };
  static logging: boolean = false;
  static timeout: number = 0;

  private static _http: void | typeof HTTP;

  static get http() {
    this._http = this._http || HTTP;
    this._http.host = this.host;
    this._http.headers = this.headers;
    this._http.logging = this.logging;
    this._http.timeout = this.timeout;

    return this._http as typeof HTTP;
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
    return pluralize(dasherize(underscore(Model.name))).toLowerCase();
  }

  static async resetRecords(
    Model?: typeof MemoriaModel,
    targetState?: ModelRefOrInstance[],
    options?: ModelBuildOptions
  ): Promise<MemoriaModel[]> {
    if (Model) {
      let allRecords = this.peekAll(Model);
      try {
        Model.unloadAll();
        return (await this.http.post(
          `${this.host}/${this.pathForType(Model)}/reset`,
          { [pluralize(Model.Serializer.modelKeyNameForPayload(Model))]: targetState },
          this.headers,
          Object.assign({ Model }, options)
        )) as MemoriaModel[];
      } catch (error) {
        allRecords.forEach((record) => this.cache(Model, record));
        throw error;
      }
    }

    return await super.resetRecords(Model, targetState, options);
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
    primaryKey: PrimaryKey | PrimaryKey[],
    options?: ModelBuildOptions
  ): Promise<MemoriaModel[] | MemoriaModel | void> {
    if (Array.isArray(primaryKey)) {
      return (await this.http.get(
        `${this.host}/${this.pathForType(Model)}${buildQueryPath({ ids: primaryKey })}`,
        this.headers,
        Object.assign({ Model }, options)
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
        Object.assign({ Model }, options)
      )) as MemoriaModel;
    }

    throw new RuntimeError(`${Model.name}.find() called without a valid primaryKey`);
  }

  // GET /people?keyName=value, or GET /people/:id (if only primaryKeyName provided)
  static async findBy(
    Model: typeof MemoriaModel,
    query: QueryObject,
    options?: ModelBuildOptions
  ): Promise<MemoriaModel | void> {
    return (
      await this.http.get(
        `${this.host}/${this.pathForType(Model)}${buildQueryPath(query)}`,
        this.headers,
        Object.assign({ Model }, options)
      )
    )[0] as MemoriaModel | void;
  }

  // GET /people, or GET /people?keyName=value
  static async findAll(
    Model: typeof MemoriaModel,
    query: QueryObject,
    options?: ModelBuildOptions
  ): Promise<MemoriaModel[] | void> {
    return (await this.query(Model, query, options)) as MemoriaModel[] | void;
  }

  // GET /people, or GET /people?keyName=value
  static async query(
    Model: typeof MemoriaModel,
    query: QueryObject,
    options?: ModelBuildOptions
  ): Promise<MemoriaModel[] | MemoriaModel | void> {
    return (await this.http.get(
      `${this.host}/${this.pathForType(Model)}${buildQueryPath(query)}`,
      this.headers,
      Object.assign({ Model }, options)
    )) as MemoriaModel[] | MemoriaModel | void;
  }

  static async insert(
    Model: typeof MemoriaModel,
    record: QueryObject | ModelRefOrInstance,
    options?: ModelBuildOptions
  ): Promise<MemoriaModel> {
    return (await this.http.post(
      `${this.host}/${this.pathForType(Model)}`,
      { [Model.Serializer.modelKeyNameForPayload(Model)]: record },
      this.headers,
      Object.assign({ Model }, options)
    )) as MemoriaModel;
  }

  static async update(
    Model: typeof MemoriaModel,
    record: ModelRefOrInstance,
    options?: ModelBuildOptions
  ): Promise<MemoriaModel> {
    return (await this.http.put(
      `${this.host}/${this.pathForType(Model)}/${record[Model.primaryKeyName]}`,
      { [Model.Serializer.modelKeyNameForPayload(Model)]: record },
      this.headers,
      Object.assign({ Model }, options)
    )) as MemoriaModel;
  }

  static async delete(
    Model: typeof MemoriaModel,
    record: ModelRefOrInstance,
    options?: ModelBuildOptions
  ): Promise<MemoriaModel> {
    await this.http.delete(
      `${this.host}/${this.pathForType(Model)}/${record[Model.primaryKeyName]}`,
      { [Model.Serializer.modelKeyNameForPayload(Model)]: record },
      this.headers,
      Object.assign({ Model }, options)
    );

    return this.unload(Model, record);
  }

  // POST /people/bulk
  static async insertAll(
    Model: typeof MemoriaModel,
    records: ModelRefOrInstance[],
    options?: ModelBuildOptions
  ): Promise<MemoriaModel[]> {
    return (await this.http.post(
      `${this.host}/${this.pathForType(Model)}/bulk`,
      { [pluralize(Model.Serializer.modelKeyNameForPayload(Model))]: records },
      this.headers,
      Object.assign({ Model }, options)
    )) as MemoriaModel[];
  }

  // UPDATE /people/bulk
  static async updateAll(
    Model: typeof MemoriaModel,
    records: ModelRefOrInstance[],
    options?: ModelBuildOptions
  ): Promise<MemoriaModel[]> {
    return (await this.http.put(
      `${this.host}/${this.pathForType(Model)}/bulk`,
      { [pluralize(Model.Serializer.modelKeyNameForPayload(Model))]: records },
      this.headers,
      Object.assign({ Model }, options)
    )) as MemoriaModel[];
  }

  // DELETE /people/bulk
  static async deleteAll(
    Model: typeof MemoriaModel,
    records: ModelRefOrInstance[],
    options?: ModelBuildOptions
  ): Promise<MemoriaModel[]> {
    await this.http.delete(
      `${this.host}/${this.pathForType(Model)}/bulk`,
      { [pluralize(Model.Serializer.modelKeyNameForPayload(Model))]: records },
      this.headers,
      Object.assign({ Model }, options)
    );

    return this.unloadAll(Model, records);
  }

  static fetchRelationship(
    model: MemoriaModel,
    relationshipName: string,
    relationshipMetadata?: RelationshipMetadata
  ) {
    let Model = model.constructor as typeof MemoriaModel;
    let metadata =
      relationshipMetadata ||
      RelationshipSchema.getRelationshipMetadataFor(Model, relationshipName);
    let { relationshipType, RelationshipClass, reverseRelationshipName } = metadata;

    return new RelationshipPromise(async (resolve, reject) => {
      if (relationshipType === "BelongsTo") {
        let foreignKeyColumnName = metadata.foreignKeyColumnName as string;
        if (!model[foreignKeyColumnName]) {
          return resolve(null);
        }

        return resolve(await RelationshipClass.find(model[foreignKeyColumnName]));
      } else if (relationshipType === "OneToOne") {
        if (reverseRelationshipName) {
          let reverseRelationshipForeignKeyColumnName = metadata.reverseRelationshipForeignKeyColumnName as string;

          return resolve(
            await RelationshipClass.findBy({
              [reverseRelationshipForeignKeyColumnName]: model[Model.primaryKeyName],
            })
          );
        }

        return reject();
      } else if (relationshipType === "HasMany") {
        if (reverseRelationshipName) {
          let foreignKeyColumnName = metadata.foreignKeyColumnName as string;
          return resolve(
            await RelationshipClass.findAll({ [foreignKeyColumnName]: model[Model.primaryKeyName] })
          );
        }

        return reject();
      }

      return reject("ManyToMany fetchRelationship not implemented yet");
    });
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
