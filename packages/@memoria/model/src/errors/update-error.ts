import ChangesetError from "./changeset-error.js";
import type { ErrorMetadata } from "../error.js";
import type Changeset from "../changeset.js";

export default class UpdateError extends ChangesetError {
  constructor(changeset: Changeset, errorMetadata: ErrorMetadata) {
    super(changeset, errorMetadata, "Memoria.UpdateError");

    return this;
  }
}
