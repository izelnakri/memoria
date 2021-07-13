import Model, { Store } from "@memoria/model";

export default function (hooks) {
  hooks.beforeEach(() => Store.reset());
  hooks.afterEach(() => Store.reset());
}
