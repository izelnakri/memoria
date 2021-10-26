import Model, { PrimaryGeneratedColumn, Column, RuntimeError, Serializer } from "@memoria/model";
import { module, test, skip } from "qunitx";
import setupMemoria from "../helpers/setup-memoria.js";
import generateModels from "../helpers/models-with-relations/id/index.js";

module("@memoria/adapters | MemoryAdapter | Relationship API for ID(integer)", function (hooks) {
  setupMemoria(hooks);

  const PHOTO_FIXTURES = [
    {
      id: 1,
      name: "Ski trip",
      href: "ski-trip.jpeg",
      is_public: false,
    },
    {
      id: 2,
      name: "Family photo",
      href: "family-photo.jpeg",
      is_public: true,
    },
    {
      id: 3,
      name: "Selfie",
      href: "selfie.jpeg",
      is_public: false,
    },
  ];
  const PHOTO_COMMENT_FIXTURES = [
    {
      uuid: "499ec646-493f-4eea-b92e-e383d94182f4",
      content: "What a nice photo!",
      photo_id: 1,
      user_id: 1,
    },
    {
      uuid: "77653ad3-47e4-4ec2-b49f-57ea36a627e7",
      content: "I agree",
      photo_id: 1,
      user_id: 2,
    },
    {
      uuid: "d351963d-e725-4092-a37c-1ca1823b57d3",
      content: "I was kidding",
      photo_id: 1,
      user_id: 1,
    },
    {
      uuid: "374c7f4a-85d6-429a-bf2a-0719525f5f29",
      content: "Interesting indeed",
      photo_id: 2,
      user_id: 1,
    },
  ];
  const USER_FIXTURES = [
    {
      id: 1,
      authentication_token: "1RQFPDXxNBvhGwZAEOj8ztGFItejDusXJw_F1FAg5-GknxhqrcfH9h4p9NGCiCVG",
      password_digest:
        "tL4rJzy3GrjSQ7K0ZMNqKsgMthsikbWfIEPTi/HJXD3lme7q6HT57RpuCKJOcAC9DFb3lXtEONmkB3fO0q3zWA==",
      primary_email_id: 1,
    },
  ];

  // function prepare() {
  //   return { Activity, Email, User, Photo, PhotoComment };
  // }

  // changing relationship reference should change the _id column
  module("belongsTo Relationship test", async function (assert) {
    function prepare() {
      return generateModels();
    }

    // TODO: reflexive relationship test is missing only
    // setting _id column OR relationship reference should change the relationship reference(do both ways on each test(?))
    // TODO: also add embed + serializer tests to the test cases correctly
    test("new model can be built from scratch and it sends the right data to the server during post", async function (assert) {
      let { Group, PhotoComment, Photo, User } = prepare();
    });

    test("new model can have relationship set afterwards and it sends the right data to the server during post", async function (assert) {});

    test("fetched model can request the relationship(without embed) and change the relationship before update", async function (assert) {});

    test("fetched model can remove the relationship before update", async function (assert) {});

    test("fetched model can remove the relationship before delete", async function (assert) {});

    test("a model can create, update, delete with correct changing relationships without GET in one flow", async function (assert) {});

    test("a model can fetch its not loaded relationship", async function (assert) {});

    test("a models relationship promise reference turns to null when relationship gets destroyed either way", async function (assert) {});

    test("a models empty relationship reference turns to promise and can fetch when changed", async function (assert) {});

    test("a models empty relationship reference can turn to promise, incorrectly fetched(with server error), than can be retried to fetch correctly", async function (assert) {});
  });

  // module('hasOne Relationship test', async function (assert) {

  // });

  // module('hasMany Relationship test', async function (assert) {

  // });

  // module("manyToMany Relationship test", async function (assert) {

  // });
});
