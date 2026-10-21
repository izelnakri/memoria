// Stamps every package with one version, builds them and publishes each dist/ to npm.
//
//   node scripts/publish.ts <version> [--dry-run]
//
// The packages always share a version, and internal dependencies are pinned to it exactly: a
// @memoria/model release is only tested against the @memoria/adapters it was released with.
//
// Nothing is stamped until npm has confirmed that no package already has this version, so a version
// that was (partly) published before stops here, not halfway through a second set.
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";
import { PACKAGES, packageDirectory, publishedDirectory } from "./build.ts";

const shell = promisify(execFile);
const [version] = process.argv.slice(2).filter((argument) => !argument.startsWith("--"));
const dryRun = process.argv.includes("--dry-run");

if (!version || !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
  console.error("Usage: node scripts/publish.ts <version> [--dry-run]");
  process.exit(1);
}

let alreadyPublished = (
  await Promise.all(PACKAGES.map(async (name) => ((await isPublished(name)) ? `@memoria/${name}@${version}` : null)))
).filter(Boolean);

if (alreadyPublished.length > 0) {
  console.error(`Refusing to publish: ${alreadyPublished.join(", ")} already exists on npm.`);
  process.exit(1);
}

await Promise.all([...PACKAGES.map((name) => stamp(`${packageDirectory(name)}/package.json`)), stamp("package.json")]);
await shell("node", ["scripts/build.ts"]);

// NOTE: one at a time and in PACKAGES order, so a failure leaves a prefix of the set published --
// which the version check above then reports on a retry -- rather than an arbitrary subset.
for (let name of PACKAGES) {
  await shell("npm", ["publish", publishedDirectory(name), "--access", "public", ...(dryRun ? ["--dry-run"] : [])]);
  console.log(`${dryRun ? "[dry run] " : ""}Published @memoria/${name}@${version}`);
}

// NOTE: only a 404 means "not published". Any other failure (offline, registry down, not logged in)
// has to stop the release rather than read as a green light.
async function isPublished(name: string) {
  try {
    let { stdout } = await shell("npm", ["view", `@memoria/${name}@${version}`, "version"]);

    return stdout.trim() !== "";
  } catch (error) {
    if (/E404/.test(String((error as { stderr?: string }).stderr))) {
      return false;
    }

    throw error;
  }
}

async function stamp(manifestPath: string) {
  let manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));

  manifest.version = version;
  for (let dependency of Object.keys(manifest.dependencies ?? {})) {
    if (dependency.startsWith("@memoria/")) {
      manifest.dependencies[dependency] = version;
    }
  }

  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
