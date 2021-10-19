import generateGroup from "./group.js";
import generatePhotoComment from "./photo-comment.js";
import generatePhoto from "./photo.js";
import generateUser from "./user.js";

export default function generateModels() {
  return {
    Group: generateGroup(),
    Photo: generatePhoto(),
    PhotoComment: generatePhotoComment(),
    User: generateUser(),
  };
}
