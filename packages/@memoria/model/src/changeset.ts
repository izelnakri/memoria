import MemoriaModel from "./model.js";
import type MemoriaError from "./error.js";

type ChangesetAction = null | "insert" | "update" | "delete" | "replace" | "ignore"; // NOTE: taken from Ecto https://hexdocs.pm/ecto/Ecto.Changeset.html#module-the-ecto-changeset-struct
type JSObject = { [key: string]: any };

export default class Changeset {
  action: ChangesetAction;
  changes: JSObject;
  data: MemoriaModel;
  date: Date;
  errors: MemoriaError[]; // [{ attribute: '', message: '', modelName: '', id: '' }] // reference()
  isValid: boolean;
  // emptyValues: string[] = []; // NOTE: might be useful for default casting

  constructor(model: typeof MemoriaModel | Changeset, params: JSObject) {
    if (model instanceof MemoriaModel) {
      this.action = null;
      this.data = model;
      this.errors = [];
    } else {
      this.action = (model as Changeset).action;
      this.data = (model as Changeset).data;
      this.errors = (model as Changeset).errors;
    }

    this.changes = Object.keys(this.data).reduce((result, keyName) => {
      if (keyName in params && this.data[keyName] !== params[keyName]) {
        result[keyName] = params[keyName];
      }

      return result;
    }, {});
    this.isValid = this.errors.length === 0;
    this.date = new Date();

    return Object.freeze(this);
  }

  // validations
  // constraints = [];
  // prepare: [(t() -> t())],
  // required: string[] // Required fields
}

// #Ecto.Changeset<action: 'insert', changes: %{},
//  errors: [first_name: "can't be blank", last_name: "can't be blank"],
//  data: #Friends.Person<>, valid?: false>}

// errors can be individual, changeset scope them to per action, instead of Model

// %Post{}
// |> change()
// |> validate_format(:title, ~r/^\w+:\s/, message: "must start with a topic")
// |> validate_length(:title, max: 100)
// |> validations()
// #=> [
//   title: {:length, [ max: 100 ]},
//   title: {:format, ~r/^\w+:\s/}
// ]
