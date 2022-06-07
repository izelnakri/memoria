import Model, {
  PrimaryGeneratedColumn,
  Serializer,
  Column,
  ManyToMany,
  BelongsTo,
  HasOne,
  HasMany,
} from "@memoria/model";
import { RESTAdapter } from "@memoria/adapters";
import User from "./user.js";
import Photo from "./photo.js";
import PhotoComment from "./photo-comment.js";

export default function generateGroup() {
  class RESTGroup extends Model {
    static Adapter = class GroupRESTAdapter extends RESTAdapter {
      static pathForType(_Model: typeof Model) {
        return "groups";
      }
    };
    static Serializer = class GroupSerializer extends Serializer {
      static modelKeyNameFromPayload(_Model: typeof Model) {
        return "group";
      }
    };

    @PrimaryGeneratedColumn('uuid')
    uuid: string;

    @Column()
    name: string;

    @Column("int")
    owner_id: number;

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
