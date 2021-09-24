import NetworkError from "./network/index.js";
import AbortError from "./abort-error.js";
import ConflictError from "./conflict-error.js";
import ForbiddenError from "./network/forbidden-error.js";
import NotFoundError from "./network/not-found-error.js";
import TimeoutError from "./network/timeout-error.js";
import UnauthorizedError from "./network/unauthorized-error.js";
import ServerError from "./server-error.js";

export default {
  NetworkError,
  AbortError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  TimeoutError,
  UnauthorizedError,
  ServerError,
};

export {
  AbortError,
  ConflictError,
  NetworkError,
  ForbiddenError,
  NotFoundError,
  TimeoutError,
  UnauthorizedError,
  ServerError,
};
