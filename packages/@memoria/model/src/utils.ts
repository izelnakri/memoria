import type Model from "./index.js";
import Cache from "./cache.js";
import { Changeset, RuntimeError } from "./index.js";

interface AnyObject {
  [key: string]: any;
}

const firstDotIndexCache = new Cache<string, number>(1000, (key) => key.indexOf("."));

function isPath(path: any): boolean {
  return typeof path === "string" && firstDotIndexCache.get(path) !== -1;
}

export function clearObject(object: AnyObject) {
  for (let key in object) delete object[key];

  return object;
}

export function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;

    return v.toString(16);
  });
}
// typeorm uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(msg) if false reimplement

export function primaryKeyTypeSafetyCheck(
  model: Model | AnyObject,
  ModelDefinition?: typeof Model
) {
  let Klass = ModelDefinition || (model.constructor as typeof Model);
  let primaryKeyIsValid =
    Klass.primaryKeyType === "id"
      ? typeof model[Klass.primaryKeyName] === "number"
      : typeof model[Klass.primaryKeyName] === "string";

  if (!primaryKeyIsValid) {
    throw new RuntimeError(
      new Changeset(Klass.build(model)),
      `Wrong ${Klass.primaryKeyName} input type: entered ${typeof model[
        Klass.primaryKeyName
      ]} instead of ${Klass.primaryKeyType}`
    );
  }

  return model;
}

export function assert(errorMessage: string, condition: boolean) {
  if (!condition) {
    throw new RuntimeError(errorMessage);
  }
}

export function get(obj: object, keyName: string) {
  assert(
    `.get() must be called with two arguments; an object and a property key`,
    arguments.length === 2
  );
  assert(
    `.get() cannot call get with '${keyName}' on an undefined object.`,
    obj !== undefined && obj !== null
  );
  assert(
    `.get() the key provided to get must be a string or number, you passed ${keyName}`,
    typeof keyName === "string" || (typeof keyName === "number" && !isNaN(keyName))
  );
  assert(
    `'this' in paths is not supported`,
    typeof keyName !== "string" || keyName.lastIndexOf("this.", 0) !== 0
  );

  // NOTE: removed isDestroyed check
  // NOTE: this used to always call _getProp and refresh glimmer tracking consumeTag(tagFor(obj, keyName)):
  // packages/@ember/-internals/metal/lib/property_get.ts

  return isPath(keyName) ? getPath(obj, keyName) : obj[keyName];
}

function getPath(obj: AnyObject, keyName: string | string[]) {
  let parts = typeof keyName === "string" ? keyName.split(".") : keyName; // NOTE: create here RuntimeError
  for (let i = 0; i < parts.length; i++) {
    if (obj === undefined || obj === null) {
      return undefined;
    }

    obj = obj[parts[i]]; // NOTE: this was _getProp() call before
  }

  return obj;
}

export function set<T = unknown>(obj: object, keyName: string, value: T, tolerant?: boolean): T {
  assert(
    `.set() must be called with three or four arguments; an object, a property key, a value and tolerant true/false`,
    arguments.length === 3 || arguments.length === 4
  );
  assert(
    `.set() cannot call with '${keyName}' on an undefined object.`,
    (obj && typeof obj === "object") || typeof obj === "function"
  );
  assert(
    `.set() the key provided to set must be a string or number, you passed ${keyName}`,
    typeof keyName === "string" || (typeof keyName === "number" && !isNaN(keyName))
  );
  assert(
    `.set() 'this' in paths is not supported`,
    typeof keyName !== "string" || keyName.lastIndexOf("this.", 0) !== 0
  );

  // NOTE: removed isDestroyed check
  // NOTE: removed all other logic

  if (isPath(keyName)) {
    let parts = keyName.split(".");
    let targetKeyName = parts.pop()!;

    assert("Property set failed: You passed an empty path", targetKeyName.trim().length > 0);

    let root = getPath(obj, parts);
    if (root !== null && root !== undefined) {
      return set(root, targetKeyName, value);
    } else if (!tolerant) {
      throw new RuntimeError(
        `.set() property set failed: object in path "${parts.join(".")}" could not be found.`
      );
    }
  }

  obj[keyName] = value;
  return value;
}

// NOTE: Remove if not needed in future for tracking purposes
export function getProperties(obj: object, keys?: string[]): object {
  if (keys && Array.isArray(keys)) {
    return keys.reduce((result, propertyName) => {
      result[propertyName] = get(obj, propertyName);

      return result;
    }, {});
  }

  return {};
}

export function setProperties<TProperties extends { [key: string]: any }>(
  obj: object,
  properties: TProperties
): TProperties {
  if (properties === null || typeof properties !== "object") {
    return properties;
  }

  let props = Object.keys(properties);
  for (let i = 0; i < props.length; i++) {
    set(obj, props[i], properties[props[i]]);
  }

  return properties;
}

// TODO: in future we could typecast based on schema definitions
// export function runtimeTypecheck(Model: typeof Model, columnName: string, value: any) {
//   // let columnType =
//   if (columnType === 'id') {
//
//   }
// }

// export type PrimaryGeneratedColumnType = "int" // mysql, mssql, oracle, sqlite, sap
//     |"int2" // postgres, sqlite, cockroachdb
//     |"int4" // postgres, cockroachdb
//     |"int8" // postgres, sqlite, cockroachdb
//     |"integer" // postgres, oracle, sqlite, mysql, cockroachdb, sap
//     |"smallint" // mysql, postgres, mssql, oracle, sqlite, cockroachdb, sap
//     |"bigint" // mysql, postgres, mssql, sqlite, cockroachdb, sap
//     |"decimal" // mysql, postgres, mssql, sqlite, sap
//     |"numeric" // postgres, mssql, sqlite

/**
 * Column types where spatial properties are used.
 */
// export type SpatialColumnType = "geometry" // postgres
//     |"geography" // postgres

/**
 * Column types where precision and scale properties are used.
 */
// export type WithPrecisionColumnType = "float" // mysql, mssql, oracle, sqlite
//     |"decimal" // mysql, postgres, mssql, sqlite
//     |"numeric" // postgres, mssql, sqlite, mysql
//     |"real" // mysql, postgres, mssql, oracle, sqlite, cockroachdb, sap
//     |"double precision" // postgres, oracle, sqlite, mysql, cockroachdb
//     |"time" // mysql, postgres, mssql, cockroachdb
//     |"time with time zone" // postgres, cockroachdb
//     |"time without time zone" // postgres
//     |"timestamp" // mysql, postgres, mssql, oracle, cockroachdb
//     |"timestamp without time zone" // postgres, cockroachdb
//     |"timestamp with time zone" // postgres, oracle, cockroachdb

/**
 * Column types where column length is used.
 */
// export type WithLengthColumnType = "character varying" // postgres, cockroachdb
//     |"character" // mysql, postgres, sqlite, cockroachdb
//     |"varchar" // mysql, postgres, mssql, sqlite, cockroachdb
//     |"char" // mysql, postgres, mssql, oracle, cockroachdb, sap

// export type SimpleColumnType =
//     "simple-array" // typeorm-specific, automatically mapped to string
//     // |"string" // typeorm-specific, automatically mapped to varchar depend on platform

//     |"simple-json" // typeorm-specific, automatically mapped to string

//     |"simple-enum" // typeorm-specific, automatically mapped to string

//     // numeric types
//     |"int2" // postgres, sqlite, cockroachdb
//     |"integer" // postgres, oracle, sqlite, cockroachdb
//     |"int4" // postgres, cockroachdb
//     |"int8" // postgres, sqlite, cockroachdb
//     |"float4" // postgres, cockroachdb
//     |"float8" // postgres, cockroachdb
//     |"money" // postgres, mssql

//     // boolean types
//     |"boolean" // postgres, sqlite, mysql, cockroachdb
//     |"bool" // postgres, mysql, cockroachdb

//     // text/binary types
//     |"text" // mysql, postgres, mssql, sqlite, cockroachdb, sap
//     |"citext" // postgres
//     |"hstore" // postgres
//     |"bytea" // postgres, cockroachdb

//     // date types
//     |"timetz" // postgres
//     |"timestamptz" // postgres, cockroachdb
//     |"date" // mysql, postgres, mssql, oracle, sqlite
//     |"interval" // postgres, cockroachdb

//     // geometric types
//     |"point" // postgres, mysql
//     |"line" // postgres
//     |"lseg" // postgres
//     |"box" // postgres
//     |"circle" // postgres
//     |"path" // postgres
//     |"polygon" // postgres, mysql

//     // range types
//     |"int4range" // postgres
//     |"int8range" // postgres
//     |"numrange" // postgres
//     |"tsrange" // postgres
//     |"tstzrange" // postgres
//     |"daterange" // postgres

//     // other types
//     |"enum" // mysql, postgres
//     |"cidr" // postgres
//     |"inet" // postgres, cockroachdb
//     |"macaddr"// postgres
//     |"bit" // postgres, mssql
//     |"bit varying" // postgres
//     |"varbit"// postgres
//     |"tsvector" // postgres
//     |"tsquery" // postgres
//     |"uuid" // postgres, cockroachdb
//     |"xml" // mssql, postgres
//     |"json" // mysql, postgres, cockroachdb
//     |"jsonb" // postgres, cockroachdb
//     |"cube" // postgres
//     |"ltree"; // postgres
