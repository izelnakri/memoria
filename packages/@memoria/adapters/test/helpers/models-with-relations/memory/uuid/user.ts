import Model, { Serializer, PrimaryGeneratedColumn, Column, HasMany, ManyToMany } from "@memoria/model";
import Group from "./group.js";
import Photo from "./photo.js";
import PhotoComment from "./photo-comment.js";

export default function generateUser() {
  class MemoryUser extends Model {
    static Serializer = class UserSerializer extends Serializer {};

    @PrimaryGeneratedColumn("uuid")
    uuid: string;

    @Column()
    first_name: string;

    @Column()
    last_name: string;

    @HasMany(Photo)
    photos;

    @HasMany(PhotoComment)
    photoComments;

    @HasMany(Group)
    ownedGroups;

    // @ManyToMany(Group)
    // groups;
  }

  return MemoryUser;
}
