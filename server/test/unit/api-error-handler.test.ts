/**
 * The final error handler sends generic text for 5xx errors and only passes
 * through 4xx messages that are marked client-safe.
 */

import express from "express";
import request from "supertest";
import { apiErrorHandler } from "../../errorHandler";

function appThrowing(err: unknown) {
  const app = express();
  app.use(express.json());
  app.get("/boom", (_req, _res, next) => next(err));
  app.post("/json", (_req, res) => res.json({ ok: true }));
  app.use(apiErrorHandler);
  return app;
}

describe("apiErrorHandler", () => {
  let errorSpy: jest.SpyInstance;
  beforeEach(() => {
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => errorSpy.mockRestore());

  it("returns generic text for an error without a status", async () => {
    const res = await request(appThrowing(new Error('relation "users" does not exist'))).get("/boom");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: "Internal Server Error" });
  });

  it("returns generic text for 5xx even when the error is marked client-safe", async () => {
    const err = Object.assign(new Error("connect ECONNREFUSED 10.0.0.5:5432"), { status: 503, expose: true });
    const res = await request(appThrowing(err)).get("/boom");
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ message: "Service Unavailable" });
  });

  it("keeps a client-safe 4xx message", async () => {
    const err = Object.assign(new Error("Payload too large for this route"), { status: 413, expose: true });
    const res = await request(appThrowing(err)).get("/boom");
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ message: "Payload too large for this route" });
  });

  it("uses generic text for a 4xx that is not marked client-safe", async () => {
    const err = Object.assign(new Error("internal detail"), { statusCode: 409 });
    const res = await request(appThrowing(err)).get("/boom");
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ message: "Conflict" });
  });

  it("treats an out-of-range status as 500", async () => {
    const err = Object.assign(new Error("odd"), { status: 302 });
    const res = await request(appThrowing(err)).get("/boom");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: "Internal Server Error" });
  });

  it("passes body-parser's 400 through", async () => {
    const res = await request(appThrowing(null))
      .post("/json")
      .set("Content-Type", "application/json")
      .send("{not json");
    expect(res.status).toBe(400);
    expect(typeof res.body.message).toBe("string");
  });
});
