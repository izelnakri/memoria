import { SQLAdapter } from "@memoria/adapters";

// domain
// password
// username
// databaseName
class User extends SQLAdapter {
  static databaseType: 'posgresql',
  static databaseName: 'public'
  static domain: 'localhost',
  static username: 'izelnakri',
  static password: '123456'
}
