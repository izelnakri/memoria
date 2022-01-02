export default class LazyPromise<ValueType> extends Promise<ValueType> {
  _promise: undefined | Promise<ValueType>;
  _executor: ((resolve: any, reject: any) => ValueType);

  constructor(executor: ((resolve: any, reject: any) => ValueType)) {
    super((resolve) => resolve(new Promise(() => {})));

    this._executor = executor;
  }

  static from(function_: any) {
    return new this((resolve) => resolve(function_()));
  }

  static resolve(value: any) {
    return new this((resolve) => resolve(value));
  }

  static reject(error: any) {
    return new this((_resolve, reject) => reject(error));
  }

  // @ts-ignore
  then<A, B>(onFulfilled?: any, onRejected?: any) {
    this._promise = this._promise || new Promise(this._executor);

    return this._promise.then(onFulfilled, onRejected);
  }

  catch(onRejected: any) {
    this._promise = this._promise || new Promise(this._executor);

    return this._promise.catch(onRejected);
  }
}
