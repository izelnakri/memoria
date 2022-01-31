import Model, { PrimaryGeneratedColumn, Serializer, Column, BelongsTo } from "@memoria/model";
import { SQLAdapter } from "@memoria/adapters";
import User from "./user.js";
import Photo from "./photo.js";

export default function generatePhotoComment() {
  class SQLPhotoComment extends Model {
    static Adapter = SQLAdapter;
    static Serializer = class PhotoCommentSerializer extends Serializer {};

    @PrimaryGeneratedColumn("uuid")
    uuid: string;

    @Column("varchar", { nullable: true })
    content: string;

    @Column("varchar", { nullable: true })
    photo_uuid: string;

    @Column("varchar", { nullable: true })
    user_uuid: string;

    @BelongsTo(User)
    user;

    @BelongsTo(Photo)
    photo;
  }

  return SQLPhotoComment;
}
