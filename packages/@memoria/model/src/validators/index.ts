// TODO: Add functional checks for class-validators
// NOTE: Make them applicable on memoria setter, so they need to be binded in & registered via custom glue code(?!?) - TEST THIS HYPOTHESIS
// NOTE: Make them combined with typeorm decorators, so constraints can be defined there
// NOTE: Fix DB Migrations concept well, thought of this to see API Parity with typeorm
import validatePartialModelInput from "./partial-model-input.js";
import validateRelationshipInput from "./relationship-input.js";

export {
  validatePartialModelInput,
  validateRelationshipInput
};
