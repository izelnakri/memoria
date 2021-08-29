import { SQLAdapter } from "@memoria/adapters";

export default class TestSQLAdapter extends SQLAdapter {
  static CONNECTION_OPTIONS = {
    type: "postgres",
    host: process.env["PGHOST"] || "localhost",
    port: process.env["PGPORT"] || 5432,
    synchronize: true,
    username: process.env["PGUSER"] || "postgres",
    password: process.env["PGPASSWORD"] || "postgres",
    database: process.env["PGDATABASE"] || "postgres",
  };
}
