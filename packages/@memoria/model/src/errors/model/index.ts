import Model from "../../model.js";

// TODO: how can we lookup, an unsaved(without id) errors?
// basically it is the changeset
// TODO: do we even need to cache the errors? instead push them to $instance.errors and remove them

type primaryKey = number | string;

export interface ErrorMetadata {
  id?: null | primaryKey;
  modelName: string;
  attribute: string;
  message: string;
}

// type ErrorClassCache = { [key: string]: typeof ModelError };
// type ErrorCacheItem = {
//   [modelName: string]: ModelError[];
// };

// type ErrorCache = {
//   [modelName: string]: ErrorCacheItem[];
// };

export default class ModelError extends Error {
  id?: primaryKey | null;
  modelName: string;
  attribute: string;
  message: string;
  // reference?: Model;
  // TODO: there has to be a reference to records with no id

  static has(model: Model, attribute: string) {
    return model.errors.some((error) => error.attribute === attribute);
  }

  static remove(model: Model, attribute: string) {
    model.errors = model.errors.filter((error) => error.attribute !== attribute);

    return model.errors;
  }

  static errorsFor(model: Model, attribute?: string) {
    return attribute ? model.errors.filter((error) => error.attribute === attribute) : model.errors;
  }

  static add(model: Model, attribute: string, messages: string[]) {
    let Class = model.constructor as typeof Model;

    return messages.map((message) => {
      return new ModelError(model, {
        id: model[Class.primaryKeyName],
        modelName: Class.name,
        attribute,
        message,
      });
    });
  }

  constructor(model: Model, errorMetadata: ErrorMetadata) {
    if (!model) {
      throw new Error(
        "ModelError should pass an memoria model instance when creating new MemoriaError($model, errorMetadata)"
      );
    } else if (!errorMetadata.attribute) {
      throw new Error("ModelError: attribute missing during MemoriaError instance initialization");
    } else if (!errorMetadata.message) {
      throw new Error("ModelError: message missing during MemoriaError instance initialization");
    }

    super(errorMetadata.message);

    this.name = "ModelError";
    this.id = errorMetadata.id || null;
    this.modelName = model.constructor.name; // TODO: instead this could be Model.Error class
    this.attribute = errorMetadata.attribute;
    this.message = errorMetadata.message;

    let error = Object.freeze(this);

    model.errors.push(error);

    return error;
  }
}

// problem is with every null object, do they get the same errors[]?

// export function createModelErrorClass(Model: typeof Model): typeof ModelError {
//   let errorClass = class extends ModelError {
//     static Model = Model;

//     static has(model: Model, attribute: string) {
//       // return super.has(this.Model, attribute);
//     }

//     static remove(model: Model, attribute: string) {
//       // return super.remove(this.Model, attribute);
//     }

//     static errorsFor(model: Model, attribute: string) {
//       // return super.errorsFor(this.Model, attribute);
//     }

//     static add(model: Model, attribute: string, messages: string[]) {
//       // return super.add(this.Model, attribute, messages);
//     }
//   };

//   return Object.defineProperty(errorClass, "name", { value: `${Model.name}Error` });
// }

// new User.Error(modelInstance, { id: '', attribute: '', message: '' }); Note; without instance
// new Memoria.ModelError(modelInstance, { id: 4, attribute: 'password', message: 'too short' });

// User.Error.errorsFor(userInstance, 'firstName')
// Memoria.ModelError.errorsFor(userInstance, 'firstName');

// Memoria.Model
// Memoria.Server
// Memoria.Error
// Memoria.Adapter
// Memoria.Serializer
// Memoria.Schema
// Memoria.DB
// Memoria.Utils
