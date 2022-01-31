import generateGroup from "./group.js";
import generatePhotoComment from "./photo-comment.js";
import generatePhoto from "./photo.js";
import generateUser from "./user.js";
import Model, {
  Serializer,
  PrimaryGeneratedColumn,
  Column,
  BelongsTo,
  HasMany,
  HasOne,
  ManyToMany,
} from "@memoria/model";
import { SQLAdapter } from "@memoria/adapters";

export default function generateModels() {
  return {
    SQLGroup: generateGroup(),
    SQLPhoto: generatePhoto(),
    SQLPhotoComment: generatePhotoComment(),
    SQLUser: generateUser(),
  };
}
