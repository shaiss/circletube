/**
 * Auth and profile responses carry public user fields only.
 * Storage mocks deliberately return full rows (including `password`) to show
 * the route-level sanitizeUser layer still removes it.
 */

import express from "express";
import request from "supertest";
import { scryptSync } from "crypto";
import { findKeyPaths } from "../helpers/key-paths";

const STORED_HASH = (() => {
  const salt = "0123456789abcdef0123456789abcdef";
  return `${scryptSync("correct-horse", salt, 64).toString("hex")}.${salt}`;
})();

const fullRow = (overrides: Record<string, unknown> = {}) => ({
  id: 42,
  username: "bob",
  password: STORED_HASH,
  avatarUrl: "https://cdn.example/bob.png",
  bio: "hello",
  createdAt: new Date("2024-06-01T12:00:00.000Z"),
  ...overrides,
});

const mockGetUserByUsername = jest.fn();
const mockGetUserCredentials = jest.fn();
const mockCreateUser = jest.fn();
const mockGetUser = jest.fn();
const mockUpdateUser = jest.fn();

jest.mock("../../storage", () => ({
  storage: {
    getUserByUsername: (...args: unknown[]) => mockGetUserByUsername(...args),
    getUserCredentials: (...args: unknown[]) => mockGetUserCredentials(...args),
    createUser: (...args: unknown[]) => mockCreateUser(...args),
    getUser: (...args: unknown[]) => mockGetUser(...args),
    updateUser: (...args: unknown[]) => mockUpdateUser(...args),
  },
}));

import { setupAuth } from "../../auth";
import userRoutes from "../../routes/userRoutes";

describe("auth and profile responses contain public user fields only", () => {
  let app: express.Express;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.SESSION_SECRET = "unit-test-session-secret";
    app = express();
    app.use(express.json());
    await setupAuth(app);
    app.use("/api/user", userRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserByUsername.mockResolvedValue(undefined);
    mockGetUserCredentials.mockResolvedValue({ id: 42, password: STORED_HASH });
    mockCreateUser.mockImplementation(async (data: Record<string, unknown>) =>
      fullRow({ username: data.username, password: data.password }),
    );
    mockGetUser.mockResolvedValue(fullRow());
    mockUpdateUser.mockImplementation(async (_id: number, updates: Record<string, unknown>) =>
      fullRow(updates),
    );
  });

  it("POST /api/register", async () => {
    const res = await request(app)
      .post("/api/register")
      .send({ username: "bob", password: "correct-horse" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 42, username: "bob" });
    expect(findKeyPaths(res.body, "password")).toEqual([]);
  });

  it("POST /api/login reads the hash via getUserCredentials only", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({ username: "bob", password: "correct-horse" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 42, username: "bob" });
    expect(findKeyPaths(res.body, "password")).toEqual([]);
    expect(mockGetUserCredentials).toHaveBeenCalledWith("bob");
    expect(mockGetUserByUsername).not.toHaveBeenCalled();
  });

  it("POST /api/login rejects a wrong password", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({ username: "bob", password: "wrong" });

    expect(res.status).toBe(401);
    expect(findKeyPaths(res.body, "password")).toEqual([]);
  });

  it("GET /api/user and PATCH /api/user/profile for a signed-in session", async () => {
    const agent = request.agent(app);
    const login = await agent
      .post("/api/login")
      .send({ username: "bob", password: "correct-horse" });
    expect(login.status).toBe(200);

    const me = await agent.get("/api/user");
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ id: 42, username: "bob" });
    expect(findKeyPaths(me.body, "password")).toEqual([]);

    const profile = await agent.patch("/api/user/profile").send({ bio: "updated" });
    expect(profile.status).toBe(200);
    expect(profile.body).toMatchObject({ id: 42, bio: "updated" });
    expect(findKeyPaths(profile.body, "password")).toEqual([]);
    expect(mockUpdateUser).toHaveBeenCalledWith(42, { bio: "updated" });
  });

  it("GET /api/user without a session is 401", async () => {
    const res = await request(app).get("/api/user");
    expect(res.status).toBe(401);
  });
});
