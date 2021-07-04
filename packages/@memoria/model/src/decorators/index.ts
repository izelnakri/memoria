import {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Generated,
} from "./column";

// something(options) {
//   return function (target, propertyKey, descriptor) {
//   }
// }

export function proxyToAdapter(decoratorName, options) {
  return function (target, propertyKey, descriptor) {
    console.log("descriptor is");
    console.log(descriptor);
    return target.constructor.Adapter.Decorators[decoratorName](
      target.constructor,
      propertyKey,
      options,
      descriptor
    );
  };
}

export default {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Generated,
};

export {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Generated,
};
