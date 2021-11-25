import Model, { PrimaryGeneratedColumn, Serializer, Column, BelongsTo } from "@memoria/model";
import { RESTAdapter } from "@memoria/adapter";
import User from "./user.js";
import Photo from "./photo.js";

export default function generatePhotoComment() {
  class RESTPhotoComment extends Model {
    static Adapter = RESTAdapter;
    static Serializer = class PhotoCommentSerializer extends Serializer {};

    @PrimaryGeneratedColumn("uuid")
    uuid: string;

    @Column()
    content: string;

    @Column()
    photo_uuid: string;

    @Column()
    user_uuid: string;

    @BelongsTo(User)
    user;

    @BelongsTo(Photo)
    photo;
  }

  return RESTPhotoComment;
}
