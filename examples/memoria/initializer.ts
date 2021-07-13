declare global {
  interface Window {
    User: any;
    PhotoComment: any;
  }
}

import users from "./fixtures/users";
import photoComments from './fixtures/photo-comments';
import User from "./models/user";
import PhotoComment from './models/photo-comment';

export default function() {
  window.User = User;
  window.PhotoComment = PhotoComment;

  User.resetDatabase(users);
  PhotoComment.resetDatabase(photoComments);
}
