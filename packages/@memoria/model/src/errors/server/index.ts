import ChangesetError from "../changeset-error.js";
import type Changeset from "../../changeset.js";
import type { ChangesetErrorItem } from "../../changeset.js";

export default class ServerError extends ChangesetError {
  constructor(
    reference: Changeset,
    errorMetadata?: ChangesetErrorItem | ChangesetErrorItem[] | string,
    errorMessage?: string
  ) {
    let providedMessage = typeof errorMetadata === "string" ? errorMetadata : errorMessage;
    let targetMessage = providedMessage || "Web server responds with an error";

    super(reference, errorMetadata, "Memoria.ServerError", targetMessage);

    return this;
  }
}
