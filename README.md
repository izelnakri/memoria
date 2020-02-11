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

