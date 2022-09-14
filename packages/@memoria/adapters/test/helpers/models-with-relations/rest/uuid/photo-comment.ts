import Model, {
  PrimaryGeneratedColumn,
  Serializer,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BelongsTo,
} from "@memoria/model";
import { RESTAdapter } from "@memoria/adapters";
import User from "./user.js";
import Photo from "./photo.js";

export default function generatePhotoComment() {
  class RESTPhotoComment extends Model {
    static Adapter = class PhotoCommentRESTAdapter extends RESTAdapter {
      static pathForType(_Model: typeof Model) {
        return "photo-comments";
      }
    };
    static Serializer = class PhotoCommentSerializer extends Serializer {
      static modelKeyNameFromPayload(_Model: typeof Model) {
        return "photoComment";
      }
    };

    @PrimaryGeneratedColumn("uuid")
    uuid: string;

    @Column()
    content: string;

    @Column("boolean", { default: true })
    is_important: boolean;

    @CreateDateColumn()
    inserted_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @Column()
    user_uuid: string;

    @Column()
    photo_uuid: string;

    @BelongsTo(User)
    user;

    @BelongsTo(Photo)
    photo;
  }

  return RESTPhotoComment;
}
