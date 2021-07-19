export function Index(_indexNameOrColumnList?, _columnListOrOptions?) {}

export function Unique(_indexNameOrColumnList?, _columnList?) {} // NOTE: maybe do this in future

export function Check(_checkExpression) {}

export function Exclusion(_exclusingQuery) {}

export function Generated(_strategy) {}

export default {
  Index,
  Unique,
  Check,
  Exclusion,
  Generated,
};

// @Transaction
