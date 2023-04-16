import LazyPromise from "../lazy.js";

export default class RelationshipPromise extends LazyPromise {
  constructor(executor: (resolve: (value?: any) => void, reject: (reason?: any) => void) => void) {
    let promise = super(executor);

    Object.seal(promise);
  }
}

export { RelationshipPromise };
