import type { Request, Response, NextFunction } from "express";
import { STATUS_CODES } from "http";

type ErrorLike = {
  status?: unknown;
  statusCode?: unknown;
  expose?: unknown;
  message?: unknown;
};

/** Resolve an error's HTTP status, defaulting anything missing or out of range to 500. */
export function errorStatus(err: ErrorLike | null | undefined): number {
  const raw = err?.status ?? err?.statusCode;
  const status = typeof raw === "number" ? raw : Number(raw);
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
}

/**
 * Client-facing message for an error. 5xx responses always use the generic
 * status text. 4xx keep their own message only when the error marks it as
 * client-safe (`expose: true`, as body-parser / http-errors set it).
 */
export function errorMessage(err: ErrorLike | null | undefined, status: number): string {
  if (status < 500 && err?.expose === true && typeof err.message === "string" && err.message) {
    return err.message;
  }
  return STATUS_CODES[status] ?? "Internal Server Error";
}

/** Final Express error handler: log server-side, send a generic body. */
export function apiErrorHandler(err: any, _req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    return next(err);
  }
  const status = errorStatus(err);
  console.error("Error handling request:", err);
  res.status(status).json({ message: errorMessage(err, status) });
}
