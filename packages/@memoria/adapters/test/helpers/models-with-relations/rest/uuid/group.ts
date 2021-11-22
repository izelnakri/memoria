import Model, {
  PrimaryGeneratedColumn,
  Serializer,
  Column,
  ManyToMany,
  BelongsTo,
  HasOne,
  HasMany,
} from "@memoria/model";
import { RESTAdapter } from "@memoria/adapter";
import User from "./user.js";
import Photo from "./photo.js";
import PhotoComment from "./photo-comment.js";

export default function generateGroup() {
  class RESTGroup extends Model {
    static Adapter = RESTAdapter;
    static Serializer = class GroupSerializer extends Serializer {};

    @PrimaryGeneratedColumn("uuid")
    uuid: string;

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

  return RESTGroup;
}
