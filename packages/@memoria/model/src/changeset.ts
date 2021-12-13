import Model from "./model.js";
import ChangesetError from "./errors/changeset-error.js";
import RuntimeError from "./errors/runtime-error.js";

export type ChangesetAction = null | "insert" | "update" | "delete"; // | "replace" | "ignore"; // NOTE: taken from Ecto https://hexdocs.pm/ecto/Ecto.Changeset.html#module-the-ecto-changeset-struct
export type JSObject = { [key: string]: any };
export type primaryKey = number | string;
export interface ChangesetErrorItem {
  id?: primaryKey | null;
  modelName?: string; // optional
  attribute?: string; // optional
  message: string;
}

export default class Changeset {
  action: ChangesetAction;
  data: JSObject;
  changes: JSObject;
  date: Date;
  errors: ChangesetErrorItem[]; // [{ attribute: '', message: '', modelName: '', id: '' }] // reference()
  // emptyValues: string[] = []; // NOTE: might be useful for default casting

  constructor(model?: Model | Changeset, params?: JSObject) {
    if (!model) {
      this.action = null;
      this.data = {};
      this.changes = {};
      this.errors = [];
    } else if (model instanceof Model) {
      this.action = model.isNew ? "insert" : "update";
      this.data = model;
      this.errors = model.errors;

      // TODO: this could be problematic for relationship mutations
      let castedChanges = params
        ? Object.keys(this.data).reduce((result, keyName) => {
            if (keyName in params && this.data[keyName] !== params[keyName]) {
              result[keyName] = params[keyName];
            }

            return result;
          }, {})
        : {};
      this.changes = Object.assign({}, model.changes, castedChanges);
    } else {
      this.action = (model as Changeset).action;
      this.data = (model as Changeset).data;
      this.errors = (model as Changeset).errors;
      // TODO: this could be problematic for relationship mutations
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

  static serializer(changeset: Changeset | ChangesetError) {
    if (changeset instanceof Changeset || changeset instanceof ChangesetError) {
      return changeset.errors.map((error) => {
        const { id, modelName, attribute, message } = error;

        return { id, modelName, attribute, message };
      });
    }

    throw new RuntimeError("Changeset.serializer(param) called but param is not a changeset!");
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
