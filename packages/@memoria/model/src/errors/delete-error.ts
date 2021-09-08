import ChangesetError from "./changeset-error.js";
import type Model from "../model.js";
import type { ErrorMetadata } from "../error.js";
import type Changeset from "../changeset.js";

export default class DeleteError extends ChangesetError {
  constructor(modelOrChangeset: Model | Changeset, errorMetadata: ErrorMetadata) {
    super(modelOrChangeset, errorMetadata, "Memoria.DeleteError");

    return this;
  }
}
