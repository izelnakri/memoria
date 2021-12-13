import { camelize, pluralize, underscore } from "inflected";
import { Config, RuntimeError } from "./index.js";
import type { ModelReferenceShape } from "./index.js";
import type MemoriaModel from "./model.js";

const DATE_COLUMN_DEFINITIONS = new Set([
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

// TODO: implement array version for HasMany maybe..
// also embeds might be completely redundant due to new model instances
type EmbedTree = { [embedKeyName: string]: typeof MemoriaModel };

// NOTE: in future:
// static serializer(model) {
//   let json = super.serializer(model);
//
//   return Object.assign(json, { comments: model.comments });
// }

// EXAMPLE: User.Serializer.embed(User, { comments: Comment });
export default class Serializer {
  static embeds: EmbedTree = {};

  static embed(
    Model: typeof MemoriaModel,
    relationship: { [key: string]: typeof MemoriaModel }
  ): object {
    if (typeof relationship !== "object" || relationship.name) {
      throw new RuntimeError(
        `${Model.name}.Serializer.embed(relationshipObject) requires an object as a parameter: { relationshipKey: $RelationshipModel }`
      );
    }

    const key = Object.keys(relationship)[0];

    if (!relationship[key]) {
      throw new RuntimeError(
        `${Model.name}.Serializer.embed(relationship) fails: ${key} Model reference is not a valid. Please put a valid $ModelName to Serializer.embed({ $ModelName: typeof Model })`
      );
    }

    return Object.assign(Model.Serializer.embeds, relationship);
  }

  static modelKeyNameFromPayload(Model: typeof MemoriaModel) {
    return camelize(Model.name, false);
  }

  static modelKeyNameForPayload(Model: typeof MemoriaModel) {
    return this.modelKeyNameFromPayload(Model);
  }

  static keyNameFromPayloadFormat(keyName: string) {
    return keyName;
  }

  static keyNameForPayloadFormat(keyName: string) {
    return keyName;
  }

  static getEmbeddedRelationship(
    Model: typeof MemoriaModel,
    parentObject: ModelReferenceShape,
    relationshipName: string,
    relationshipModel?: typeof MemoriaModel
  ) {
    if (Array.isArray(parentObject)) {
      throw new RuntimeError(
        `${Model.name}.Serializer.getEmbeddedRelationship(Model, parentObject) expects parentObject input to be an object not an array`
      );
    }

    const targetRelationshipModel: typeof MemoriaModel =
      relationshipModel || Model.Serializer.embeds[relationshipName];
    const hasManyRelationship = pluralize(relationshipName) === relationshipName;

    if (!targetRelationshipModel) {
      throw new RuntimeError(
        `${relationshipName} relationship could not be found on ${Model.name} model. Please put the ${relationshipName} Model object as the fourth parameter to ${Model.name}.Serializer.getEmbeddedRelationship function`
      );
    } else if (hasManyRelationship) {
      if (parentObject.id) {
        const hasManyIDRecords = targetRelationshipModel.Adapter.peekAll(targetRelationshipModel, {
          [`${underscore(Model.name)}_id`]: parentObject.id,
        });

        return hasManyIDRecords.length > 0
          ? sortByIdOrUUID(
              hasManyIDRecords,
              (hasManyIDRecords[0].constructor as typeof MemoriaModel).primaryKeyName
            )
          : [];
      } else if (parentObject.uuid) {
        const hasManyUUIDRecords = targetRelationshipModel.Adapter.peekAll(
          targetRelationshipModel,
          {
            [`${underscore(Model.name)}_uuid`]: parentObject.uuid,
          }
        );

        return hasManyUUIDRecords.length > 0
          ? sortByIdOrUUID(
              hasManyUUIDRecords,
              (hasManyUUIDRecords[0].constructor as typeof MemoriaModel).primaryKeyName
            )
          : [];
      }
    }

    // TODO: get this from foreign key metadata in future:
    const objectRef =
      parentObject[`${underscore(relationshipName)}_id`] ||
      parentObject[`${underscore(relationshipName)}_uuid`] ||
      parentObject[`${underscore(targetRelationshipModel.name)}_id`] ||
      parentObject[`${underscore(targetRelationshipModel.name)}_uuid`];

    if (objectRef && typeof objectRef === "number") {
      return targetRelationshipModel.Adapter.peek(targetRelationshipModel, objectRef);
    } else if (objectRef) {
      return targetRelationshipModel.Adapter.peekBy(targetRelationshipModel, { uuid: objectRef });
    }

    if (parentObject.id) {
      return targetRelationshipModel.Adapter.peekBy(targetRelationshipModel, {
        [`${underscore(Model.name)}_id`]: parentObject.id,
      });
    } else if (parentObject.uuid) {
      return targetRelationshipModel.Adapter.peekBy(targetRelationshipModel, {
        [`${underscore(Model.name)}_uuid`]: parentObject.uuid,
      });
    }
  }

  static serialize(Model: typeof MemoriaModel, model: MemoriaModel) {
    let objectWithAllColumns = Array.from(Model.columnNames).reduce((result, columnName) => {
      if (model[columnName] === undefined) {
        result[columnName] = null;
      } else {
        result[columnName] = model[columnName];
      }

      return result;
    }, {});
    return Object.keys(Model.Serializer.embeds).reduce((result, embedKey) => {
      let embedModel = Model.Serializer.embeds[embedKey];
      let embeddedRecords = this.getEmbeddedRelationship(
        Model,
        model as ModelReferenceShape,
        embedKey,
        embedModel
      ) as MemoriaModel | MemoriaModel[];

      return Object.assign({}, result, { [embedKey]: embedModel.serializer(embeddedRecords) });
    }, objectWithAllColumns);
  }
}

function sortByIdOrUUID(records: MemoriaModel[], primaryColumnName: string) {
  // TODO: Optimize, READ MDN Docs on default sorting algorithm, implement it for objects
  let sortedIds = records.map((record) => record[primaryColumnName]).sort();
  return sortedIds.map((id) => records.find((record) => record[primaryColumnName] === id));
}

export function transformValue(Model: typeof MemoriaModel, keyName: string, value: any) {
  if (value === undefined) {
    return null;
  } else if (
    typeof value === "string" &&
    DATE_COLUMN_DEFINITIONS.has(Config.getSchema(Model).columns[keyName].type as string)
  ) {
    return new Date(value);
  }

  return value;
}

// keyForAttribute() {}

// attrs = {
//   familyName: 'familyNameOfPerson'
// }
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

// links: {} following
