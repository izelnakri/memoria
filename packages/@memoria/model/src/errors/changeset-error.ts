import Model from "../model.js";
import ModelError, { ErrorMetadata } from "../error.js";
import Changeset, { ChangesetAction, JSObject } from "../changeset.js";

// already-exists,
// check-constraint, foreign-key-constaint, not-null-constraint, unique-constraint
export default class ChangesetError extends Error {
  message: string;

  action: ChangesetAction;
  changes: JSObject;
  data: Model;
  date: Date;
  errors: ModelError[]; // [{ attribute: '', message: '', modelName: '', id: '' }] // reference()

  constructor(
    modelOrChangeset: Model | Changeset,
    errorMetadata: ErrorMetadata,
    errorName: string
  ) {
    let changeset =
      modelOrChangeset instanceof Changeset ? modelOrChangeset : new Changeset(modelOrChangeset);

    let error = errorMetadata ? new ModelError(changeset.data, errorMetadata) : changeset.errors[0];
    if (errorMetadata) {
      changeset.errors.push(error);
    }

    let message = `${error.modelName}:${error.id} ${error.attribute} ${error.message}`;

    super(message);

    Object.assign(this, changeset);

    this.message = message;
    this.name = errorName;

    return Object.freeze(this);
  }
}
