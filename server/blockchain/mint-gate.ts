import type { Request, Response, NextFunction } from "express";

/**
 * NFT routes are off unless NFT_MINT_ENABLED is exactly "true" AND a signing
 * key (ETH_PRIVATE_KEY) is configured. Anything else (unset, "1", "TRUE",
 * empty key) keeps them off.
 */
export function isNftMintEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NFT_MINT_ENABLED === "true" && Boolean(env.ETH_PRIVATE_KEY?.trim());
}

/** Responds 404 when the NFT feature is off, so the routes look absent. */
export function requireNftMintEnabled(_req: Request, res: Response, next: NextFunction) {
  if (!isNftMintEnabled()) {
    return res.status(404).json({ error: "Not found" });
  }
  next();
}

export const MINT_LIMIT_PER_WINDOW = 5;
export const MINT_WINDOW_MS = 10 * 60 * 1000;

const mintAttempts = new Map<number, number[]>();

/**
 * Small in-memory, per-user limiter for mint requests
 * (MINT_LIMIT_PER_WINDOW requests per MINT_WINDOW_MS). Must run after requireAuth.
 */
export function mintRateLimit(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id;
  if (userId == null) {
    return res.sendStatus(401);
  }

  const now = Date.now();
  const recent = (mintAttempts.get(userId) ?? []).filter((t) => now - t < MINT_WINDOW_MS);
  if (recent.length >= MINT_LIMIT_PER_WINDOW) {
    mintAttempts.set(userId, recent);
    res.setHeader("Retry-After", String(Math.ceil((MINT_WINDOW_MS - (now - recent[0])) / 1000)));
    return res.status(429).json({ error: "Too many mint requests, try again later" });
  }

  recent.push(now);
  mintAttempts.set(userId, recent);
  next();
}

/** Test helper: clear limiter state. */
export function resetMintRateLimit() {
  mintAttempts.clear();
}
