import type Model from "@memoria/model";
import kleur from "kleur";

export function primaryKeyTypeSafetyCheck(Class: typeof Model, modelPrimaryKey: any) {
  let primaryKeyIsValid =
    Class.primaryKeyType === "id"
      ? typeof modelPrimaryKey === "number"
      : typeof modelPrimaryKey === "string";
  if (!primaryKeyIsValid) {
    throw new Error(
      kleur.red(
        `[Memoria] ${Class.name}.primaryKeyType is '${
          Class.primaryKeyType
        }'. Instead you've tried: ${modelPrimaryKey} with ${typeof modelPrimaryKey} type`
      )
    );
  }
}
