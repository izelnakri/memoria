export function Index(_indexNameOrColumnList?, _columnListOrOptions?) {
  return () => {};
}

export function Unique(_indexNameOrColumnList?, _columnList?) {
  return () => {};
}

export function Check(_checkExpression) {
  return () => {};
}

export function Exclusion(_exclusingQuery) {
  return () => {};
}

export function Generated(_strategy) {
  return () => {};
}

export default {
  Index,
  Unique,
  Check,
  Exclusion,
  Generated,
};

// @Transaction
