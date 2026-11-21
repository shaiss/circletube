import { sanitizeUser } from "./sanitizeUser";
import type { User } from "@shared/schema";

describe("sanitizeUser", () => {
  const sampleUser: User = {
    id: 7,
    username: "alice",
    password: "deadbeef.salt",
    avatarUrl: "https://example.com/a.png",
    bio: "hi",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
  };

  test("omits password and keeps public fields", () => {
    const publicUser = sanitizeUser(sampleUser);
    expect(publicUser).toEqual({
      id: 7,
      username: "alice",
      avatarUrl: "https://example.com/a.png",
      bio: "hi",
      createdAt: sampleUser.createdAt,
    });
    expect(publicUser).not.toHaveProperty("password");
  });

  test("returns undefined for missing users", () => {
    expect(sanitizeUser(undefined)).toBeUndefined();
    expect(sanitizeUser(null)).toBeUndefined();
  });
});
