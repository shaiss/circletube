import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Logs one line per /api request: method, path, status and duration.
 * Request/response bodies, query strings and headers (Authorization, Cookie,
 * Sec-WebSocket-Protocol, ...) are intentionally never included.
 */
export function formatApiLogLine(method: string, path: string, status: number, durationMs: number): string {
  return `${method} ${path} ${status} in ${durationMs}ms`;
}

export function apiRequestLogger(log: (message: string) => void): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const path = req.path;

    res.on("finish", () => {
      if (path.startsWith("/api")) {
        log(formatApiLogLine(req.method, path, res.statusCode, Date.now() - start));
      }
    });

    next();
  };
}
