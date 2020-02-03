import test from "ava";
import fs from "fs-extra";

const CWD = process.cwd();
const modelFileContent = (fileName) => `import Model from '${CWD}/dist/model';
export default class ${fileName} extends Model{
}`;

test.before(async () => {
  await fs.mkdir(`${CWD}/memserver`);
  await fs.mkdir(`${CWD}/memserver/models`);
  await Promise.all([
    fs.writeFile(`${CWD}/memserver/models/user.ts`, modelFileContent("User")),
    fs.writeFile(`${CWD}/memserver/models/photo.ts`, modelFileContent("Photo")),
    fs.writeFile(`${CWD}/memserver/models/photo-comment.ts`, modelFileContent("PhotoComment")),
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
    )
  ]);
});

test.beforeEach(() => {
  Object.keys(require.cache).forEach((key) => delete require.cache[key]);
});

test.after.always(async () => {
  if (await fs.pathExists(`${CWD}/memserver`)) {
    await fs.remove(`${CWD}/memserver`);
  }
});

test.serial("$Model.delete() can delete existing items", async (t) => {
  t.plan(4);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
  const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
    .default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));
  PhotoCommentFixtures.forEach((photoComment) => PhotoComment.insert(photoComment));

  const deletedPhoto = Photo.delete({ id: 2 });
  const deletedComment = PhotoComment.delete({ uuid: "499ec646-493f-4eea-b92e-e383d94182f4" });

  PhotoComment.delete({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29" });

  t.deepEqual(deletedPhoto, {
    id: 2,
    name: "Family photo",
    href: "family-photo.jpeg",
    is_public: true
  });
  t.deepEqual(deletedComment, {
    uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
    content: "What a nice photo!",
    photo_id: 1,
    user_id: 1
  });
  t.deepEqual(Photo.findAll(), [
    {
      id: 1,
      name: "Ski trip",
      href: "ski-trip.jpeg",
      is_public: false
    },
    {
      id: 3,
      name: "Selfie",
      href: "selfie.jpeg",
      is_public: false
    }
  ]);
  t.deepEqual(PhotoComment.findAll(), [
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
});

test.serial(
  "$Model.delete(model) throws when the model primaryKey doesnt exist in the database",
  async (t) => {
    t.plan(8);

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;

    const error = t.throws(() => Photo.delete({ id: 1 }), { instanceOf: Error });

    t.true(
      /\[Memserver\] Photo has no records in the database to delete\. Photo\.delete\(\{ id: 1 \}\) failed/.test(
        error.message
      )
    );

    const secondError = t.throws(
      () => {
        return PhotoComment.delete({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5111" });
      },
      { instanceOf: Error }
    );

    t.true(
      /\[Memserver\] PhotoComment has no records in the database to delete\. PhotoComment\.delete\(\{ uuid: '374c7f4a-85d6-429a-bf2a-0719525f5111' \}\) failed/.test(
        secondError.message
      )
    );

    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
    const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
      .default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));
    PhotoCommentFixtures.forEach((photoComment) => PhotoComment.insert(photoComment));

    Photo.delete({ id: 1 });

    const thirdError = t.throws(() => Photo.delete({ id: 1 }), { instanceOf: Error });

    t.true(
      /\[Memserver\] Could not find Photo with id 1 to delete\. Photo\.delete\(\{ id: 1 \}\) failed/.test(
        thirdError.message
      )
    );

    const fourthError = t.throws(
      () => PhotoComment.delete({ uuid: "374c7f4a-85d6-429a-bf2a-0719525f5111" }),
      { instanceOf: Error }
    );

    t.true(
      /\[Memserver\] Could not find PhotoComment with uuid 374c7f4a-85d6-429a-bf2a-0719525f5111 to delete\. PhotoComment\.delete\(\{ uuid: '374c7f4a-85d6-429a-bf2a-0719525f5111' \}\) failed/.test(
        fourthError.message
      )
    );
  }
);

test("$Model.delete() throws when called without a parameter", async (t) => {
  t.plan(4);

  const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
  const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
  const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
  const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
    .default;

  PhotoFixtures.forEach((photo) => Photo.insert(photo));
  PhotoCommentFixtures.forEach((photoComment) => PhotoComment.insert(photoComment));

  const error = t.throws(() => Photo.delete(), { instanceOf: Error });

  t.true(
    /\[Memserver\] Photo\.delete\(model\) model object parameter required to delete a model/.test(
      error.message
    )
  );

  const secondError = t.throws(() => PhotoComment.delete(), { instanceOf: Error });

  t.true(
    /\[Memserver\] PhotoComment\.delete\(model\) model object parameter required to delete a model/.test(
      secondError.message
    )
  );
});

// NOTE: $Model.delete(primaryKey) feature ?
