import Model, { Serializer, PrimaryGeneratedColumn, Column, BelongsTo, HasMany } from "@memoria/model";
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

    @PrimaryGeneratedColumn("uuid")
    uuid: string;

    @Column("varchar", { default: "Photo default name" })
    name: string;

    @Column()
    href: string;

    @Column("boolean", { default: true })
    is_public: boolean;

    @Column()
    owner_uuid: string;

    @Column()
    group_uuid: string;

    @BelongsTo(User)
    owner;

    @BelongsTo(Group)
    group;

    @HasMany(PhotoComment)
    comments;
  }

  return RESTPhoto;
}
