import test from "ava";
import fs from "fs-extra";

const CWD = process.cwd();
const modelFileContent = (fileName) => `import Model from '${CWD}/dist/model';
export default class ${fileName} extends Model{
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
          comments: PhotoComment,
          activity: Activity
        }
      }
    `
    ),
    fs.writeFile(
      `${CWD}/memserver/models/photo-comment.ts`,
      `
      import Model from '${CWD}/dist/model';
      import User from '${CWD}/memserver/models/user';

      export default class PhotoComment extends Model {
        static embedReferences = {
          author: User
        }
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
        id: 1,
        name: 'Ski trip',
        href: 'ski-trip.jpeg',
        is_public: false
      },
      {
        id: 2,
        name: 'Family photo',
        href: 'family-photo.jpeg',
        is_public: true
      },
      {
        id: 3,
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
        photo_id: 1,
        user_id: 1
      },
      {
        uuid: '77653ad3-47e4-4ec2-b49f-57ea36a627e7',
        content: 'I agree',
        photo_id: 1,
        user_id: 2
      },
      {
        uuid: 'd351963d-e725-4092-a37c-1ca1823b57d3',
        content: 'I was kidding',
        photo_id: 1,
        user_id: 1
      },
      {
        uuid: '374c7f4a-85d6-429a-bf2a-0719525f5f29',
        content: 'Interesting indeed',
        photo_id: 2,
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
        photo_id: 1
      },
      {
        id: 2,
        user_id: 1,
        photo_id: null
      }
    ];`
    ),
    fs.writeFile(
      `${CWD}/memserver/fixtures/photos.ts`,
      `export default [
      {
        id: 1,
        name: 'Ski trip',
        href: 'ski-trip.jpeg',
        is_public: false
      },
      {
        id: 2,
        name: 'Family photo',
        href: 'family-photo.jpeg',
        is_public: true
      },
      {
        id: 3,
        name: 'Selfie',
        href: 'selfie.jpeg',
        is_public: false
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
        primary_email_id: 1
      }
    ];`
    ),
    fs.writeFile(
      `${CWD}/memserver/fixtures/emails.ts`,
      `export default [
      {
        id: 1,
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
  "$Model.getRelationship() works for hasOne/belongsTo id relationships both sides on id relationships",
  async (t) => {
    t.plan(6);

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const Activity = (await import(`${CWD}/memserver/models/activity.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
    const ActivityFixtures = (await import(`${CWD}/memserver/fixtures/activities.ts`)).default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));
    ActivityFixtures.forEach((activity) => Activity.insert(activity));

    const activity = Photo.getRelationship(Photo.find(1), "activity", Activity);
    const activityLookupWithoutModel = Photo.getRelationship(Photo.find(1), "activity");
    const activityLookupWithDifferentReferenceName = Photo.getRelationship(
      Photo.find(1),
      "somethingElse",
      Activity
    );

    t.deepEqual(activity, activityLookupWithoutModel);
    t.deepEqual(activity, activityLookupWithDifferentReferenceName);
    t.deepEqual(activity, { id: 1, user_id: 1, photo_id: 1 });
    t.is(Photo.getRelationship(Photo.find(2), "activity", Activity), undefined);
    t.deepEqual(Activity.getRelationship(activity, "photo", Photo), Photo.find(1));
    t.is(Activity.getRelationship(Activity.find(2), "photo", Photo), undefined);
  }
);

test.serial(
  "$Model.getRelationship() works for hasMany/belongsTo id relationships both sides on id relationships",
  async (t) => {
    t.plan(7);

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
    const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
      .default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));
    PhotoCommentFixtures.forEach((photoComment) => PhotoComment.insert(photoComment));

    const firstPhotoComments = Photo.getRelationship(Photo.find(1), "comments", PhotoComment);
    const secondPhotoComments = Photo.getRelationship(Photo.find(2), "comments", PhotoComment);
    const thirdPhotoComments = Photo.getRelationship(Photo.find(3), "comments", PhotoComment);

    t.deepEqual(firstPhotoComments, [
      {
        uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
        content: "What a nice photo!",
        photo_id: 1,
        user_id: 1
      },
      {
        uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
        content: "I agree",
        photo_id: 1,
        user_id: 2
      },
      {
        uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
        content: "I was kidding",
        photo_id: 1,
        user_id: 1
      }
    ]);
    t.deepEqual(secondPhotoComments, [
      {
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        content: "Interesting indeed",
        photo_id: 2,
        user_id: 1
      }
    ]);
    t.deepEqual(thirdPhotoComments, []);

    const error = t.throws(() => PhotoComment.getRelationship(firstPhotoComments, "photo"), {
      instanceOf: Error
    });

    t.true(
      /\[Memserver\] PhotoComment\.getRelationship expects model input to be an object not an array/.test(
        error.message
      )
    );
    t.deepEqual(PhotoComment.getRelationship(firstPhotoComments[0], "photo", Photo), {
      id: 1,
      name: "Ski trip",
      href: "ski-trip.jpeg",
      is_public: false
    });
    t.deepEqual(PhotoComment.getRelationship(secondPhotoComments[0], "photo", Photo), {
      id: 2,
      name: "Family photo",
      href: "family-photo.jpeg",
      is_public: true
    });
  }
);

test.serial(
  "$Model.getRelationship() works for custom named hasOne/belongsTo id relationships both side on id relationships",
  async (t) => {
    t.plan(6);

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

    const activity = Photo.getRelationship(Photo.find(1), "userActivity", Activity);

    t.deepEqual(activity, { id: 1, user_id: 1, photo_id: 1 });
    t.deepEqual(User.getRelationship(User.find(1), "primaryEmail", Email), {
      id: 1,
      address: "contact@izelnakri.com",
      is_public: false,
      confirmed_at: "2018-02-25T23:00:00.000Z",
      confirmation_token: "951d3321-9e66-4099-a4a5-cc1e4795d4ss",
      confirmation_token_sent_at: "2018-02-25T22:16:01.133Z",
      person_id: 1
    });
    t.is(Photo.getRelationship(Photo.find(2), "userActivity", Activity), undefined);
    t.deepEqual(Activity.getRelationship(activity, "photo", Photo), Photo.find(1));
    t.is(Activity.getRelationship(Activity.find(2), "userPhoto", Photo), undefined);
    t.deepEqual(Activity.getRelationship(activity, "photo", Photo), Photo.find(1));
  }
);

test.serial(
  "$Model.getRelationship() works for custom named hasMany/belongsTo id relationships both side on id relationships",
  async (t) => {
    t.plan(7);

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
    const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
      .default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));
    PhotoCommentFixtures.forEach((photoComment) => PhotoComment.insert(photoComment));

    const firstPhotoComments = Photo.getRelationship(Photo.find(1), "comments", PhotoComment);
    const secondPhotoComments = Photo.getRelationship(Photo.find(2), "comments", PhotoComment);
    const thirdPhotoComments = Photo.getRelationship(Photo.find(3), "comments", PhotoComment);

    t.deepEqual(firstPhotoComments, [
      {
        uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
        content: "What a nice photo!",
        photo_id: 1,
        user_id: 1
      },
      {
        uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
        content: "I agree",
        photo_id: 1,
        user_id: 2
      },
      {
        uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
        content: "I was kidding",
        photo_id: 1,
        user_id: 1
      }
    ]);
    t.deepEqual(secondPhotoComments, [
      {
        uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
        content: "Interesting indeed",
        photo_id: 2,
        user_id: 1
      }
    ]);
    t.deepEqual(thirdPhotoComments, []);

    const error = t.throws(() => PhotoComment.getRelationship(firstPhotoComments, "photo", Photo), {
      instanceOf: Error
    });

    t.true(
      /\[Memserver\] PhotoComment\.getRelationship expects model input to be an object not an array/.test(
        error.message
      )
    );
    t.deepEqual(PhotoComment.getRelationship(firstPhotoComments[0], "photo", Photo), {
      id: 1,
      name: "Ski trip",
      href: "ski-trip.jpeg",
      is_public: false
    });
    t.deepEqual(PhotoComment.getRelationship(secondPhotoComments[0], "photo", Photo), {
      id: 2,
      name: "Family photo",
      href: "family-photo.jpeg",
      is_public: true
    });
  }
);

test.serial(
  "$Model.getRelationship() throws an error when id relationship reference is invalid",
  async (t) => {
    t.plan(4);

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));

    const error = t.throws(() => Photo.getRelationship(Photo.find(1), "device"), {
      instanceOf: Error
    });

    t.true(
      /\[Memserver\] device relationship could not be found on Photo model\. Please put the device Model object as the third parameter to Photo\.getRelationship function/.test(
        error.message
      )
    );

    const secondError = t.throws(() => Photo.getRelationship(Photo.find(2), "senderActivity"), {
      instanceOf: Error
    });

    t.true(
      /\[Memserver\] senderActivity relationship could not be found on Photo model\. Please put the senderActivity Model object as the third parameter to Photo\.getRelationship function/.test(
        secondError.message
      )
    );
  }
);

test.serial("$Model.embedReferences can be set before runtime", async (t) => {
  t.plan(2);

  const Activity = (await import(`${CWD}/memserver/models/activity.ts`)).default;
  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
  const User = (await import(`${CWD}/memserver/models/user.ts`)).default;

  t.deepEqual(Photo.embedReferences, { comments: PhotoComment, activity: Activity });
  t.deepEqual(PhotoComment.embedReferences, { author: User });
});

test.serial(
  "$Model.embed({ embedName: ModelName }) sets an embedReference during runtime",
  async (t) => {
    t.plan(2);

    const Activity = (await import(`${CWD}/memserver/models/activity.ts`)).default;
    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
    const User = (await import(`${CWD}/memserver/models/user.ts`)).default;

    Photo.embed({ userActivity: Activity });
    User.embed({ activities: Activity });

    t.deepEqual(Photo.embedReferences, {
      comments: PhotoComment,
      activity: Activity,
      userActivity: Activity
    });
    t.deepEqual(User.embedReferences, { activities: Activity });
  }
);

test.serial(
  "$Model.embed() throws error at runtime doesnt receive an object as parameter",
  async (t) => {
    t.plan(4);

    const Activity = (await import(`${CWD}/memserver/models/activity.ts`)).default;
    const User = (await import(`${CWD}/memserver/models/user.ts`)).default;
    const error = t.throws(() => User.embed(), { instanceOf: Error });

    t.true(
      /\[Memserver\] User\.embed\(relationshipObject\) requires an object as a parameter: { relationshipKey: \$RelationshipModel }/.test(
        error.message
      )
    );

    const secondError = t.throws(() => User.embed(Activity), { instanceOf: Error });

    t.true(
      /\[Memserver\] User\.embed\(relationshipObject\) requires an object as a parameter: { relationshipKey: \$RelationshipModel }/.test(
        secondError.message
      )
    );
  }
);

test.serial(
  "$Model.embed() throws error when runtime $Model.embed(relationship) called with a Model that doesnt exist",
  async (t) => {
    t.plan(2);

    const User = (await import(`${CWD}/memserver/models/user.ts`)).default;
    const error = t.throws(() => User.embed({ activities: undefined }), { instanceOf: Error });

    t.true(
      /\[Memserver\] User\.embed\(\) fails: activities Model reference is not a valid\. Please put a valid \$ModelName to User\.embed\(\)/.test(
        error.message
      )
    );
  }
);
