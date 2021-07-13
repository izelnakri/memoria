import UserEntity from "../entities/user";

class User extends UserEntity {
  Adapter = MainDBAdapter; // MainDBAdapter
  // Serializer = JSONSerializer;
}
