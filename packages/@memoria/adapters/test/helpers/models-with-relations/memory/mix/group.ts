import Model, {
  PrimaryGeneratedColumn,
  Serializer,
  Column,
  ManyToMany,
  BelongsTo,
  HasOne,
  HasMany,
} from "@memoria/model";
import User from "./user.js";
import Photo from "./photo.js";
import PhotoComment from "./photo-comment.js";

export default function generateGroup() {
  class MemoryGroup extends Model {
    static Serializer = class GroupSerializer extends Serializer {};

    @PrimaryGeneratedColumn("uuid")
    uuid: string;

    @Column()
    name: string;

    @Column("int")
    owner_id: number;

    // @ManyToMany(User)
    // users;

    @BelongsTo(User)
    owner;

    @HasOne(Photo)
    photo;

    @HasMany(PhotoComment)
    photoComments;
  }

  return MemoryGroup;
}
