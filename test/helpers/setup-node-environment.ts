// Node.js test-environment bootstrap, loaded via `node --import` before any test module.
//
// qunitx 0.4 was a CLI that owned the process and installed a jsdom environment for you. qunitx 1.x
// is a library on top of `node:test`, so anything the browser globals were providing has to be set
// up explicitly. Pretender (via @memoria/server) reads `self` at module-evaluation time, which means
// this has to run before the first import of @memoria/server -- hence `--import` rather than an
// in-suite hook.
import setupDom from "@memoria/server/src/setup-dom.js";

if (!globalThis.window) {
  await setupDom();
}
