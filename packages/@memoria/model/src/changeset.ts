import MemoriaModel from "./model.js";
import type MemoriaError from "./error.js";
import ChangesetError from "./errors/changeset-error.js";

export type ChangesetAction = null | "insert" | "update" | "delete"; // | "replace" | "ignore"; // NOTE: taken from Ecto https://hexdocs.pm/ecto/Ecto.Changeset.html#module-the-ecto-changeset-struct
export type JSObject = { [key: string]: any };

export default class Changeset {
  action: ChangesetAction;
  changes: JSObject;
  data: MemoriaModel;
  date: Date;
  errors: MemoriaError[]; // [{ attribute: '', message: '', modelName: '', id: '' }] // reference()
  // emptyValues: string[] = []; // NOTE: might be useful for default casting

  constructor(model: MemoriaModel | Changeset, params?: JSObject) {
    if (model instanceof MemoriaModel) {
      this.action = null;
      this.data = model;
      this.errors = [];
      this.changes = params
        ? Object.keys(this.data).reduce((result, keyName) => {
            if (keyName in params && this.data[keyName] !== params[keyName]) {
              result[keyName] = params[keyName];
            }

            return result;
          }, {})
        : {};
    } else {
      this.action = (model as Changeset).action;
      this.data = (model as Changeset).data;
      this.errors = (model as Changeset).errors;
      this.changes = params
        ? Object.keys(this.data).reduce((result, keyName) => {
            if (keyName in params && this.data[keyName] !== params[keyName]) {
              result[keyName] = params[keyName];
            } else if (keyName in model.changes) {
              result[keyName] = model.changes[keyName];
            }

            return result;
          }, {})
        : model.changes;
    }

    this.date = new Date();

    return Object.freeze(this);
  }

  get isValid() {
    return this.errors.length === 0;
  }

  static assign(changeset: Changeset, changes: JSObject) {
    return Object.assign(Object.create(Object.getPrototypeOf(changeset)), changeset, changes);
  }

  static serialize(changeset: Changeset | ChangesetError) {
    if (changeset instanceof Changeset || changeset instanceof ChangesetError) {
      return changeset.errors.map((error) => {
        const { id, modelName, attribute, message } = error;

        return { id, modelName, attribute, message };
      });
    }

    // throw new SerializationError(
  }
}

// validations
// constraints = [];
// prepare: [(t() -> t())],
// required: string[] // Required fields

// %Post{}
// |> change()
// |> validate_format(:title, ~r/^\w+:\s/, message: "must start with a topic")
// |> validate_length(:title, max: 100)
// |> validations()
// #=> [
//   title: {:length, [ max: 100 ]},
//   title: {:format, ~r/^\w+:\s/}
// ]

// Old Decision: only cache on ModelError.Cache[modelName:id] = Set($ModelError)

// MemoriaError

// ModelError

// ----
// Changeset static cache(why? could allow timetravel on valid ones(maybe too much events)), no
// ---

// Changeset
//  |
//   ---> [
//    ModelError,
//    ModelError
//  ]
