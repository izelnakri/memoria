export default class AbortError extends Error {
  constructor(message: string = "Operation aborted") {
    super(message);

    this.message = message;
    this.name = "Memoria.AbortError";
  }
}
