import ModelError, { ErrorMetadata } from "../error.js";
import Changeset from "../changeset.js";

export default class RuntimeError extends Error {
  constructor(reference?: Changeset | string, metadata?: ErrorMetadata | string) {
    if (typeof reference === "string") {
      super(reference);

      this.message = reference;
      this.name = "Memoria.RuntimeError";
    } else if (reference instanceof Changeset) {
      if (typeof metadata === "string") {
        super(metadata);

        this.message = metadata;
      } else {
        let error = metadata as ErrorMetadata;
        let message = `${error.modelName} ${error.attribute} ${error.message}`;

        reference.errors.push(new ModelError(reference.data, error));

        super(message);

        Object.assign(this, reference);

        this.message = message;
      }

      this.name = "Memoria.RuntimeError";
    }
  }
}
