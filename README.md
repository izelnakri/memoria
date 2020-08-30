<a href="https://circleci.com/gh/izelnakri/memserver/">
  <img src="https://circleci.com/gh/izelnakri/memserver/tree/master.png" alt="Build Status">
</a>

# What is MemServer?
MemServer is an in-memory database/ORM and http mock server you can run in-browser and node environments. Extremely useful library for fast frontend tests, rapid prototyping, single-file SPA demo deployments.

## Installation
In order to use memserver CLI you need to have typescript set up in your project folder.
`memserver` binary will only work on typescript project directories since it uses ts-node under the hood to for `memserver console` and `memserver g fixtures $modelName` generation commands.

``` npm install -g memserver ```

``` memserver ```

You can use the CLI to create relevant boilerplate files and initial setup

### Memserver Model API

```js
// MEMSERVER MODEL API
import Model from 'memserver/model';
// OR:
const Model = require('memserver/model');
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

let updatedUser = User.find(1); // [{ id: 1, firstName: 'Isaac', lastName: 'Nakri' }]

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
  this.post('/users'. User);

  this.get('/users', (request: Request) => {
    if (request.queryParams.filter === 'is_active') {
      const users = User.findAll({ is_active: true });

      return { users: User.serializer(user) };
    }

    return Response(422, { error: 'filter is required' });
  });

  // Shorthand without filter, displaying all users: this.get('/users'. User);

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
  this.delete('/users/:id');

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

test('testing form submit errors when backend is offline', async function (assert)  {

  Server.post('/users'. (request) => {
    return Response(500, {});
  });

  // NOTE: also there is Server.get, Server.update, Server.delete, Server.put for mocking with those verbs

  await visit('/form');

  // submit the form
  // GET /users will be added to your route handlers or gets overwritten if it exists
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
```

This is basically a superior mirage.js API & implementation. Also check the tests...
