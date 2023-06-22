import { Changeset } from "@memoria/model";
import Memoria from "@memoria/server";
import generateModels from "../../memory/mix/index.js";
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

      this.get("/photos", async ({ queryParams }) => {
        if (queryParams) {
          let photos = queryParams.ids ? await Photo.find(queryParams.ids) : await Photo.findAll(queryParams);

          return { photos: Photo.serializer(photos) };
        }

        let photos = await Photo.findAll(queryParams);

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

      this.get("/photos/count", async (request) => {
        let photos = await Photo.findAll();

        return { count: photos.length };
      });

      this.post("/users", async (request) => {
        try {
          let user = await User.insert(request.params.user);

          return { user: User.serializer(user) };
        } catch (changeset) {
          return { errors: Changeset.serializer(changeset) };
        }
      });

      this.put("/users/:id", async (request) => {
        try {
          let user = await User.update(request.params.user);

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

      this.post("/groups", async (request) => {
        try {
          let group = await Group.insert(request.params.group);

          return { group: Group.serializer(group) };
        } catch (changeset) {
          return { errors: Changeset.serializer(changeset) };
        }
      });

      this.get("/groups", async () => {
        let groups = await Group.findAll();

        return { groups: Group.serializer(groups) };
      });

      this.get("/groups/:uuid", async (request) => {
        let group = await Group.find(request.params.uuid);

        return { group: Group.serializer(group) };
      });

      this.put("/groups/:uuid", async (request) => {
        try {
          let group = await Group.update(request.params.group);

          return { group: Group.serializer(group) };
        } catch (changeset) {
          return { errors: Changeset.serializer(changeset) };
        }
      });

      this.delete("/groups/:uuid", async (request) => {
        try {
          await Group.delete(request.params.group);
        } catch (changeset) {
          return { errors: Changeset.serializer(changeset) };
        }
      });

      this.post("/photo-comments", async (request) => {
        try {
          let photoComment = await PhotoComment.insert(request.params.photoComment);

          return { photoComment: PhotoComment.serializer(photoComment) };
        } catch (changeset) {
          return { errors: Changeset.serializer(changeset) };
        }
      });

      this.get("/photo-comments", async (request) => {
        if (request.queryParams) {
          let photoComments = request.queryParams.ids
            ? await PhotoComment.find(request.queryParams.ids)
            : await PhotoComment.findAll(request.queryParams);

          return { photoComments: PhotoComment.serializer(photoComments) };
        }

        let photoComment = await PhotoComment.findAll();

        return { photoComments: PhotoComment.serializer(photoComment) };
      });

      this.get("/photo-comments/:uuid", async (request) => {
        let photoComment = (await PhotoComment.find(request.params.uuid)) as PhotoComment;

        return { photoComment: PhotoComment.serializer(photoComment) };
      });

      this.put("/photo-comments/:uuid", async (request) => {
        try {
          let photoComment = await PhotoComment.update(request.params.photoComment);

          return { photoComment: PhotoComment.serializer(photoComment) };
        } catch (changeset) {
          return { errors: Changeset.serializer(changeset) };
        }
      });

      this.delete("/photo-comments/:uuid", async (request) => {
        try {
          await PhotoComment.delete(request.params.photoComment);
        } catch (changeset) {
          return { errors: Changeset.serializer(changeset) };
        }
      });

      this.get("/photo-comments/count", async (request) => {
        let photoComment = await PhotoComment.findAll();

        return { count: photoComment.length };
      });
    },
  });

  return {
    MemoryGroup,
    MemoryPhoto,
    MemoryPhotoComment,
    MemoryUser,
    RESTGroup: generateRESTGroup(),
    RESTPhoto: generateRESTPhoto(),
    RESTPhotoComment: generateRESTPhotoComment(),
    RESTUser: generateRESTUser(),
    Server,
  };
}
