import type { User } from "@shared/schema";

/** Public user fields safe to include in API responses (no password / secrets). */
export type PublicUser = Omit<User, "password">;

/**
 * Strip secret columns from a users row before sending it in JSON.
 * Returns undefined when the input is missing so callers can pass getUser results through.
 */
export function sanitizeUser(user: User): PublicUser;
export function sanitizeUser(user: User | undefined | null): PublicUser | undefined;
export function sanitizeUser(user: User | undefined | null): PublicUser | undefined {
  if (!user) return undefined;
  const { password: _password, ...publicUser } = user;
  return publicUser;
}
