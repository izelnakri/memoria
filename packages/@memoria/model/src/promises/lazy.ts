interface DeferredPromise {
  promise: LazyPromise;
  resolve: (value) => {};
  reject: (value) => {};
}

export default class LazyPromise extends Promise<void> {
  // isSlow = false;
  // isLoading = false;
  // isLoaded = false;
  // isError = false;
  // get notStarted() {
  //   return !this.isLoading || !this.isLoaded || !this.isError;
  // }

  #promise: undefined | Promise<void>;
  #executor: (resolve: any, reject: any) => void;

  constructor(executor: (resolve: any, reject: any) => void) {
    super((_resolve, _reject) => {});

    this.#executor = executor;
  }

  static from(function_: any) {
    return new this((resolve) => resolve(function_()));
  }

  static defer() {
    let deferred = {} as DeferredPromise;
    let promise = new this(function (resolve, reject) {
      deferred.resolve = resolve;
      deferred.reject = reject;
    });
    deferred.promise = promise;

    return deferred;
  }

  static resolve(value: any) {
    return new this((resolve) => resolve(value));
  }

  static reject(error: any) {
    return new this((_resolve, reject) => reject(error));
  }

  // @ts-ignore
  then(onFulfilled?: any, onRejected?: any) {
    this.#promise = this.#promise || new Promise(this.#executor);

    return this.#promise.then(onFulfilled, onRejected);
  }

  catch(onRejected: any) {
    this.#promise = this.#promise || new Promise(this.#executor);

    return this.#promise.catch(onRejected);
  }

  reload() {
    this.#promise = new Promise(this.#executor);

    return this.#promise;
  }
}
