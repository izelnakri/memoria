import RuntimeError from "../runtime-error.js";
import type { HTTPOptions } from "@memoria/adapters";

export default class NetworkError extends RuntimeError {
  constructor(httpOptions: HTTPOptions, message?: string) {
    let errorMessage =
      message || `Web request network error for ${httpOptions.method} ${httpOptions.url}`;

    super(errorMessage);

    this.message = errorMessage;
    this.name = "Memoria.NetworkError";
  }
}
