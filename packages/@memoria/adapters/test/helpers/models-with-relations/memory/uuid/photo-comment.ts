import Model, {
  PrimaryGeneratedColumn,
  Serializer,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BelongsTo,
} from "@memoria/model";
import User from "./user.js";
import Photo from "./photo.js";
import Group from "./group.js";

export default function generatePhotoComment() {
  class MemoryPhotoComment extends Model {
    static Serializer = class PhotoCommentSerializer extends Serializer {};

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
    group_id: string;

    @Column()
    user_uuid: string;

    @Column()
    photo_uuid: string;

    @BelongsTo(Group)
    group;

    @BelongsTo(User)
    user;

    @BelongsTo(Photo)
    photo;
  }

  return MemoryPhotoComment;
}
