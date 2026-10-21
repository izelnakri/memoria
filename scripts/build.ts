// Builds every publishable package into packages/@memoria/<name>/dist, ready to `npm publish` as is.
//
//   node scripts/build.ts
//
// In the repository each package's `exports` point at its TypeScript sources, so tests, the type
// checker and editors all run against src/ with nothing built. A release publishes dist/ instead,
// which carries its own package.json whose `exports` point at the built files. Nothing in the
// repository is ever rewritten to switch between the two -- that is what scripts/change-entrypoints.js
// used to do, and what left a half-toggled package.json one interrupted build away.
//
// JS: esbuild bundles each `exports` entry, keeping every bare import external so packages import
// each other (and their dependencies) at runtime instead of inlining copies. Code splitting puts
// what two entries share -- @memoria/adapters' root and its /sql entry -- into one chunk, so the
// SQLAdapter and the rest of the package see the same module instances.
//
// Types: a single tsc run over every package (tsconfig.build.json) emits declarations, which are
// copied next to the bundles. Sources already import with .js specifiers, so the declarations need
// no rewriting.
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";
import * as esbuild from "esbuild";

/** Publishable packages, in the order they are published. */
export const PACKAGES = ["response", "server", "model", "adapters"];

const TYPES_DIRECTORY = "tmp/types";
const MANIFEST_FIELDS_TO_PUBLISH = [
  "name",
  "type",
  "version",
  "description",
  "author",
  "license",
  "repository",
  "engines",
  "dependencies",
  "peerDependencies",
  "peerDependenciesMeta",
];

export function packageDirectory(name: string) {
  return `packages/@memoria/${name}`;
}

export function publishedDirectory(name: string) {
  return `${packageDirectory(name)}/dist`;
}

async function bundle(name: string) {
  let manifest = await readManifest(name);

  await esbuild.build({
    entryPoints: Object.fromEntries(
      Object.values(manifest.exports as Record<string, string>).map((source) => [
        outputName(source),
        `${packageDirectory(name)}/${source}`,
      ]),
    ),
    outdir: publishedDirectory(name),
    bundle: true,
    splitting: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    sourcemap: true,
    // NOTE: legacy decorators. esbuild only honours `experimentalDecorators` for files the tsconfig
    // includes, which is why tsconfig.json includes every package's src/.
    tsconfig: "tsconfig.json",
    logLevel: "warning",
    plugins: [externalizeBareImports],
  });
}

async function emitDeclarations() {
  try {
    await promisify(execFile)("node_modules/.bin/tsc", ["--project", "tsconfig.build.json"]);
  } catch (error) {
    // NOTE: tsc reports type errors on stdout, which execFile attaches to the error it rejects with.
    throw new Error(`Declaration emit failed:\n${(error as { stdout?: string }).stdout || error}`);
  }
}

async function finalize(name: string) {
  let manifest = await readManifest(name);
  let target = publishedDirectory(name);
  let published = Object.fromEntries(
    MANIFEST_FIELDS_TO_PUBLISH.filter((field) => field in manifest).map((field) => [field, manifest[field]]),
  );

  published.main = "./index.js";
  published.types = "./index.d.ts";
  published.exports = Object.fromEntries(
    Object.entries(manifest.exports as Record<string, string>).map(([subpath, source]) => [
      subpath,
      { types: `./${outputName(source)}.d.ts`, default: `./${outputName(source)}.js` },
    ]),
  );

  await Promise.all([
    fs.cp(`${TYPES_DIRECTORY}/@memoria/${name}/src`, target, { recursive: true }),
    fs.writeFile(`${target}/package.json`, `${JSON.stringify(published, null, 2)}\n`),
    fs.copyFile("LICENSE", `${target}/LICENSE`),
    fs.copyFile("README.md", `${target}/README.md`),
  ]);
}

async function readManifest(name: string): Promise<Record<string, any>> {
  return JSON.parse(await fs.readFile(`${packageDirectory(name)}/package.json`, "utf8"));
}

// The built file mirrors the source's path under src/: "./src/sql/index.ts" -> "sql/index", so the
// declarations tsc emits for that source land right next to it.
function outputName(source: string) {
  return source.replace(/^\.\/src\//, "").replace(/\.ts$/, "");
}

const externalizeBareImports: esbuild.Plugin = {
  name: "externalize-bare-imports",
  setup(build) {
    build.onResolve({ filter: /^[^./]/ }, ({ path }) => ({ path, external: true }));
  },
};

if (import.meta.main) {
  let startedAt = performance.now();

  await Promise.all([
    fs.rm(TYPES_DIRECTORY, { recursive: true, force: true }),
    ...PACKAGES.map((name) => fs.rm(publishedDirectory(name), { recursive: true, force: true })),
  ]);
  await Promise.all([emitDeclarations(), ...PACKAGES.map((name) => bundle(name))]);
  await Promise.all(PACKAGES.map((name) => finalize(name)));

  console.log(
    `Built ${PACKAGES.map((name) => `@memoria/${name}`).join(", ")} in ${Math.round(performance.now() - startedAt)}ms`,
  );
}
