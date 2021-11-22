import Model, {
  Serializer,
  PrimaryGeneratedColumn,
  Column,
  HasMany,
  ManyToMany,
} from "@memoria/model";
import { RESTAdapter } from "@memoria/adapter";
import Group from "./group.js";
import Photo from "./photo.js";
import PhotoComment from "./photo-comment.js";

export default function generateUser() {
  class RESTUser extends Model {
    static Adapter = RESTAdapter;
    static Serializer = class UserSerializer extends Serializer {};

    @PrimaryGeneratedColumn("uuid")
    uuid: string;

    @Column()
    first_name: string;

    @Column()
    last_name: string;

    @HasMany(Photo)
    photos;

    @HasMany(PhotoComment)
    photoComments;

    @ManyToMany(Group)
    groups;
  }

  return RESTUser;
}
