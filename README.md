![docker-based-ci](https://github.com/izelnakri/memoria/workflows/docker-based-ci/badge.svg)
[![codecov](https://codecov.io/gh/izelnakri/memoria/branch/main/graph/badge.svg?token=I416U3QJL7)](https://codecov.io/gh/izelnakri/memoria)
[![npm version](https://badge.fury.io/js/@memoria%2Fmodel.svg)](https://badge.fury.io/js/@memoria%2Fmodel)

# Memoria: Elegant, simple & very flexible ORM for JavaScript/TypeScript

Memoria is an in-memory/off-memory state management solution for JavaScript apps on client and/or server side. It is a
very flexible typeorm-like entity definition API that just use JS classes and decorators to define or generate the
schema. You can choose different adapters and use the same CRUD interface: `MemoryAdapter`, `RESTAdapter` or
`SQLAdapter`. In other words it is a general purpose data library for JavaScript. It is also extremely useful library
for making frontend e2e tests extremely fast by utilizing an in-browser http server and in-memory MemoryAdapter models
in the mock server.

You can also use it for rapid prototyping frontends for a demo: one can also use the library for single-file SPA demo
deployments, as a frontend SPA data store or as a backend HTTP Server ORM. The http mock server(@memoria/server) can be
run in-browser and node environments, thus allows for running your in-memory test suite in SSR(server-side rendering)
environment if it is needed.

In summary, this is an extremely flexible and complete data management solution for JS based applications. It tries to
be as intuitive as it could be, without introducing new JS concepts or much boilerplates for any mutation. It is also
very easy to write automated tests on this framework, introspect any part of the state so it doesn't compromise on
stability, development speed, extensibility, runtime performance & debuggability.

It is based on these principles:

- TypeORM based Entity API: This makes the SQLAdapter easy to work with typeorm while making the API usable in browser
for frontend.

- One Schema/Class that can be used in 4 environments with different Adapters: MemoryAdapter, RESTAdapter, SQLAdapter,
GraphQLAdapter(in future maybe).

- Default Model CRUD operations represented as static class methods: User.insert(), User.update() etc.

- Provides ember-data like property dirty tracking on changed properties until successful CRUD operation.

- Optional entity/instance based caching: Enabled by default, timeout adjustable, RESTAdapter & SQLAdapter extends from
MemoryAdapter which provides this caching. Also useful for advanced frontend tests when used with in-browser mode of
@memoria/server.

- [Ecto Changeset](https://hexdocs.pm/ecto/Ecto.Changeset.html) inspired: Changeset structs with pipeline
operators are very powerful. Memoria CRUD operations return ChangesetError which extends from JS Error with Ecto-like Changeset shape.

## Installation
In order to use memoria CLI you need to have typescript set up in your project folder.
`memoria` binary will only work on typescript project directories since it uses ts-node under the hood for
`memoria console` and `memoria g fixtures $modelName` generation commands.

``` npm install -g @memoria/cli ```

``` memoria ```

You can use the CLI to create relevant boilerplate files and initial setup

### memoria Model API

```ts
// memoria MODEL API
import Model, { primaryGeneratedColumn, Column } from '@memoria/model';
// OR:
const Model = require('@memoria/model').default;
// THEN:

class User extends Model {
 // Optionally add static Adapter = RESTAdapter; by default its MemoryAdapter
 @PrimaryGeneratedColumn()
 id: number;

 @Column()
 firstName: string;

 @Column()
 lastName: string

 // NOTE: you can add here your static methods
 static serializer(modelOrArray) {
   return modelOrArray;
 }
};
// allows User.serializer(user);

await User.findAll(); // [];

await User.insert({ firstName: 'Izel', lastName: 'Nakri' }); // User{ id: 1, firstName: 'Izel', lastName: 'Nakri' }

let usersAfterInsert = await User.findAll(); // [User{ id: 1, firstName: 'Izel', lastName: 'Nakri' }]

let insertedUser = usersAfterInsert[0];

insertedUser.firstName = 'Isaac';

await User.findAll(); // [User{ id: 1, firstName: 'Izel', lastName: 'Nakri' }]

await User.update(insertedUser); // User{ id: 1, firstName: 'Isaac', lastName: 'Nakri' }

await User.findAll(); // [User{ id: 1, firstName: 'Isaac', lastName: 'Nakri' }]

let updatedUser = await User.find(1); // User{ id: 1, firstName: 'Isaac', lastName: 'Nakri' }

let anotherUser = await User.insert({ firstName: 'Brendan' }); // User{ id: 2, firstName: 'Brendan', lastName: null }

updatedUser.firstName = 'Izel';

await User.findAll(); // [User{ id: 1, firstName: 'Isaac', lastName: 'Nakri' }, User{ id: 2, firstName: 'Brendan', lastName: null }]

await User.delete(updatedUser); // User{ id: 1, firstName: 'Isaac', lastName: 'Nakri' }

await User.findAll(); // [User{ id: 2, firstName: 'Brendan', lastName: null }]
```

NOTE: API also works for UUIDs instead of id primary keys

### memoria Server API

```js

// in memoria/routes.ts:

import User from './models/user';
import Response from '@memoria/response';

interface Request {
  headers: object,
  params: object,
  queryParams: object,
  body: object
}

export default function() {
  this.logging = true; // OPTIONAL: only if you want to log incoming requests/responses
  this.urlPrefix = 'http://localhost:8000/api'; // OPTIONAL: if you want to scope all the routes under a host/url

  this.post('/users', async (request: Request) => {
    const user = await User.insert(request.params.user);

    return { user: User.serializer(user) };
  });

  // OR:
  this.post('/users', User);

  this.get('/users', async (request: Request) => {
    if (request.queryParams.filter === 'is_active') {
      const users = await User.findAll({ is_active: true });

      return { users: User.serializer(users) };
    }

    return Response(422, { error: 'filter is required' });
  });

  // Shorthand without filter, displaying all users: this.get('/users', User);

  this.get('/users/:id', async (request: Request) => {
    return { user: User.serializer(await User.find(request.params.id)) };
    // NOTE: you can wrap it with auth through custom User.findFromHeaders(request.headers) if needed.
  });

  // OR:
  this.get('/users/:id', User);

  this.put('/users/:id', async (request: Request) => {
    let user = await User.find(request.params.id);

    if (!user) {
      return Response(404, { error: 'user not found');
    }

    return { user: User.serializer(await User.update(user.params.user)) };
  });

  // OR:
  this.put('/users/:id', User);

  this.delete('/users/:id', async ({ params }) => {
    const user = await User.find(params.id);

    if (!user) {
      return Response(404, { errors: 'user not found' });
    }

    return await User.delete(user);
  });

  // OR:
  this.delete('/users/:id', User);

  // You can also mock APIs under different hostname

  this.get('https://api.github.com/users/:username', (request) => {
    // NOTE: your mocking logic
  });

  // OTHER OPTIONS:

  this.passthrough('https://api.stripe.com');
  // OR: this.passthrough('https://somedomain.com/api');

  // OPTIONAL: this.timing(500); if you want to slow down responses for testing something etc.
  // BookRoutes.apply(this); // if you want to apply routes from a separate file
}
```

You can also add routes on demand for your tests:

```ts
import Server from './memoria/index';
import Response from '@memoria/response';

test('testing form submit errors when backend is down', async function (assert)  {

  Server.post('/users'. (request) => {
    return Response(500, {});
  });

  // NOTE: also there is Server.get, Server.update, Server.delete, Server.put for mocking with those verbs

  await visit('/form');

  // submit the form
  // POST /users will be added to your route handlers or gets overwritten if it exists
});
```

### memoria init/shutdown API

```ts
// in memoria/index.ts:

import memoria from "@memoria/server";
import initializer from "./initializer";
import routes from "./routes";

const Memoria = new memoria({
  initializer: initializer,
  routes: routes
});

export default Memoria;

// If you want to shutdown request mocking: Memoria.shutdown();
// If you want to reset a database with predefined data:
// User.resetRecords([{ id: 1, firstName: 'Izel', lastName: 'Nakri' }, { id: 2, firstName: 'Brendan', lastName: 'Eich' }]);
```

This is basically a superior mirage.js API & implementation. Also check the tests...

### memoria serializer API:

memoria serializer is very straight-forward, performant and functional/explicit. We have two ways to serialize model
data, it is up to you the developer if you want to serialize it in a custom format(for example JSONAPI) by adding a new
static method(`static customSerializer(modelOrArray) {}`) on the model:

memoria serializer API:

```js
import Model from '@memoria/model';

class User extends Model {
}

const user = await User.find(1);

const serializedUserForEndpoint = { user: User.serializer(user) }; // or User.serialize(user);

const users = await User.findAll({ active: true });

const serializedUsersForEndpoint = { users: User.serializer(users) }; // or users.map((user) => User.serialize(user));
```

Custom serializers:

```js
import Model from '@memoria/model';

class User extends Model {
  static customSerializer(modelObjectOrArray) {
    if (Array.isArray(objectOrArray)) {
      return modelObjectOrArray.map((object) => this.serialize(object));
    }

    return this.customSerialize(objectOrArray);
  }

  static customSerialize(object) {
    return Object.assign({}, object, {
      newKey: 'something'
    });
  }
}

const user = await User.find(1);

const serializedUserForEndpoint = { user: User.customSerializer(user) }; // or User.customSerialize(user);

const users = await User.findAll({ active: true });

const serializedUsersForEndpoint = { users: User.customSerializer(users) }; // or users.map((user) => User.customSerialize(user));
```

### Why this is superior to Mirage?

- Class static method provide a better and more functional way to work on CRUD operations.

- Better typecasting on submitted JSON data and persisted models. Empty string are `null`, '123' is a JS number, integer foreign key constraints are not strings.

- can run on node.js thus allows frontend mocking on server-side rendering context.

- `@memoria/response` does not require `new Response`, just `Response`.

- Less code output and dependencies.

- No bad APIs such as association(). Better APIs, no strange factory API that introduces redundant concepts as traits,
or implicit association behavior. Your model inserts are your factories. You can easily create different ES6 standard
methods on the model modules, thus memoria is easier and better to extend.

- No implicit model lifecycle callbacks such as `beforeCreate`, `afterCreate`, `afterUpdate`, `beforeDelete` etc.
This is an old concept that is generally deemed harmful for development, we shouldn't do that extra computation during
runtime for all CRUD. Autogenerating things after a model gets created is an implicit thus bad behavior. Validations
could be done in future as types or TS type decorators(like `class-validator` npm package).

- route shorthands accept the model definition to execute default behavior: `this.post('/users', User)` doesn't need to dasherize,
underscore or do any other string manipulation to get the reference model definition. It also returns correct default
http status code based on the HTTP verb, ex. HTTP POST returns 201 Created just like mirage.

- very easy to debug/develop the server, serialize any data in a very predictable and functional way.

- API is very similar to Mirage, it can do everything mirage can do, while all redudant and worse API removed.

- written in Typescript, thus provides type definitions by default.
