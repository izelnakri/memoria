import type { RelationshipMetadata } from "../stores/relationship/schema.js";
import type Model from "../model.js";
import { RuntimeError } from "../errors/index.js";
import validatePartialModelInput from "./partial-model-input.js";

type JSObject = { [key: string]: any };

const SINGLE_VALUE_RELATIONSHIPS = ["BelongsTo", "OneToOne"];
const MULTI_VALUE_RELATIONSHIPS = ["HasMany", "ManyToMany"];

export default function validateRelationshipInput(
  input: any,
  Class: typeof Model,
  { RelationshipClass, relationshipType, relationshipName }: RelationshipMetadata
) {
  if (
    SINGLE_VALUE_RELATIONSHIPS.includes(relationshipType) &&
    (input === null || isPartialModelInput(input, RelationshipClass))
  ) {
    return input;
  } else if (
    MULTI_VALUE_RELATIONSHIPS.includes(relationshipType) &&
    input instanceof Array &&
    input.every((item) => isPartialModelInput(item, RelationshipClass))
  ) {
    return input;
  }

  throw new RuntimeError(`Invalid relationship input for ${Class.name}.${relationshipName}!`);
}

function isPartialModelInput(input: JSObject, Class: typeof Model) {
  return input && (input instanceof Class || validatePartialModelInput(input, Class));
}
