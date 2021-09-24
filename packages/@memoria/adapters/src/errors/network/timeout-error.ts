import NetworkError from "./index.js";
import type { HTTPOptions } from "../../http.js";

export default class TimeoutError extends NetworkError {
  constructor(httpOptions: HTTPOptions) {
    let message = `Web request timed out for ${httpOptions.method} ${httpOptions.url}`;

    super(httpOptions, message);

    this.message = message;
    this.name = "Memoria.TimeoutError";
  }
}
