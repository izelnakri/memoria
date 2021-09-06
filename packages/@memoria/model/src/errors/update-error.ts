import ModelError, { ErrorMetadata } from "../error.js";
import Changeset from "../changeset.js";

export default class UpdateError extends Error {
  changeset: Changeset;

  constructor(changeset: Changeset, errorMetadata: ErrorMetadata) {
    changeset.errors.push(new ModelError(changeset.data, errorMetadata));

    let message = `${errorMetadata.modelName} ${errorMetadata.attribute} ${errorMetadata.message}`;

    super(message);

    this.message = message;
    this.name = "Memoria.UpdateError";
    this.changeset = changeset;
  }
}
