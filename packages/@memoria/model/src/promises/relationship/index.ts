import LazyPromise from "../lazy.js";

export default class RelationshipPromise extends LazyPromise {
  constructor(executor) {
    let promise = super(...arguments);

    return Object.seal(promise);
  }
}

export { RelationshipPromise };
