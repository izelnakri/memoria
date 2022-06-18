// NOTE: can only accept model instances inside
export default class HasManyArray extends Set {

}

// length, size
// add, clear, delete [make this accept array?), has
// at, concat, find, findIndex, any/some, every, indexOf, lastIndexOf, reverse(), removeAt,
// insertAt[Error: Index out of range], map, filter, reduce,
// slice, toArray, includes, uniq, pop, push(allow it to accept array for pushing them(?)), shift, sort, splice, unshift
// uniqBy(keyOrFunc), mapBy(key), objectsAt, sortBy, uniqBy, findBy, filterBy('food', 'beans') or filterBy('isFruit')
// isAny, isEvery, toJSON()
//
// [] lookup, how does Array.from() work(?)
//
// addObjects, [compact(?) probably shouldnt need as its automatically done]
// arr.objectsAt([2, 3, 4]);  // ['c', 'd', undefined]
//
// .entries() should return Array iteratora, .keys()[index], .values()
// maybe HasManyArray.of() sugar for new HasManyArray(), reduceRight
// .get('0'), people.invoke('greet') , set('3', model);, toString() person.toString(); //=> "<Person:ember1024>", .without()[alias for delete(?)]
// first, last(?) property or function call(?), count()
