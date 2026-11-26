/**
 * Circle details (owner + members) and post author payloads carry public user
 * fields only, even if storage hands back a full users row.
 */

import express from "express";
import request from "supertest";
import { findKeyPaths } from "../helpers/key-paths";

const fullRow = (id: number, username: string) => ({
  id,
  username,
  password: "stored-hash-value.stored-salt",
  avatarUrl: null,
  bio: null,
  createdAt: new Date("2024-06-01T12:00:00.000Z"),
});

const circle = {
  id: 5,
  name: "Friends",
  description: null,
  icon: null,
  color: null,
  isDefault: false,
  visibility: "private",
  userId: 7,
  createdAt: new Date("2024-06-01T12:00:00.000Z"),
};

const post = {
  id: 90,
  userId: 7,
  circleId: 5,
  content: "hello",
  createdAt: new Date("2024-06-02T12:00:00.000Z"),
};

const interactions = [
  { id: 1, postId: 90, userId: 8, aiFollowerId: null, content: "hi", type: "comment", parentId: null },
];

const mockStorage = {
  getCircleWithDetails: jest.fn(async () => ({
    circle,
    owner: fullRow(7, "owner"),
    members: [
      { id: 0, circleId: 5, userId: 7, role: "owner", status: "active", joinedAt: circle.createdAt, username: "owner" },
      { id: 3, circleId: 5, userId: 8, role: "viewer", status: "active", joinedAt: circle.createdAt, username: "member" },
    ],
    followers: [],
    collectives: [],
  })),
  getCirclePosts: jest.fn(async () => [post]),
  getPost: jest.fn(async () => post),
  getCircle: jest.fn(async () => circle),
  getPostInteractions: jest.fn(async () => interactions),
  getUser: jest.fn(async (id: number) => fullRow(id, `user${id}`)),
  getAiFollower: jest.fn(async () => undefined),
  getPostPendingResponses: jest.fn(async () => []),
};

jest.mock("../../storage", () => ({ storage: mockStorage }));

jest.mock("../../response-scheduler", () => ({
  ResponseScheduler: { getInstance: jest.fn(() => ({})) },
}));

jest.mock("../../context-manager", () => ({
  ThreadContextManager: { getInstance: jest.fn(() => ({})) },
}));

jest.mock("../../thread-manager", () => ({
  ThreadManager: { getThreadedInteractions: jest.fn(async () => []) },
}));

jest.mock("../../routes/middleware", () => ({
  requireAuth: (req: { user?: { id: number } }, _res: unknown, next: () => void) => {
    req.user = { id: 7 };
    next();
  },
  hasCirclePermission: jest.fn(async () => true),
}));

import circleRoutes from "../../routes/circleRoutes";
import postRoutes from "../../routes/postRoutes";

describe("circle and post payloads contain public user fields only", () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/circles", circleRoutes);
    app.use("/api/posts", postRoutes);
  });

  it("GET /api/circles/:id/details (owner and members)", async () => {
    const res = await request(app).get("/api/circles/5/details");

    expect(res.status).toBe(200);
    expect(res.body.owner).toMatchObject({ id: 7, username: "owner" });
    expect(res.body.members).toHaveLength(2);
    expect(findKeyPaths(res.body, "password")).toEqual([]);
  });

  it("GET /api/circles/:id/posts (interaction authors)", async () => {
    const res = await request(app).get("/api/circles/5/posts");

    expect(res.status).toBe(200);
    expect(res.body[0].interactions[0].author).toMatchObject({ id: 8, username: "user8" });
    expect(findKeyPaths(res.body, "password")).toEqual([]);
  });

  it("GET /api/posts/:id (interaction authors)", async () => {
    const res = await request(app).get("/api/posts/90");

    expect(res.status).toBe(200);
    expect(res.body.interactions[0].author).toMatchObject({ id: 8, username: "user8" });
    expect(findKeyPaths(res.body, "password")).toEqual([]);
  });
});
