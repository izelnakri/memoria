# Memoria - Production Milestones

**Branch**: `main` is the correct target. All prior feature branches have been merged or superseded.

## Current baseline

As of the toolchain-modernization PR, on Node 24:

- **842 node tests passing** (`npm run test:node`) — `@memoria/model` + Memory, REST and SQL adapters
- **726 browser tests passing** (`npm run test:browser`) — model, Memory, REST, `@memoria/server`,
  `@memoria/response`
- `npm run typecheck` clean across all four packages' `src/`
- `npm run format` clean
- CI runs typecheck, format, a Node 22/24 matrix, browser tests, coverage and a build check

Two things previously believed broken turned out not to be:

- **SQLAdapter was not broken.** All 158 SQL failures in the old baseline were `password authentication
failed` — an environment problem, not a code one. Every SQL test passes against a correctly configured
  Postgres. The TypeORM 0.2 API it used (`createConnection`/`isConnected`/`close`) still existed as
  deprecated shims in 0.3.17, so it worked; it has now been ported to `DataSource` and the pin moved to
  0.3.31.
- **`@memoria/server` passthrough works.** It is exercised and green in the browser suite. What is actually
  broken is Node-side `fetch` interception, which is why the server tests are excluded from the Node run —
  a narrower problem than "passthrough is non-functional".

## Working Convention

Each change — whether a bug fix, new feature, or refactor — should be accompanied by a clear explanation
covering: what the problem was, why the chosen approach is correct, and what trade-offs were considered or
rejected. Explanations should be peer-level: no hand-holding, no padding. Assume 17+ years of JS/TS/web
experience. Skip the basics, go straight to the interesting parts — the non-obvious design decisions, the
sharp edges in JS semantics being navigated, and why this codebase's constraints make certain solutions
better than others.

The test suite must pass at the completion of each milestone. New functionality requires new tests; bug
fixes require a regression test that would have caught the bug. A milestone is not done until `npm test`
is green.

---

## Milestone 1: SQLAdapter Modernization (TypeORM 0.3 Compatibility)

The SQLAdapter was written against the deprecated TypeORM 0.2 API. Those entry points still existed as
shims in 0.3.17, so this was never a functional break — but they are gone in later versions and blocked
every upgrade.

**Tasks:**

- [x] Replace `createConnection` with `new DataSource(...)` and `.initialize()`
- [x] Replace `Connection` type references with `DataSource`
- [x] Replace `isConnected` checks with `isInitialized`
- [x] Replace `connection.close()` with `connection.destroy()`
- [x] Make connection options configurable via standard libpq environment variables
- [x] Run SQL adapter tests end-to-end (158/158 passing on typeorm 0.3.31)
- [x] Deduplicate the serial-sequence resync into `syncPrimaryKeySequence()` with a real error on
      missing entity metadata
- [ ] `connection.manager` → `dataSource.manager` (works today via the `EntityManager.connection`
      back-reference; worth making explicit)
- [ ] Enable `resetSchemas(Model)` per-model reset (currently throws RuntimeError — not supported)
- [ ] Ensure `getConnection()` / `getEntityManager()` correctly lazily reinitializes after close
- [ ] Fix `insertAll()` — it has a `console.log(error)` and commented-out error handling; add proper errors
- [ ] Fix `updateAll()` — uses `Manager.save()` with `cleanRelationships()` hack; replace with proper query builder
- [ ] Fix `deleteAll()` — `peekAll(Model, targetPrimaryKeys)` called with array where object expected

---

## Milestone 2: Relationship Layer Bug Fixes

Several known relationship correctness issues need resolution before production use.

**Tasks:**

- [ ] Fix `RelationshipDB.delete()` — comment says "only removes belongsTo, not an element from HasMany array".
      `deleteRelationshipsGloballyFromARelationship` sets `reference[relationshipName] = null` but should
      `splice()` the item from HasMany arrays instead
- [ ] Fix `RelationshipDB.clear(Class)` — currently throws; implement per-model relationship cache clearing
- [ ] Fix `fetchRelationship()` bookkeeping after fetch: when a belongsTo is fetched, the reverse HasMany on
      the returned record should be updated to include the source model (both append and removal)
- [ ] Audit `onlyAddRecordsToHasManyArrayIfInMemoryReferenceToBelongsToFound` — complex logic with potential
      edge cases; write targeted tests for the described scenarios in TODO
- [ ] Fix `RelationshipDB.set()` for `undefined` input on HasMany — `existingRelationship.clear()` is called
      but the relationship reference itself is also deleted, leaving the model in an inconsistent state
- [ ] `Model.peekBy({ owner: userInstance })` should auto-translate to `{ owner_id: x }` style queries
- [ ] `validatePartialModelInput` — when a relationship instance is provided without its foreign key, the
      foreign key should be extracted and used rather than throwing or silently ignoring
- [ ] Relationship reverse-relationship lookup: improve error messages when reverse relationship is missing
      to guide the developer toward the correct fix

---

## Milestone 3: Complete HasMany Mutation Test Coverage

The `has-many-id-test.ts` and `has-many-uuid-test.ts` files exist only for MemoryAdapter (as mostly empty stubs)
and are entirely missing for RESTAdapter and SQLAdapter. These scenarios represent a critical gap.

**Tasks:**

- [ ] MemoryAdapter `has-many-id-test.ts` — fill in all commented-out test cases:
  - build from scratch and insert sends correct data
  - set relationship after build, insert correctly
  - fetched model can request relationship without embed and mutate before update
  - fetched model removes relationship before update
  - fetched model removes relationship before delete
  - full build → insert → update → delete flow with correct relationship changes
  - fetch relationship lazily (not pre-loaded)
  - HasMany array replacement via direct assignment
  - foreign key null sets triggers relationship lookup
- [ ] MemoryAdapter `has-many-uuid-test.ts` — same as above for UUID primary keys
- [ ] Create RESTAdapter `relationships/has-many-id-test.ts` — mirror MemoryAdapter tests with HTTP mock
- [ ] Create RESTAdapter `relationships/has-many-uuid-test.ts`
- [ ] Create SQLAdapter `relationships/has-many-id-test.ts`
- [ ] Create SQLAdapter `relationships/has-many-uuid-test.ts`
- [ ] Add `has-many-id-test.js` and `has-many-uuid-test.js` imports to all three adapter test index files

---

## Milestone 4: ManyToMany Relationship Implementation

ManyToMany is currently disabled with a stub reject/null return. This is a core ORM feature.

**Tasks:**

- [ ] Design ManyToMany join table tracking in `RelationshipSchema` — determine if a join model is required
      or if implicit join tables are supported
- [ ] Implement `RelationshipDB.get()` for ManyToMany (currently returns `null`)
- [ ] Implement `RelationshipDB.set()` for ManyToMany
- [ ] Implement `RelationshipDB.delete()` for ManyToMany (currently only removes from array via splice,
      which is the correct direction — verify)
- [ ] Implement `MemoryAdapter.fetchRelationship()` for ManyToMany
- [ ] Implement `RESTAdapter.fetchRelationship()` for ManyToMany
- [ ] Implement `SQLAdapter.fetchRelationship()` for ManyToMany (with actual join table query)
- [ ] `@ManyToMany` decorator — verify `JoinTable` decorator works with SQLAdapter schema generation
- [ ] Write `many-to-many-id-test.ts` for MemoryAdapter
- [ ] Write `many-to-many-uuid-test.ts` for MemoryAdapter
- [ ] Write `many-to-many-id-test.ts` for RESTAdapter
- [ ] Write `many-to-many-uuid-test.ts` for RESTAdapter
- [ ] Write `many-to-many-id-test.ts` for SQLAdapter
- [ ] Write `many-to-many-uuid-test.ts` for SQLAdapter

---

## Milestone 5: Changeset & Error API Completeness

The Changeset and Error types are partially implemented. Several ergonomic APIs are missing.

**Tasks:**

- [ ] `model.errors` — add `errors.has(attr)`, `errors.errorsFor(attr)`, `errors.add(attr, messages[])`,
      `errors.remove(attr)` helpers as part of the errors array/object interface
- [ ] `Changeset` — add `cast(changeset, params, allowedFields)` helper (Ecto-inspired field whitelisting)
- [ ] `Changeset` — add `validateRequired(changeset, fields[])` helper
- [ ] `Changeset` — add `validateLength(changeset, field, opts)` helper
- [ ] `Changeset.assign()` — verify this works correctly as a pipeline step, add tests
- [ ] `Changeset.serializer()` — currently formats errors; ensure it handles ChangesetError subtypes correctly
- [ ] `model.changeset` getter — verify it correctly reflects the diff between revision and current state
      for relationship changes, not just column changes
- [ ] `model.changedAttributes()` — verify it works when `revisionHistory` has multiple entries
- [ ] `model.rollbackAttributes()` — should roll back to last persisted state, not just last revision entry;
      clarify semantics and add tests
- [ ] `model.toObject()` — currently returns `revision[columnName]` values, which is the previous state;
      should return current values. Fix and add tests.
- [ ] `RevisionHistory` — determine if it should track relationship changes as well as column changes

---

## Milestone 6: Server Package Completion

The `@memoria/server` package is functional but has known issues and its tests are commented out.

**Tasks:**

- [ ] Fix `passthrough` — noted as non-functional ("make passthrough PASS")
- [ ] Fix Node.js `fetch` mocking — Pretender doesn't intercept Node.js native `fetch`; investigate
      `undici` / `node-fetch` interception or add `@whatwg-node/fetch` / custom fetch wrapper support
- [ ] Fix `jsdom` fetch interception issue noted in `test/index.ts` (AggregateError from `xhr-utils.js`)
- [ ] Restore server test imports in `test/index.ts` once above issues are fixed
- [ ] `packages/@memoria/server/test/index.ts` — run all server tests and fix failures
- [ ] Handler defaults — ensure `this.post('/users', User)` shorthand works correctly for all verbs and
      returns the right HTTP status codes (201 for POST, 200 for GET/PUT, 204 for DELETE)
- [ ] Route handler error propagation — investigate silent errors inside handler context (noted in TODO)
- [ ] Add `packages/@memoria/response/test/index.ts` back to main test suite

---

## Milestone 7: Model Instance Metadata & Lifecycle Tracking

The instance metadata feature is stubbed out but never implemented. Useful for debugging and audit trails.

**Tasks:**

- [ ] Implement `instanceMetadata` on model instances:
  - `builtAt: Date` — when the instance was created
  - `source` — the origin of the build (CRUD operation name or "build")
  - `reason` — optional developer-supplied string
- [ ] Wire `builtAt` into `RevisionHistory` entries
- [ ] `Model.build(obj, { source: 'insert', reason: '...' })` — thread source/reason into options
- [ ] Consider whether `InstanceDB` should store metadata alongside instance sets

---

## Milestone 8: MemoryAdapter String/BigInt Primary Key Support

Noted in TODO: "MemoryAdapter should be able to handle string id/bigint columns for increment".

**Tasks:**

- [ ] `DB.getDefaultValues()` for insert — when primary key is `bigint` type, generate next value correctly
- [ ] Ensure `Cache` Map keys work correctly for bigint (JS Map supports bigint keys natively)
- [ ] Test UUID-as-string and bigint-as-string flows through MemoryAdapter
- [ ] Ensure `primaryKeyTypeSafetyCheck` handles bigint correctly

---

## Milestone 9: CLI Package Completion

The CLI package exists but its current state is unclear.

**Tasks:**

- [ ] Audit existing CLI commands and determine what works
- [ ] `memoria console` — TypeScript REPL with models loaded; verify ts-node integration
- [ ] `memoria g fixtures $modelName` — fixture generation command; verify it works
- [ ] Add CLI tests to main test suite (`test:cli` script already exists)
- [ ] Document CLI installation and usage in README

---

## Milestone 10: Production Build System & Package Exports

Currently all packages use `"main": "src/index.ts"` which means consumers get raw TypeScript.
Production builds should emit compiled ESM/CJS with proper type declarations.

**Tasks:**

- [ ] Each package (`@memoria/model`, `@memoria/adapters`, `@memoria/response`, `@memoria/server`) should
      have a proper build step that emits:
  - `dist/esm/` — ESM output
  - `dist/cjs/` — CommonJS output (for Node.js `require()` compatibility)
  - `dist/types/` — `.d.ts` type declarations
- [ ] Replace the current webpack-based `libs:build` with a lighter tool (esbuild or tsup) per package
- [ ] Add proper `package.json` `exports` field with `import` / `require` / `types` conditions per package
      (`@memoria/adapters` now has a minimal `exports` map with `.`, `./sql` and a `./*` passthrough;
      the other three packages still only have `main`)
- [ ] Add `sideEffects: false` to each package for tree-shaking
- [x] Ensure `@memoria/adapters` does not pull `typeorm` into browser bundles — SQLAdapter is now a
      separate entry point (`@memoria/adapters/sql`), which cut the browser test bundle 7.65 MB → 1.59 MB
- [x] Add `engines` field specifying minimum Node.js version (`>=22`)
- [x] Remove `typeorm` from the main `@memoria/adapters` bundle; make it an optional peer dependency

---

## Milestone 11: Dependency Reduction

Goal: minimal runtime dependencies per the project philosophy.

**Tasks:**

- [ ] `@memoria/model` — only runtime dep is `inflected`. Audit if the full inflected library is needed
      or if a small custom `pluralize`/`underscore`/`camelize` can replace it (save ~40kb)
- [ ] `@memoria/server` — depends on `pretender`, `fake-xml-http-request`, `route-recognizer`, `kleur`.
      Audit whether all are still needed; `kleur` could be inlined as the usage is tiny
- [ ] `@memoria/adapters` — `inflected` is re-used for `RESTAdapter.pathForType()`; share from model package
      so it's not duplicated in the bundle
- [x] `typeorm` in SQLAdapter — now an optional peer dependency, documented in the README
- [x] Remove `sketchpad.ts`, `sketchpad.js` and `index.html` from the repo root before release
      (also removed: `webpack.config.js` and the webpack toolchain, `public/`, `test/memoria-ssr.ts`,
      `Dockerfile`, `setup-database.sh`, `.env`)
- [ ] Decide the fate of `examples/` — it is uncompiled sketch code, `examples/adapters/database.ts` is not
      valid TypeScript, and it still imports `SQLAdapter` from the package root. Either rewrite it against
      the current API and typecheck it in CI, or delete it. It is excluded from prettier until then.

---

## Milestone 12: Documentation & README

**Tasks:**

- [x] Update README to reflect current API (removed the Mirage comparison as primary framing)
- [ ] Document all relationship types with code examples (BelongsTo, HasOne, HasMany, ManyToMany)
- [ ] Document `Model.build()`, `Model.cache()`, `Model.resetCache()`, `Model.resetRecords()` semantics
- [ ] Document `Changeset` API and how to use it for validation
- [ ] Document `HasManyArray` methods and iteration protocols
- [ ] Document adapter configuration (RESTAdapter `host`, `headers`, `pathForType` override)
- [ ] Document SQLAdapter setup (DataSource options, connection lifecycle)
- [ ] Add migration guide from mirage.js
- [ ] Generate and publish typedoc API docs

---

## Milestone 13: Performance & Benchmarks

**Tasks:**

- [ ] Set up benchmark suite (the `benchmark` branch was started but never merged)
- [ ] Benchmark `RelationshipDB.cache()` — the `updateRelationshipsGloballyFromARelationship` loop
      iterates all known instances on every CRUD operation; profile and optimize if needed
- [ ] Benchmark `onlyAddRecordsToHasManyArrayIfInMemoryReferenceToBelongsToFound` — complex nested loops
- [ ] Benchmark MemoryAdapter insert/update/delete at scale (10k, 100k records)
- [ ] Add benchmark results to README

---

## Milestone 14: Bring Tests Under the Type Checker

`npm run typecheck` covers `src/` only. Adding `packages/**/test` produces ~9,200 errors, overwhelmingly
`TS2339` (property does not exist): the suites build model classes inside factory functions
(`generatePhoto()` returns an anonymous `class extends Model`), so the checker sees `Model`, not a class
with `name`/`href`/`owner_id`. Decorators contribute the rest — a decorated field has no declared type the
checker can relate to the column definition.

This is the single largest source of "the agent cannot tell whether it broke something without running the
whole suite". It is worth solving properly rather than with `// @ts-nocheck`.

**Tasks:**

- [ ] Decide the typing strategy for decorator-defined columns — declaration merging, a `Model<Shape>`
      generic, or a codegen step that emits interfaces from the schema
- [ ] Give the test model factories concrete return types so `generatePhoto()` yields a typed class
- [ ] Fold `packages/**/test` and `test/` into `tsconfig.typecheck.json` and make CI enforce it
- [ ] Type the custom assertions (`matchJson`, `hasMany`, …) via module augmentation so `assert.hasMany`
      is not an `any` — `test/helpers/custom-assertions.ts` currently casts around qunitx's two runtime
      shapes

---

## Milestone 15: Node.js `fetch` Interception

The reason `@memoria/server` and `@memoria/response` are excluded from the Node suite (they pass in the
browser). Pretender patches `XMLHttpRequest`, which jsdom provides, but Node's native `fetch` is undici and
goes nowhere near it. Everything under `packages/@memoria/server/test` is green in a browser today, so this
is purely about the Node story.

**Tasks:**

- [ ] Choose an interception strategy — undici `MockAgent` / `setGlobalDispatcher`, or a `globalThis.fetch`
      wrapper that routes into Pretender's recognizer
- [ ] Make `RESTAdapter` requests go through the same path in both runtimes
- [ ] Restore the `@memoria/server` and `@memoria/response` imports in `test/index.ts`
- [ ] Confirm the Node and browser suites report the same test count

---

## Milestone 16: Test Suite Performance and Isolation

The Node suite runs as a single aggregate entry (`test/index.ts`) in one process, inherited from the old
runner. `node:test` can run files in parallel processes, but the suite is not ready for it: models register
into a global `Schema.Schemas`, and the SQL tests share one database that they `TRUNCATE`/`dropDatabase`
between tests.

**Tasks:**

- [ ] Make per-file runs work standalone (`node --test packages/@memoria/model/test/build-test.ts`)
- [ ] Give SQL tests an isolated schema or database per worker so they can run concurrently
- [ ] Switch to a glob entry and measure the wall-clock win (currently ~70s node, ~22s browser)
- [ ] Add `--experimental-test-isolation` or equivalent guards so global-state leaks fail loudly

---

## Milestone 17: TypeScript 7

TypeScript 7 (the native port) removes `baseUrl` and `moduleResolution: node10`, both of which this repo
relies on. It was deliberately not adopted during the toolchain refresh because the fix interacts with the
`main: src/index.ts` package layout — packages resolve to TypeScript source today, which `bundler` and
`nodenext` resolution treat very differently.

**Tasks:**

- [ ] Replace `baseUrl` + `paths` with explicit relative paths or an `exports`-driven layout
- [ ] Move to `moduleResolution: bundler` (or `nodenext` once packages emit real `exports`)
- [ ] Sequence against Milestone 10 — the build-system work and this share a root cause
- [ ] Re-run both suites and the typecheck on TS 7

---

## Done (baseline on `main`)

- MemoryAdapter: full CRUD with auto-incrementing id/UUID primary keys
- RESTAdapter: full CRUD with HTTP + in-memory cache layer
- SQLAdapter: full CRUD via TypeORM 0.3.31 `DataSource` — 158/158 tests green
- BelongsTo / OneToOne / HasMany relationships across all three adapters
- Reflective (bidirectional) relationship tracking in memory
- HasManyArray — custom Array subclass with relationship mutation hooks
- InstanceDB — reference tracking across all copies of an instance
- RelationshipDB — global relationship cache with bidirectional sync on CRUD
- RevisionHistory — snapshot of column state for dirty tracking
- Changeset — error container with action, data, changes
- Serializer — model to JSON with configurable key casing and embed support
- Error types — InsertError, UpdateError, DeleteError, CacheError, NotFoundError, etc.
- LazyPromise / RelationshipPromise — deferred async relationship resolution
- Enum / EnumFreeze utilities
- `@memoria/server` in-browser HTTP mock server (Pretender-based)
- `@memoria/response` Response helper
- QUnitX-based test suite across model, memory, rest, sql adapters — the same files run on `node:test`
  and in a browser
- TypeScript throughout, type checked across every package's `src/`
- CI on Node 22/24 with a postgres service, browser tests, format and build verification
