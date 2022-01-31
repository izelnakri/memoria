import Model, { PrimaryGeneratedColumn, Serializer, Column, BelongsTo } from "@memoria/model";
import { SQLAdapter } from "@memoria/adapters";
import User from "./user.js";
import Photo from "./photo.js";

export default function generatePhotoComment() {
  class SQLPhotoComment extends Model {
    static Adapter = SQLAdapter;
    static Serializer = class PhotoCommentSerializer extends Serializer {};

    @PrimaryGeneratedColumn()
    id: number;

    @Column("varchar", { nullable: true })
    content: string;

    @Column("int", { nullable: true })
    photo_id: number;

    @Column("int", { nullable: true })
    user_id: number;

    @BelongsTo(User)
    user;

    @BelongsTo(Photo)
    photo;
  }

  return SQLPhotoComment;
}
