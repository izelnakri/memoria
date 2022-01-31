import Model, {
  Serializer,
  PrimaryGeneratedColumn,
  Column,
  BelongsTo,
  HasMany,
} from "@memoria/model";
import { SQLAdapter } from "@memoria/adapters";
import User from "./user.js";
import Group from "./group.js";
import PhotoComment from "./photo-comment.js";

export default function generatePhoto() {
  class SQLPhoto extends Model {
    static Adapter = SQLAdapter;
    static Serializer = class PhotoSerializer extends Serializer {};

    @PrimaryGeneratedColumn("uuid")
    uuid: string;

    @Column("varchar", { nullable: true })
    name: string;

    @Column("varchar", { nullable: true })
    href: string;

    @Column("boolean", { nullable: true })
    is_public: boolean;

    @Column("varchar", { nullable: true })
    owner_uuid: string;

    @Column("varchar", { nullable: true })
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
