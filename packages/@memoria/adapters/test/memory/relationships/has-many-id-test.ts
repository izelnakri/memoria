// TODO: also add embed + serializer tests to the test cases correctly
// Model memory tests where there is sending data, build and mutate, build with data, etc [foreign keys change correctly]
// Model memory tests where there is mutation
// NOTE: replace the hasMany array completely and make it work with sending data in memory changes etc
// import Model, { PrimaryGeneratedColumn, Column, RuntimeError, Serializer, InstanceDB, RelationshipPromise } from "@memoria/model";
import { module, test, skip } from "qunitx";
import setupMemoria from "../../helpers/setup-memoria.js";
import generateModels from "../../helpers/models-with-relations/memory/id/index.js";

module("@memoria/adapters | MemoryAdapter | Relationships | @HasMany mutation tests(id)", function (hooks) {
  setupMemoria(hooks);

  // test("new model can be built from scratch and it sends the right data to the server during post", async function (assert) {
  //   // let { MemoryGroup, MemoryPhoto } = generateModels();
  //   // let photo = MemoryPhoto.build({ name: "Some photo" });
  //   // let group = MemoryGroup.build({ name: "Hacker Log", photo });
  //   // assert.strictEqual(group.photo, photo);
  //   // assert.equal(photo.group_id, null);
  //   // let insertedGroup = await MemoryGroup.insert(group);
  //   // assert.strictEqual(group.photo, photo);
  //   // assert.strictEqual(insertedGroup.photo, photo);
  //   // assert.equal(photo.group_id, insertedGroup.id);
  //   // let insertedPhoto = await MemoryPhoto.insert(photo);
  //   // assert.strictEqual(group.photo, insertedPhoto);
  //   // assert.strictEqual(insertedGroup.photo, insertedPhoto);
  // });

  // test("new model can have relationship set afterwards and it sends the right data to the server during post", async function (assert) {});

  // test("fetched model can request the relationship(without embed) and change the relationship before update", async function (assert) {});

  // test("fetched model can remove the relationship before update", async function (assert) {});

  // test("fetched model can remove the relationship before delete", async function (assert) {});

  // test("a model can be built, created, updated, deleted with correct changing relationships in one flow", async function (assert) {});

  // test("a model can be fetched, created, updated, deleted with correct changing relationships in one flow", async function (assert) {});

  // test("a model can fetch its not loaded relationship", async function (assert) {});

  // test("a models relationship lookup gets activated when relationship foreign key sets to null", async function (assert) {});

  // test("a models empty relationship reference turns to promise and can fetch when changed", async function (assert) {});
});
