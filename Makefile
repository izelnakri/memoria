.DEFAULT_GOAL := help

LEVEL ?= patch

.PHONY: build changelog check check-static clean fix format help release test test-browser test-node \
        test-release typecheck

# ── Build ─────────────────────────────────────────────────────────────────────

# Bundles every package into its publishable dist/. Only publishing needs it (make test-release,
# make release): the tests, the type checker and editors all run from the sources.
build:
	npm run build

clean:
	npm run clean

# ── Check ─────────────────────────────────────────────────────────────────────

# Everything CI checks, cheapest first. The node suite needs postgres: `docker compose up -d`.
check: check-static test test-release

check-static: format typecheck

format:
	npm run format

fix:
	npm run format:fix

typecheck:
	npm run typecheck

test: test-node test-browser

test-node:
	npm run test:node

test-browser:
	npm run test:browser

# Packs every package and type checks + runs a consumer against the tarballs.
test-release:
	npm run test:release

# Prints what the next release's CHANGELOG section will say.
changelog:
	npm run changelog:preview

# ── Release ───────────────────────────────────────────────────────────────────

# make release LEVEL=patch|minor|major|x.y.z
#
# Publishes every package at one new version from a clean, up-to-date main whose node_modules match the
# lockfile, after the full check. npm is published to before anything is committed -- which is why the
# guards come first: a release that fails afterwards leaves only local, uncommitted changes behind.
release:
	@branch=$$(git rev-parse --abbrev-ref HEAD); \
	if [ "$$branch" != "main" ]; then \
		echo "make release must run on main — you are on '$$branch'."; \
		exit 1; \
	fi
	@git fetch -q origin main; \
	if [ "$$(git rev-parse HEAD)" != "$$(git rev-parse origin/main)" ]; then \
		echo "main and origin/main differ — pull or push first, then release."; \
		exit 1; \
	fi
	@if [ -n "$$(git status --porcelain)" ]; then \
		echo "Refusing to release with a dirty working tree:"; \
		git status --short; \
		exit 1; \
	fi
	@npm ls --all > /dev/null 2>&1 || { \
		echo "node_modules does not match package.json and package-lock.json: run npm ci, then release."; \
		exit 1; \
	}
	@npm whoami > /dev/null 2>&1 || npm login
	$(MAKE) check
	@VERSION=$$(node scripts/next-version.ts "$(LEVEL)") && \
	node scripts/publish.ts "$$VERSION" && \
	npm install --package-lock-only --ignore-scripts && \
	npm run changelog:update -- --tag "v$$VERSION" && \
	git add package.json package-lock.json CHANGELOG.md packages/@memoria/*/package.json && \
	git commit -m "Release $$VERSION" && \
	git tag "v$$VERSION" && \
	git push origin main "v$$VERSION"

# ── Help ──────────────────────────────────────────────────────────────────────

help:
	@echo "make check          format, typecheck, both test suites and the packed-package test (CI's checks)"
	@echo "make check-static   format + typecheck"
	@echo "make test           node suite (needs postgres: docker compose up -d), then browser suite"
	@echo "make test-release   pack every package and type check + run a consumer against the tarballs"
	@echo "make fix            prettier --write"
	@echo "make build          build every package's publishable dist/"
	@echo "make changelog      preview the next release's CHANGELOG section"
	@echo "make release        LEVEL=patch|minor|major|x.y.z -- publish to npm, tag, push (from main)"
