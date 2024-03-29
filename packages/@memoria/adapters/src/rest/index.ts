import { dasherize, pluralize, underscore } from "inflected"; // NOTE: make ember-inflector included in @emberx/string
import MemoriaModel, {
  RuntimeError,
  RelationshipPromise,
  RelationshipDB,
  RelationshipSchema,
} from "@memoria/model";
import type { PrimaryKey, ModelReference, ModelBuildOptions, RelationshipMetadata } from "@memoria/model";
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
  static host: string = typeof window === "undefined" ? "http://localhost:3000" : window.location?.origin;
  static headers: HTTPHeaders = {
    Accept: "application/json",
  };
  static logging: boolean = false;
  static timeout: number = 0;

  private static _http: typeof HTTP;

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
  ): Promise<MemoriaModel[] | MemoriaModel | null> {
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
  ): Promise<MemoriaModel | null> {
    let result = await this.http.get(
      `${this.host}/${this.pathForType(Model)}${buildQueryPath(query)}`,
      this.headers,
      Object.assign({ Model }, options)
    );

    return result && (result as MemoriaModel[]).length ? (result as MemoriaModel[])[0] : null;
  }

  // GET /people, or GET /people?keyName=value
  static async findAll(
    Model: typeof MemoriaModel,
    query: QueryObject,
    options?: ModelBuildOptions
  ): Promise<MemoriaModel[] | null> {
    return (await this.query(Model, query, options)) as MemoriaModel[] | null;
  }

  // GET /people, or GET /people?keyName=value
  static async query(
    Model: typeof MemoriaModel,
    query: QueryObject,
    options?: ModelBuildOptions
  ): Promise<MemoriaModel[] | MemoriaModel | null> {
    return (await this.http.get(
      `${this.host}/${this.pathForType(Model)}${buildQueryPath(query)}`,
      this.headers,
      Object.assign({ Model }, options)
    )) as MemoriaModel[] | MemoriaModel | null;
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

  static fetchRelationship(model: MemoriaModel, relationshipName: string, relationshipMetadata?: RelationshipMetadata) {
    let Model = model.constructor as typeof MemoriaModel;
    let metadata = relationshipMetadata || RelationshipSchema.getRelationshipMetadataFor(Model, relationshipName);
    let { SourceClass, relationshipType, RelationshipClass, reverseRelationshipName } = metadata;

    return new RelationshipPromise(async (resolve, reject) => {
      try {
        if (relationshipType === "BelongsTo") {
          let foreignKeyColumnName = metadata.foreignKeyColumnName as string;
          if (!model[foreignKeyColumnName]) {
            return resolve(RelationshipDB.cacheRelationship(model, metadata, null));
          }

          return resolve(
            RelationshipDB.cacheRelationship(
              model,
              metadata,
              await RelationshipClass.find(model[foreignKeyColumnName] as PrimaryKey)
            )
          );
        } else if (relationshipType === "OneToOne") {
          let reverseRelationshipForeignKeyColumnName = metadata.reverseRelationshipForeignKeyColumnName as string;
          if (!reverseRelationshipForeignKeyColumnName || !reverseRelationshipName) {
            throw new Error(
              `${RelationshipClass.name} missing a foreign key column or @BelongsTo declaration for ${SourceClass.name} on ${relationshipName} @hasOne relationship!`
            );
          }

          let relationship = model[Model.primaryKeyName]
            ? await RelationshipClass.findBy({
                [reverseRelationshipForeignKeyColumnName]: model[Model.primaryKeyName],
              })
            : null;

          return resolve(RelationshipDB.cacheRelationship(model, metadata, relationship));
        } else if (relationshipType === "HasMany") {
          let reverseRelationshipForeignKeyColumnName = metadata.reverseRelationshipForeignKeyColumnName as string;
          if (!reverseRelationshipForeignKeyColumnName) {
            throw new Error(
              `${RelationshipClass.name} missing a foreign key column for ${SourceClass.name} on ${relationshipName} @hasMany relationship!`
            );
          }

          let relationship = model[Model.primaryKeyName]
            ? await RelationshipClass.findAll({ [reverseRelationshipForeignKeyColumnName]: model[Model.primaryKeyName] })
            : [];
          // NOTE: peekAll generate new instances each time, this is a feature, not a bug(?). That way when we mutate foreignKey of existing record, hasMany array stays in tact

          return resolve(RelationshipDB.cacheRelationship(model, metadata, relationship));
        }
      } catch (error) {
        return reject(error);
      }

      return reject("ManyToMany fetchRelationship not implemented yet");
      // return reject(null); // NOTE: ManyToMany not implemented yet.
    });
  }
}

function buildQueryPath(queryObject?: JSObject) {
  if (!queryObject) {
    return "";
  }

  let findByKeys =
    queryObject instanceof MemoriaModel
      ? Array.from((queryObject.constructor as typeof MemoriaModel).columnNames)
      : Object.keys(queryObject);
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
