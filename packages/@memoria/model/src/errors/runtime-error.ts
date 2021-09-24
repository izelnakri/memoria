import Model from "../model.js";
import ModelError, { ErrorMetadata } from "../error.js";
import Changeset from "../changeset.js";

// NOTE: should I make RuntimeError accept *any* object?
export default class RuntimeError extends Error {
  constructor(reference: Changeset | string, metadata?: ErrorMetadata | string) {
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
        let message = `${error.modelName}:${error.id} ${error.attribute} ${error.message}`;

        reference.errors.push(new ModelError(reference.data as Model, error));

        super(message);

        this.message = message;
      }

      Object.assign(this, reference);

      this.name = "Memoria.RuntimeError";
    }
  }
}
