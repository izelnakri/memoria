export default class LazyPromise<ValueType> extends Promise<ValueType> {
  _promise: void | Promise<ValueType>;
  _executor: void | ValueType;

  constructor(executor: ValueType) {
    super((resolve) => {
      resolve();
    });

    this._executor = executor;
  }

  static from(function_) {
    return new LazyPromise((resolve) => {
      resolve(function_());
    });
  }

  static resolve(value) {
    return new LazyPromise((resolve) => {
      resolve(value);
    });
  }

  static reject(error) {
    return new LazyPromise((_resolve, reject) => {
      reject(error);
    });
  }

  then(onFulfilled, onRejected) {
    this._promise = this._promise || new Promise(this._executor);
    // eslint-disable-next-line promise/prefer-await-to-then
    return this._promise.then(onFulfilled, onRejected);
  }

  catch(onRejected) {
    this._promise = this._promise || new Promise(this._executor);
    return this._promise.catch(onRejected);
  }
}
