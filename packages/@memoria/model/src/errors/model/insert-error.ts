import ChangesetError from "../changeset-error.js";
import type { ErrorMetadata } from "./index.js";
import type Changeset from "../../changeset.js";

export default class InsertError extends ChangesetError {
  constructor(changeset: Changeset, errorMetadata: ErrorMetadata) {
    super(changeset, errorMetadata, "Memoria.InsertError");

    return this;
  }
}
