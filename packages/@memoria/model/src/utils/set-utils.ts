export default class SetUtils {
  static shift(set: Set<any>): any {
    let result = set.values().next();
    if (result.done) {
      return;
    } else {
      set.delete(result.value);

      return result.value;
    }
  }
}
