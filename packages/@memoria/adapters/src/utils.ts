import type MemoriaModel from "@memoria/model";

export function prepareTargetObjectFromInstance(model, Model: typeof MemoriaModel) {
  if (!(model instanceof Model)) {
    return { ...model };
  } else if (!model.isFrozen) {
    return model;
  }

  let target = {};
  Model.columnNames.forEach((columnName) => {
    target[columnName] = model[columnName];
  });
  model.fetchedRelationships.forEach((relationshipName) => {
    target[relationshipName] = model[relationshipName];
  });

  return target;
}
