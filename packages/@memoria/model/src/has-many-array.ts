import InstanceDB from "./stores/instance/db.js";
import Model from "./model.js";

// TODO: check HasManyArray.of() call

// TODO: trigger relationship adds here
// Adding should do Model check and duplication check(from the instance group):
// - push -> probably done
// - unshift
// - splice(?) -> this could add to the end(multiple)
// - add(?) -> this could add to the end multiple -> same/uses splice

// TODO: trigger relationship deletes here
// Removing logic:
// - pop -> from end
// - shift -> from beginning
// - splice(?) -> from anywhere, multiple

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
  spliceCallOnNullSetting = true; // NOTE: Maybe make this a public thing already
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

            self.forEach((existingInstance, existingInstanceIndex) => { // NOTE: this makes adding to list slow, array.push() also triggers it
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
                    let model = self[existingInstanceIndex + i + 1];
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

  fill(value: void | Model, start?: number, end?: number): this {
    let [targetStart, targetEnd] = [start || 0, end || this.length - 1];
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

  pop(): Model | undefined {
    return this.length === 0 ? undefined : this.splice(this.length - 1, 1)[0];
  }

  push(model: Model): number {
    this[this.length] = model;

    return this.length;
  }

  shift(): Model | undefined {
    return this.length === 0 ? undefined : this.splice(0, 1)[0];
  }

  splice(startIndex: number, deleteCount?: number, ..._items: Model[]): Model[] {
    let targetStartIndex = startIndex >= 0 ? startIndex : this.length + (startIndex || 0);
    if (targetStartIndex < 0) {
      targetStartIndex = 0;
    }

    let targetDeleteCount = (isNumber(deleteCount) ? deleteCount : this.length - targetStartIndex) as number;
    if (targetDeleteCount > this.length) {
      targetDeleteCount = this.length - targetStartIndex;
    }

    let deletedElements: Array<Model> = [];
    let oldSpliceCallOnNullSetting = this.spliceCallOnNullSetting;

    this.spliceCallOnNullSetting = false;

    if (targetDeleteCount > 0) {
      for (let i = 0; i < this.length && i < targetDeleteCount; i++) {
        deletedElements.push(this[targetStartIndex + i]);
        this[targetStartIndex + i] = null;
      }

      if (deletedElements.length > 0) {
        let deleteIndex = targetStartIndex + targetDeleteCount;
        let numberOfModelsToMoveAfterDelete = this.length - deleteIndex;
        if (numberOfModelsToMoveAfterDelete > 0) {
          for (let i = 0; i < numberOfModelsToMoveAfterDelete; i++) {
            let model = this[deleteIndex + i];

            this[targetStartIndex + targetDeleteCount + i] = null;
            this[targetStartIndex + i] = model;
          }
        }

        this.length = this.length - deletedElements.length;
      }
    }

    let shouldMoveAddedItems = targetStartIndex >= 0 && targetStartIndex < this.length;
    let indexForAdd = -1;
    let itemsToAdd = Array.prototype.slice.call(arguments).slice(2);
    itemsToAdd.forEach((item: Model) => {
      if (item instanceof Model) {
        let oldLength = this.length;

        this[this.length] = item;

        if (oldLength === this.length) {
          return;
        } else if (shouldMoveAddedItems) {
          indexForAdd = indexForAdd + 1;
          this[targetStartIndex + indexForAdd] = item;
        }
        // TODO: also what about RelationshipDB.addModelToHasManyArray()?, currently it would replace the existing one instead of actually adding
      }
    });

    this.spliceCallOnNullSetting = oldSpliceCallOnNullSetting;

    return deletedElements;
  }

  unshift(..._models: Model[]): number {
    [...arguments].forEach((element: Model, index: number) => {
      if (element instanceof Model) {
        this[this.length] = element;
        this[index] = element;
      }
    });

    return this.length;
  }

  any(predicate: any) {
    return super.some(predicate);
  }

  // TODO: Built for DX and optimized RelationshipDB operations here:
  add(param: Model | Model[]): this {
    Array.isArray(param)
      ? filterInstancesToAdd(param).forEach((model) => this.push(model))
      : this.push(param)

    return this;
  }

  // replace(existingReference: Model | Model[], targetToReplace: Model | Model[]): this {

  // }

  delete(param: Model | Model[]): boolean {
    let index = this.indexOf(param);
    if (index > -1) {
      this.splice(index, 1);
      return true;
    }

    return false;
  }

  clear() {
    return this.fill(); // NOTE: this.fill so it triggers removals
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

function filterInstancesToAdd(instancesToLookup: Model[]) {
  let arraysModelType: any;

  return instancesToLookup.reduce((result: [Model[], Set<Set<Model>>], instanceToLookup: Model) => {
    let instancesToAdd = result[0];
    if (!(instanceToLookup instanceof Model)) {
      throw new Error('HasManyArray cannot have non memoria Model instance inside!');
    } else if (!arraysModelType) {
      arraysModelType = instanceToLookup.constructor;
    } else if (arraysModelType !== instanceToLookup.constructor) {
      throw new Error('HasManyArray cannot be instantiated or added with model types different than one another!');
    }

    let instanceReferences = InstanceDB.getReferences(instanceToLookup) as Set<Model>;
    if (result[1].has(instanceReferences)) {
      let existingInstance = instancesToAdd
        .find((instance) => InstanceDB.getReferences(instance) === instanceReferences) as Model;
      let instanceReferencesArray = Array.from(instanceReferences);
      if (instanceReferencesArray.indexOf(instanceToLookup) > instanceReferencesArray.indexOf(existingInstance)) {
        instancesToAdd[instancesToAdd.indexOf(existingInstance)] = instanceToLookup;
      }

      return result;
    }

    result[0].push(instanceToLookup as Model);
    result[1].add(instanceReferences as Set<Model>);

    return result as [Model[], Set<Set<Model>>];
  }, [[] as Model[], new Set()])[0] as Model[];
}

function isNumber(value: any) {
  return typeof value === 'number' && isFinite(value);
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
