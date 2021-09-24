import Model from "../model.js";
import ModelError, { ErrorMetadata } from "../error.js";
import Changeset, { ChangesetErrorItem, ChangesetAction, JSObject } from "../changeset.js";

// already-exists,
// check-constraint, foreign-key-constaint, not-null-constraint, unique-constraint
export default class ChangesetError extends Error {
  message: string;

  action: ChangesetAction;
  changes: JSObject;
  data: Model;
  date: Date;
  errors: ChangesetErrorItem[]; // [{ attribute: '', message: '', modelName: '', id: '' }] // reference()

  constructor(
    changeset: Changeset,
    errorMetadata?: ChangesetErrorItem | ChangesetErrorItem[] | string,
    errorName?: string,
    errorMessage?: string
  ) {
    appendErrorToChangesetIfNeeded(changeset, errorMetadata);

    let targetErrorReference = changeset.errors[0];
    let message =
      errorMessage ||
      `${targetErrorReference.modelName}:${targetErrorReference.id} ${targetErrorReference.attribute} ${targetErrorReference.message}`;

    super(message);

    Object.assign(this, changeset);

    this.message = message;
    this.name = errorName || "Memoria.ChangesetError";

    return Object.freeze(this);
  }
}

function appendErrorToChangesetIfNeeded(
  changeset: Changeset,
  errorMetadata?: ChangesetErrorItem | ChangesetErrorItem[] | string
) {
  let ChangesetModel = changeset.data instanceof Model ? changeset.data.constructor : null;

  if (!errorMetadata || typeof errorMetadata === "string") {
    return;
  }

  let targetErrors = Array.isArray(errorMetadata) ? errorMetadata : [errorMetadata];
  targetErrors.forEach((targetError) => {
    let errorFound = changeset.errors.find((errorItem) => {
      return (
        errorItem.id === targetError.id &&
        errorItem.modelName === targetError.modelName &&
        errorItem.attribute === targetError.attribute &&
        errorItem.message === targetError.message
      );
    });

    if (!errorFound) {
      changeset.errors.push(
        ChangesetModel
          ? new ModelError(changeset.data as Model, targetError as ErrorMetadata)
          : targetError
      );
    }
  });
}
