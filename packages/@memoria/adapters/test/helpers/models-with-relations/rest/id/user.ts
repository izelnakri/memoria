import Model, {
  Serializer,
  PrimaryGeneratedColumn,
  Column,
  HasMany,
  ManyToMany,
} from "@memoria/model";
import { RESTAdapter } from "@memoria/adapters";
import Group from "./group.js";
import Photo from "./photo.js";
import PhotoComment from "./photo-comment.js";

export default function generateUser() {
  class RESTUser extends Model {
    static Adapter = class UserRESTAdapter extends RESTAdapter {
      static pathForType(_Model: typeof Model) {
        return "users";
      }
    };
    static Serializer = class UserSerializer extends Serializer {
      static modelKeyNameFromPayload(_Model: typeof Model) {
        return "user";
      }
    };

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    first_name: string;

    @Column()
    last_name: string;

    @HasMany(Photo)
    photos;

    @HasMany(PhotoComment)
    photoComments;

    // TODO: ADD THIS:
    // @HasMany(Group)
    // ownedGroups;

    @ManyToMany(Group)
    groups;
  }

  return RESTUser;
}
