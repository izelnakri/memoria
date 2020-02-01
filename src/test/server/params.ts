declare global {
  interface Window {
    $?: any;
  }
}

import test from "ava";
import fs from "fs-extra";

const AUTHENTICATION_TOKEN = "ec25fc7b-6ee2-4bda-b57c-6c9867b30ff4";
const AJAX_AUTHORIZATION_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Token ${AUTHENTICATION_TOKEN}`
};
const CWD = process.cwd();

test.before(async () => {
  await fs.mkdir(`${CWD}/memserver`);
  await fs.mkdir(`${CWD}/memserver/models`);
  await Promise.all([
    fs.writeFile(
      `${CWD}/memserver/models/user.ts`,
      `
      import Model from '${CWD}/dist/model';

      export default class User extends Model {
        static findFromHeaderToken(headers): any | false {
          const authorizationHeader = headers.Authorization;
          const token = authorizationHeader ? authorizationHeader.slice(6) : false;

          return this.findBy({ authentication_token: token }) || false;
        }
      }
    `
    ),
    fs.writeFile(
      `${CWD}/memserver/models/photo.ts`,
      `
      import Model from '${CWD}/dist/model';

      export default class Photo extends Model {
        static defaultAttributes = {
          is_public: true,
          name() {
            return 'Some default name';
          }
        }
      }
    `
    ),
    fs.writeFile(
      `${CWD}/memserver/models/photo-comment.ts`,
      `
      import Model from '${CWD}/dist/model';

      export default class PhotoComment extends Model {
        static defaultAttributes = {
          inserted_at() {
            return '2017-10-25T20:54:04.447Z';
          },
          is_important: true
        }
      }
    `
    ),
    fs.mkdir(`${CWD}/memserver/fixtures`)
  ]);
  await Promise.all([
    fs.writeFile(
      `${CWD}/memserver/fixtures/users.ts`,
      `export default [
      {
        id: 1,
        email: 'contact@izelnakri.com',
        username: 'izelnakri',
        authentication_token: '${AUTHENTICATION_TOKEN}'
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
        is_public: false,
        user_id: 1
      },
      {
        id: 2,
        name: 'Family photo',
        href: 'family-photo.jpeg',
        is_public: true,
        user_id: 1
      },
      {
        id: 3,
        name: 'Selfie',
        href: 'selfie.jpeg',
        is_public: false,
        user_id: 1
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

test.serial(
  "[MemServer.Server] POST /resources work with custom headers, queryParams and responses",
  async (t) => {
    t.plan(8);

    await writeSimpleRESTServerFile();

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const User = (await import(`${CWD}/memserver/models/user.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
    const UserFixtures = (await import(`${CWD}/memserver/fixtures/users.ts`)).default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));
    UserFixtures.forEach((user) => User.insert(user));

    await (await import(`${CWD}/dist/setup-dom`)).default();
    const Memserver = (await import(`${CWD}/dist/server`)).default;

    const Server = new Memserver({
      routes: (await import(`${CWD}/memserver/routes`)).default
    });

    window.$ = await import("jquery");

    t.is(Photo.count(), 3);

    await window.$.ajax({
      type: "POST",
      url: "/photos",
      headers: { "Content-Type": "application/json" }
    }).catch((jqXHR) => {
      t.is(jqXHR.status, 401);
      t.deepEqual(jqXHR.responseJSON, { error: "Unauthorized" });
    });

    await window.$.ajax({
      type: "POST",
      url: "/photos",
      headers: AJAX_AUTHORIZATION_HEADERS
    }).catch((jqXHR) => {
      t.is(jqXHR.status, 401);
      t.deepEqual(jqXHR.responseJSON, { error: "Unauthorized" });
    });

    await window.$.ajax({
      type: "POST",
      url: "/photos?is_admin=true",
      headers: AJAX_AUTHORIZATION_HEADERS
    }).then((data, textStatus, jqXHR) => {
      t.is(jqXHR.status, 201);
      t.deepEqual(data, { photo: Photo.serializer(Photo.find(4)) });
      t.is(Photo.count(), 4);
    });
  }
);

test.serial(
  "[MemServer.Server] GET /resources works with custom headers, queryParams and responses",
  async (t) => {
    t.plan(6);

    await writeSimpleRESTServerFile();

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const User = (await import(`${CWD}/memserver/models/user.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
    const UserFixtures = (await import(`${CWD}/memserver/fixtures/users.ts`)).default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));
    UserFixtures.forEach((user) => User.insert(user));

    await (await import(`${CWD}/dist/setup-dom`)).default();
    const Memserver = (await import(`${CWD}/dist/server`)).default;

    const Server = new Memserver({
      routes: (await import(`${CWD}/memserver/routes`)).default
    });

    window.$ = await import("jquery");

    await window.$.ajax({
      type: "GET",
      url: "/photos",
      headers: { "Content-Type": "application/json" }
    }).catch((jqXHR) => {
      t.is(jqXHR.status, 404);
      t.deepEqual(jqXHR.responseJSON, { error: "Not found" });
    });

    await window.$.ajax({
      type: "GET",
      url: "/photos?is_public=false",
      headers: AJAX_AUTHORIZATION_HEADERS
    }).then((data, textStatus, jqXHR) => {
      t.is(jqXHR.status, 200);
      t.deepEqual(data, { photos: Photo.serializer(Photo.findAll({ is_public: false })) });
    });

    await window.$.ajax({
      type: "GET",
      url: "/photos?href=family-photo.jpeg",
      headers: AJAX_AUTHORIZATION_HEADERS
    }).then((data, textStatus, jqXHR) => {
      t.is(jqXHR.status, 200);
      t.deepEqual(data, { photos: Photo.serializer(Photo.findAll({ href: "family-photo.jpeg" })) });
    });
  }
);

test.serial(
  "[MemServer.Server] GET /resources/:id works with custom headers, queryParams and responses",
  async (t) => {
    t.plan(4);

    await writeSimpleRESTServerFile();

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const User = (await import(`${CWD}/memserver/models/user.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
    const UserFixtures = (await import(`${CWD}/memserver/fixtures/users.ts`)).default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));
    UserFixtures.forEach((user) => User.insert(user));

    await (await import(`${CWD}/dist/setup-dom`)).default();
    const Memserver = (await import(`${CWD}/dist/server`)).default;

    const Server = new Memserver({
      routes: (await import(`${CWD}/memserver/routes`)).default
    });

    window.$ = await import("jquery");

    await window.$.ajax({
      type: "GET",
      url: "/photos/1",
      headers: AJAX_AUTHORIZATION_HEADERS
    }).catch((jqXHR) => {
      t.is(jqXHR.status, 404);
      t.deepEqual(jqXHR.responseJSON, { error: "Not found" });
    });

    await window.$.ajax({
      type: "GET",
      url: "/photos/1?nonce=123123123",
      headers: AJAX_AUTHORIZATION_HEADERS
    }).then((data, textStatus, jqXHR) => {
      t.is(jqXHR.status, 200);
      t.deepEqual(data, { photo: Photo.serializer(Photo.find(1)) });
    });
  }
);

test.serial(
  "[MemServer.Server] PUT /resources/:id works with custom headers, queryParams and responses",
  async (t) => {
    t.plan(4);

    await writeSimpleRESTServerFile();

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const User = (await import(`${CWD}/memserver/models/user.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
    const UserFixtures = (await import(`${CWD}/memserver/fixtures/users.ts`)).default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));
    UserFixtures.forEach((user) => User.insert(user));

    await (await import(`${CWD}/dist/setup-dom`)).default();
    const Memserver = (await import(`${CWD}/dist/server`)).default;

    const Server = new Memserver({
      routes: (await import(`${CWD}/memserver/routes`)).default
    });

    window.$ = await import("jquery");

    await window.$.ajax({
      type: "PUT",
      url: "/photos/1",
      headers: AJAX_AUTHORIZATION_HEADERS,
      data: JSON.stringify({ photo: { id: 1, name: "Life" } })
    }).catch((jqXHR) => {
      t.is(jqXHR.status, 500);
      t.deepEqual(jqXHR.responseJSON, { error: "Unexpected error occured" });
    });

    await window.$.ajax({
      type: "PUT",
      url: "/photos/1?nonce=123123123",
      headers: AJAX_AUTHORIZATION_HEADERS,
      data: JSON.stringify({ photo: { id: 1, name: "Life" } })
    }).then((data, textStatus, jqXHR) => {
      t.is(jqXHR.status, 200);
      t.deepEqual(data, { photo: Photo.serializer(Photo.find(1)) });
    });
  }
);

test.serial(
  "[MemServer.Server] DELETE /resources/:id works with custom headers, queryParams and responses",
  async (t) => {
    t.plan(3);

    await writeSimpleRESTServerFile();

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const User = (await import(`${CWD}/memserver/models/user.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;
    const UserFixtures = (await import(`${CWD}/memserver/fixtures/users.ts`)).default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));
    UserFixtures.forEach((user) => User.insert(user));

    await (await import(`${CWD}/dist/setup-dom`)).default();
    const Memserver = (await import(`${CWD}/dist/server`)).default;

    const Server = new Memserver({
      routes: (await import(`${CWD}/memserver/routes`)).default
    });

    window.$ = await import("jquery");

    await window.$.ajax({
      type: "DELETE",
      url: "/photos/1",
      headers: AJAX_AUTHORIZATION_HEADERS
    }).catch((jqXHR) => {
      t.is(jqXHR.status, 500);
      t.deepEqual(jqXHR.responseJSON, { error: "Invalid nonce to delete a photo" });
    });

    await window.$.ajax({
      type: "DELETE",
      url: "/photos/1?nonce=123123123",
      headers: AJAX_AUTHORIZATION_HEADERS
    }).then((data, textStatus, jqXHR) => {
      t.is(jqXHR.status, 204);
    });
  }
);

test.serial(
  "[MemServer.Server Edge cases] Server works for coalasceFindRequests routes",
  async (t) => {
    t.plan(6);

    await writeEdgeCasesServerFile();

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));

    await (await import(`${CWD}/dist/setup-dom`)).default();
    const Memserver = (await import(`${CWD}/dist/server`)).default;

    const Server = new Memserver({
      routes: (await import(`${CWD}/memserver/routes`)).default
    });

    window.$ = await import("jquery");

    await window.$.ajax({
      type: "GET",
      url: "/photos",
      headers: { "Content-Type": "application/json" }
    }).catch((jqXHR) => {
      t.is(jqXHR.status, 404);
      t.deepEqual(jqXHR.responseJSON, { error: "Not found" });
    });

    await window.$.ajax({
      type: "GET",
      url: "/photos?ids[]=1&ids[]=2",
      headers: { "Content-Type": "application/json" }
    }).then((data, textStatus, jqXHR) => {
      t.is(jqXHR.status, 200);
      t.deepEqual(jqXHR.responseJSON, { photos: Photo.serializer(Photo.find([1, 2])) });
    });

    await window.$.ajax({
      type: "GET",
      url: "/photos?ids[]=2&ids[]=3",
      headers: { "Content-Type": "application/json" }
    }).then((data, textStatus, jqXHR) => {
      t.is(jqXHR.status, 200);
      t.deepEqual(jqXHR.responseJSON, { photos: Photo.serializer(Photo.find([2, 3])) });
    });
  }
);

test.serial(
  "[MemServer.Server Edge cases] Server converts empty strings to null during a request and formats query params",
  async (t) => {
    t.plan(4);

    await writeEdgeCasesServerFile();

    const Photo = (await import(`${CWD}/memserver/models/photo.ts`)).default;
    const PhotoFixtures = (await import(`${CWD}/memserver/fixtures/photos.ts`)).default;

    PhotoFixtures.forEach((photo) => Photo.insert(photo));

    await (await import(`${CWD}/dist/setup-dom`)).default();

    const Memserver = (await import(`${CWD}/dist/server`)).default;
    const Server = new Memserver({
      routes: (await import(`${CWD}/memserver/routes`)).default
    });

    window.$ = await import("jquery");

    Server.post("/photos", ({ params, queryParams }) => {
      t.deepEqual(params, { name: null, title: "Cool" });
      t.deepEqual(queryParams, { is_important: true, filter: 32 });

      return { photo: Photo.serializer(Photo.insert(params)) };
    });

    await window.$.ajax({
      type: "POST",
      url: "/photos?is_important=true&filter=32",
      data: { name: "", title: "Cool" }
    }).then((data, textStatus, jqXHR) => {
      t.is(jqXHR.status, 201);
      t.is(Photo.count(), 4);
    });
  }
);

test.serial("[MemServer.Server Edge cases] Server casts uuids correctly as params", async (t) => {
  t.plan(2);

  await writeEdgeCasesServerFile();

  const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
  const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
    .default;

  PhotoCommentFixtures.forEach((photoComment) => PhotoComment.insert(photoComment));

  await (await import(`${CWD}/dist/setup-dom`)).default();

  const Memserver = (await import(`${CWD}/dist/server`)).default;
  const Server = new Memserver({
    routes: (await import(`${CWD}/memserver/routes`)).default
  });

  window.$ = await import("jquery");

  const targetComment = PhotoComment.findBy({ uuid: "499ec646-493f-4eea-b92e-e383d94182f4" });

  await window.$.ajax({
    type: "GET",
    url: "/photo-comments/499ec646-493f-4eea-b92e-e383d94182f4"
  }).then((data, textStatus, jqXHR) => {
    t.is(jqXHR.status, 200);
    t.deepEqual(data, { photo_comment: PhotoComment.serializer(targetComment) });
  });
});

test.serial(
  "[MemServer.Server Edge cases] Server casts uuids correct as queryParams",
  async (t) => {
    t.plan(2);

    await writeEdgeCasesServerFile();

    const PhotoComment = (await import(`${CWD}/memserver/models/photo-comment.ts`)).default;
    const PhotoCommentFixtures = (await import(`${CWD}/memserver/fixtures/photo-comments.ts`))
      .default;

    PhotoCommentFixtures.forEach((photoComment) => PhotoComment.insert(photoComment));

    await (await import(`${CWD}/dist/setup-dom`)).default();

    const Memserver = (await import(`${CWD}/dist/server`)).default;
    const Server = new Memserver({
      routes: (await import(`${CWD}/memserver/routes`)).default
    });

    window.$ = await import("jquery");

    const targetComments = PhotoComment.findAll({ uuid: "499ec646-493f-4eea-b92e-e383d94182f4" });

    await window.$.ajax({
      type: "GET",
      url: "/photo-comments?uuid=499ec646-493f-4eea-b92e-e383d94182f4"
    }).then((data, textStatus, jqXHR) => {
      t.is(jqXHR.status, 200);
      t.deepEqual(data, { photo_comments: PhotoComment.serializer(targetComments) });
    });
  }
);

test.serial(
  "[MemServer.Server Edga cases] Server casts ethereum adresses correctly as string request.params",
  async (t) => {
    t.plan(2);

    await writeEdgeCasesServerFile();

    const EthereumAccount = (await import(`${CWD}/memserver/models/ethereum-account.ts`)).default;
    const EthereumAccountFixtures = (await import(`${CWD}/memserver/fixtures/ethereum-accounts.ts`))
      .default;

    EthereumAccountFixtures.forEach((ethereumAccount) => EthereumAccount.insert(ethereumAccount));

    await (await import(`${CWD}/dist/setup-dom`)).default();

    const Memserver = (await import(`${CWD}/dist/server`)).default;
    const Server = new Memserver({
      routes: (await import(`${CWD}/memserver/routes`)).default
    });

    window.$ = await import("jquery");

    const targetAccount = EthereumAccount.findBy({
      address: "0x7be8315acfef37816c9ad4dc5e82195f2a52934c5d0c74883f9978675e26d600"
    });

    await window.$.ajax({
      type: "GET",
      url: "/ethereum-accounts/0x7be8315acfef37816c9ad4dc5e82195f2a52934c5d0c74883f9978675e26d600"
    }).then((data, textStatus, jqXHR) => {
      t.is(jqXHR.status, 200);
      t.deepEqual(data, { ethereum_account: EthereumAccount.serializer(targetAccount) });
    });
  }
);

test.serial(
  "[MemServer.Server Edge cases] Server casts ethereum addresses correctly as string in request.queryParams",
  async (t) => {
    t.plan(2);

    await writeEdgeCasesServerFile();

    const EthereumAccount = (await import(`${CWD}/memserver/models/ethereum-account.ts`)).default;
    const EthereumAccountFixtures = (await import(`${CWD}/memserver/fixtures/ethereum-accounts.ts`))
      .default;

    EthereumAccountFixtures.forEach((ethereumAccount) => EthereumAccount.insert(ethereumAccount));

    await (await import(`${CWD}/dist/setup-dom`)).default();

    const Memserver = (await import(`${CWD}/dist/server`)).default;
    const Server = new Memserver({
      routes: (await import(`${CWD}/memserver/routes`)).default
    });

    window.$ = await import("jquery");

    const targetAccounts = EthereumAccount.findAll({
      address: "0x7be8315acfef37816c9ad4dc5e82195f2a52934c5d0c74883f9978675e26d600"
    });

    await window.$.ajax({
      type: "GET",
      url:
        "/ethereum-accounts?address=0x7be8315acfef37816c9ad4dc5e82195f2a52934c5d0c74883f9978675e26d600"
    }).then((data, textStatus, jqXHR) => {
      t.is(jqXHR.status, 200);
      t.deepEqual(data, { ethereum_accounts: EthereumAccount.serializer(targetAccounts) });
    });
  }
);

async function writeSimpleRESTServerFile() {
  await fs.writeFile(
    `${CWD}/memserver/routes.ts`,
    `
    import Photo from './models/photo';
    import User from './models/user';
    import Response from '../dist/response';

    export default function() {
      this.post('/photos', ({ headers, params, queryParams }) => {
        const user = User.findFromHeaderToken(headers);

        if (!user || !queryParams.is_admin) {
          return Response(401, { error: 'Unauthorized' });
        }

        console.log('user is', user);
        const photo = Photo.insert(Object.assign({}, params.photo, { user_id: user.id }));

        return { photo: Photo.serializer(photo) };
      });

      this.get('/photos', ({ headers, queryParams }) => {
        const user = User.findFromHeaderToken(headers);

        if (!user) {
          return Response(404, { error: 'Not found' });
        }

        const photos = Photo.findAll(Object.assign({}, { user_id: user.id }, queryParams));

        if (!photos || photos.length === 0) {
          return Response(404, { error: 'Not found' });
        }

        return { photos: Photo.serializer(photos) };
      });

      this.get('/photos/:id', ({ headers, params, queryParams }) => {
        const user = User.findFromHeaderToken(headers);

        if (!user) {
          return Response(401, { error: 'Unauthorized' });
        } else if (queryParams.nonce === 123123123) {
          const photo = Photo.findBy({ id: params.id, user_id: user.id });

          return photo ? { photo: Photo.serializer(photo) } : Response(404, { error: 'Not found' });
        }

        return Response(404, { error: 'Not found' });
      });

      this.put('/photos/:id', ({ headers, params, queryParams }) => {
        const user = User.findFromHeaderToken(headers);
        const validRequest = user && queryParams.nonce === 123123123 &&
          Photo.findBy({ id: params.id, user_id: user.id });

        if (validRequest) {
          return { photo: Photo.serializer(Photo.update(params.photo)) };
        }

        return Response(500, { error: 'Unexpected error occured' });
      });

      this.delete('/photos/:id', ({ headers, params, queryParams }) => {
        const user = User.findFromHeaderToken(headers);

        if (!(queryParams.nonce === 123123123)) {
          return Response(500, { error: 'Invalid nonce to delete a photo' });
        } else if (!user || !Photo.findBy({ id: params.id, user_id: user.id })) {
          return Response(404, { error: 'Not found' });
        }

        Photo.delete({ id: params.id }); // NOTE: what to do with this response
      });
    }
  `
  );
}

async function writeEdgeCasesServerFile() {
  await Promise.all([
    fs.writeFile(
      `${CWD}/memserver/models/ethereum-account.ts`,
      `
      import Model from '${CWD}/dist/model';

      export default class EthereumAccount extends Model {
      }
    `
    ),
    fs.writeFile(
      `${CWD}/memserver/fixtures/ethereum-accounts.ts`,
      `export default [
      {
        id: 1,
        address: '0x7be8315acfef37816c9ad4dc5e82195f2a52934c5d0c74883f9978675e26d600'
      }
    ];`
    ),
    fs.writeFile(
      `${CWD}/memserver/routes.ts`,
      `
      import Photo from './models/photo';
      import PhotoComment from './models/photo-comment';
      import User from './models/user';
      import EthereumAccount from './models/ethereum-account';
      import Response from '../dist/response';

      export default function() {
        this.get('/ethereum-accounts', ({ queryParams }) => {
          const ethereumAccounts = EthereumAccount.findAll({ address: queryParams.address });

          return { ethereum_accounts: EthereumAccount.serializer(ethereumAccounts) };
        });

        this.get('/ethereum-accounts/:address', ({ params }) => {
          const ethereumAccount = EthereumAccount.findBy({ address: params.address });

          return { ethereum_account: EthereumAccount.serializer(ethereumAccount) };
        });

        this.get('/photos', ({ queryParams }) => {
          const photos = Photo.find(queryParams.ids || []);

          if (!photos || photos.length === 0) {
            return Response(404, { error: 'Not found' });
          }

          return { photos: Photo.serializer(photos) };
        });

        this.get('/photo-comments/:uuid', ({ params }) => {
          const photoComment = PhotoComment.findBy({ uuid: params.uuid });

          return { photo_comment: PhotoComment.serializer(photoComment) };
        });

        this.get('/photo-comments', ({ queryParams }) => {
          const photoComments = PhotoComment.findAll({ uuid: queryParams.uuid });

          return { photo_comments: PhotoComment.serializer(photoComments) };
        });
      }
    `
    )
  ]);
}
