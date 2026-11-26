/**
 * Direct-chat GET and POST only serve a follower owned by the request user.
 */

import express from "express";
import request from "supertest";

const mockGetAiFollower = jest.fn();
const mockGetDirectChatMessages = jest.fn();
const mockCreateDirectChatMessage = jest.fn();
const mockGenerateAIResponse = jest.fn();

jest.mock("../../storage", () => ({
  storage: {
    getAiFollower: (...args: unknown[]) => mockGetAiFollower(...args),
    getDirectChatMessages: (...args: unknown[]) =>
      mockGetDirectChatMessages(...args),
    createDirectChatMessage: (...args: unknown[]) =>
      mockCreateDirectChatMessage(...args),
  },
}));

jest.mock("../../openai", () => ({
  generateAIResponse: (...args: unknown[]) => mockGenerateAIResponse(...args),
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
}));

import directChatRoutes from "../../routes/directChatRoutes";

describe("direct chat scoped to the follower's owner", () => {
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

  const notFoundBody = {
    message: "AI Follower not found or you don't have permission",
  };

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/direct-chat", directChatRoutes);
  });

  beforeEach(() => {
    mockGetAiFollower.mockReset();
    mockGetDirectChatMessages.mockReset();
    mockCreateDirectChatMessage.mockReset();
    mockGenerateAIResponse.mockReset();
  });

  it("GET returns 404 when the follower is owned by another user and does not read messages", async () => {
    mockGetAiFollower.mockResolvedValue(otherOwnerFollower);

    const response = await request(app).get("/api/direct-chat/11");

    expect(response.status).toBe(404);
    expect(response.body).toEqual(notFoundBody);
    expect(mockGetAiFollower).toHaveBeenCalledWith(11);
    expect(mockGetDirectChatMessages).not.toHaveBeenCalled();
  });

  it("POST returns 404 when the follower is owned by another user and does not create a message or generate a response", async () => {
    mockGetAiFollower.mockResolvedValue(otherOwnerFollower);

    const response = await request(app)
      .post("/api/direct-chat/11")
      .send({ content: "Hello" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual(notFoundBody);
    expect(mockGetAiFollower).toHaveBeenCalledWith(11);
    expect(mockCreateDirectChatMessage).not.toHaveBeenCalled();
    expect(mockGenerateAIResponse).not.toHaveBeenCalled();
    expect(mockGetDirectChatMessages).not.toHaveBeenCalled();
  });

  it("GET returns 200 when the follower is owned by the user", async () => {
    const messages = [
      {
        id: 100,
        userId: 7,
        aiFollowerId: 11,
        content: "Hello",
        isUserMessage: true,
      },
    ];
    mockGetAiFollower.mockResolvedValue(ownedFollower);
    mockGetDirectChatMessages.mockResolvedValue(messages);

    const response = await request(app).get("/api/direct-chat/11");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      follower: ownedFollower,
      messages,
    });
    expect(mockGetDirectChatMessages).toHaveBeenCalledWith(7, 11);
  });

  it("POST returns 201 when the follower is owned by the user", async () => {
    const userContent = "Hello";
    const userMessage = {
      id: 101,
      userId: 7,
      aiFollowerId: 11,
      content: userContent,
      isUserMessage: true,
    };

    mockGetAiFollower.mockResolvedValue(ownedFollower);
    mockCreateDirectChatMessage
      .mockResolvedValueOnce(userMessage)
      .mockResolvedValueOnce({
        id: 102,
        userId: 7,
        aiFollowerId: 11,
        content: "Hi",
        isUserMessage: false,
      });
    mockGetDirectChatMessages.mockResolvedValue([userMessage]);

    let resolveGenerate: () => void = () => {};
    const generateCalled = new Promise<void>((resolve) => {
      resolveGenerate = resolve;
    });
    mockGenerateAIResponse.mockImplementation(async () => {
      resolveGenerate();
      return { type: "reply", content: "Hi", confidence: 0.95 };
    });

    const response = await request(app)
      .post("/api/direct-chat/11")
      .send({ content: userContent });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject(userMessage);
    expect(mockCreateDirectChatMessage).toHaveBeenCalled();

    await generateCalled;
  });
});
