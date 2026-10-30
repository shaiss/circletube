/**
 * Route-level coverage for POST /api/register mass-assignment hardening (#37).
 */

import express from "express";
import request from "supertest";

const mockGetUserByUsername = jest.fn();
const mockCreateUser = jest.fn();
const mockGetUser = jest.fn();

jest.mock("../../storage", () => ({
  storage: {
    getUserByUsername: (...args: unknown[]) => mockGetUserByUsername(...args),
    createUser: (...args: unknown[]) => mockCreateUser(...args),
    getUser: (...args: unknown[]) => mockGetUser(...args),
  },
}));

import { setupAuth } from "../../auth";

describe("POST /api/register mass assignment (#37)", () => {
  let app: express.Express;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.SESSION_SECRET = "unit-test-session-secret";
    app = express();
    app.use(express.json());
    await setupAuth(app);
  });

  beforeEach(() => {
    mockGetUserByUsername.mockReset();
    mockCreateUser.mockReset();
    mockGetUser.mockReset();
  });

  it("rejects privileged and unknown fields in the request body", async () => {
    mockGetUserByUsername.mockResolvedValue(undefined);

    const response = await request(app)
      .post("/api/register")
      .send({
        username: "alice",
        password: "secretpass",
        id: 999,
        createdAt: "1999-01-01T00:00:00.000Z",
        role: "admin",
        isAdmin: true,
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message", "Invalid registration data");
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it("creates from allowlisted fields only and omits password hash from the response", async () => {
    mockGetUserByUsername.mockResolvedValue(undefined);
    mockCreateUser.mockImplementation(async (data: Record<string, unknown>) => ({
      id: 42,
      username: data.username,
      password: data.password,
      avatarUrl: data.avatarUrl ?? null,
      bio: data.bio ?? null,
      createdAt: new Date("2024-06-01T12:00:00.000Z"),
    }));

    const response = await request(app)
      .post("/api/register")
      .send({
        username: "bob",
        password: "secretpass",
        avatarUrl: "https://cdn.example/avatar.png",
        bio: "hello",
      });

    expect(response.status).toBe(201);
    expect(mockCreateUser).toHaveBeenCalledTimes(1);

    const createArg = mockCreateUser.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(createArg).sort()).toEqual(
      ["avatarUrl", "bio", "password", "username"].sort(),
    );
    expect(createArg).toMatchObject({
      username: "bob",
      avatarUrl: "https://cdn.example/avatar.png",
      bio: "hello",
    });
    expect(createArg.password).not.toBe("secretpass");
    expect(createArg).not.toHaveProperty("id");
    expect(createArg).not.toHaveProperty("createdAt");
    expect(createArg).not.toHaveProperty("role");
    expect(createArg).not.toHaveProperty("isAdmin");

    expect(response.body).toMatchObject({
      id: 42,
      username: "bob",
      avatarUrl: "https://cdn.example/avatar.png",
      bio: "hello",
    });
    expect(response.body).not.toHaveProperty("password");
  });
});
