import { Changeset } from "@memoria/model";
import Memoria from "@memoria/server";
import generateModels from "../../memory/id/index.js";
import generateRESTGroup from "./group.js";
import generateRESTPhotoComment from "./photo-comment.js";
import generateRESTPhoto from "./photo.js";
import generateRESTUser from "./user.js";

export default function generateRESTModels() {
  let { MemoryGroup, MemoryPhoto, MemoryPhotoComment, MemoryUser } = generateModels();
  let { Group, Photo, PhotoComment, User } = {
    Group: MemoryGroup,
    Photo: MemoryPhoto,
    PhotoComment: MemoryPhotoComment,
    User: MemoryUser,
  };
  let Server = new Memoria({
    routes() {
      this.post("/photos", async (request) => {
        try {
          let photo = await Photo.insert(request.params.photo);

          return { photo: Photo.serializer(photo) };
        } catch (changeset) {
          return { errors: Changeset.serializer(changeset) };
        }
      });

      this.put("/photos/:id", async (request) => {
        try {
          let photo = await Photo.update(request.params.photo);

          return { photo: Photo.serializer(photo) };
        } catch (changeset) {
          return { errors: Changeset.serializer(changeset) };
        }
      });

      this.get("/photos", async () => {
        let photos = await Photo.findAll();

        return { photos: Photo.serializer(photos) };
      });

      this.get("/photos/:id", async (request) => {
        let photo = await Photo.find(request.params.id);

        return { photo: Photo.serializer(photo) };
      });

      this.delete("/photos/:id", async (request) => {
        try {
          await Photo.delete(request.params.photo);
        } catch (changeset) {
          return { errors: Changeset.serializer(changeset) };
        }
      });

      this.post("/users", async (request) => {
        try {
          let user = await User.insert(request.params.user);

          return { user: User.serializer(user) };
        } catch (changeset) {
          return { errors: Changeset.serializer(changeset) };
        }
      });

      this.get("/users", async () => {
        let users = await User.findAll();

        return { users: User.serializer(users) };
      });

      this.get("/users/:id", async (request) => {
        let user = await User.find(request.params.id);

        return { user: User.serializer(user) };
      });

      this.delete("/users/:id", async (request) => {
        try {
          await User.delete(request.params.user);
        } catch (changeset) {
          return { errors: Changeset.serializer(changeset) };
        }
      });
    },
  });

  return {
    RESTGroup: generateRESTGroup(),
    RESTPhoto: generateRESTPhoto(),
    RESTPhotoComment: generateRESTPhotoComment(),
    RESTUser: generateRESTUser(),
    MemoryGroup,
    MemoryPhoto,
    MemoryPhotoComment,
    MemoryUser,
    Server,
  };
}
