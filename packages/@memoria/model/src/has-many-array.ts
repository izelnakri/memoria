import InstanceDB from "./stores/instance/db.js";
import Model from "./model.js";

// TODO: check HasManyArray.of() call

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

// TODO: tests for push(void), push(newModel), push(modelWithExistingInstance), push(modelWrongInstance), pop, shift, splice, unshift, clear, addObjects, remove/delete(?)

// NOTE: do we want to batch also relationships assignments(?) -> probably not for now
export default class HasManyArray extends Array {
  static get [Symbol.species]() {
    return Array;
  }

  #relationshipMetadata; // -> relationshipMetadata: this could cache the lookup for remaining stuff
  // #content; -> this could be a set implementation if needed to remove the JS Proxy

  constructor(array?: Array<Model> | Set<Model>) {
    super();

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
      set(target, propertyName, value) {
        console.log('propertyName', propertyName);

        if (typeof propertyName !== 'symbol') {
          let targetIndex = Number(propertyName);
          if (!isNaN(targetIndex)) {
            console.log('SET[x] CALLED');

            if (targetIndex > self.length) {
              throw new Error(`You cannot add HasManyArray[${targetIndex}] to HasManyArray of ${self.length} elements. You can expand the HasManyArray by one element at a time!`);
            } else if (!(value instanceof Model)) {
              if (value) {
                throw new Error(`HasManyArray accepts memoria Models or falsy values for assignment, not ${value}`);
              } else if (targetIndex !== self.length) {
                // TODO: instead this should just remove it!!, figure out how to remove

                self.splice(targetIndex, 1); // TODO: splice should do this: RelationshipDB.removeFromHasManyArray(targetIndex, self);
              }

              return true;
            }

            let instancesToAdd = [value];
            let instanceToAddReferencesSet = InstanceDB.getReferences(value);
            if (self[0] && self[0].constructor !== value.constructor) {
              throw new Error(`This HasManyArray accepts ${self[0].constructor.name} instances, you tried to assign ${value.constructor.name} instance!`);
            }

            self.forEach((existingInstance, existingInstanceIndex) => { // NOTE: this makes adding to list very slow because array.push() also triggers it
              if (existingInstance && instanceToAddReferencesSet === InstanceDB.getReferences(existingInstance)) {
                instancesToAdd.length = 0; // make this remove it instead in future for extensibility super.splice(existingInstanceIndex, 1);

                if ((value === existingInstance) && (targetIndex === existingInstance)) {
                  return;
                } else if (targetIndex === existingInstanceIndex || targetIndex === self.length) {
                  // RelationshipDB.replaceExistingModelFromHasManyArray(value, existingModelIndex, self) || RelationshipDB.addModel , in other words branch this out
                  self[existingInstanceIndex] = value;
                } else if (targetIndex < existingInstanceIndex) {
                  for (let i = 0; i < existingInstanceIndex - targetIndex; i++) {
                    let model = self[existingInstanceIndex - i - 1];
                    self[existingInstanceIndex - i] = model;
                  }

                  self[targetIndex] = value;
                } else {
                  for (let i = 0; i < targetIndex - existingInstanceIndex; i++) {
                    let model = self[existingInstanceIndex + i + 1]; // does this ow
                    self[existingInstanceIndex + i] = model;
                  }

                  self[targetIndex] = value;
                }
              }
            });

            instancesToAdd.forEach((instanceToAdd) => {
              if (targetIndex === self.length) {
                // RelationshipDB.addModelToHasManyArray(value, self);
              } else {
                // RelationshipDB.replaceExistingModelFromHasManyArray(value, targetIndex, self);
              }

              target[propertyName] = instanceToAdd;
            });

            return true;
          } else if (propertyName === 'length') {
            if (value < self.length) {
              self.splice(value, self.length - value); // NOTE: assuming .splice() calls the RelationshipDB

              return true;
            } else if (value !== self.length && !pushLengthCall) {
              throw new Error(`You cant change the length of an hasManyArray to ${value} is actual length is ${self.length}`); // TODO: is this needed(?) check this;
            }

            pushLengthCall = false;
          }
        }

        target[propertyName] = value;

        return true;
      },
      get(target, propertyName) {
        if (propertyName === 'push') {
          pushLengthCall = true;
        }

        return target[propertyName];
      },
      deleteProperty(self, propertyName) {
        let propertyAsNumber = typeof propertyName !== 'symbol' && Number(propertyName);
        if (!isNaN(propertyAsNumber as number)) {
          if (propertyAsNumber >= self.length) {
            throw new Error(`You cant delete the index of ${propertyAsNumber} when hasManyArray.length is ${self.length}`);
          }

          self.splice(propertyAsNumber, 1);

          return true;
        }

        delete self[propertyName];

        return true;
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
    // implement RelationshipDB.removeFromHasManyArray and RelationshipDB.addModelToHasManyArray
    return super.splice.apply(this, [...arguments]);

    // // NOTE: array.splice runs the constructor!! this is why this is messed up
    // if (deleteCount > 0) {
    //   for (let i = 0; i < deleteCount; i++;) {
    //     this[startIndex + i] = null; // NOTE: move this to delete this[startIndex + i] ?
    //   }
    // }

    // let itemsToAdd = Array.prototype.slice.call(arguments).slice(2);
    // itemsToAdd.forEach((item, index) => {
    //   // TODO: this should expand the length, so its currently a wrong logic:
    //   this[startIndex + index + 1] = item; // TODO: also what about RelationshipDB.addModelToHasManyArray()?, currently it would replace the existing one instead of actually adding
    // });
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

  get metadata() {
    return this.#relationshipMetadata || {
      RelationshipClass: this[0] && this[0].constructor,
      relationshipName: null,
      relationshipType: null,
      foreignKeyColumnName: null,
      reverseRelationshipName: null,
      reverseRelationshipType: null,
      reverseRelationshipForeignKeyColumnName: null
    };
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
  let arraysModelType;

  return instancesToLookup.reduce((result, instanceToLookup) => {
    let instancesToAdd = result[0];
    if (!(instanceToLookup instanceof Model)) {
      throw new Error('HasManyArray cannot have non memoria Model instance inside!');
    } else if (!arraysModelType) {
      arraysModelType = instanceToLookup.constructor;
    } else if (arraysModelType !== instanceToLookup.constructor) {
      throw new Error('HasManyArray cannot be instantiated with model types different than one another!');
    }

    let instanceReferences = InstanceDB.getReferences(instanceToLookup);
    if (result[1].has(instanceReferences)) {
      let existingInstance = instancesToAdd
        .find((instance) => InstanceDB.getReferences(instance) === instanceReferences) as Model;
      let instanceReferencesArray = Array.from(instanceReferences);
      if (instanceReferencesArray.indexOf(instanceToLookup) > instanceReferencesArray.indexOf(existingInstance)) {
        instancesToAdd[instancesToAdd.indexOf(existingInstance)] = instanceToLookup;
      }

      return result;
    }

    result[0].push(instanceToLookup);
    result[1].add(instanceReferences);

    return result;
  }, [[] as Model[], new Set()])[0];
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
// getProperties, insertAt, invoke, objectsAt(is this needed(?)), replace(basically splice but array of inserts)
// insertAt[Error: Index out of range], isAny, isEvery, removeAt[Error: Index out of range], addObjects and add could be strict/throw something
// addObjects, [compact(?) probably shouldnt need as its automatically done]
// arr.objectsAt([2, 3, 4]);  // ['c', 'd', undefined]
// .get('0'), people.invoke('greet') , set('3', model);, toString() person.toString(); //=> "<Person:ember1024>", .without()[alias for delete(?)]

// type exactInstanceAlreadyInHasManyArray = boolean;
// type instanceGroupAlreadyInHasManyArray = boolean;
// type instanceLookupResultInHasManyArray = [exactInstanceAlreadyInHasManyArray, instanceGroupAlreadyInHasManyArray]; // there is no early return on Array.prototype.reduce
