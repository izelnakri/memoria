import ModelError, { ErrorMetadata } from "../error.js";
import Model from "../model.js";
import Changeset from "../changeset.js";

export default class RuntimeError extends Error {
  model?: Model;
  changeset?: Changeset;

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

        this.message = message;
      }

      this.changeset = reference;
      this.name = "Memoria.RuntimeError";
    }
  }
}

// .push() primaryKey doesnt exists, and provided changeset values useful
// NOTE: method called without valid primaryKey on peek, changeset is nice to see provided values? (maybe remove in future)
// NOTE: method called without primaryKey on update or doesnt exist in cache, changeset is nice to see provided values?
