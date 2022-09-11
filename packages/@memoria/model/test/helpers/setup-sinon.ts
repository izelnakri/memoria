import sinon from "sinon";

export default function (hooks) {
  hooks.afterEach(function () {
    sinon.restore();
  });
}
