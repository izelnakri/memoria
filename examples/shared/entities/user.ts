import Model, {
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from "@memoria/model"; // NOTE: also check VersionColumn
import { Contains, IsInt, Length, IsEmail, IsFQDN, IsDate, Min, Max } from "class-validator";

// NOTE: how to check for unique combination indexes?
// NOTE: how to check for "check" db constraints

@Entity() // NOTE: maybe make this optional or set through the adapter
export default class User extends Model {
  // static Adapter = MemoryAdapter;
  // static Serializer = ModelSerializer;

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "bool", default: false })
  isAdmin: boolean;

  // TODO: how to add minLength etc
  @Column({ type: "varchar", length: 100, unique: true, nullable: false }) // check default things
  @Length(10, 20)
  slug: string;

  @OneToMany(() => PhotoComment, (photoComment) => photoComment.user)
  photoComments: PhotoComment[];
}

// MODEL API:
// import Model,{ belongsTo, hasMany } from 'memserver/model';

// class User extends Model {
//   static Adapter: MemoryAdapter, // or SQLAdapter, JSONAPIAdapter, JSONAdapter, GraphQLAdapter
//   static Serializer: ModelSerializer // or JSONSerializer, JSONAPISerializer, GraphQLSerializer

//   static primaryKey = 'id' // or uuid or function(?)

//   // also attribute declaration here as typescript or from ember-data to TS migration

//   person = belongsTo();
//   emails = hasMany();

//   static insert(options) {

//   }
//   static update(options) {

//   }
//   static delete(options) {

//   }
//   static serializer(userOrUsers) {

//   }
//   static serialize(user) {

//   }
//   static resetDatabase(targetInitialState: object[]) {

//   }

//   // Model Query Interface:
//   static find(idOrIds) {

//   }
//   static findBy(options) {

//   }
//   static findAll(options) {

//   }
//   static count(options) { // in memory, or in the resource through adapter with options?

//   }

//   // Extra examples: customAPIActions:
//   static confirm = APIAction({
//     type: 'POST',
//     path: 'confirmation.microservice.com/user/confirm',
//     before() {

//     },
//     after() {

//     }
//   })

//   // private API: attributes, DB, defaultAttributes(string or lazy(with functions)) in future maybe as prop or decorator etc
//   // maybe default App or DB validations expressed as decorators
// }VGkkkkkkkkkkkkkkkkkkkkkkk
