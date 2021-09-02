import MemoriaModel from "./model.js";

type primaryKey = number | string;

interface ErrorInterface {
  id?: primaryKey;
  modelName: string;
  attribute: string;
  message: string;
}

type ErrorCacheItem = {
  [id: string]: ModelError[];
};

type ErrorCache = {
  [modelName: string]: ErrorCacheItem[];
};

// errors can be individual, changeset scope them to per action, instead of Model

// NOTE: when to evict this cache on the server side? probably a timeout on each based on config,
export class ModelError {
  id?: primaryKey;
  reference?: MemoriaModel;
  // TODO: there has to be a reference to records with no id
  modelName: string;
  attribute: string;
  message: string;

  static cache: ErrorCache = {}; // { id: []

  // static has(attribute: string) {}

  // static remove(attribute: string) {}

  // static errorsFor(attribute: string) {}

  // static add(attibute: string, messages: string[]) {}
}

// TODO: should this extend from JS Error?
// TODO: should I create Model.Error interface or one error interface?(probably both)
export default class MemoriaError {
  constructor(
    model: typeof MemoriaModel | MemoriaModel | typeof ModelError,
    options: ErrorInterface
  ) {
    if (!options.id) {
      throw new Error("MemoriaError: id missing during MemoriaError instance initialization");
    } else if (!options.modelName) {
      throw new Error(
        "MemoriaError: modelName missing during MemoriaError instance initialization"
      );
    } else if (!options.attribute) {
      throw new Error(
        "MemoriaError: attribute missing during MemoriaError instance initialization"
      );
    } else if (!options.message) {
      throw new Error("MemoriaError: message missing during MemoriaError instance initialization");
    }

    // this.id = options.id;
    // this.modelName = options.modelName; // TODO: instead this could be Model.Error class
    // this.attribute = options.attribute;
    // this.message = options.message;

    this.add(this.attribute, [this.message]);
    // TODO: add this to

    return Object.freeze(this);
  }

  static cache: ErrorCache = {}; // { id: []

  // static has(Model: typeof MemoriaModel, attribute: string) {}

  // static remove(Model: typeof MemoriaModel, attribute: string) {}

  // static errorsFor(Model: typeof MemoriaModel, attribute: string) {}

  // static add(Model: typeof MemoriaModel, attibute: string, messages: string[]) {}
}

// new User.Error({ id: '', attribute: '', message: '' });
// new Memoria.Error(User | User.Error, { id: 4, attribute: 'password', message: 'too short' });

// User.Error.cache
// User.Error.errorsFor('firstname')
// Memoria.Error.errorsFor(User, 'firstName');

// Memoria.Model
// Memoria.Server
// Memoria.Error
// Memoria.Adapter
// Memoria.Serializer
// Memoria.Config
// Memoria.Utils
