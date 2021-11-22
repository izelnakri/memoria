import Model, { PrimaryGeneratedColumn, Serializer, Column, BelongsTo } from "@memoria/model";
import { SQLAdapter } from "@memoria/adapter";
import User from "./user.js";
import Photo from "./photo.js";

export default function generatePhotoComment() {
  class SQLPhotoComment extends Model {
    static Adapter = SQLAdapter;
    static Serializer = class PhotoCommentSerializer extends Serializer {};

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    content: string;

    @Column("int")
    photo_id: number;

    @Column("int")
    user_id: number;

    @BelongsTo(User)
    user;

    @BelongsTo(Photo)
    photo;
  }

  return SQLPhotoComment;
}
