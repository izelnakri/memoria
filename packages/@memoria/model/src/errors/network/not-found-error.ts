import NetworkError from "./index.js";
import type { HTTPOptions, JSObject } from "@memoria/adapters";

export default class NotFoundError extends NetworkError {
  constructor(httpOptions: HTTPOptions | JSObject, message?: string) {
    let errorMessage =
      message || `Server responded with not found for ${httpOptions.method} ${httpOptions.url}`;

    super(httpOptions, errorMessage);

    this.message = errorMessage;
    this.name = "Memoria.NotFoundError";
  }
}
