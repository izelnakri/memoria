### Setup instructions

In order to use memserver CLI you need to have typescript set up in your project folder.
`memserver` binary will only work on typescript project directories since it uses ts-node under the hood to for `memserver console` and `memserver g fixtures $modelName` generation commands.

```
npm install && npm run npm-link-ember-packages && tsc --build && npm run publish-modules-for-browser-and-node
```


