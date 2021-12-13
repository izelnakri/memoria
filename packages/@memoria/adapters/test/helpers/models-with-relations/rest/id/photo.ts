import Model, {
  Serializer,
  PrimaryGeneratedColumn,
  Column,
  BelongsTo,
  HasMany,
} from "@memoria/model";
import { RESTAdapter } from "@memoria/adapters";
import User from "./user.js";
import Group from "./group.js";
import PhotoComment from "./photo-comment.js";

export default function generatePhoto() {
  class RESTPhoto extends Model {
    static Adapter = class PhotoRESTAdapter extends RESTAdapter {
      static pathForType(_Model: typeof Model) {
        return "photos";
      }
    };
    static Serializer = class PhotoSerializer extends Serializer {
      static modelKeyNameFromPayload(_Model: typeof Model) {
        return "photo";
      }
    };

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
