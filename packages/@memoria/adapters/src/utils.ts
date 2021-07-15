import kleur from "kleur";

export function primaryKeyTypeSafetyCheck(targetPrimaryKeyType, primaryKey, modelName) {
  const primaryKeyType = typeof primaryKey;

  if (targetPrimaryKeyType === "id" && primaryKeyType !== "number") {
    throw new Error(
      kleur.red(
        `[Memserver] ${modelName} model primaryKey type is 'id'. Instead you've tried to enter id: ${primaryKey} with ${primaryKeyType} type`
      )
    );
  } else if (targetPrimaryKeyType === "uuid" && primaryKeyType !== "string") {
    throw new Error(
      kleur.red(
        `[Memserver] ${modelName} model primaryKey type is 'uuid'. Instead you've tried to enter uuid: ${primaryKey} with ${primaryKeyType} type`
      )
    );
  }

  return targetPrimaryKeyType;
}

export function insertFixturesWithTypechecks(modelDefinition, fixtures) {
  fixtures.reduce((primaryKeys, fixture) => {
    const modelName = modelDefinition.name;
    const primaryKey = (fixture.uuid ? "uuid" : null) || (fixture.id ? "id" : null);

    if (!primaryKey) {
      throw new Error(
        kleur.red(
          `[Memserver] DATABASE ERROR: At least one of your ${modelName} fixtures missing a primary key. Please make sure all your ${modelName} fixtures have either id or uuid primaryKey`
        )
      );
    } else if (primaryKeys.includes(fixture[primaryKey])) {
      throw new Error(
        kleur.red(
          `[Memserver] DATABASE ERROR: Duplication in ${modelName} fixtures with ${primaryKey}: ${fixture[primaryKey]}`
        )
      );
    }

    modelDefinition.insert(fixture);
    primaryKeys.push(fixture[primaryKey]);

    return primaryKeys;
  }, []);

  return fixtures;
}
