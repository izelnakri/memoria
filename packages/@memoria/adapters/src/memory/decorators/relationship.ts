export function OneToOne(modelFunction, inversionFunction) {}

export function ManyToOne(modelFunction, inversionFunction) {}

export function OneToMany(modelFunction, inversionFunction) {}

export function ManyToMany(modelFunction, inversionFunction) {}

export function JoinColumn(joinColumnOptions) {}

export function JoinTable(joinTableOptions) {}

export default {
  OneToOne,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
};
