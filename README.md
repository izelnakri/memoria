[![CI](https://github.com/izelnakri/memoria/actions/workflows/ci.yml/badge.svg)](https://github.com/izelnakri/memoria/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/izelnakri/memoria/branch/main/graph/badge.svg?token=I416U3QJL7)](https://codecov.io/gh/izelnakri/memoria)
[![npm version](https://badge.fury.io/js/@memoria%2Fmodel.svg)](https://badge.fury.io/js/@memoria%2Fmodel)

# memoria

**One model definition. Three adapters. The same CRUD API in the browser, in Node, and against a real
database.**

memoria is a universal data-management library for JavaScript and TypeScript. You declare a model once, with
decorators, and then choose where its records actually live:

| Adapter         | Records live in                     | Typical use                                 |
| --------------- | ----------------------------------- | ------------------------------------------- |
| `MemoryAdapter` | an in-memory store                  | tests, prototypes, frontend state, fixtures |
| `RESTAdapter`   | a remote HTTP API, cached in memory | frontend data layer                         |
| `SQLAdapter`    | PostgreSQL, via TypeORM             | backend ORM                                 |

Swapping the adapter does not change your model code, your queries or your call sites. Relationship tracking,
dirty tracking, changesets and serializers behave identically across all three, because `RESTAdapter` and
`SQLAdapter` both extend `MemoryAdapter` — there is one implementation of the semantics and three
implementations of persistence.

`@memoria/server` additionally provides an in-browser (and in-Node) HTTP mock server, so the same models can
back a mocked API during frontend tests without a network.

> **Status:** pre-1.0 and under active development. The MemoryAdapter, RESTAdapter and SQLAdapter share one
> CRUD + relationship suite: 842 tests in Node, 726 in the browser. See [MILESTONES.md](MILESTONES.md) for
> what works, what is missing, and what is next.

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

```ts
import Memoria from "@memoria/server";
import Response from "@memoria/response";
import User from "./models/user.js";

const Server = new Memoria({
  routes() {
    this.urlPrefix = "http://localhost:8000/api";

    this.get("/users", async () => {
      return { users: User.serializer(await User.findAll()) };
    });

    // Shorthand: derives the default handler and status code from the model
    this.post("/users", User);

    this.get("/users/:id", async (request) => {
      let user = await User.find(request.params.id);

      return user ? { user: User.serializer(user) } : Response(404, { error: "not found" });
    });

    this.passthrough("https://api.stripe.com");
  },
});

// Server.shutdown() stops intercepting.
```

Routes can be overridden per test, which is the point of the whole thing:

```ts
test("shows an error when the backend is down", async function (assert) {
  Server.post("/users", () => Response(500, {}));

  // ... drive your UI and assert on the failure path
});
```

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

| Command                   | What it does                                                 |
| ------------------------- | ------------------------------------------------------------ |
| `npm run test:node`       | 842 tests on `node:test` (model + all three adapters)        |
| `npm run test:browser`    | 726 tests in headless chromium (model, memory, REST, server) |
| `npm run test:node:watch` | node suite in watch mode                                     |
| `npm run typecheck`       | `tsc --noEmit` over every package's `src/`                   |
| `npm run format`          | prettier check (`format:fix` to write)                       |
| `npm run build`           | compile all packages to `dist/`                              |

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
packages/@memoria/cli        `memoria` binary (console, fixture generation)
```

The test suite is written with [qunitx](https://github.com/izelnakri/qunitx), which runs the same test files
unchanged on `node:test` and in a browser. That is what lets one suite prove the library works in both
environments.

## Design principles

- **One schema, many environments.** A TypeORM-compatible entity API that also runs in a browser.
- **CRUD as static methods.** `User.insert()`, not `new User().save()`.
- **Explicit over implicit.** No lifecycle callbacks (`beforeCreate`, `afterUpdate`), no factory/trait DSL, no
  implicit associations. Your inserts are your factories.
- **Ecto-inspired changesets** for validation and error reporting.
- **Minimal runtime dependencies.** SQL and HTTP-mocking dependencies are opt-in, and `@memoria/adapters` is
  structured so that importing it never pulls TypeORM into a browser bundle.
- **Debuggable.** Every part of the state is introspectable at runtime.

## Contributing

[MILESTONES.md](MILESTONES.md) holds the roadmap and this repo's working conventions — what a change is
expected to explain, and the rule that `npm test` must be green before a milestone counts as done.

## License

MIT © Izel Nakri
