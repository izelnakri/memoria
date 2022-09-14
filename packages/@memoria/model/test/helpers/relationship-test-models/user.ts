import Model, { Serializer, PrimaryGeneratedColumn, Column, HasMany, ManyToMany } from "@memoria/model";
import Group from "./group.js";
import Photo from "./photo.js";
import PhotoComment from "./photo-comment.js";

export default function generateUser() {
  class User extends Model {
    static Serializer = class UserSerializer extends Serializer {};

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    first_name: string;

    @Column()
    last_name: string;

    @HasMany(Photo)
    photos;

    @HasMany(PhotoComment)
    photoComments;

    @ManyToMany(Group)
    groups;
  }

  return User;
}
