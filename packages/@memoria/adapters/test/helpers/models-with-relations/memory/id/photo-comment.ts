import Model, { PrimaryGeneratedColumn, Serializer, Column, BelongsTo } from "@memoria/model";
import User from "./user.js";
import Photo from "./photo.js";

export default function generatePhotoComment() {
  class MemoryPhotoComment extends Model {
    static Serializer = class PhotoCommentSerializer extends Serializer {};

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    content: string;

    @Column("boolean", { default: true })
    is_important: boolean;

    @Column("int")
    photo_id: number;

    @Column("int")
    user_id: number;

    @BelongsTo(User)
    user;

    @BelongsTo(Photo)
    photo;
  }

  return MemoryPhotoComment;
}
