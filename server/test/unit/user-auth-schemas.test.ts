/**
 * Schema-level coverage: login insertUserSchema must stay uncapped like main,
 * while registerUserSchema enforces registration allowlist + length limits (#37).
 */

import { insertUserSchema, registerUserSchema } from "@shared/schema";

describe("insertUserSchema (login / shared credentials)", () => {
  it("accepts a long password so existing users can still log in via the UI", () => {
    const result = insertUserSchema.safeParse({
      username: "legacy-user",
      password: "p".repeat(200),
    });
    expect(result.success).toBe(true);
  });

  it("accepts a long username", () => {
    const result = insertUserSchema.safeParse({
      username: "u".repeat(100),
      password: "secret",
    });
    expect(result.success).toBe(true);
  });

  it("does not require avatarUrl or bio", () => {
    const result = insertUserSchema.safeParse({
      username: "alice",
      password: "secret",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ username: "alice", password: "secret" });
    }
  });
});

describe("registerUserSchema (POST /api/register)", () => {
  it("rejects usernames longer than 64 characters", () => {
    const result = registerUserSchema.safeParse({
      username: "u".repeat(65),
      password: "secretpass",
    });
    expect(result.success).toBe(false);
  });

  it("rejects passwords longer than 128 characters", () => {
    const result = registerUserSchema.safeParse({
      username: "bob",
      password: "p".repeat(129),
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown and privileged keys", () => {
    const result = registerUserSchema.safeParse({
      username: "carol",
      password: "secretpass",
      id: 999,
      role: "admin",
      isAdmin: true,
    });
    expect(result.success).toBe(false);
  });

  it("accepts allowlisted fields within length limits", () => {
    const result = registerUserSchema.safeParse({
      username: "dave",
      password: "secretpass",
      avatarUrl: "https://cdn.example/a.png",
      bio: "hi",
    });
    expect(result.success).toBe(true);
  });
});
