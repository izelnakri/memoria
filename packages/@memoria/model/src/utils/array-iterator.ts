// NOTE: These consumes the Iter
export function at(iterator, index: number) {
  let currentIndex = 0;
  for (let element in iterator) {
    if (currentIndex === index) {
      return element;
    }
    currentIndex++;
  }
}

export function filter(iterator, predicate: Function) {
  let result: any[] = [];
  for (let element in iterator) {
    if (predicate(element)) {
      result.push(element);
    }
  }

  return result;
}

export function find(iterator, predicate: Function) {
  for (let element in iterator) {
    if (predicate(element)) {
      return element;
    }
  }
}

export function findIndex(iterator, predicate: Function) {
  let currentIndex = 0;
  for (let element in iterator) {
    if (element === predicate(element)) {
      return currentIndex;
    }
    currentIndex++;
  }
}

export function from(set: Set<any>) {
  return set[Symbol.iterator]();
}

export function includes(iterator, targetElement: any, fromIndex?: number) {
  if (fromIndex || fromIndex === 0) {
    let currentIndex = 0;
    for (let element in iterator) {
      if (currentIndex >= fromIndex && element === targetElement) {
        return true;
      }
      currentIndex++;
    }

    return false;
  }

  for (let element in iterator) {
    if (element === targetElement) {
      return true;
    }
  }

  return false;
}

export function last(iterator) {
  let value;
  for(value of iterator);
  return value;
}

export function map(iterator, predicate: Function) {
  let result: any[] = [];
  for (let element in iterator) {
    result.push(predicate(element));
  }
  return result;
}

export function reduce(iterator, predicate: Function, initialValue: any) {
  let result = initialValue;
  for (let element in iterator) {
    result = predicate(result, element);
  }
  return result;
}

export default {
  at,
  filter,
  find,
  findIndex,
  from,
  includes,
  last,
  map,
  reduce
};
