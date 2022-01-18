import { RuntimeError } from "../errors/index.js";

interface DeferredPromise {
  promise: LazyPromise;
  resolve: (value) => {};
  reject: (value) => {};
}

// TODO: maybe add timeout option, shouldTakeInMs option(for .isSlow)
// NOTE: isSlow = false; NOTE: instead it could have start time and finishTime and hooks onStart, onFinish, onError
export default class LazyPromise extends Promise<void> {
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

  isStarted = false;
  isLoading = false;
  isLoaded = false;
  isError = false;
  isAborted = false;

  #rejectHandlers = new Set();
  #abortMessage: Error;
  #abortController: AbortController;
  #promise?: Promise<void>;
  #executor: (resolve: any, reject: any) => void;

  #runRejectHandlers(error) {
    this.isLoading = false;

    let result = Promise.all(
      Array.from(this.#rejectHandlers).map((rejectHandler: (unknown) => void) =>
        rejectHandler(error)
      )
    );
    this.#rejectHandlers.clear();

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
    onRejected && this.#rejectHandlers.add(onRejected);

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
    this.#rejectHandlers.add(onRejected);

    return this;
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
