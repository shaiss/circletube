/**
 * NFT routes: feature flag + signing key gate (404 when off), sign-in (401),
 * follower ownership (403), and the per-user mint limit (429).
 */

import express from "express";
import request from "supertest";

const mockGetAiFollower = jest.fn();
const mockMint = jest.fn();
const mockStatus = jest.fn();
const mockMetadata = jest.fn();

jest.mock("../../storage", () => ({
  storage: {
    getAiFollower: (...args: unknown[]) => mockGetAiFollower(...args),
  },
}));

jest.mock("../../blockchain/nft-service", () => ({
  mintAIFollowerNFT: (...args: unknown[]) => mockMint(...args),
  getAIFollowerMintingStatus: (...args: unknown[]) => mockStatus(...args),
  generateMetadata: (...args: unknown[]) => mockMetadata(...args),
}));

jest.mock("../../routes/middleware", () => ({
  requireAuth: (
    req: { isAuthenticated?: () => boolean },
    res: { sendStatus: (code: number) => void },
    next: () => void,
  ) => {
    if (!req.isAuthenticated?.()) return res.sendStatus(401);
    next();
  },
}));

import nftRoutes from "../../blockchain/routes";
import { isNftMintEnabled, resetMintRateLimit, MINT_LIMIT_PER_WINDOW } from "../../blockchain/mint-gate";

const OWNER_ID = 7;
const OTHER_ID = 8;
const ADDRESS = "0x" + "a".repeat(40);

const follower = (id: number, userId: number | null) => ({
  id,
  userId,
  name: `Follower ${id}`,
  personality: "curious",
  avatarUrl: "https://cdn.example/f.png",
});

function buildApp(userId?: number) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const r = req as unknown as { user?: { id: number }; isAuthenticated: () => boolean };
    if (userId != null) r.user = { id: userId };
    r.isAuthenticated = () => userId != null;
    next();
  });
  app.use("/api/nft", nftRoutes);
  return app;
}

const routes: Array<{ name: string; send: (app: express.Express, followerId: number) => request.Test }> = [
  { name: "POST mint", send: (app, id) => request(app).post(`/api/nft/mint/${id}`).send({ ownerAddress: ADDRESS }) },
  { name: "GET metadata", send: (app, id) => request(app).get(`/api/nft/metadata/${id}`) },
  { name: "GET status", send: (app, id) => request(app).get(`/api/nft/status/${id}`) },
];

describe("NFT routes gate", () => {
  const savedEnv = { ...process.env };

  const turnOn = () => {
    process.env.NFT_MINT_ENABLED = "true";
    process.env.ETH_PRIVATE_KEY = "test-signing-key-placeholder";
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetMintRateLimit();
    delete process.env.NFT_MINT_ENABLED;
    delete process.env.ETH_PRIVATE_KEY;
    mockGetAiFollower.mockImplementation(async (id: number) => {
      if (id === 1) return follower(1, OWNER_ID);
      if (id === 2) return follower(2, null);
      return undefined;
    });
    mockStatus.mockResolvedValue({ status: "NOT_MINTED" });
    mockMint.mockResolvedValue({ status: "PENDING" });
    mockMetadata.mockReturnValue({ metadata: { name: "Follower 1" } });
  });

  afterAll(() => {
    process.env = savedEnv;
  });

  describe("isNftMintEnabled", () => {
    it("requires the flag to be exactly 'true' and a signing key", () => {
      expect(isNftMintEnabled({})).toBe(false);
      expect(isNftMintEnabled({ NFT_MINT_ENABLED: "true" })).toBe(false);
      expect(isNftMintEnabled({ NFT_MINT_ENABLED: "true", ETH_PRIVATE_KEY: "  " })).toBe(false);
      expect(isNftMintEnabled({ NFT_MINT_ENABLED: "TRUE", ETH_PRIVATE_KEY: "k" })).toBe(false);
      expect(isNftMintEnabled({ NFT_MINT_ENABLED: "1", ETH_PRIVATE_KEY: "k" })).toBe(false);
      expect(isNftMintEnabled({ ETH_PRIVATE_KEY: "k" })).toBe(false);
      expect(isNftMintEnabled({ NFT_MINT_ENABLED: "true", ETH_PRIVATE_KEY: "k" })).toBe(true);
    });
  });

  describe.each(routes)("$name", ({ send }) => {
    it("is 404 when the flag is unset", async () => {
      process.env.ETH_PRIVATE_KEY = "test-signing-key-placeholder";
      expect((await send(buildApp(OWNER_ID), 1)).status).toBe(404);
      expect((await send(buildApp(), 1)).status).toBe(404);
    });

    it("is 404 when the flag is not exactly 'true'", async () => {
      process.env.NFT_MINT_ENABLED = "yes";
      process.env.ETH_PRIVATE_KEY = "test-signing-key-placeholder";
      expect((await send(buildApp(OWNER_ID), 1)).status).toBe(404);
    });

    it("is 404 when the signing key is missing", async () => {
      process.env.NFT_MINT_ENABLED = "true";
      expect((await send(buildApp(OWNER_ID), 1)).status).toBe(404);
    });

    it("is 401 without a signed-in user", async () => {
      turnOn();
      expect((await send(buildApp(), 1)).status).toBe(401);
    });

    it("is 403 for a user who does not own the follower", async () => {
      turnOn();
      expect((await send(buildApp(OTHER_ID), 1)).status).toBe(403);
    });

    it("is 403 for a follower with no owner", async () => {
      turnOn();
      expect((await send(buildApp(OWNER_ID), 2)).status).toBe(403);
    });

    it("is 200 for the owner", async () => {
      turnOn();
      expect((await send(buildApp(OWNER_ID), 1)).status).toBe(200);
    });
  });

  it("never calls the mint service when the request is refused", async () => {
    await routes[0].send(buildApp(OWNER_ID), 1);
    turnOn();
    await routes[0].send(buildApp(), 1);
    await routes[0].send(buildApp(OTHER_ID), 1);
    await routes[0].send(buildApp(OWNER_ID), 2);
    expect(mockMint).not.toHaveBeenCalled();
  });

  it("limits mint requests per user", async () => {
    turnOn();
    const app = buildApp(OWNER_ID);
    for (let i = 0; i < MINT_LIMIT_PER_WINDOW; i++) {
      expect((await routes[0].send(app, 1)).status).toBe(200);
    }
    expect((await routes[0].send(app, 1)).status).toBe(429);
    // Another user is counted separately
    expect((await routes[0].send(buildApp(OTHER_ID), 1)).status).toBe(403);
  });

  describe("GET /api/nft/enabled", () => {
    it("reports false when off and true when on, booleans only", async () => {
      const off = await request(buildApp(OWNER_ID)).get("/api/nft/enabled");
      expect(off.status).toBe(200);
      expect(off.body).toEqual({ enabled: false });

      turnOn();
      const on = await request(buildApp(OWNER_ID)).get("/api/nft/enabled");
      expect(on.body).toEqual({ enabled: true });
    });

    it("requires a signed-in user", async () => {
      expect((await request(buildApp()).get("/api/nft/enabled")).status).toBe(401);
    });
  });
});
