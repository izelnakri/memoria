import { Changeset, RuntimeError } from "@memoria/model";
import type Model from "@memoria/model";

export function primaryKeyTypeSafetyCheck(model: Model) {
  let Klass = model.constructor as typeof Model;
  let primaryKeyIsValid =
    Klass.primaryKeyType === "id"
      ? typeof model[Klass.primaryKeyName] === "number"
      : typeof model[Klass.primaryKeyName] === "string";

  if (!primaryKeyIsValid) {
    throw new RuntimeError(
      new Changeset(model),
      `${Klass.name}.primaryKeyType is '${Klass.primaryKeyType}'. Instead you've tried: ${
        model[Klass.primaryKeyName]
      } with ${typeof model[Klass.primaryKeyName]} type`
    );
  }
}
