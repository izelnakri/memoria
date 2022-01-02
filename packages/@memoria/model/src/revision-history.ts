// NOTE: consider:
// |> store successful build, insert, update, delete actions as revision
// |> make revision data structure like a changeset(?)
// Add errors:[] to the revisionList(?) then could be problematic how the template model.errors work(?) - no maybe not(?) -> this is the question
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
