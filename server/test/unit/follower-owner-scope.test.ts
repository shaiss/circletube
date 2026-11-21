/**
 * Follower reads are scoped to the follower's owner.
 * POST /api/posts/test-pending-response is not mounted.
 */

import express from "express";
import request from "supertest";

const mockGetAiFollower = jest.fn();
const mockGetUser = jest.fn();
const mockGetPost = jest.fn();
const mockCreatePendingResponse = jest.fn();
const mockHasCirclePermission = jest.fn();

jest.mock("../../storage", () => ({
  storage: {
    getAiFollower: (...args: unknown[]) => mockGetAiFollower(...args),
    getUser: (...args: unknown[]) => mockGetUser(...args),
    getPost: (...args: unknown[]) => mockGetPost(...args),
    createPendingResponse: (...args: unknown[]) =>
      mockCreatePendingResponse(...args),
  },
}));

jest.mock("../../openai", () => ({
  generateAIBackground: jest.fn(),
  generateAIResponse: jest.fn(),
}));

jest.mock("../../clone-service", () => ({
  cloneFollowers: jest.fn(),
}));

jest.mock("../../response-scheduler", () => ({
  ResponseScheduler: {
    getInstance: jest.fn(),
  },
}));

jest.mock("../../context-manager", () => ({
  ThreadContextManager: {
    getInstance: jest.fn(() => ({})),
  },
}));

jest.mock("../../thread-manager", () => ({
  ThreadManager: {},
}));

jest.mock("../../routes/middleware", () => ({
  requireAuth: (
    req: { user?: { id: number } },
    _res: unknown,
    next: () => void,
  ) => {
    req.user = { id: 7 };
    next();
  },
  hasCirclePermission: (...args: unknown[]) =>
    mockHasCirclePermission(...args),
}));

import followerRoutes from "../../routes/followerRoutes";
import postRoutes from "../../routes/postRoutes";

describe("GET /api/followers/:id scoped to the follower's owner", () => {
  let app: express.Express;

  const ownedFollower = {
    id: 11,
    userId: 7,
    name: "Ada",
    personality: "witty and curious",
    avatarUrl: "https://cdn.example/ada.png",
    background: null,
    interests: null,
    communicationStyle: null,
    interactionPreferences: null,
    active: true,
    responsiveness: "active" as const,
    responseDelay: { min: 1, max: 60 },
    responseChance: 80,
    tools: null,
    parentId: null,
  };

  const otherOwnerFollower = {
    ...ownedFollower,
    userId: 8,
    name: "Bea",
  };

  const unownedFollower = {
    ...ownedFollower,
    userId: null,
    name: "Cora",
  };

  const ownerUser = {
    id: 7,
    username: "owner",
    avatarUrl: "https://cdn.example/owner.png",
  };

  const notFoundBody = {
    message: "AI Follower not found or you don't have permission",
  };

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/followers", followerRoutes);
  });

  beforeEach(() => {
    mockGetAiFollower.mockReset();
    mockGetUser.mockReset();
    mockGetPost.mockReset();
    mockCreatePendingResponse.mockReset();
    mockHasCirclePermission.mockReset();
  });

  it("returns 200 and the full record when the follower is owned by the user", async () => {
    mockGetAiFollower.mockResolvedValue(ownedFollower);
    mockGetUser.mockResolvedValue(ownerUser);

    const response = await request(app).get("/api/followers/11");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ...ownedFollower,
      creator: {
        id: ownerUser.id,
        username: ownerUser.username,
        displayName: ownerUser.username,
        avatarUrl: ownerUser.avatarUrl,
      },
    });
    expect(mockGetAiFollower).toHaveBeenCalledWith(11);
    expect(mockGetUser).toHaveBeenCalledWith(7);
  });

  it("returns 404 when the follower is owned by another user and does not read the creator", async () => {
    mockGetAiFollower.mockResolvedValue(otherOwnerFollower);

    const response = await request(app).get("/api/followers/11");

    expect(response.status).toBe(404);
    expect(response.body).toEqual(notFoundBody);
    expect(mockGetAiFollower).toHaveBeenCalledWith(11);
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("returns 404 when the follower is missing and does not read the creator", async () => {
    mockGetAiFollower.mockResolvedValue(undefined);

    const response = await request(app).get("/api/followers/11");

    expect(response.status).toBe(404);
    expect(response.body).toEqual(notFoundBody);
    expect(mockGetAiFollower).toHaveBeenCalledWith(11);
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("returns 404 when the follower has a null userId and does not read the creator", async () => {
    mockGetAiFollower.mockResolvedValue(unownedFollower);

    const response = await request(app).get("/api/followers/11");

    expect(response.status).toBe(404);
    expect(response.body).toEqual(notFoundBody);
    expect(mockGetAiFollower).toHaveBeenCalledWith(11);
    expect(mockGetUser).not.toHaveBeenCalled();
  });
});

describe("POST /api/posts/test-pending-response no longer exists", () => {
  let app: express.Express;
  const originalNodeEnv = process.env.NODE_ENV;

  const ownedFollower = {
    id: 11,
    userId: 7,
    name: "Ada",
  };

  const post = {
    id: 21,
    userId: 7,
    circleId: 3,
    content: "Hello circle",
  };

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/posts", postRoutes);
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  beforeEach(() => {
    mockGetAiFollower.mockReset();
    mockGetUser.mockReset();
    mockGetPost.mockReset();
    mockCreatePendingResponse.mockReset();
    mockHasCirclePermission.mockReset();

    mockGetAiFollower.mockResolvedValue(ownedFollower);
    mockGetPost.mockResolvedValue(post);
    mockHasCirclePermission.mockResolvedValue(true);
    mockCreatePendingResponse.mockResolvedValue({
      id: 31,
      postId: 21,
      aiFollowerId: 11,
      processed: false,
    });
  });

  async function assertRouteIsAbsent() {
    const response = await request(app)
      .post("/api/posts/test-pending-response")
      .send({ postId: 21, followerId: 11, delayMinutes: 5 });

    expect(response.status).toBe(404);
    expect(mockGetPost).not.toHaveBeenCalled();
    expect(mockCreatePendingResponse).not.toHaveBeenCalled();
  }

  it("returns 404 and does not write when NODE_ENV is production", async () => {
    process.env.NODE_ENV = "production";
    await assertRouteIsAbsent();
  });

  it("returns 404 and does not write when NODE_ENV is unset", async () => {
    delete process.env.NODE_ENV;
    await assertRouteIsAbsent();
  });
});
