// TODO: Do we want some of these properties/structure in $Model.findAll, insertAll(?) returns(?), maybe a ModelArray<Model>
import InstanceDB from "./stores/instance/db.js";
import RelationshipUtils from "./stores/relationship/utils.js";
import Model from "./model.js";
import Enum from "./enum.js";
import { compare, get, match, SetUtils } from "./utils/index.js";

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

// NOTE: things that can return mutation metadata(these could be the actual optimized relationship mutation paths(?)):
// should they return metadata or this(?)
// - add() -> //-> added or replaced(true | false)
// - replace() // -> actual removal count, actual addition, actual replacementIndexes[]
// - remove -> // -> [Model] // found and removed models
// @ts-ignore
export default class HasManyArray extends Array {
  static get [Symbol.species]() {
    return Array;
  }

  static of(..._input: Model[]) {
    let args = [...arguments];

    return Array.isArray(args[0]) ? new HasManyArray(args[0]) : new HasManyArray(args);
  }

  RelationshipClass: typeof Model;
  spliceCallWhenSettingNull = true; // NOTE: Maybe make this a public thing already
  // #content; -> this could be a set implementation if needed to remove the JS Proxy

  get metadata() {
    if (!this.RelationshipClass && this[0]) {
      this.RelationshipClass = this[0].constructor as typeof Model;
    }

    return {
      RelationshipClass: this.RelationshipClass,
      relationshipName: null,
      relationshipType: null,
      foreignKeyColumnName: null,
      reverseRelationshipName: null,
      reverseRelationshipType: null,
      reverseRelationshipForeignKeyColumnName: null,
    };
  }

  get firstObject() {
    return this[0];
  }

  get lastObject() {
    return this[this.length - 1];
  }

  constructor(array?: Array<Model> | Set<Model>) {
    super();

    if (Array.isArray(array)) {
      filterInstancesToAddFor(this, array).forEach((model) => {
        RelationshipUtils.addHasManyRelationshipFor(this, model); // TODO: this should not be needed, instead done in push
        this.push(model);
      });
    } else if (array && array instanceof Set) {
      filterInstancesToAddFor(this, Array.from(array)).forEach((model) => {
        RelationshipUtils.addHasManyRelationshipFor(this, model); // TODO: this should not be needed, instead done in push
        this.push(model);
      });
    } else if (array) {
      throw new Error(
        "Invalid param passed to HasManyArray. Either provide an array of memoria Models or dont provide any elements"
      );
    }

    let pushLengthCall = false;
    let self = this;

    return new Proxy(this, {
      set(target, propertyName, value) {
        if (typeof propertyName !== "symbol") {
          let targetIndex = Number(propertyName);
          if (!isNaN(targetIndex)) {
            if (targetIndex > self.length) {
              throw new Error(
                `You cannot add HasManyArray[${targetIndex}] to HasManyArray of ${self.length} elements. You can expand the HasManyArray by one element at a time!`
              );
            } else if (!(value instanceof Model)) {
              if (value) {
                throw new Error(`HasManyArray accepts memoria Models or falsy values for assignment, not ${value}`);
              } else if (targetIndex !== self.length) {
                if (self.spliceCallWhenSettingNull) {
                  self.splice(targetIndex, 1);
                } else {
                  self[targetIndex] = null;
                }
              }

              return true;
            }

            let instancesToAdd = [value];
            let instanceToAddReferencesSet = InstanceDB.getReferences(value);
            if (self.metadata.RelationshipClass && value.constructor !== self.metadata.RelationshipClass) {
              throw new Error(
                `This HasManyArray accepts ${self.metadata.RelationshipClass.name} instances, you tried to assign ${value.constructor.name} instance!`
              );
            }

            self.forEach((existingInstance, existingInstanceIndex) => {
              if (
                existingInstance === value &&
                (existingInstanceIndex === targetIndex || targetIndex === self.length)
              ) {
                instancesToAdd.length = 0;

                return true;
              } else if (
                existingInstance &&
                instanceToAddReferencesSet === InstanceDB.getReferences(existingInstance)
              ) {
                instancesToAdd.length = 0; // make this remove it instead in future for extensibility super.splice(existingInstanceIndex, 1);

                if (existingInstance !== value) {
                  RelationshipUtils.removeHasManyRelationshipFor(self, existingInstance);
                  RelationshipUtils.addHasManyRelationshipFor(self, value);
                }

                if (targetIndex === existingInstanceIndex || targetIndex === self.length) {
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
              if (self.spliceCallWhenSettingNull) {
                RelationshipUtils.addHasManyRelationshipFor(self, value);

                if (self[propertyName] && targetIndex !== self.length) {
                  RelationshipUtils.removeHasManyRelationshipFor(self, self[propertyName]);
                }
              }

              target[propertyName] = instanceToAdd;
            });

            return true;
          } else if (propertyName === "length") {
            if (value < self.length) {
              for (let i = self.length - 1; i >= value; i--) {
                if (self[i]) {
                  RelationshipUtils.removeHasManyRelationshipFor(self, self[i]); // NOTE: maybe move it to deleteProperty check it later
                }
              }

              target[propertyName] = value;

              return true;
            } else if (value !== self.length && !pushLengthCall) {
              throw new Error(
                `You cant change the length of an hasManyArray to ${value} when actual length is ${self.length}`
              ); // TODO: is this needed(?) check this;
            }

            pushLengthCall = false;
          }
        }

        target[propertyName] = value;

        return true;
      },
      get(target, propertyName) {
        if (propertyName === "push") {
          pushLengthCall = true;
        }

        return target[propertyName];
      },
      deleteProperty(self, propertyName) {
        let propertyAsNumber = typeof propertyName !== "symbol" && Number(propertyName);
        if (!isNaN(propertyAsNumber as number)) {
          if (propertyAsNumber >= self.length) {
            throw new Error(
              `You cant delete the index of ${propertyAsNumber} when hasManyArray.length is ${self.length}`
            );
          }

          self.splice(propertyAsNumber as number, 1);

          return true;
        }

        delete self[propertyName];

        return true;
      },
    });
  }

  toArray() {
    return this.map((model) => model);
  }

  toJSON() {
    return this.map((model) => model.toJSON());
  }

  concat(_otherHasManyArrays: Model[] | HasManyArray): Array<Model> {
    return filterInstancesToAddFor(this, super.concat.apply(this, [...arguments]));
  }

  fill(value: void | Model, start?: number, end?: number): this {
    let [targetStart, targetEnd] = [start || 0, end || this.length - 1];
    let endIndex = targetEnd < 0 ? this.length + targetEnd : targetEnd;
    let startIndex = targetStart < 0 ? this.length + targetStart : targetStart;
    if (startIndex > 0 && startIndex > this.length - 1) {
      return this;
    } else if (value && !(value instanceof Model)) {
      throw new Error("hasManyArray.fill(value) value has to be falsy value or a memoria Model");
    }

    let oldSpliceCallOnNullSetting = this.spliceCallWhenSettingNull;

    this.spliceCallWhenSettingNull = false;
    this.splice(startIndex, endIndex - startIndex + 1);
    this.spliceCallWhenSettingNull = oldSpliceCallOnNullSetting;

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

    let deletedModels: Array<Model> = [];
    let oldSpliceCallOnNullSetting = this.spliceCallWhenSettingNull;

    this.spliceCallWhenSettingNull = false;

    if (targetDeleteCount > 0) {
      for (let i = 0; i < this.length && i < targetDeleteCount; i++) {
        deletedModels.push(this[targetStartIndex + i]);
        this[targetStartIndex + i] = null;
      }

      if (deletedModels.length > 0) {
        let deleteIndex = targetStartIndex + targetDeleteCount;
        let numberOfModelsToMoveAfterDelete = this.length - deleteIndex;
        if (numberOfModelsToMoveAfterDelete > 0) {
          for (let i = 0; i < numberOfModelsToMoveAfterDelete; i++) {
            let model = this[deleteIndex + i];

            this[targetStartIndex + targetDeleteCount + i] = null;
            this[targetStartIndex + i] = model;
          }
        }

        deletedModels.forEach((deletedModel) => RelationshipUtils.removeHasManyRelationshipFor(this, deletedModel));
        this.length = this.length - deletedModels.length;
      }
    }

    let shouldMoveAddedItems = targetStartIndex < this.length;
    let itemsToAdd = Array.prototype.slice.call(arguments).slice(2);
    itemsToAdd.reduce((indexForAdd: number, item: Model) => {
      if (item instanceof Model) {
        let oldLength = this.length;

        this[this.length] = item;

        if (oldLength === this.length) {
          return indexForAdd;
        } else if (shouldMoveAddedItems) {
          this[targetStartIndex + indexForAdd] = item;
          indexForAdd = indexForAdd + 1;
        }

        RelationshipUtils.addHasManyRelationshipFor(this, item);
      }

      return indexForAdd;
    }, 0);

    this.spliceCallWhenSettingNull = oldSpliceCallOnNullSetting;

    return deletedModels;
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

  add(param: Model | Model[]): this {
    filterInstancesToAddFor(this, Array.isArray(param) ? param : [param], false).forEach((model) => this.push(model));

    return this;
  }

  replace(existingReference: Model | Model[], targetToReplace: Model | Model[]): this {
    let referencesToRemove = new Set(Array.isArray(existingReference) ? existingReference : [existingReference]);
    let referencesToAdd = new Set(
      filterInstancesToAddFor(this, Array.isArray(targetToReplace) ? targetToReplace : [targetToReplace])
    );

    this.forEach((model, index) => {
      if (referencesToRemove.has(model)) {
        referencesToRemove.delete(model);

        if (referencesToAdd.has(model)) {
          return referencesToAdd.delete(model);
        }

        this[index] = null;

        let referenceToAdd = SetUtils.shift(referencesToAdd);
        if (referenceToAdd) {
          this[this.length] = referenceToAdd;
          this[index] = referenceToAdd;
        }
      }
    });
    referencesToAdd.forEach((model) => {
      this[this.length] = model;
    });

    return this;
  }

  delete(param: Model | Model[]): boolean {
    if (Array.isArray(param)) {
      return param.every((model) => this.delete(model));
    }

    let index = this.indexOf(param);
    if (index > -1) {
      this.splice(index, 1);
      return true;
    }

    return false;
  }

  clear(): this {
    return this.fill();
  }

  insertAt(index: number, input: Model | Model[]): this {
    let amountToAdd = Array.isArray(input) ? input.length : 1;
    let targetIndex = index >= 0 ? index : this.length + amountToAdd + index;
    if (targetIndex < 0 || targetIndex > this.length - 1 + amountToAdd) {
      throw new Error(`insertAt: index ${index} is not a valid index when length of the array is ${this.length}`);
    } else if (Array.isArray(input)) {
      this.splice(targetIndex, 0, ...input);
    } else {
      this[this.length] = input;
      this[targetIndex] = input;
    }

    return this;
  }

  deleteAt(index: number, amount: number = 1): this {
    let targetIndex = index >= 0 ? index : this.length + index;
    if (targetIndex < 0 || targetIndex > this.length - 1) {
      throw new Error(`deleteAt: index ${index} is not a valid index when length of the array is ${this.length}`);
    }

    let maxAmountToDelete = this.length - targetIndex;
    if (amount > 0) {
      this.splice(targetIndex, amount > maxAmountToDelete ? maxAmountToDelete : amount);
    }

    return this;
  }

  filterBy(key: string, value: any): this {
    let indexesToRemove: number[] = [];

    this.forEach((model, index) => {
      if (!match(get(model, key), value)) {
        indexesToRemove.push(index);
      }
    });

    for (let index = indexesToRemove.length - 1; index >= 0; index--) {
      this[indexesToRemove[index]] = null;
    }

    return this;
  }

  uniqBy(key: string): this {
    let indexesToRemove: number[] = [];

    this.reduce((foundValues, model: Model, index) => {
      if (!Reflect.has(model, key)) {
        throw new Error(`uniqBy: Key ${key} not found in a model inside the array!`);
      } else if (foundValues.has(model[key])) {
        indexesToRemove.push(index);
      }

      return foundValues.add(model[key]);
    }, new Set());

    for (let index = indexesToRemove.length - 1; index >= 0; index--) {
      this[indexesToRemove[index]] = null;
    }

    return this;
  }

  sortBy(_key: string): this {
    let sortKeys = Array.isArray(arguments[0]) ? arguments[0] : Array.from(arguments);

    return this.sort((elementOne, elementTwo) => {
      for (let i = 0; i < sortKeys.length; i++) {
        let key = sortKeys[i];
        let compareValue = compare(get(elementOne, key), get(elementTwo, key));
        if (compareValue) {
          return compareValue; // return 1 or -1 else continue to the next sortKey
        }
      }

      return 0;
    });
  }

  any(predicate: any): boolean {
    return super.some(predicate);
  }

  mapBy(key: string): Model[] {
    return Enum.mapBy(this, key);
  }

  objectsAt(indexes: number[]): Model[] {
    return Enum.objectsAt(this, indexes);
  }

  findBy(key: string, value: any): Model | void {
    return Enum.findBy(this, key, value);
  }

  getProperties(keys: string[]): Array<any> {
    return Enum.getProperties(this, keys);
  }

  isAny(key: string, value: any): boolean {
    return Enum.isAny(this, key, value);
  }

  isEvery(key: string, value: any): boolean {
    return Enum.isEvery(this, key, value);
  }
}

function filterInstancesToAddFor(array: HasManyArray, instancesToLookup: Model[], shouldThrow = true) {
  let referenceRelationshipClass = array.metadata.RelationshipClass;
  return instancesToLookup.reduce(
    (result: [Model[], Set<Set<Model>>], instanceToLookup: Model) => {
      let instancesToAdd = result[0];
      if (!(instanceToLookup instanceof Model)) {
        return throwError(shouldThrow, "HasManyArray cannot have non memoria Model instance inside!", result);
      } else if (!referenceRelationshipClass) {
        referenceRelationshipClass = instanceToLookup.constructor as typeof Model;
      } else if (referenceRelationshipClass !== instanceToLookup.constructor) {
        return throwError(
          shouldThrow,
          "HasManyArray cannot be instantiated or added with model types different than one another!",
          result
        );
      }

      let instanceReferences = InstanceDB.getReferences(instanceToLookup) as Set<Model>;
      if (result[1].has(instanceReferences)) {
        let existingInstance = instancesToAdd.find(
          (instance) => InstanceDB.getReferences(instance) === instanceReferences
        ) as Model;
        let instanceReferencesArray = Array.from(instanceReferences);
        if (instanceReferencesArray.indexOf(instanceToLookup) > instanceReferencesArray.indexOf(existingInstance)) {
          instancesToAdd[instancesToAdd.indexOf(existingInstance)] = instanceToLookup;
        }

        return result;
      }

      result[0].push(instanceToLookup as Model);
      result[1].add(instanceReferences as Set<Model>);

      return result as [Model[], Set<Set<Model>>];
    },
    [[] as Model[], new Set()]
  )[0] as Model[];
}

function throwError(shouldThrow: boolean, message: string, result: any) {
  if (shouldThrow) {
    throw new Error(message);
  }

  return result;
}

function isNumber(value: any) {
  return typeof value === "number" && isFinite(value);
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

// type exactInstanceAlreadyInHasManyArray = boolean;
// type instanceGroupAlreadyInHasManyArray = boolean;
// type instanceLookupResultInHasManyArray = [exactInstanceAlreadyInHasManyArray, instanceGroupAlreadyInHasManyArray]; // there is no early return on Array.prototype.reduce
