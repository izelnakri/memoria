import MemoriaModel, { Config } from "./index.js";

let DATE_COLUMN_DEFINITIONS = new Set([
  "date",
  "datetime", // mssql, mysql, sqlite
  "time", // mysql, postgres, mssql, cockroachdb
  "time with time zone", // postgres, cockroachdb
  "time without time zone", // postgres
  "timestamp", // mysql, postgres, mssql, oracle, cockroachdb
  "timestamp without time zone", // postgres, cockroachdb
  "timestamp with time zone", // postgres, oracle, cockroachdb
  "timestamp with local time zone", // oracle
  "timetz", // postgres
  "timestamptz", // postgres, cockroachdb
]);

export function transformValue(Model: typeof MemoriaModel, keyName: string, value: any) {
  if (
    typeof value === "string" &&
    DATE_COLUMN_DEFINITIONS.has(Config.getSchema(Model).columns[keyName].type as string)
  ) {
    return new Date(value);
  }

  return value;
}

// keyForAttribute() {}
//
// serialize(snapshot, options) {
//   super.serialize(...arguments);
// }
// normalize(store, primaryModelClass, payload, id, requestType) {
// payload.data.attributes.amount = payload.data.attributes.cost.amount;
// payload.data.attributes.currency = payload.data.attributes.cost.currency;

// delete payload.data.attributes.cost;

// return super.normalizeResponse(...arguments);
// }
//
// attrs = {
//   familyName: 'familyNameOfPerson'
// }
//
//
//  attrs = {
//   authors: {
//     serialize: 'records',
//     deserialize: 'records'
//   }
// };
// OR:
// attrs = {
//   authors: { embedded: 'always' }
// };

// attrs = {
//   author: {
//     serialize: false,
//     deserialize: 'records'
//   },
//   comments: {
//     deserialize: 'records',
//     serialize: 'ids'
//   }
// };
//
// normalizeResponse(store, primaryModelClass, payload, id, requestType) {
//     if (requestType === 'findRecord') {
//       return this.normalize(primaryModelClass, payload);
//     } else {
//       return payload.reduce(function(documentHash, item) {
//         let { data, included } = this.normalize(primaryModelClass, item);
//         documentHash.included.push(...included);
//         documentHash.data.push(data);
//         return documentHash;
//       }, { data: [], included: [] })
//     }
//   }

// serialize(snapshot, options) {
//   let json = {
//     id: snapshot.id
//   };

//   snapshot.eachAttribute((key, attribute) => {
//     json[key] = snapshot.attr(key);
//   });

//   snapshot.eachRelationship((key, relationship) => {
//     if (relationship.kind === 'belongsTo') {
//       json[key] = snapshot.belongsTo(key, { id: true });
//     } else if (relationship.kind === 'hasMany') {
//       json[key] = snapshot.hasMany(key, { ids: true });
//     }
//   });

//   return json;
// },
// links: {} following
