import InstanceDB from "./stores/instance/db.js";
import Model from "./model.js";

// TODO: check HasManyArray.of() call

// TODO: check/investigate delete obj[3]; it creates "empty" falsy value that jumps on forEach but doesnt change the length!

// TODO: trigger relationship adds here
// Adding should do Model check and duplication check(from the instance group):
// - push -> probably done
// - unshift
// - concat -> this could add to the end(multiple)
// - splice(?) -> this could add to the end(multiple)
// - add(?) -> this could add to the end multiple -> same/uses splice

// TODO: trigger relationship deletes here
// Removing logic:
// - pop -> from end
// - shift -> from beginning
// - splice(?) -> from anywhere, multiple

// TODO: tests for new HasManyArray(), new HasManyArray([]) new HasManyArray([Model1, Model2]), new HasManyArray([Model, SameInstance, AnotherInstance])
// TODO: make direct [] changes tests
// TODO: tests for push(void), push(newModel), push(modelWithExistingInstance), push(modelWrongInstance), pop, shift, splice, unshift, clear, addObjects, remove/delete(?)

// NOTE: do we want to batch also relationships assignments(?) -> probably not for now
export default class HasManyArray extends Array {
  // #relationshipMetadata; -> relationshipMetadata: this could cache the lookup for remaining stuff
  // #content; -> this could be a set implementation if needed to remove the JS Proxy

  constructor(array?: Array<Model> | Set<Model>) {
    let parent = super();

    if (Array.isArray(array)) {
      filterInstancesToAdd(array).forEach((element) => this.push(element));
    } else if (array && array instanceof Set) {
      filterInstancesToAdd(Array.from(array)).forEach((element) => this.push(element));
    } else if (array) {
      throw new Error('Invalid param passed to HasManyArray. Either provide an array of memoria Models or dont provide any elements');
    }

    let self = this;
    let pushLengthCall = false;
    return new Proxy(self, {
      set(target, name, value) {
        console.log('name', name);

        if (typeof name !== 'symbol') {
          let targetIndex = Number(name);
          if (!isNaN(targetIndex)) {
            console.log('SET[x] CALLED');

            if (targetIndex > self.length) {
              throw new Error(`You cannot add HasManyArray[${targetIndex}] to HasManyArray of ${self.length} elements. You can expand the HasManyArray by one element at a time!`);
            } else if (!(value instanceof Model)) {
              if (value) {
                throw new Error(`HasManyArray accepts memoria Models or falsy values for assignment, not ${value}`);
              } else if (targetIndex !== self.length) {
                // RelationshipDB.removeFromHasManyArray(targetIndex, self);
                parent.splice(targetIndex, 1);
              }

              return true; // NOTE: this should ignore adding array[array.length] = null;
            }

            let instancesToAdd = [value];
            let instanceToAddReferencesSet = InstanceDB.getReferences(value);

            self.forEach((existingInstance) => { // NOTE: this makes adding to list very slow because array.push() also triggers it
              let existingElementReferencesSet = InstanceDB.getReferences(existingInstance);
              if (instanceToAddReferencesSet === existingElementReferencesSet) {
                if (value === existingInstance) {
                  instancesToAdd.length = 0; // make this remove it instead in future for extensibility super.splice(existingInstanceIndex, 1);
                  return;
                }

                let existingInstanceIndex = self.indexOf(existingInstance);

                // RelationshipDB.replaceExistingModelFromHasManyArray(value, existingModelIndex, self);
                this[existingInstanceIndex] = instancesToAdd[0];
                instancesToAdd.length = 0; // make this remove it instead in future for extensibility super.splice(existingInstanceIndex, 1);
              }
            });

            instancesToAdd.forEach((instanceToAdd) => {
              if (targetIndex === self.length) {
                // RelationshipDB.addModelToHasManyArray(value, self);
              } else {
                // RelationshipDB.replaceExistingModelFromHasManyArray(value, targetIndex, self);
              }

              target[name] = value;
            });

            return true;
          } else if (name === 'length') {
            if (value === 0) {
              // TODO: clean up relationships in the future
            } else if (!pushLengthCall) {
              debugger;
              throw new Error('You cant change the size of HasManyArray this way!!');
            }

            pushLengthCall = false;
          }
        }

        target[name] = value;

        return true;
      },
      get(target, name) {
        if (typeof name !== 'symbol' && !isNaN(Number(name))) {
          // object[x];
          console.log('GET');
        } else if (name === 'push') {
          pushLengthCall = true;
        }

        return target[name];
      }
    });
  }

  concat(otherHasManyArray: Model[]) {
    // NOTE: this shouldnt replace in place(?) here, but might be needed for manipulation(?)
    throw new Error('HasManyArray.concat() not supported for now, it can be very complex to implement correctly');
  }

  slice(start, end) {
    // NOTE: maybe implement this by basic super.slice(start, end); for tests
    // NOTE: this shouldnt replace in place(?) here, but might be needed for manipulation(?)
    throw new Error('HasManyArray.slice() not supported for now, it can be very complex to implement correctly');
  }

  fill() {
    // instead this should clear and add the model if model is a proper value
    return this;
  }

  pop() {
    let result = super.pop();
    if (result) {
      // TODO: Remove reflection of the relationship
    }

    return result;
  }

  push(model: Model) { // NOTE: this can add or replace-in-place
    return super.push(model);
  }

  shift() {
    // TODO: remove reflection
    return super.shift();
  }

  splice(_startIndex, _deleteCount, _item1?: Model) {
    return this; // NOTE: nooped for now because EmberArray doesnt have it. Requires complex implementation for now
  }

  unshift(_element0?: Model, _element1?: Model) {
    // TODO: add reflection of the relationship

    return super.push(...arguments);
  }

  any(predicate) {
    return super.some(predicate);
  }

  addObjects(param: Model[]) { // this can add or replace objects after a filter
    this.push(param);

    return this;
  }

  delete(param) { // NOTE: or remove
    let index = this.indexOf(param);
    if (index > -1) {
      this.splice(index, 1); // TODO: splice nooped!!
      return true;
    }

    return false;
  }

  clear() {
    // this.forEach((model, index) => RelationshipDB.removeFromHasManyArray(index, self));
    this.length = 0;

    return this;
  }

  get firstObject() {
    return this[0];
  }

  get lastObject() {
    return this[this.length - 1];
  }
}

// NOTE: maybe this isnt needed based on the array, but we also dont want to change the arrays existing results for no reason

function filterInstancesToAdd(instancesToLookup: Model[]) {
  let [targetInstances] = instancesToLookup.reduce((result, instanceToLookup) => {
    let instancesToAdd = result[0];
    let instancesReferences = Array.from(InstanceDB.getReferences(instanceToLookup));
    if (result[1].has(instancesReferences)) {
      let existingInstanceIndex = instancesReferences
        .findIndex((reference) => instancesToAdd.includes(reference));
      let targetInstanceIndex = instancesReferences.indexOf(instanceToLookup);
      if (targetInstanceIndex > existingInstanceIndex) {
        let instancesIndexInAdd = instancesToAdd.findIndex((instance) => instancesReferences.includes(instance)); // NOTE: maybe costly

        instancesToAdd[instancesIndexInAdd] = instanceToLookup;
      }

      return result;
    }

    result[0].push(instanceToLookup);
    result[1].add(instancesReferences);

    return result;
  }, [[] as Model[], new Set()]); // result one can also be Set for result[0].includes() optimization?

  return targetInstances;
}

// function addInstancesToHasManyArray(instancesToLookup: Model[], hasManyArray: Model[]): Model[] {
//   let [instancesToAdd, instanceToAddReferencesSet] = filterInstancesToAdd(instancesToLookup);

//   // TODO: should mutate instancesToAdd for old or replaced instances on hasManyArray
//   hasManyArray.forEach((existingInstance) => {
//     let existingElementReferences = InstanceDB.getReferences(existingInstance);

//     if (instanceToAddReferencesSet.has(existingElementReferences)) {

//       // remove for old or replace for
//     }
//     let existingReference =

//     // replaceExistingModelFromArray(instancesToAdd, existingModelIndex, hasManyArray);
//   });

//   instancesToAdd.forEach((targetInstance) => addToHasManyArray(targetInstance, hasManyArray));

//   return hasManyArray;
// }


// Atomic operations
function replaceExistingModelFromArray(newModel: Model, existingModelIndex: number, hasManyArray: Model[]) {

}

// TODO: this will be push instead(push does filtering itself(?)
function addToHasManyArray(newModel: Model, hasManyArray: Model[]) {

}

function removeFromHasManyArray(existingModelIndex: number, hasManyArray: Model[]) {
  return array.splice(existingModelIndex, 1);
}



// let instancesToAdd = [model];
// let instanceToAddReferencesSet = new Set([InstanceDB.getReferences(instancesToAdd[0])]);

// this.forEach((existingInstance) => {
//   let existingElementReferencesSet = InstanceDB.getReferences(existingInstance);

//   if (instanceToAddReferencesSet.has(existingElementReferencesSet)) {
//     let existingElementReferences = Array.from(existingElementReferencesSet);
//     let existingInstanceIndex = existingElementReferences.indexOf(existingInstance);
//     let instanceToAddIndex = existingElementReferences.indexOf(instancesToAdd[0]);

//     if (instanceToAddIndex > existingInstanceIndex) {
//       let instancesArrayIndex = this.indexOf(existingInstance);

//       this[instancesArrayIndex] = instancesToAdd[0]; // TODO: this should trigger InstanceDB.replaceRecord in the proxy
//     }

//     instancesToAdd.length = 0; // make this remove it instead in future for extensibility
//   }
// });

// instancesToAdd.forEach((instanceToAdd) => {
//   super.push(instanceToAdd);
//   // RelationshipDB effect
// });

// return super.length;




// NOTE: For later: Array utils/mixins from ember:
// toArray, toJSON()[is it the same?], reduceRight
// uniqBy(keyOrFunc), mapBy(key), objectsAt, sortBy, uniqBy, findBy, filterBy('food', 'beans') or filterBy('isFruit')
// insertAt[Error: Index out of range], isAny, isEvery, removeAt[Error: Index out of range]

// addObjects, [compact(?) probably shouldnt need as its automatically done]
// arr.objectsAt([2, 3, 4]);  // ['c', 'd', undefined]

// .get('0'), people.invoke('greet') , set('3', model);, toString() person.toString(); //=> "<Person:ember1024>", .without()[alias for delete(?)]


// type exactInstanceAlreadyInHasManyArray = boolean;
// type instanceGroupAlreadyInHasManyArray = boolean;
// type instanceLookupResultInHasManyArray = [exactInstanceAlreadyInHasManyArray, instanceGroupAlreadyInHasManyArray]; // there is no early return on Array.prototype.reduce
