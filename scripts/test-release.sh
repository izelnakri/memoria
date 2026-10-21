#!/usr/bin/env bash
# Builds and packs every package, installs the tarballs into a scratch project, then type checks and
# runs test/release/consumer.ts there. This is the only check that sees the packages the way npm
# users do: from dist/, through the published package.json, with only declared dependencies present.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONSUMER="$(mktemp -d)"
trap 'rm -rf "$CONSUMER"' EXIT

cd "$ROOT"
node scripts/build.ts

version_of() { node -p "require('$1/package.json').version"; }

for package in model adapters response server; do
  npm pack "packages/@memoria/$package/dist" --pack-destination "$CONSUMER" --silent > /dev/null
done

cp test/release/consumer.ts test/release/tsconfig.json "$CONSUMER/"
cd "$CONSUMER"
echo '{ "name": "memoria-release-consumer", "private": true, "type": "module" }' > package.json

# NOTE: the optional peers (typeorm, jsdom) and the toolchain are pinned to what the repository
# itself resolves, so this checks the packages and not a dependency that moved in the meantime.
npm install --no-audit --no-fund --silent ./memoria-*.tgz \
  "typeorm@$(version_of "$ROOT/node_modules/typeorm")" \
  "jsdom@$(version_of "$ROOT/node_modules/jsdom")" \
  "typescript@$(version_of "$ROOT/node_modules/typescript")" \
  "@types/node@$(version_of "$ROOT/node_modules/@types/node")"

npx tsc --project tsconfig.json
node dist/consumer.js
