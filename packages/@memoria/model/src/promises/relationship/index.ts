import LazyPromise from "../lazy.js";

export default class RelationshipPromise {
  constructor(executor) {
    return new LazyPromise(executor);
  }
}

export { RelationshipPromise };
