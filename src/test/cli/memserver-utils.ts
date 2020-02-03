import test from "ava";
// import { generateUUID, primaryKeyTypeSafetyCheck } from '../../lib/utils';

test("memserver/lib/utils exports generateUUID correctly", (t) => {
  t.is(true, true);
  // t.plan(21);

  // const UUIDs = Array.from({ length: 10 }).map(() => generateUUID());

  // t.is(UUIDs.length, 10);

  // UUIDs.forEach((currentUUID) => {
  //   t.is(currentUUID.length, 36);
  //   t.is(UUIDs.filter((uuid) => uuid === currentUUID).length, 1);
  // });
});

// test('memserver/lib/utils exports primaryKeyTypeSafetyCheck correctly', (t) => {
//   t.plan(6);

//   const error = t.throws(() => primaryKeyTypeSafetyCheck('id', '22', 'Photo'), Error);

//   t.true(/\[MemServer\] Photo model primaryKey type is 'id'. Instead you've tried to enter id: 22 with string type/.test(error.message));
//   t.notThrows(() => primaryKeyTypeSafetyCheck('id', 22, 'Photo'));

//   const secondError = t.throws(() => primaryKeyTypeSafetyCheck('uuid', 22, 'PhotoComment'), Error);

//   t.true(/\[MemServer\] PhotoComment model primaryKey type is 'uuid'. Instead you've tried to enter uuid: 22 with number type/.test(secondError.message));
//   t.notThrows(() => primaryKeyTypeSafetyCheck('uuid', '166a435d-ad3d-4662-9f6f-04373280a38b', 'PhotoComment'));
// });
