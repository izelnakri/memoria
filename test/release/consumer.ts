// Consumer smoke test for the packed tarballs, run by scripts/test-release.sh in a scratch project
// that installs them from disk. It is compiled by that project's own tsc -- strict, with library
// checking on -- so a broken or missing declaration fails here before it reaches anyone's editor,
// and then executed, so a bundle that imports something it does not declare fails too.
import assert from "node:assert/strict";
import Model, { BelongsTo, Column, HasMany, PrimaryGeneratedColumn } from "@memoria/model";
import { MemoryAdapter, RESTAdapter } from "@memoria/adapters";
import SQLAdapter from "@memoria/adapters/sql";
import setupDom from "@memoria/server/setup-dom";

// NOTE: the models are the README's, so its examples are known to compile for a consumer.
class User extends Model {
  static Adapter = MemoryAdapter;

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column("boolean", { default: true })
  isActive: boolean;

  // NOTE: a thunk, because Photo is declared below. Every relationship decorator takes either form.
  @HasMany(() => Photo)
  photos: Photo[];
}

class Photo extends Model {
  static Adapter = MemoryAdapter;

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  href: string;

  @Column("int")
  owner_id: number;

  @BelongsTo(User)
  owner: User;
}

let user = (await User.insert({ firstName: "Izel" })) as User;
let photo = (await Photo.insert({ href: "a.png", owner: user })) as Photo;

assert.equal(user.id, 1);
assert.equal(user.isActive, true);
assert.equal(((await User.find(1)) as User).firstName, "Izel");
assert.equal(photo.owner_id, user.id);
let photos = await user.photos; // NOTE: unfetched, so a RelationshipPromise that resolves from the cache

assert.equal(photos.length, 1);
assert.equal(photos[0].id, photo.id); // NOTE: the same record, not necessarily the same instance
assert.equal(Object.getPrototypeOf(RESTAdapter), MemoryAdapter);
assert.equal(Object.getPrototypeOf(SQLAdapter), MemoryAdapter);

// NOTE: Pretender reads `self` while @memoria/server is being evaluated, so a DOM has to exist before
// it is imported at all -- the same constraint the node test suite's bootstrap works around.
await setupDom();

const { default: Server } = await import("@memoria/server");
const { default: Response } = await import("@memoria/response");

assert.equal(typeof Server, "function");
assert.equal(typeof Response, "function");

console.log("ok - the packed @memoria packages install, type check and run");
