// TODO: there is a bug on object imports sometimes
// Photo import returned undefined for some reason?!?!
import test from "ava";
import fs from "fs-extra";

const CWD = process.cwd();
const modelFileContent = (fileName) => `import Model from '${CWD}/dist/model';
import PhotoComment from '${CWD}/memserver/models/photo-comment';

export default class ${fileName} extends Model{
  static embedReferences = {
    photoComments: PhotoComment
  }
}`;

test.before(async () => {
  Object.keys(require.cache).forEach((key) => delete require.cache[key]);

  await fs.mkdir(`${CWD}/memserver`);
  await fs.mkdir(`${CWD}/memserver/models`);
  await Promise.all([
    fs.writeFile(
      `${CWD}/memserver/models/photo.ts`,
      `
      import Model from '${CWD}/dist/model';
      import Activity from '${CWD}/memserver/models/activity';
      import PhotoComment from '${CWD}/memserver/models/photo-comment';

      export default class Photo extends Model {
        static embedReferences = {
          activity: Activity,
          comments: PhotoComment
        };
      }
    `
    ),
    fs.writeFile(
      `${CWD}/memserver/models/photo-comment.ts`,
      `
      import Model from '${CWD}/dist/model';
      import User from '${CWD}/memserver/models/user';
      import Photo from '${CWD}/memserver/models/photo';

      export default class PhotoComment extends Model {
        static embedReferences = {
          photo: Photo,
          author: User
        };
      }
    `
    ),
    fs.writeFile(`${CWD}/memserver/models/user.ts`, modelFileContent("User")),
    fs.writeFile(`${CWD}/memserver/models/email.ts`, modelFileContent("Email")),
    fs.writeFile(`${CWD}/memserver/models/activity.ts`, modelFileContent("Activity")),
    fs.mkdir(`${CWD}/memserver/fixtures`)
  ]);
  await Promise.all([
    fs.writeFile(
      `${CWD}/memserver/fixtures/photos.ts`,
      `export default [
      {
        uuid: '65075a0c-3f4c-47af-9995-d4a01747ff7a',
        name: 'Ski trip',
        href: 'ski-trip.jpeg',
        is_public: false
      },
      {
        uuid: '2ae860da-ee55-4fd2-affb-da62e263980b',
        name: 'Family photo',
        href: 'family-photo.jpeg',
        is_public: true
      },
      {
        uuid: '6f0c74bb-13e0-4609-b34d-568cd3cee6bc',
        name: 'Selfie',
        href: 'selfie.jpeg',
        is_public: false
      }
    ];`
    ),
    fs.writeFile(
      `${CWD}/memserver/fixtures/photo-comments.ts`,
      `export default [
      {
        uuid: '499ec646-493f-4eea-b92e-e383d94182f4',
        content: 'What a nice photo!',
        photo_uuid: '65075a0c-3f4c-47af-9995-d4a01747ff7a',
        user_id: 1
      },
      {
        uuid: '77653ad3-47e4-4ec2-b49f-57ea36a627e7',
        content: 'I agree',
        photo_uuid: '65075a0c-3f4c-47af-9995-d4a01747ff7a',
        user_id: 2
      },
      {
        uuid: 'd351963d-e725-4092-a37c-1ca1823b57d3',
        content: 'I was kidding',
        photo_uuid: '65075a0c-3f4c-47af-9995-d4a01747ff7a',
        user_id: 1
      },
      {
        uuid: '374c7f4a-85d6-429a-bf2a-0719525f5f29',
        content: 'Interesting indeed',
        photo_uuid: '2ae860da-ee55-4fd2-affb-da62e263980b',
        user_id: 1
      }
    ];`
    ),
    fs.writeFile(
      `${CWD}/memserver/fixtures/activities.ts`,
      `export default [
      {
        id: 1,
        user_id: 1,
        photo_uuid: '65075a0c-3f4c-47af-9995-d4a01747ff7a'
      },
      {
        id: 2,
        user_id: 1,
        photo_uuid: null
      }
    ];`
    ),
    fs.writeFile(
      `${CWD}/memserver/fixtures/users.ts`,
      `export default [
      {
        id: 1,
        authentication_token: '1RQFPDXxNBvhGwZAEOj8ztGFItejDusXJw_F1FAg5-GknxhqrcfH9h4p9NGCiCVG',
        password_digest: 'tL4rJzy3GrjSQ7K0ZMNqKsgMthsikbWfIEPTi/HJXD3lme7q6HT57RpuCKJOcAC9DFb3lXtEONmkB3fO0q3zWA==',
        primary_email_uuid: '951d3321-9e66-4099-a4a5-cc1e4795d4zz'
      }
    ];`
    ),
    fs.writeFile(
      `${CWD}/memserver/fixtures/emails.ts`,
      `export default [
      {
        uuid: '951d3321-9e66-4099-a4a5-cc1e4795d4zz',
        address: 'contact@izelnakri.com',
        is_public: false,
        confirmed_at: '2018-02-25T23:00:00.000Z',
        confirmation_token: '951d3321-9e66-4099-a4a5-cc1e4795d4ss',
        confirmation_token_sent_at: '2018-02-25T22:16:01.133Z',
        person_id: 1
      }
    ];`
    )
  ]);
});

test.beforeEach(() => {
  Object.keys(require.cache).forEach((key) => delete require.cache[key]);
});

test.afterEach(() => {
  Object.keys(require.cache).forEach((key) => delete require.cache[key]);
});

test.after.always(async () => {
  if (await fs.pathExists(`${CWD}/memserver`)) {
    await fs.remove(`${CWD}/memserver`);
  }
});

test.serial(
  "$Model.getRelationship() works for hasOne/belongsTo uuid relationships both sides on uuid relationship",
  async (t) => {
    t.plan(4);

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const Activity = (await import(`${CWD}/memserver/models/activity.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
    const ActivityFixtures = (await import(`${CWD}/memserver/fixtures/activities.ts`)).default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));
    ActivityFixtures.forEach((activity) => Activity.insert(activity));

    const activity = Photo.getRelationship(
      Photo.findBy({
        uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a"
      }),
      "activity"
    );

    t.deepEqual(activity, {
      id: 1,
      user_id: 1,
      photo_uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a"
    });
    t.is(
      Photo.getRelationship(
        Photo.findBy({
          uuid: "2ae860da-ee55-4fd2-affb-da62e263980b"
        }),
        "activity"
      ),
      undefined
    );
    t.deepEqual(
      Activity.getRelationship(activity, "photo", Photo),
      Photo.findBy({
        uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a"
      })
    );
    t.is(Activity.getRelationship(Activity.find(2), "photo", Photo), undefined);
  }
);

test.serial(
  "$Model.getRelationship() works for hasMany/belongsTo uuid relationship both sides on uuid",
  async (t) => {
    t.plan(7);

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
    const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
      .default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));
    PhotoCommentFixtures.forEach((photoComment) => PhotoComment.insert(photoComment));

    const firstPhotoComments = Photo.getRelationship(
      Photo.findBy({
        uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a"
      }),
      "comments"
    );
    const secondPhotoComments = Photo.getRelationship(
      Photo.findBy({
        uuid: "2ae860da-ee55-4fd2-affb-da62e263980b"
      }),
      "comments"
    );
    const thirdPhotoComments = Photo.getRelationship(
      Photo.findBy({
        uuid: "6f0c74bb-13e0-4609-b34d-568cd3cee6bc"
      }),
      "comments"
    );

    t.deepEqual(firstPhotoComments, [
      {
        uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
        content: "What a nice photo!",
        photo_uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
        user_id: 1
      },
      {
        uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
        content: "I agree",
        photo_uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
        user_id: 2
      },
      {
        uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
        content: "I was kidding",
        photo_uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
        user_id: 1
      }
    ]);
    t.deepEqual(secondPhotoComments, [
      {
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        content: "Interesting indeed",
        photo_uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
        user_id: 1
      }
    ]);
    t.deepEqual(thirdPhotoComments, []);

    const error = t.throws(() => PhotoComment.getRelationship(firstPhotoComments, "photo"), {
      instanceOf: Error
    });

    t.true(
      /\[MemServer\] PhotoComment\.getRelationship expects model input to be an object not an array/.test(
        error.message
      )
    );
    t.deepEqual(PhotoComment.getRelationship(firstPhotoComments[0], "photo", Photo), {
      uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
      name: "Ski trip",
      href: "ski-trip.jpeg",
      is_public: false
    });
    t.deepEqual(PhotoComment.getRelationship(secondPhotoComments[0], "photo", Photo), {
      uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
      name: "Family photo",
      href: "family-photo.jpeg",
      is_public: true
    });
  }
);

test.serial(
  "$Model.getRelationship() works for custom named hasOne/belongsTo uuid relationships both side on uuid relationship",
  async (t) => {
    t.plan(5);

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const Activity = (await import(`${CWD}/memserver/models/activity.ts`)).default;
    const User = (await import(`${CWD}/memserver/models/user.ts`)).default;
    const Email = (await import(`${CWD}/memserver/models/email.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
    const ActivityFixtures = (await import(`${CWD}/memserver/fixtures/activities.ts`)).default;
    const UserFixtures = (await import(`${CWD}/memserver/fixtures/users.ts`)).default;
    const EmailFixtures = (await import(`${CWD}/memserver/fixtures/emails.ts`)).default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));
    ActivityFixtures.forEach((activity) => Activity.insert(activity));
    UserFixtures.forEach((user) => User.insert(user));
    EmailFixtures.forEach((email) => Email.insert(email));

    const activity = Photo.getRelationship(
      Photo.findBy({
        uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a"
      }),
      "userActivity",
      Activity
    );

    t.deepEqual(activity, {
      id: 1,
      user_id: 1,
      photo_uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a"
    });
    t.deepEqual(User.getRelationship(User.find(1), "primaryEmail", Email), {
      uuid: "951d3321-9e66-4099-a4a5-cc1e4795d4zz",
      address: "contact@izelnakri.com",
      is_public: false,
      confirmed_at: "2018-02-25T23:00:00.000Z",
      confirmation_token: "951d3321-9e66-4099-a4a5-cc1e4795d4ss",
      confirmation_token_sent_at: "2018-02-25T22:16:01.133Z",
      person_id: 1
    });
    t.is(
      Photo.getRelationship(
        Photo.findBy({
          uuid: "2ae860da-ee55-4fd2-affb-da62e263980b"
        }),
        "userActivity",
        Activity
      ),
      undefined
    );
    t.deepEqual(
      Activity.getRelationship(activity, "photo", Photo),
      Photo.findBy({
        uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a"
      })
    );
    t.is(Activity.getRelationship(Activity.find(2), "photo", Photo), undefined);
  }
);

test.serial(
  "$Model.getRelationship() works for custom named hasMany/belongsTo uuid relationships both side on uuid relationship",
  async (t) => {
    t.plan(7);

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
    const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
      .default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));
    PhotoCommentFixtures.forEach((photoComment) => PhotoComment.insert(photoComment));

    const firstPhotoComments = Photo.getRelationship(
      Photo.findBy({
        uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a"
      }),
      "comments",
      PhotoComment
    );
    const secondPhotoComments = Photo.getRelationship(
      Photo.findBy({
        uuid: "2ae860da-ee55-4fd2-affb-da62e263980b"
      }),
      "comments",
      PhotoComment
    );
    const thirdPhotoComments = Photo.getRelationship(
      Photo.findBy({
        uuid: "6f0c74bb-13e0-4609-b34d-568cd3cee6bc"
      }),
      "comments",
      PhotoComment
    );

    t.deepEqual(firstPhotoComments, [
      {
        uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
        content: "What a nice photo!",
        photo_uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
        user_id: 1
      },
      {
        uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
        content: "I agree",
        photo_uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
        user_id: 2
      },
      {
        uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
        content: "I was kidding",
        photo_uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
        user_id: 1
      }
    ]);
    t.deepEqual(secondPhotoComments, [
      {
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        content: "Interesting indeed",
        photo_uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
        user_id: 1
      }
    ]);
    t.deepEqual(thirdPhotoComments, []);

    const error = t.throws(() => PhotoComment.getRelationship(firstPhotoComments, "photo"), {
      instanceOf: Error
    });

    t.true(
      /\[MemServer\] PhotoComment\.getRelationship expects model input to be an object not an array/.test(
        error.message
      )
    );
    t.deepEqual(PhotoComment.getRelationship(firstPhotoComments[0], "photo", Photo), {
      uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a",
      name: "Ski trip",
      href: "ski-trip.jpeg",
      is_public: false
    });
    t.deepEqual(PhotoComment.getRelationship(secondPhotoComments[0], "photo", Photo), {
      uuid: "2ae860da-ee55-4fd2-affb-da62e263980b",
      name: "Family photo",
      href: "family-photo.jpeg",
      is_public: true
    });
  }
);

test.serial(
  "$Model.getRelationship() throws an error when uuid relationship reference is invalid",
  async (t) => {
    t.plan(4);

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));

    const error = t.throws(
      () =>
        Photo.getRelationship(
          Photo.findBy({
            uuid: "65075a0c-3f4c-47af-9995-d4a01747ff7a"
          }),
          "userComments"
        ),
      { instanceOf: Error }
    );

    t.true(
      /\[MemServer\] userComments relationship could not be found on Photo model\. Please put the userComments Model object as the third parameter to Photo\.getRelationship function/.test(
        error.message
      )
    );

    const secondError = t.throws(
      () =>
        Photo.getRelationship(
          Photo.findBy({
            uuid: "2ae860da-ee55-4fd2-affb-da62e263980b"
          }),
          "userActivity"
        ),
      { instanceOf: Error }
    );

    t.true(
      /\[MemServer\] userActivity relationship could not be found on Photo model\. Please put the userActivity Model object as the third parameter to Photo\.getRelationship function/.test(
        secondError.message
      )
    );
  }
);
