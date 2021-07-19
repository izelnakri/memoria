export function OneToOne(_modelFunction, _inversionFunction) {}

export function ManyToOne(_modelFunction, _inversionFunction) {}

export function OneToMany(_modelFunction, _inversionFunction) {}

export function ManyToMany(_modelFunction, _inversionFunction) {}

export function JoinColumn(_joinColumnOptions) {}

export function JoinTable(_joinTableOptions) {}

export default {
  OneToOne,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
};
