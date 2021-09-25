import NetworkError from "./index.js";
import type { HTTPOptions } from "@memoria/adapters";

export default class NotFoundError extends NetworkError {
  constructor(httpOptions: HTTPOptions) {
    let message = `Server responded with not found for ${httpOptions.method} ${httpOptions.url}`;

    super(httpOptions, message);

    this.message = message;
    this.name = "Memoria.NotFoundError";
  }
}
