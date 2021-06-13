import Model, { resetMemory } from "@memserver/model";

export default function (hooks) {
  hooks.beforeEach(() => resetMemory(Model));
  hooks.afterEach(() => resetMemory(Model));
}
