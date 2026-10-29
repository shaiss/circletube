import { config } from 'dotenv';
import { jest } from '@jest/globals';

// Load environment variables for testing
config();

type OpenAIResponse = {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
};

type ChatCompletionArgs = {
  messages: Array<{ content: string }>;
};

// Mock OpenAI for testing
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          // Untyped args: @jest/globals mockImplementation expects UnknownFunction
          create: jest.fn().mockImplementation((args: unknown): Promise<OpenAIResponse> => {
            const { messages } = args as ChatCompletionArgs;
            // Different responses based on the system message content
            const isBackgroundGeneration = messages[0].content.includes('creative AI character developer');

            if (isBackgroundGeneration) {
              return Promise.resolve({
                choices: [{
                  message: {
                    content: JSON.stringify({
                      background: "Test AI background story",
                      interests: ["coding", "testing", "automation"],
                      communication_style: "Professional and direct",
                      interaction_preferences: {
                        likes: ["thoughtful discussions", "technical topics", "helping others"],
                        dislikes: ["spam", "rudeness"]
                      }
                    })
                  }
                }]
              });
            }

            // Default response for regular interactions
            return Promise.resolve({
              choices: [{
                message: {
                  content: JSON.stringify({
                    type: "comment",
                    content: "Test AI response",
                    confidence: 0.95
                  })
                }
              }]
            });
          })
        }
      }
    }))
  };
});

// Mock WebSocket for testing
jest.mock('ws', () => {
  return {
    WebSocketServer: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      clients: new Set(),
      close: jest.fn()
    })),
    WebSocket: jest.fn()
  };
});
