import { proxyToAdapter } from "./index";

export function OneToOne(modelFunction, inversionFunction) {
  return proxyToAdapter("OneToOne", modelFunction, inversionFunction);
}

export function ManyToOne(modelFunction, inversionFunction) {
  return proxyToAdapter("ManyToOne", modelFunction, inversionFunction);
}

export function OneToMany(modelFunction, inversionFunction) {
  return proxyToAdapter("OneToMany", modelFunction, inversionFunction);
}

export function ManyToMany(modelFunction, inversionFunction) {
  return proxyToAdapter("ManyToMany", modelFunction, inversionFunction);
}

export function JoinColumn(joinColumnOptions) {
  return proxyToAdapter("JoinColumn", joinColumnOptions);
}

export function JoinTable(joinTableOptions) {
  return proxyToAdapter("JoinTable", joinTableOptions);
}

export default {
  OneToOne,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
};
// NOTE: not done: RelationId
