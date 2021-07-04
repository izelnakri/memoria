import { proxyToAdapter } from "./index";

export function Column(keyOrOptions = {}, options?) {
  let optionsObject = typeof keyOrOptions === "string" ? { type: keyOrOptions } : keyOrOptions;
  return proxyToAdapter("Column", { ...optionsObject, ...options });
}

export function CreateDateColumn(options) {
  return proxyToAdapter("CreateDateColumn", options);
}

export function UpdateDateColumn(options) {
  return proxyToAdapter("UpdateDateColumn", options);
}

export function DeleteDateColumn(options) {
  return proxyToAdapter("DeleteDateColumn", options);
}

export function PrimaryColumn(keyOrOptions = {}, options) {
  let optionsObject = typeof keyOrOptions === "string" ? { type: keyOrOptions } : keyOrOptions;
  return Column({ ...optionsObject, ...options, primary: true });
}

export function PrimaryGeneratedColumn(strategy) {
  return proxyToAdapter("PrimaryGeneratedColumn", strategy);
}

export function Generated(generateFunction) {
  return proxyToAdapter("Generated", generateFunction);
}

export function Index(generateFunction) {
  return proxyToAdapter("Index", generateFunction);
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
