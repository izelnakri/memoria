import { ChangesetError } from "@memoria/model";
import type { Changeset, ChangesetErrorItem } from "@memoria/model";

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
