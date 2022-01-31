import Model, {
  PrimaryGeneratedColumn,
  Serializer,
  Column,
  ManyToMany,
  BelongsTo,
  HasOne,
  HasMany,
} from "@memoria/model";
import { SQLAdapter } from "@memoria/adapters";
import User from "./user.js";
import Photo from "./photo.js";
import PhotoComment from "./photo-comment.js";

export default function generateGroup() {
  class SQLGroup extends Model {
    static Adapter = SQLAdapter;
    static Serializer = class GroupSerializer extends Serializer {};

    @PrimaryGeneratedColumn("uuid")
    uuid: string;

    @Column("varchar", { nullable: true })
    name: string;

    @ManyToMany(User)
    users;

    @BelongsTo(User)
    owner;

    @HasOne(Photo)
    photo;

    @HasMany(PhotoComment)
    photoComments;
  }

  return SQLGroup;
}
