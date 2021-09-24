import NetworkError from "./network-error.js";
import type { HTTPOptions } from "../../http.js";

export default class NotFoundError extends NetworkError {
  constructor(httpOptions: HTTPOptions) {
    let message = `Server responded with not found for ${httpOptions.method} ${httpOptions.url}`;

    super(httpOptions, message);

    this.message = message;
    this.name = "Memoria.NotFoundError";
  }
}
