/**
 * Prompt-building coverage for generateAIResponse (#44): previousMessages
 * must appear in the system prompt even when threadContext is omitted.
 * The OpenAI client is mocked; generateAIResponse itself is not.
 */

const mockCreate = jest.fn();

jest.mock("openai", () => {
  if (!process.env.OPENAI_API_KEY) {
    process.env.OPENAI_API_KEY = "sk-test-dummy-key-not-real";
  }
  const MockOpenAI = jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: (...args: unknown[]) => mockCreate(...args),
      },
    },
  }));
  return { __esModule: true, default: MockOpenAI };
});

import { generateAIResponse } from "../../openai";
import type { ThreadContextData } from "../../context-manager";

const personality = "witty and curious";
const postContent = "What's 2+2?";
const history = "Ada: Hey there\nUser: What's 2+2?";

const follower = {
  id: 11,
  userId: 7,
  name: "Ada",
  personality,
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

function stubCompletion() {
  mockCreate.mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            type: "comment",
            content: "It's 4.",
            confidence: 0.9,
          }),
        },
      },
    ],
  });
}

function lastCreateArg(): {
  messages: Array<{ role: string; content: string }>;
} {
  expect(mockCreate).toHaveBeenCalled();
  return mockCreate.mock.calls[0][0] as {
    messages: Array<{ role: string; content: string }>;
  };
}

function systemContent(): string {
  const system = lastCreateArg().messages.find((m) => m.role === "system");
  expect(system?.content).toEqual(expect.any(String));
  return system!.content;
}

describe("generateAIResponse conversation history (#44)", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    stubCompletion();
  });

  it("includes previousMessages and personality when threadContext is omitted", async () => {
    await generateAIResponse(
      postContent,
      personality,
      undefined,
      undefined,
      history,
      follower,
    );

    const system = systemContent();
    expect(system).toContain(`personality: "${personality}"`);
    expect(system).toContain("Recent conversation history:");
    expect(system).toContain(history);
    expect(system).toContain(`Current message to respond to: "${postContent}"`);
    expect(system).not.toContain("Starting a new conversation");

    const user = lastCreateArg().messages.find((m) => m.role === "user");
    expect(user?.content).toBe(postContent);
  });

  it("still uses previousMessages over depth-aware threadContext when both are set", async () => {
    const threadContext: ThreadContextData = {
      immediateContext: "DEPTH_IMMEDIATE_CONTEXT",
      parentMessage: "DEPTH_PARENT_MESSAGE",
      threadTopic: "DEPTH_THREAD_TOPIC",
      threadDepth: 2,
    };

    await generateAIResponse(
      postContent,
      personality,
      "Hello there!",
      threadContext,
      history,
      follower,
    );

    const system = systemContent();
    expect(system).toContain(`personality: "${personality}"`);
    expect(system).toContain("Recent conversation history:");
    expect(system).toContain(history);
    expect(system).toContain(`Current message to respond to: "${postContent}"`);
    expect(system).not.toContain("Starting a new conversation");
    expect(system).not.toContain("DEPTH_IMMEDIATE_CONTEXT");
    expect(system).not.toContain("DEPTH_PARENT_MESSAGE");
    expect(system).not.toContain("DEPTH_THREAD_TOPIC");
  });
});
