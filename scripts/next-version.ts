// Prints the version `make release LEVEL=<level>` will publish.
//
//   node scripts/next-version.ts patch|minor|major|x.y.z
import fs from "node:fs/promises";

const level = process.argv[2];
const current = JSON.parse(await fs.readFile("package.json", "utf8")).version as string;
const [major, minor, patch] = current.split("-")[0].split(".").map(Number);

const next = {
  patch: `${major}.${minor}.${patch + 1}`,
  minor: `${major}.${minor + 1}.0`,
  major: `${major + 1}.0.0`,
}[level];

if (next) {
  console.log(next);
} else if (/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(level ?? "")) {
  console.log(level);
} else {
  console.error(`Usage: node scripts/next-version.ts patch|minor|major|x.y.z (current: ${current})`);
  process.exit(1);
}
