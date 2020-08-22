import Model from "memserver/model";

export default class User extends Model {
  static defaultAttributes = {
    is_admin: false,
    slug() {
      console.log(this.lastName);
      console.log(this.is_admin);
      console.log(this.firstName);
      return `${this.firstName}-${this.lastName}`;
    },
  };

  constructor() {
    super();
  }
}
