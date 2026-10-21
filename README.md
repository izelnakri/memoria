[![CI](https://github.com/izelnakri/memoria/actions/workflows/ci.yml/badge.svg)](https://github.com/izelnakri/memoria/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/izelnakri/memoria/branch/main/graph/badge.svg?token=I416U3QJL7)](https://codecov.io/gh/izelnakri/memoria)
[![npm version](https://badge.fury.io/js/@memoria%2Fmodel.svg)](https://badge.fury.io/js/@memoria%2Fmodel)

# Memoria: an elegant, simple and very flexible ORM for JavaScript/TypeScript

**One model definition. Three adapters. The same CRUD API in the browser, in Node, and against a real
database.**

Memoria is an in-memory/off-memory state management solution for JavaScript apps, on the client and/or the
server. Its entity definition API is TypeORM-like: plain JS classes and decorators define (or generate) the
schema. You then pick an adapter, and keep the same CRUD interface whichever one you pick:

| Adapter         | Records live in                     | Typical use                                 |
| --------------- | ----------------------------------- | ------------------------------------------- |
| `MemoryAdapter` | an in-memory store                  | tests, prototypes, frontend state, fixtures |
| `RESTAdapter`   | a remote HTTP API, cached in memory | frontend data layer                         |
| `SQLAdapter`    | PostgreSQL, via TypeORM             | backend ORM                                 |

In other words, it is a general-purpose data library for JavaScript. Swapping the adapter does not change your
model code, your queries or your call sites: relationship tracking, dirty tracking, changesets and serializers
behave identically across all three, because `RESTAdapter` and `SQLAdapter` both extend `MemoryAdapter` — one
implementation of the semantics, three implementations of persistence.

It is also an extremely useful library for making frontend e2e tests fast: `@memoria/server` is an HTTP mock
server that runs in the browser, so a test suite can serve its API from `MemoryAdapter` models instead of a
network. The same goes for rapid prototyping — a single-file SPA demo deployment, a frontend data store, or a
backend HTTP server ORM are all the same models with a different adapter. The mock server runs in Node too, so an
in-memory test suite can also run in a server-side rendering environment when it needs to.

In summary, memoria aims to be a complete and flexible data-management solution for JavaScript applications,
and as intuitive as it can be: no new JS concepts, and little boilerplate for any mutation. Every part of the
state can be introspected and every behaviour tested, so it does not compromise on stability, development
speed, extensibility, runtime performance or debuggability.

> **Status:** pre-1.0 and under active development. The MemoryAdapter, RESTAdapter and SQLAdapter share one
> CRUD + relationship suite: 842 tests in Node, 726 in the browser. See [MILESTONES.md](MILESTONES.md) for
> what works, what is missing, and what is next.

## Principles

- **A TypeORM-based entity API.** The SQLAdapter works naturally with TypeORM, while the very same API runs in a
  browser for the frontend.
- **One schema, many environments.** A model class is used unchanged with `MemoryAdapter`, `RESTAdapter` or
  `SQLAdapter` (a GraphQL adapter may follow).
- **CRUD as static class methods.** `User.insert()`, `User.update()`, `User.delete()` — not `new User().save()`.
- **ember-data-like dirty tracking.** Changed properties are tracked on the instance until a CRUD operation
  succeeds.
- **Instance caching, on by default.** `RESTAdapter` and `SQLAdapter` extend `MemoryAdapter`, which provides it.
  It also makes advanced frontend tests possible when combined with the in-browser `@memoria/server`.
- **[Ecto Changeset](https://hexdocs.pm/ecto/Ecto.Changeset.html) inspired errors.** CRUD operations reject with a
  `ChangesetError`, a JS `Error` carrying an Ecto-like changeset.
- **Explicit over implicit.** No lifecycle callbacks (`beforeCreate`, `afterUpdate`), no factory/trait DSL, no
  implicit associations. Your inserts are your factories.
- **Minimal runtime dependencies.** SQL and HTTP-mocking dependencies are opt-in, and `@memoria/adapters` is
  structured so that importing it never pulls TypeORM into a browser bundle.

---

## Installation

```sh
npm install @memoria/model @memoria/adapters
```

`@memoria/server` and `@memoria/response` are optional, and only needed for HTTP mocking:

```sh
npm install --save-dev @memoria/server @memoria/response
```

The SQLAdapter needs TypeORM and a Postgres driver. They are optional peer dependencies, so you only install
them if you actually use SQL:

```sh
npm install typeorm pg
```

Requires **Node.js >= 22**, and `experimentalDecorators` enabled in your `tsconfig.json`.

---

## Defining a model

```ts
import Model, { PrimaryGeneratedColumn, Column } from "@memoria/model";

class User extends Model {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column("boolean", { default: true })
  isActive: boolean;
}
```

A model uses `MemoryAdapter` unless you say otherwise. To point it elsewhere, set the static `Adapter`:

```ts
import { RESTAdapter } from "@memoria/adapters";
import SQLAdapter from "@memoria/adapters/sql"; // NOTE: subpath -- keeps typeorm out of browser bundles

class User extends Model {
  static Adapter = RESTAdapter;
  // ...
}
```

UUID primary keys work the same way — `@PrimaryGeneratedColumn("uuid")` with a `uuid: string` field. Every
adapter is tested against both integer and UUID primary keys.

## CRUD

Every operation is a static method on the model and returns model instances:

```ts
await User.findAll(); // []

let user = await User.insert({ firstName: "Izel", lastName: "Nakri" });
// User { id: 1, firstName: 'Izel', lastName: 'Nakri', isActive: true }

user.firstName = "Isaac";
// NOTE: nothing is persisted until update() -- User.findAll() still reports 'Izel'

await User.update(user); // User { id: 1, firstName: 'Isaac', ... }

await User.find(1);
await User.findBy({ firstName: "Isaac" });
await User.findAll({ isActive: true });

await User.delete(user);
```

`insertAll` / `updateAll` / `deleteAll` take arrays. `peek`, `peekBy` and `peekAll` are the synchronous,
cache-only counterparts of `find`, `findBy` and `findAll` — they never touch the network or the database.

`Model.build(attributes)` creates a tracked instance without persisting it.

## Relationships

Relationships are declared with decorators that take the related class directly, and are tracked
bidirectionally in memory. Assigning one side updates the other and keeps the foreign key in sync, with no
save in between:

```ts
import Model, { PrimaryGeneratedColumn, Column, BelongsTo, HasMany } from "@memoria/model";
import User from "./user.js";

class Photo extends Model {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  href: string;

  @Column("int")
  owner_id: number;

  @BelongsTo(User)
  owner;
}
```

```ts
let user = await User.insert({ firstName: "Izel" });
let photo = Photo.build({ owner: user });

photo.owner_id; // 1 -- derived from the assignment
user.photos; // HasManyArray containing photo, if User declares @HasMany(Photo)
```

Unfetched relationships resolve lazily and are awaitable:

```ts
let photos = await user.photos; // fetches through the model's adapter if not already loaded
```

`BelongsTo`, `HasOne` and `HasMany` are implemented across all three adapters. `ManyToMany` is **not yet
implemented** — see [MILESTONES.md](MILESTONES.md).

## Dirty tracking and changesets

Every tracked instance knows what changed since it was last persisted:

```ts
let user = await User.find(1);

user.firstName = "Isaac";

user.isDirty; // true
user.changes; // { firstName: 'Isaac' }
user.revision; // the last persisted state
user.changedAttributes();

user.rollbackAttributes();
user.isDirty; // false
```

Failed CRUD operations reject with an [Ecto-inspired](https://hexdocs.pm/ecto/Ecto.Changeset.html) changeset
error carrying the attempted action and per-field errors, rather than an opaque message:

```ts
try {
  await User.insert({ firstName: null });
} catch (error) {
  error.action; // 'insert'
  error.errors; // [{ id, modelName, attribute, message }]
}
```

## HTTP mocking with @memoria/server

Routes are plain functions over your models. Request `params`, `queryParams` and JSON bodies arrive typecast —
`"123"` is a number, `"true"` a boolean, an empty string `null` — so handlers can hand them straight to the
model:

```ts
// memoria/routes.ts
import Response from "@memoria/response";
import User from "../models/user.js";

export default function () {
  this.urlPrefix = "http://localhost:8000/api"; // OPTIONAL: scope every route under a host/path

  this.get("/users", async (request) => {
    if (request.queryParams.filter === "is_active") {
      return { users: User.serializer(await User.findAll({ is_active: true })) };
    }

    return Response(422, { error: "filter is required" });
  });

  this.post("/users", async (request) => {
    return { user: User.serializer(await User.insert(request.params.user)) };
  });

  this.put("/users/:id", async (request) => {
    if (!(await User.find(request.params.id))) {
      return Response(404, { error: "user not found" });
    }

    return { user: User.serializer(await User.update(request.params.user)) };
  });

  // Shorthands: pass the model, get the default handler and status code for the verb (POST is 201 Created):
  this.get("/users/:id", User);
  this.delete("/users/:id", User);

  // Other hosts can be mocked too, and real ones let through:
  this.get("https://api.github.com/users/:username", (request) => ({ login: request.params.username }));
  this.passthrough("https://api.stripe.com");
}
```

```ts
// memoria/index.ts
import Memoria from "@memoria/server";
import initializer from "./initializer.js"; // e.g. seeds data: User.resetRecords([{ id: 1, firstName: "Izel" }])
import routes from "./routes.js";

export default new Memoria({
  initializer,
  routes,
  logging: true, // OPTIONAL: log every request/response (default)
  timing: 500, // OPTIONAL: delay responses, in ms
});

// Server.shutdown() stops intercepting.
```

Routes can be added or overridden per test, which is the point of the whole thing:

```ts
import Server from "./memoria/index.js";
import Response from "@memoria/response";

test("shows an error when the backend is down", async function (assert) {
  Server.post("/users", () => Response(500, {})); // also Server.get, .put, .delete

  // ... drive your UI and assert on the failure path
});
```

### Why not Mirage?

memoria's server started as a reimplementation of the mirage.js API, keeping what it does well and dropping
what gets in the way:

- **Static class methods** make CRUD more direct and functional than a schema object: `User.insert(...)`.
- **Real typecasting** of submitted data: empty strings are `null`, `"123"` is a number, and integer foreign key
  columns are not strings.
- **Runs in Node**, so frontend mocking also works in a server-side rendering context.
- **`Response(...)`**, not `new Response(...)`.
- **Less code and fewer dependencies**, and no redundant concepts: no `association()`, no factory/trait DSL, no
  implicit association behaviour. Your model inserts are your factories, and extending a model is plain
  ES class methods.
- **No implicit model lifecycle callbacks** (`beforeCreate`, `afterUpdate`, ...). Running hidden work on every
  CRUD operation is an old pattern that makes behaviour hard to follow; validations belong in types or
  decorators.
- **Route shorthands take the model itself** — `this.post("/users", User)` needs no dasherizing or underscoring
  to find it — and return the right default status code for the verb, POST returning 201 Created as Mirage does.
- **Easy to debug**: data is serialized in a predictable, functional way, and everything is written in
  TypeScript, so type definitions come built in.

## Serializers

```ts
User.serializer(user); // a single record
User.serializer(users); // an array

class User extends Model {
  static customSerializer(objectOrArray) {
    return Array.isArray(objectOrArray)
      ? objectOrArray.map((object) => this.customSerialize(object))
      : this.customSerialize(objectOrArray);
  }

  static customSerialize(object) {
    return { ...object, newKey: "something" };
  }
}
```

---

## Development

```sh
npm install
docker compose up -d   # postgres on 5432, for the SQLAdapter suite
npm test               # node suite, then browser suite
```

| Command                   | What it does                                                                    |
| ------------------------- | ------------------------------------------------------------------------------- |
| `npm run test:node`       | 842 tests on `node:test` (model + all three adapters)                           |
| `npm run test:browser`    | 726 tests in headless chromium (model, memory, REST, server)                    |
| `npm run test:node:watch` | node suite in watch mode                                                        |
| `npm run typecheck`       | `tsc --noEmit` over every package's `src/`                                      |
| `npm run format`          | prettier check (`format:fix` to write)                                          |
| `npm run build`           | compile all packages to `dist/`                                                 |
| `npm run sketchpad`       | run `sketchpad.ts`, a scratch file for trying the API (`-- --sql` for postgres) |

The two suites cover different ground on purpose. The browser run includes `@memoria/server` and
`@memoria/response`; the Node run currently skips them because Pretender cannot intercept Node's native
`fetch` yet. The Node run is the only one that exercises `SQLAdapter`, which needs a real database.

Postgres settings come from the standard libpq environment variables — `PGHOST`, `PGPORT`, `PGUSER`,
`PGPASSWORD`, `PGDATABASE` — defaulting to `localhost:5432` as `postgres`/`postgres`. If you already run
Postgres on 5432, point the suite somewhere else:

```sh
PGPORT=5433 npm run test:node
```

### Architecture

```
packages/@memoria/model      Model base class, decorators, relationship + instance tracking,
                             changesets, serializers, revision history
packages/@memoria/adapters   MemoryAdapter, RESTAdapter, SQLAdapter (subpath export), HTTP client
packages/@memoria/response   Response helper
packages/@memoria/server     Pretender-based HTTP mock server
```

The test suite is written with [qunitx](https://github.com/izelnakri/qunitx), which runs the same test files
unchanged on `node:test` and in a browser. That is what lets one suite prove the library works in both
environments.

## Contributing

[MILESTONES.md](MILESTONES.md) holds the roadmap and this repo's working conventions — what a change is
expected to explain, and the rule that `npm test` must be green before a milestone counts as done.

## License

MIT © Izel Nakri
