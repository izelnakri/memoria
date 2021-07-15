import { proxyToAdapter } from "./index";

// NOTE: maybe use another proxy method as the decorator could also be used in class

export function Generated(generateFunction) {
  return proxyToAdapter("Generated", generateFunction);
}

export function Index(indexNameOrColumnList?, columnListOrOptions?) {
  return proxyToAdapter("Index", indexNameOrColumnList, columnListOrOptions);
}

export function Unique(indexNameOrColumnList?, columnList?) {
  return proxyToAdapter("Unique", indexNameOrColumnList, columnList);
}

export function Check(checkExpression) {
  return proxyToAdapter("Check", checkExpression);
}

export function Exclusion(exclusingQuery) {
  return proxyToAdapter("Exclusion", exclusingQuery);
}

export default {
  Index,
  Unique,
  Check,
  Exclusion,
  Generated,
};

// @Transaction
