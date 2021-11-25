import Model, {
  Serializer,
  PrimaryGeneratedColumn,
  Column,
  BelongsTo,
  HasMany,
} from "@memoria/model";
import { SQLAdapter } from "@memoria/adapter";
import User from "./user.js";
import Group from "./group.js";
import PhotoComment from "./photo-comment.js";

export default function generatePhoto() {
  class SQLPhoto extends Model {
    static Adapter = SQLAdapter;
    static Serializer = class PhotoSerializer extends Serializer {};

    @PrimaryGeneratedColumn("uuid")
    uuid: string;

    @Column()
    name: string;

    @Column()
    href: string;

    @Column("boolean")
    is_public: boolean;

    @Column()
    owner_uuid: string;

    @Column()
    group_uuid: string;

    @BelongsTo(User)
    owner;

    @BelongsTo(Group)
    group;

    @HasMany(PhotoComment)
    comments;
  }

  return SQLPhoto;
}
