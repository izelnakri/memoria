import Model, {
  Serializer,
  PrimaryGeneratedColumn,
  Column,
  BelongsTo,
  HasMany,
} from "@memoria/model";
import { RESTAdapter } from "@memoria/adapter";
import User from "./user.js";
import Group from "./group.js";
import PhotoComment from "./photo-comment.js";

export default function generatePhoto() {
  class RESTPhoto extends Model {
    static Adapter = RESTAdapter;
    static Serializer = class PhotoSerializer extends Serializer {};

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    href: string;

    @Column("boolean")
    is_public: boolean;

    @Column("int")
    owner_id: number;

    @Column("int")
    group_id: number;

    @BelongsTo(User)
    owner;

    @BelongsTo(Group)
    group;

    @HasMany(PhotoComment)
    comments;
  }

  return RESTPhoto;
}
