import { ErrorCode } from "./types";

export class ApiError extends Error {
  status: number;
  code?: ErrorCode;

  constructor(message: string, status: number, code?: ErrorCode) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

export function getErrorCode(error: unknown) {
  return error instanceof ApiError ? error.code : undefined;
}

export function getErrorStatus(error: unknown) {
  return error instanceof ApiError ? error.status : undefined;
}
