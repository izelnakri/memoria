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
  class Group extends Model {
    static Serializer = class GroupSerializer extends Serializer {};

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
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

  return Group;
}
