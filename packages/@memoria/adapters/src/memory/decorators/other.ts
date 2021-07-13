export function Index(indexNameOrColumnList?, columnListOrOptions?) {}

export function Unique(indexNameOrColumnList?, columnList?) {} // NOTE: maybe do this in future

export function Check(checkExpression) {}

export function Exclusion(exclusingQuery) {}

export default {
  Index,
  Unique,
  Check,
  Exclusion,
};

// @Transaction
