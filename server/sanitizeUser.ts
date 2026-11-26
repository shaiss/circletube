import type { User } from "@shared/schema";

/**
 * Public user fields safe to include in API responses.
 * `password?: never` makes assigning a full users row to PublicUser a type error.
 */
export type PublicUser = Omit<User, "password"> & { password?: never };

/** Field names that make up a PublicUser. */
export const PUBLIC_USER_FIELDS = ["id", "username", "avatarUrl", "bio", "createdAt"] as const;

// Compile-time guard: a full users row is not assignable to PublicUser.
type RawRowIsNotPublic = User extends PublicUser ? false : true;
const rawRowIsNotPublic: RawRowIsNotPublic = true;
void rawRowIsNotPublic;

type UserLike = Omit<User, "password"> & { password?: unknown };

/**
 * Build a PublicUser from a users row (or an already-public user).
 * Copies an explicit allowlist of fields, so the password column and any
 * column added later are never carried into a response.
 * Returns undefined when the input is missing so callers can pass getUser results through.
 */
export function sanitizeUser(user: UserLike): PublicUser;
export function sanitizeUser(user: UserLike | undefined | null): PublicUser | undefined;
export function sanitizeUser(user: UserLike | undefined | null): PublicUser | undefined {
  if (!user) return undefined;
  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl ?? null,
    bio: user.bio ?? null,
    createdAt: user.createdAt ?? null,
  };
}
