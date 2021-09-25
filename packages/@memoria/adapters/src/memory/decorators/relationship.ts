export function OneToOne(_modelFunction, _inversionFunction) {
  return () => {};
}

export function ManyToOne(_modelFunction, _inversionFunction) {
  return () => {};
}

export function OneToMany(_modelFunction, _inversionFunction) {
  return () => {};
}

export function ManyToMany(_modelFunction, _inversionFunction) {
  return () => {};
}

export function JoinColumn(_joinColumnOptions) {
  return () => {};
}

export function JoinTable(_joinTableOptions) {
  return () => {};
}

export default {
  OneToOne,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
};
