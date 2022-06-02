// TODO: add splice tests directly before anything
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

// NOTE: things that can return *this*:
// - HasManyArray.add
// - HasManyArray.replace
// - HasManyArray.remove
// - Mixin functions could also be here, they should be in instance too because thats JS.

// NOTE: things that can return mutation metadata(these could be the actual optimized relationship mutation paths(?)):
// should they return metadata or this(?)
// - add() -> //-> added or replaced(true | false)
// - replace() // -> actual removal count, actual addition, actual replacementIndexes[]
// - remove -> // -> [Model] // found and removed models
export default class HasManyArray extends Array {
  static get [Symbol.species]() {
    return Array;
  }

  #relationshipMetadata; // -> relationshipMetadata: this could cache the lookup for remaining stuff
  #spliceCallOnNullSetting = true; // NOTE: Maybe make this a public thing already
  // #content; -> this could be a set implementation if needed to remove the JS Proxy

  get spliceCallOnNullSetting() {
    return this.#spliceCallOnNullSetting;
  }
  set spliceCallOnNullSetting(value) {
    this.#spliceCallOnNullSetting = value;
  }

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
            console.log('SET[x] CALLED for x:index');

            if (targetIndex > self.length) {
              throw new Error(`You cannot add HasManyArray[${targetIndex}] to HasManyArray of ${self.length} elements. You can expand the HasManyArray by one element at a time!`);
            } else if (!(value instanceof Model)) {
              if (value) {
                throw new Error(`HasManyArray accepts memoria Models or falsy values for assignment, not ${value}`);
              } else if (targetIndex !== self.length) {
                // NOTE: following if check needed because no way to differentiate user generated null setting and internal generated null setting
                if (self.spliceCallOnNullSetting) {
                  self.splice(targetIndex, 1); // TODO: splice should do this: RelationshipDB.removeFromHasManyArray(targetIndex, self);
                } else {
                  self[targetIndex] = null;
                }
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
              // TODO: register model removals here
              target[propertyName] = value;

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

          self.splice(propertyAsNumber as number, 1);

          return true;
        }

        delete self[propertyName];

        return true;
      }
    });
  }

  concat(_otherHasManyArrays: Model[] | HasManyArray): Array<Model> {
    return filterInstancesToAdd(super.concat.apply(this, [...arguments]));
  }

  fill(value: void | Model, start?: number, end?: number): HasManyArray {
    let [targetStart, targetEnd] = [start || 0, end || this.length - 1]; // NOTE: maybe this should be this.length - 1;
    let endIndex = targetEnd < 0 ? this.length + targetEnd : targetEnd;
    let startIndex = targetStart < 0 ? this.length + targetStart : targetStart;
    if (startIndex > 0 && startIndex > this.length - 1) {
      return this;
    } else if (value && !(value instanceof Model)) {
      throw new Error('hasManyArray.fill(value) value has to be falsy value or a memoria Model');
    }

    let oldSpliceCallOnNullSetting = this.spliceCallOnNullSetting;

    this.spliceCallOnNullSetting = false;
    this.splice(startIndex, endIndex - startIndex + 1);
    this.spliceCallOnNullSetting = oldSpliceCallOnNullSetting;

    if (value && value instanceof Model) {
      this[this.length] = value;
      this[startIndex] = value;
    }

    return this;
  }

  pop(): Element | undefined {
    if (this.length === 0) {
      return;
    }

    return this.splice(this.length - 1, 1)[0];
  }

  push(model: Model): number {
    this[this.length] = model;

    return this.length;
  }

  shift(): Model | undefined {
    if (this.length === 0) {
      return;
    }

    let [removedElement] = this.splice(0, 1);

    return removedElement;
  }

  // test it for (0, 1)
  // TODO: this sometimes changes the length(?)
  splice(startIndex: number, deleteCount?: number, _item1?: Model): Array<Model> {
    let oldSpliceCallOnNullSetting = this.spliceCallOnNullSetting;
    this.spliceCallOnNullSetting = false;

    let deletedElements: Array<Model> = [];
    if (deleteCount && deleteCount > 0) {
      // TODO: maybe limit this to this.length here:
      for (let i = 0; i < deleteCount; i++) {
        let targetIndex = startIndex + i;
        deletedElements.push(this[targetIndex]);
        this[targetIndex] = null; // NOTE: move this to delete this[startIndex + i] ?
      }

      if (deletedElements.length > 0) {
        let elementsToMoveAfterDelete = this.length - (startIndex + deleteCount);
        if (elementsToMoveAfterDelete > 0) {
          for (let i = 0; i < elementsToMoveAfterDelete; i++) {
            let targetIndex = startIndex + deleteCount + i; // NOTE: this needs to start from far right
            let model = this[targetIndex];
            debugger;
            this[targetIndex] = null; // TODO: does this ever change length(?)
            debugger;
            this[startIndex + i] = model;
          }
        }

        this.length = this.length - deletedElements.length;
      }
    }

    let itemsToAdd = Array.prototype.slice.call(arguments).slice(2);
    // debugger;
    itemsToAdd.forEach((item, index) => {
      this[this.length] = item;
      this[startIndex + index + 1] = item;  // because this should add to the end of the array
      // TODO: also what about RelationshipDB.addModelToHasManyArray()?, currently it would replace the existing one instead of actually adding
    });

    this.spliceCallOnNullSetting = oldSpliceCallOnNullSetting;

    return deletedElements;
  }

  unshift(_element0?: Model, _element1?: Model): number {
    let elements = [...arguments].reverse();

    elements.forEach((element) => {
      this.splice(-1, 0, element);
    });

    return this.length;
  }

  any(predicate) {
    return super.some(predicate);
  }

  // TODO: Built for DX and optimized RelationshipDB operations here:
  // TODO: rename this to add and make it accept Model or Array<Model>
  add(param: Model | Model[]): HasManyArray {
    Array.isArray(param)
      ? filterInstancesToAdd(param).forEach((model) => this.push(model))
      : this.push(param)

    return this;
  }

  // replace(existingReference: Model | Model[], targetToReplace: Model | Model[]): HasManyArray {

  // }

  remove(param: Model | Model[]): HasManyArray {
    let index = this.indexOf(param);
    if (index > -1) {
      this.splice(index, 1);
      return true;
    }

    return false;
  }

  clear() {
    this.length = 0;

    return this;
  }

  // NOTE: investigate .get(), .getProperties, is .reverseObjects() needed(?)

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

function filterInstancesToAdd(instancesToLookup: Model[] | HasManyArray) {
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

// Atomic operations
// function replaceExistingModelFromArray(newModel: Model, existingModelIndex: number, hasManyArray: Model[]) {

// }

// // TODO: this will be push instead(push does filtering itself(?)
// function addToHasManyArray(newModel: Model, hasManyArray: Model[]) {

// }

// function removeFromHasManyArray(existingModelIndex: number, hasManyArray: Model[]) {
//   return array.splice(existingModelIndex, 1);
// }


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
