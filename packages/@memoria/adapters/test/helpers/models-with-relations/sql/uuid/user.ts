import Model, {
  Serializer,
  PrimaryGeneratedColumn,
  Column,
  HasMany,
  ManyToMany,
} from "@memoria/model";
import { SQLAdapter } from "@memoria/adapters";
import Group from "./group.js";
import Photo from "./photo.js";
import PhotoComment from "./photo-comment.js";

export default function generateUser() {
  class SQLUser extends Model {
    static Adapter = SQLAdapter;
    static Serializer = class UserSerializer extends Serializer {};

    @PrimaryGeneratedColumn("uuid")
    uuid: string;

    @Column("varchar", { nullable: true })
    first_name: string;

    @Column("varchar", { nullable: true })
    last_name: string;

    @HasMany(Photo)
    photos;

    @HasMany(PhotoComment)
    photoComments;

    @ManyToMany(Group)
    groups;
  }

  return SQLUser;
}
