import MemoriaModel from "@memoria/model";
import type { ModelRef } from "@memoria/model";
import kleur from "kleur";

export function primaryKeyTypeSafetyCheck(
  targetPrimaryKeyType: string,
  primaryKey: number | string,
  modelName: string
) {
  const primaryKeyType = typeof primaryKey;

  if (targetPrimaryKeyType === "id" && primaryKeyType !== "number") {
    throw new Error(
      kleur.red(
        `[Memoria] ${modelName} model primaryKey type is 'id'. Instead you've tried to enter id: ${primaryKey} with ${primaryKeyType} type`
      )
    );
  } else if (targetPrimaryKeyType === "uuid" && primaryKeyType !== "string") {
    throw new Error(
      kleur.red(
        `[Memoria] ${modelName} model primaryKey type is 'uuid'. Instead you've tried to enter uuid: ${primaryKey} with ${primaryKeyType} type`
      )
    );
  }

  return targetPrimaryKeyType;
}

type primaryKey = string | number;

export async function insertFixturesWithTypechecks(
  modelDefinition: typeof MemoriaModel,
  fixtures: ModelRef[]
) {
  let result = await fixtures.reduce(async (primaryKeysPromise: Promise<primaryKey[]>, fixture) => {
    let primaryKeys = await primaryKeysPromise;
    let modelName = modelDefinition.name;
    let primaryKey = (fixture.uuid ? "uuid" : null) || (fixture.id ? "id" : null);

    if (!primaryKey) {
      throw new Error(
        kleur.red(
          `[Memoria] DB ERROR: At least one of your ${modelName} fixtures missing a primary key. Please make sure all your ${modelName} fixtures have either id or uuid primaryKey`
        )
      );
    } else if (primaryKeys.includes(fixture[primaryKey])) {
      throw new Error(
        kleur.red(
          `[Memoria] DB ERROR: Duplication in ${modelName} fixtures with ${primaryKey}: ${fixture[primaryKey]}`
        )
      );
    }

    await modelDefinition.insert(fixture);
    primaryKeys.push(fixture[primaryKey]);

    return primaryKeys;
  }, Promise.resolve([]));

  return result;
}
