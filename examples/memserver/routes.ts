import User from "./models/user";
import PhotoComment from './models/photo-comment';

export default function() {
  this.get("/users", ({ params, queryParams, headers }) => {
    return { users: User.serializer(User.findAll()) };
  });

  this.get('/photo-comments', PhotoComment);
}
