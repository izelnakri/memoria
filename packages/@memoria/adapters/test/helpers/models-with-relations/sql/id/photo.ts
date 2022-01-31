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

    @PrimaryGeneratedColumn()
    id: number;

    @Column("varchar", { nullable: true })
    name: string;

    @Column("varchar", { nullable: true })
    href: string;

    @Column("boolean", { nullable: true })
    is_public: boolean;

    @Column("int", { nullable: true })
    owner_id: number;

    @Column("int", { nullable: true })
    group_id: number;

    @BelongsTo(User)
    owner;

    @BelongsTo(Group)
    group;

    @HasMany(PhotoComment)
    comments;
  }

  return SQLPhoto;
}
