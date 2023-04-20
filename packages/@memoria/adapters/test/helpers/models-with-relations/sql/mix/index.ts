import Model, {
  Serializer,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
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

    @Column("int", { nullable: true })
    owner_id: number;

    // @ManyToMany(() => SQLUser)
    // users;

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
    uuid: number;

    @Column("varchar", { nullable: true })
    content: string;

    @Column("boolean", { default: true })
    is_important: boolean;

    @CreateDateColumn()
    inserted_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @Column("varchar", { nullable: true })
    group_uuid: string;

    @Column("int", { nullable: true })
    user_id: number;

    @Column("int", { nullable: true })
    photo_id: number;

    @BelongsTo(() => SQLGroup)
    group;

    @BelongsTo(() => SQLUser)
    user;

    @BelongsTo(() => SQLPhoto)
    photo;
  }
  class SQLPhoto extends Model {
    static Adapter = SQLAdapter;
    static Serializer = class PhotoSerializer extends Serializer {};

    @PrimaryGeneratedColumn()
    id: number;

    @Column("varchar", { nullable: true, default: "Photo default name" })
    name: string;

    @Column("varchar", { nullable: true })
    href: string;

    @Column("boolean", { nullable: true, default: true })
    is_public: boolean;

    @Column("int", { nullable: true })
    owner_id: number;

    @Column("varchar", { nullable: true })
    group_uuid: number;

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

    @PrimaryGeneratedColumn()
    id: number;

    @Column("varchar", { nullable: true })
    first_name: string;

    @Column("varchar", { nullable: true })
    last_name: string;

    @HasMany(() => SQLPhoto)
    photos;

    @HasMany(() => SQLPhotoComment)
    photoComments;

    @HasMany(() => SQLGroup)
    ownedGroups;

    // @ManyToMany(() => SQLGroup)
    // groups;
  }

  return {
    SQLGroup,
    SQLPhoto,
    SQLPhotoComment,
    SQLUser,
  };
}
