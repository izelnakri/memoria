import { Changeset, RuntimeError } from "@memoria/model";
import type Model from "@memoria/model";

export function primaryKeyTypeSafetyCheck(model: Model) {
  let Klass = model.constructor as typeof Model;
  let primaryKeyIsValid =
    Klass.primaryKeyType === "id"
      ? typeof model[Klass.primaryKeyName] === "number"
      : typeof model[Klass.primaryKeyName] === "string";

  if (!primaryKeyIsValid) {
    throw new RuntimeError(
      new Changeset(model),
      `Wrong ${Klass.primaryKeyName} input type: entered ${typeof model[
        Klass.primaryKeyName
      ]} instead of ${Klass.primaryKeyType}`
    );
  }
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
