import Model, { resetMemory } from "@memoria/model";

export default function (hooks) {
  hooks.beforeEach(() => resetMemory(Model));
  hooks.afterEach(() => resetMemory(Model));
}
