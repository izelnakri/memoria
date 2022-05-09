import Model, {
  Serializer,
  PrimaryGeneratedColumn,
  Column,
  BelongsTo,
  HasMany,
  HasOne,
  ManyToMany,
} from "@memoria/model";
import SQLAdapter from "../../../../helpers/sql-adapter.js";

export default function generateModels() {
  class SQLGroup extends Model {
    static Adapter = SQLAdapter;
    static Serializer = class GroupSerializer extends Serializer {};

    @PrimaryGeneratedColumn("uuid")
    uuid: string;

    @Column("varchar", { nullable: true })
    name: string;

    @Column("varchar", { nullable: true })
    owner_uuid: string;

    @ManyToMany(() => SQLUser)
    users;

    @BelongsTo(() => SQLUser)
    owner;

    @HasOne(() => SQLPhoto)
    photo;

    @HasMany(() => SQLPhotoComment)
    photoComments;
  }
  class SQLPhotoComment extends Model {
    static Adapter = SQLAdapter;
    static Serializer = class PhotoCommentSerializer extends Serializer {};

    @PrimaryGeneratedColumn("uuid")
    uuid: string;

    @Column("varchar", { nullable: true })
    content: string;

    @Column("varchar", { nullable: true })
    photo_uuid: string;

    @Column("varchar", { nullable: true })
    user_uuid: string;

    @BelongsTo(() => SQLUser)
    user;

    @BelongsTo(() => SQLPhoto)
    photo;
  }
  class SQLPhoto extends Model {
    static Adapter = SQLAdapter;
    static Serializer = class PhotoSerializer extends Serializer {};

    @PrimaryGeneratedColumn("uuid")
    uuid: string;

    @Column("varchar", { nullable: true })
    name: string;

    @Column("varchar", { nullable: true })
    href: string;

    @Column("boolean", { nullable: true })
    is_public: boolean;

    @Column("varchar", { nullable: true })
    owner_uuid: string;

    @Column("varchar", { nullable: true })
    group_uuid: string;

    @BelongsTo(() => SQLUser)
    owner;

    @BelongsTo(() => SQLGroup)
    group;

    @HasMany(() => SQLPhotoComment)
    comments;
  }
  class SQLUser extends Model {
    static Adapter = SQLAdapter;
    static Serializer = class UserSerializer extends Serializer {};

    @PrimaryGeneratedColumn("uuid")
    uuid: string;

    @Column("varchar", { nullable: true })
    first_name: string;

    @Column("varchar", { nullable: true })
    last_name: string;

    @HasMany(() => SQLPhoto)
    photos;

    @HasMany(() => SQLPhotoComment)
    photoComments;

    @ManyToMany(() => SQLGroup)
    groups;
  }

  return {
    SQLGroup,
    SQLPhoto,
    SQLPhotoComment,
    SQLUser,
  };
}
