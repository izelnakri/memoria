import NetworkError from "./network-error.js";
import type { HTTPOptions } from "../../http.js";

export default class UnauthorizedError extends NetworkError {
  constructor(httpOptions: HTTPOptions) {
    let message = `Server responds with unauthorized access to ${httpOptions.method} ${httpOptions.url}`;

    super(httpOptions, message);

    this.message = message;
    this.name = "Memoria.UnauthorizedError";
  }
}
