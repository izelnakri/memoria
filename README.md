![docker-based-ci](https://github.com/izelnakri/memserver/workflows/docker-based-ci/badge.svg)

# What is MemServer?
MemServer is an in-memory database/ORM and http mock server you can run in-browser and node environments.
Extremely useful library for fast frontend tests, rapid prototyping, single-file SPA demo deployments.

## Installation
In order to use memserver CLI you need to have typescript set up in your project folder.
`memserver` binary will only work on typescript project directories since it uses ts-node under the hood for `memserver console` and `memserver g fixtures $modelName` generation commands.

``` npm install -g memserver ```

``` memserver ```

You can use the CLI to create relevant boilerplate files and initial setup

### Memserver Model API

```js
// MEMSERVER MODEL API
import Model from 'memserver/model';
// OR:
const Model = require('memserver/model').default;
// THEN:

class User extends Model {
 // NOTE: you can add here your static methods
 static serializer(modelOrArray) {
   return modelOrArray;
 }
};
// allows User.serializer(user);

User.findAll(); // [];

User.insert({ firstName: 'Izel', lastName: 'Nakri' }); // { id: 1, firstName: 'Izel', lastName: 'Nakri' }

let usersAfterInsert = User.findAll(); // [{ id: 1, firstName: 'Izel', lastName: 'Nakri' }]

let insertedUser = usersAfterInsert[0];

insertedUser.firstName = 'Isaac';

User.findAll(); // [{ id: 1, firstName: 'Izel', lastName: 'Nakri' }]

User.update(insertedUser); // { id: 1, firstName: 'Isaac', lastName: 'Nakri' }

User.findAll(); // [{ id: 1, firstName: 'Isaac', lastName: 'Nakri' }]

let updatedUser = User.find(1); // { id: 1, firstName: 'Isaac', lastName: 'Nakri' }

let anotherUser = User.insert({ firstName: 'Brendan' }); // { id: 2, firstName: 'Brendan', lastName: null }

updatedUser.firstName = 'Izel';

User.findAll(); // [{ id: 1, firstName: 'Isaac', lastName: 'Nakri' }, { id: 2, firstName: 'Brendan', lastName: null }]

User.delete(updatedUser); // { id: 1, firstName: 'Isaac', lastName: 'Nakri' }

User.findAll(); // [{ id: 2, firstName: 'Brendan', lastName: null }]
```

NOTE: API also works for UUIDs instead of id primary keys

### Memserver Server API

```js

// in memserver/routes.ts:

import User from './models/user';
import Response from 'memserver/response';

interface Request {
  headers: object,
  params: object,
  queryParams: object,
  body: object
}

export default function() {
  this.logging = true; // OPTIONAL: only if you want to log incoming requests/responses
  this.urlPrefix = 'http://localhost:8000/api'; // OPTIONAL: if you want to scope all the routes under a host/url

  this.post('/users', (request: Request) => {
    const user = User.insert(request.params.user);

    return { user: User.serializer(user) };
  });

  // OR:
  this.post('/users', User);

  this.get('/users', (request: Request) => {
    if (request.queryParams.filter === 'is_active') {
      const users = User.findAll({ is_active: true });

      return { users: User.serializer(users) };
    }

    return Response(422, { error: 'filter is required' });
  });

  // Shorthand without filter, displaying all users: this.get('/users', User);

  this.get('/users/:id', (request: Request) => {
    return { user: User.serializer(User.find(request.params.id)) };
    // NOTE: you can wrap it with auth through custom User.findFromHeaders(request.headers) if needed.
  });

  // OR:
  this.get('/users/:id', User);

  this.put('/users/:id', (request: Request) => {
    let user = User.find(request.params.id);

    if (!user) {
      return Response(404, { error: 'user not found');
    }

    return { user: User.serializer(User.update(user.params.user)) };
  });

  // OR:
  this.put('/users/:id', User);

  this.delete('/users/:id', ({ params }) => {
    const user = User.find(params.id);

    if (!user) {
      return Response(404, { errors: 'user not found' });
    }

    return User.delete(user);
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
import Server from './memserver/index';
import Response from 'memserver/response';

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

### Memserver init/shutdown API

```ts
// in memserver/index.ts:

import Memserver from "memserver/server";
import initializer from "./initializer";
import routes from "./routes";

const MemServer = new Memserver({
  initializer: initializer,
  routes: routes
});

export default MemServer;

// If you want to shutdown request mocking: MemServer.shutdown();
// If you want to reset a database with predefined data:
// User.resetDatabase([{ id: 1, firstName: 'Izel', lastName: 'Nakri' }, { id: 2, firstName: 'Brendan', lastName: 'Eich' }]);
```

This is basically a superior mirage.js API & implementation. Also check the tests...

### Memserver serializer API:

Memserver serializer is very straight-forward, performant and functional/explicit. We have two ways to serialize model
data, it is up to you the developer if you want to serialize it in a custom format(for example JSONAPI) by adding a new
static method(`static customSerializer(modelOrArray) {}`) on the model:

Memserver serializer API:

```js
import Model from 'memserver/model';

class User extends Model {
}

const user = User.find(1);

const serializedUserForEndpoint = { user: User.serializer(user) }; // or User.serialize(user);

const users = User.findAll({ active: true });

const serializedUsersForEndpoint = { users: User.serializer(users) }; // or users.map((user) => User.serialize(user));
```

Custom serializers:

```js
import Model from 'memserver/model';

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

const user = User.find(1);

const serializedUserForEndpoint = { user: User.customSerializer(user) }; // or User.customSerialize(user);

const users = User.findAll({ active: true });

const serializedUsersForEndpoint = { users: User.customSerializer(users) }; // or users.map((user) => User.customSerialize(user));
```

### Why this is superior to Mirage?

- Data stored as pure JS objects and their Model module methods provides a functional way to work on the data.
This makes the inserts, updates faster and encourages a better programming model.

- Better typecasting on submitted JSON data and persisted models. Empty string are `null`, '123' is a JS number, integer foreign key constraints are not strings.

- `memserver/response` does not require `new Reponse`, just `Response`.

- Less code output and dependencies.

- No bad APIs such as association(). Better APIs, no strange factory API that introduces redundant concepts as traits,
or implicit association behavior. Your model inserts are your factories. You can easily create different ES6 standard
methods on the model modules, thus memserver is easier and better to extend.

- No implicit model lifecycle callbacks such as `beforeCreate`, `afterCreate`, `afterUpdate`, `beforeDelete` etc.
This is an old concept that is generally deemed harmful for development, we shouldn't do that extra computation in our
runtimes. Autogenerating things after a model gets created is an implicit thus bad behavior. Validations could be done
in future as types or TS type decorators(like `class-validator` npm package), thus validations don't need to  happen in
runtime and all would be check during development via typescript typecheck/linting.

- No implicit relationship tracking, creating and updating a relationship should be done on the foreign-key of the
models relationship. This might seem verbose, but leads to faster runtime and in future might allow better
typechecking/annotated validations on model properties. Due to unresolved nature of this situation we leave implicit
relationship settings. Instead users should set the related foreign keys and change that value to relationship
primary key just as it would have been done on a SQL database.

- No implicit/custom serializer abstraction/API. Memserver model serializer is more sane than mirage. It makes it easier
and more functional to create your own serializers since all `MemserverModel.serializer(modelOrArray)` does is, it embeds
defined `embedReferences`s and sets undefined or null values to null in the resulted objectOrArray.

- route shorthands accept the model definition to execute default behavior: `this.post('/users', User)` doesn't need to dasherize,
underscore or do any other string manipulation to get the reference model definition. It also returns correct default
http status code based on the HTTP verb, ex. HTTP POST returns 201 Created just like mirage.

- very easy to debug/develop the server, serialize any data in a very predictable and functional way.

- API is very similar to Mirage, it can do everything mirage can do, while all redudant and worse API removed.

- can run on node.js thus allows frontend mocking on server-side rendering context.

- written in Typescript, thus provides type definitions by default.
