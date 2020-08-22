import Model from "memserver/model";

export default class User extends Model {
  static defaultAttributes = {
    is_admin: false,
    slug() {
      return `${this.firstName}-${this.lastName}`;
    },
  };

  constructor() {
    super();
  }
}
