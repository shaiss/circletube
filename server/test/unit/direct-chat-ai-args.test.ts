/**
 * Direct-chat POST must call generateAIResponse with the correct argument
 * order (#44): personality 2nd, chat history 5th, follower 6th.
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

describe("POST /api/direct-chat/:followerId generateAIResponse args (#44)", () => {
  let app: express.Express;

  const follower = {
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
    tools: {
      equipped: [
        {
          id: "calculator",
          name: "Calculator",
          description: "Performs mathematical calculations",
          enabled: true,
        },
      ],
      customInstructions: "Always show your work.",
    },
    parentId: null,
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

  it("passes personality, chat history, and follower in the correct argument positions", async () => {
    const userContent = "What's 2+2?";
    const userMessage = {
      id: 101,
      userId: 7,
      aiFollowerId: 11,
      content: userContent,
      isUserMessage: true,
    };
    const priorAiMessage = {
      id: 100,
      userId: 7,
      aiFollowerId: 11,
      content: "Hey there",
      isUserMessage: false,
    };

    mockGetAiFollower.mockResolvedValue(follower);
    mockCreateDirectChatMessage
      .mockResolvedValueOnce(userMessage)
      .mockResolvedValueOnce({
        id: 102,
        userId: 7,
        aiFollowerId: 11,
        content: "It's 4.",
        isUserMessage: false,
      });
    mockGetDirectChatMessages.mockResolvedValue([priorAiMessage, userMessage]);

    let resolveGenerate: () => void = () => {};
    const generateCalled = new Promise<void>((resolve) => {
      resolveGenerate = resolve;
    });
    mockGenerateAIResponse.mockImplementation(async () => {
      resolveGenerate();
      return { type: "reply", content: "It's 4.", confidence: 0.95 };
    });

    const response = await request(app)
      .post("/api/direct-chat/11")
      .send({ content: userContent });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject(userMessage);

    await generateCalled;

    expect(mockGenerateAIResponse).toHaveBeenCalledTimes(1);
    const args = mockGenerateAIResponse.mock.calls[0];
    expect(args[0]).toBe(userContent);
    expect(args[1]).toBe(follower.personality);
    expect(args[2]).toBeUndefined();
    expect(args[3]).toBeUndefined();
    expect(args[4]).toBe("Ada: Hey there\nUser: What's 2+2?");
    expect(args[5]).toBe(follower);
  });
});
