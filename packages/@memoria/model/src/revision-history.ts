import type Model from "./model.js";

export default class RevisionHistory extends Array {
  add(model) {
    this.push(
      Array.from((model.constructor as typeof Model).columnNames).reduce((result, columnName) => {
        result[columnName] = model[columnName];

        return result;
      }, {})
    );

    return this;
  }
}
