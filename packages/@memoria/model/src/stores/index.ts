import Schema from "./config.js";
import DB from "./db.js";
import RelationshipSchema from "./relationship/config.js";
import RelationshipDB from "./relationship/db.js";

export type {
  RelationshipType,
  RelationshipSummary,
  RelationshipTable,
} from "./relationship/config.js";

export { Schema, DB, RelationshipSchema, RelationshipDB };
