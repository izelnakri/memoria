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
    errorMetadata?: ErrorMetadata | ErrorMetadata[],
    errorName?: string
  ) {
    let changeset =
      modelOrChangeset instanceof Changeset ? modelOrChangeset : new Changeset(modelOrChangeset);

    let targetErrorReference;
    if (!errorMetadata) {
      targetErrorReference = changeset.errors[0];
    } else if (Array.isArray(errorMetadata)) {
      let modelErrors = errorMetadata.map((errorMetadata) => {
        let modelError = new ModelError(changeset.data, errorMetadata);
        changeset.errors.push(modelError);

        return modelError;
      });
      targetErrorReference = modelErrors[0];
    } else {
      targetErrorReference = new ModelError(changeset.data, errorMetadata);
      changeset.errors.push(targetErrorReference);
    }

    let message = `${targetErrorReference.modelName}:${targetErrorReference.id} ${targetErrorReference.attribute} ${targetErrorReference.message}`;

    super(message);

    Object.assign(this, changeset);

    this.message = message;
    this.name = errorName || "Memoria.ChangesetError";

    return Object.freeze(this);
  }
}
