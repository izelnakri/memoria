import User from "./models/user";
import PhotoComment from "./models/photo-comment";
import server from "@memoria/server";

let app = server({ mock: process.env.MOCK_SERVER });

app.get("/users", async (req, res) => {
  let users = await User.findAll();

  return res.json({ users: User.serializer(users) });
});

app.get("/photo-comments", async (req, res) => {
  let photoComments = await PhotoComment.findAll();

  return res.json({ photo_comments: PhotoComment.serializer(photoComments) });
});
