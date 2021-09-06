import ModelError, { ErrorMetadata } from "../error.js";
import Changeset from "../changeset.js";

// already-exists,
// check-constraint, foreign-key-constaint, not-null-constraint, unique-constraint
export default class CacheError extends Error {
  changeset: Changeset;

  constructor(changeset: Changeset, errorMetadata: ErrorMetadata) {
    changeset.errors.push(new ModelError(changeset.data, errorMetadata));

    let message = `${errorMetadata.modelName} ${errorMetadata.attribute} ${errorMetadata.message}`;

    super(message);

    this.message = message;
    this.name = "Memoria.CacheError";
    this.changeset = changeset;
  }
}
