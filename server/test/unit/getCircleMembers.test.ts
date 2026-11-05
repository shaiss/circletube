/**
 * Regression: getCircleMembers must keep the circleId filter when status !== "all".
 * Drizzle's where() replaces prior filters — chaining a second where() dropped circle scope.
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";

const COLUMN_TO_FIELD: Record<string, string> = {
  circle_id: "circleId",
  user_id: "userId",
  status: "status",
  id: "id",
  role: "role",
};

type MemberRow = {
  id: number;
  circleId: number;
  userId: number;
  status: string;
  role: string;
  joinedAt: Date;
};

const ALL_MEMBERS: MemberRow[] = [
  {
    id: 1,
    circleId: 1,
    userId: 100,
    status: "active",
    role: "member",
    joinedAt: new Date("2024-01-01"),
  },
  {
    id: 2,
    circleId: 2,
    userId: 200,
    status: "active",
    role: "member",
    joinedAt: new Date("2024-01-02"),
  },
  {
    id: 3,
    circleId: 1,
    userId: 300,
    status: "deactivated",
    role: "member",
    joinedAt: new Date("2024-01-03"),
  },
];

/** Collect equality constraints from a Drizzle SQL condition tree. */
function extractEqConstraints(
  node: unknown,
  out: Array<{ column: string; value: unknown }> = []
): Array<{ column: string; value: unknown }> {
  if (!node || typeof node !== "object") return out;
  const n = node as {
    value?: unknown;
    encoder?: { name?: string; col?: string };
    queryChunks?: unknown[];
  };
  if (
    "value" in n &&
    n.encoder &&
    !Array.isArray(n.value) &&
    (n.encoder.name || n.encoder.col)
  ) {
    out.push({
      column: (n.encoder.name || n.encoder.col) as string,
      value: n.value,
    });
  }
  if (Array.isArray(n.queryChunks)) {
    for (const chunk of n.queryChunks) {
      extractEqConstraints(chunk, out);
    }
  }
  return out;
}

function rowsMatchingCondition(condition: unknown): MemberRow[] {
  const constraints = extractEqConstraints(condition);
  return ALL_MEMBERS.filter((row) =>
    constraints.every(({ column, value }) => {
      const field = COLUMN_TO_FIELD[column] ?? column;
      return (row as Record<string, unknown>)[field] === value;
    })
  );
}

// Mimic Drizzle: each where() call REPLACES the previous filter.
let activeCondition: unknown = null;

const queryChain = {
  from: jest.fn(() => queryChain),
  where: jest.fn((condition: unknown) => {
    activeCondition = condition;
    return queryChain;
  }),
  orderBy: jest.fn(async () => rowsMatchingCondition(activeCondition)),
};

jest.mock("../../db", () => ({
  db: {
    select: jest.fn(() => queryChain),
  },
}));

import { DatabaseStorage } from "../../storage";

describe("DatabaseStorage.getCircleMembers", () => {
  let storage: DatabaseStorage;

  beforeEach(() => {
    activeCondition = null;
    jest.clearAllMocks();
    queryChain.from.mockImplementation(() => queryChain);
    queryChain.where.mockImplementation((condition: unknown) => {
      activeCondition = condition;
      return queryChain;
    });
    queryChain.orderBy.mockImplementation(async () =>
      rowsMatchingCondition(activeCondition)
    );
    storage = new DatabaseStorage();
  });

  it("scopes active members to the requested circleId (does not leak other circles)", async () => {
    const members = await storage.getCircleMembers(1, "active");

    expect(queryChain.where).toHaveBeenCalledTimes(1);
    expect(members.map((m) => m.id)).toEqual([1]);
    expect(members.every((m) => m.circleId === 1)).toBe(true);
    expect(members.some((m) => m.circleId === 2)).toBe(false);
    expect(members.some((m) => m.userId === 200)).toBe(false);
  });

  it('omits status filter when status is "all" but still scopes by circleId', async () => {
    const members = await storage.getCircleMembers(1, "all");

    expect(queryChain.where).toHaveBeenCalledTimes(1);
    expect(members.map((m) => m.id).sort()).toEqual([1, 3]);
    expect(members.every((m) => m.circleId === 1)).toBe(true);
  });
});
