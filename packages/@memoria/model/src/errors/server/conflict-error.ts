import ChangesetError from "../changeset-error.js";
import type Changeset from "../../changeset.js";
import type { ChangesetErrorItem } from "../../changeset.js";

export default class ConflictError extends ChangesetError {
  constructor(
    reference: Changeset,
    errorMetadata?: ChangesetErrorItem | ChangesetErrorItem[] | string,
    errorMessage?: string
  ) {
    let providedMessage = typeof errorMetadata === "string" ? errorMetadata : errorMessage;
    let targetMessage = providedMessage || "Web server responds with a conflict error";

    super(reference, errorMetadata, "Memoria.ConflictError", targetMessage);

    return this;
  }
}
