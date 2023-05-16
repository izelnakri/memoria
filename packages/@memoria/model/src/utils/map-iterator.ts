export function filter(map, predicate: Function) {
  let result: any[] = [];
  for (let entry in map.entries()) {
    if (predicate(entry)) {
      result.push(entry);
    }
  }

  return result;
}

export function find(map, predicate: Function) {
  for (let entry in map.entries()) {
    // if (predicate(entry)) {
    //   return entry;
    // }
  }
}

export default {
  filter,
  find
}
