/**
 * Issue #53: the mint limiter must not keep an entry forever for every user
 * who ever called the mint route.
 */
import type { Request, Response, NextFunction } from "express";
import {
  mintRateLimit,
  pruneMintAttempts,
  resetMintRateLimit,
  mintAttemptUserCount,
  MINT_WINDOW_MS,
  MINT_LIMIT_PER_WINDOW,
} from "../../blockchain/mint-gate";

function call(userId: number) {
  const req = { user: { id: userId } } as unknown as Request;
  const res = {
    statusCode: 200,
    setHeader: jest.fn(),
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json: jest.fn(),
    sendStatus: jest.fn(),
  } as unknown as Response & { statusCode: number };
  const next: NextFunction = jest.fn();
  mintRateLimit(req, res, next);
  return { res, next: next as jest.Mock };
}

describe("mint rate limiter pruning (#53)", () => {
  const start = 1_800_000_000_000;
  let now = start;

  beforeEach(() => {
    now = start;
    jest.spyOn(Date, "now").mockImplementation(() => now);
    resetMintRateLimit();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("drops idle users once a window has passed", () => {
    for (let id = 1; id <= 50; id++) call(id);
    expect(mintAttemptUserCount()).toBe(50);

    now = start + MINT_WINDOW_MS + 1;
    call(999);
    expect(mintAttemptUserCount()).toBe(1);
  });

  it("keeps users with an attempt inside the window", () => {
    call(1);
    now = start + MINT_WINDOW_MS - 1000;
    call(2);
    expect(pruneMintAttempts(start + MINT_WINDOW_MS + 1)).toBe(1);
    expect(mintAttemptUserCount()).toBe(1);
  });

  it("keeps a user whose newest attempt is not the last entry (clock stepped back)", () => {
    now = start + MINT_WINDOW_MS - 1;
    for (let i = 0; i < MINT_LIMIT_PER_WINDOW - 1; i++) call(5);
    now = start; // clock steps back; this attempt is appended last but is the oldest
    call(5);
    expect(pruneMintAttempts(start + MINT_WINDOW_MS + 1)).toBe(0);
    expect(mintAttemptUserCount()).toBe(1);
  });

  it("still enforces the limit for an active user across a sweep", () => {
    for (let i = 0; i < MINT_LIMIT_PER_WINDOW; i++) {
      expect(call(7).next).toHaveBeenCalled();
    }
    pruneMintAttempts(now + 1);
    const { res, next } = call(7);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(429);
  });

  it("sweeps from the middleware at most once per window", () => {
    const W = MINT_WINDOW_MS;

    now = start;
    call(1); // first request sweeps (nothing to drop); next sweep is due at start + W
    now = start + W / 2;
    call(2);
    expect(mintAttemptUserCount()).toBe(2);

    now = start + W + W / 4; // a full window since the last sweep: sweep runs
    call(3); // user 1 is idle and dropped; user 2 is still inside its window
    expect(mintAttemptUserCount()).toBe(2);

    now = start + W + W / 2 + 1; // user 2 is idle now, but the next sweep is not due
    call(4);
    expect(mintAttemptUserCount()).toBe(3);

    now = start + 2 * W + W / 4; // a full window since the last sweep: sweep runs
    call(5); // users 2 and 3 are idle and dropped; user 4 is kept
    expect(mintAttemptUserCount()).toBe(2);
  });
});
