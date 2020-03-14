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

Its stable but needs documentation, check tests for now
