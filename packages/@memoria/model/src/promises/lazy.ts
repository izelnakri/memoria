import { RuntimeError } from "../errors/index.js";

interface DeferredPromise {
  promise: LazyPromise;
  resolve: (value) => {};
  reject: (value) => {};
}

interface JSObject {
  [key: string]: any;
}

// TODO: maybe add timeout option, shouldTakeInMs option(for .isSlow)
// NOTE: isSlow = false; NOTE: instead it could have start time and finishTime and hooks onStart, onFinish, onError
export default class LazyPromise extends Promise<void> {
  static from(function_: any) {
    return new this((resolve) => resolve(function_()));
  }

  static resolve(value: any) {
    return new this((resolve) => resolve(value));
  }

  static reject(error: any) {
    return new this((_resolve, reject) => reject(error));
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

  static async hash(object: JSObject) {
    let keys = Object.keys(object);
    let values = await Promise.all(keys.map((key) => object[key]));

    return values.reduce((result, values, index) => {
      result[keys[index]] = values;

      return result;
    }, {});
  }

  isStarted = false;
  isLoading = false;
  isLoaded = false;
  isError = false;
  isAborted = false;

  #rejectHandlers: Array<() => void> = [];
  #abortMessage: Error;
  #abortController: AbortController;
  #promise?: Promise<void>;
  #executor: (resolve: any, reject: any) => void;

  #runRejectHandlers(error) {
    this.isLoading = false;

    let result = Promise.all(
      this.#rejectHandlers.map((rejectHandler: (unknown) => void) => rejectHandler(error))
    );
    this.#rejectHandlers.length = 0;

    return result;
  }

  constructor(executor: (resolve: any, reject: any) => void) {
    let abortController = new AbortController();

    super((_resolve, _reject) => {});

    this.#abortController = abortController;
    this.#executor = (resolve, reject) => {
      this.isStarted = true;
      this.isLoading = true;

      if (this.isAborted) {
        this.isLoaded = false;

        return this.#runRejectHandlers(this.#abortMessage);
      }

      return executor(resolve, reject);
    };

    return this;
  }

  abort(message = "Promise aborted!") {
    return new Promise(async (resolve, reject) => {
      if (this.isLoaded || this.isError || this.isAborted) {
        return reject(new RuntimeError("Tried to abort an already finished promise!"));
      }

      this.#abortMessage = new Error(message);
      this.isAborted = true;
      this.#abortController.abort();

      if (this.#promise) {
        this.catch((error) => resolve(error));

        return await this.#runRejectHandlers(this.#abortMessage);
      }

      this.then(
        () => resolve(this.#abortMessage),
        () => resolve(this.#abortMessage)
      );
    });
  }

  // @ts-ignore
  then(onFulfilled?: any, onRejected?: () => void) {
    onRejected && this.#rejectHandlers.push(onRejected);

    if (this.isAborted) {
      return this.#runRejectHandlers(this.#abortMessage);
    }

    this.#promise = this.#promise || new Promise(this.#executor);
    this.#promise.then(
      (value) => {
        this.isLoading = false;

        if (!this.isAborted) {
          this.isLoaded = true;

          return onFulfilled ? onFulfilled(value) : value;
        }
      },
      (error) => {
        this.isLoading = false;
        this.isError = true;

        if (!this.isAborted) {
          return this.#runRejectHandlers(error);
        }
      }
    );

    return this;
  }

  // @ts-ignore
  catch(onRejected) {
    this.#rejectHandlers.push(onRejected);

    return this;
  }

  debug(callback: (any) => any) {
    return this.then((result) => {
      return callback ? callback(result) : console.log(result);
    }).catch((error) => {
      return callback ? callback(error) : console.log(error);
    });
  }

  reload() {
    this.isAborted = false;
    this.isLoading = true;
    this.isLoaded = false;
    this.isError = false;
    this.#promise = new Promise(this.#executor);
    this.then(
      () => {},
      () => {}
    );

    return this;
  }
}
