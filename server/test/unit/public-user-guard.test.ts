/**
 * sanitizeUser is the single shaping point for user objects in responses.
 * It copies an allowlist, so a full users row (or a row with columns added
 * later) is reduced to the public fields before it can reach res.json.
 */

import { sanitizeUser, PUBLIC_USER_FIELDS } from "../../sanitizeUser";
import { formatApiLogLine } from "../../requestLogger";
import { findKeyPaths } from "../helpers/key-paths";

describe("public user shaping", () => {
  const rawRow = {
    id: 3,
    username: "carol",
    password: "stored-hash-value.stored-salt",
    avatarUrl: null,
    bio: "bio",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    futureColumn: "not public",
  };

  it("keeps exactly the public fields", () => {
    const shaped = sanitizeUser(rawRow);
    expect(Object.keys(shaped).sort()).toEqual([...PUBLIC_USER_FIELDS].sort());
    expect(findKeyPaths(JSON.parse(JSON.stringify(shaped)), "password")).toEqual([]);
  });

  it("is idempotent on an already-public user", () => {
    const once = sanitizeUser(rawRow);
    expect(sanitizeUser(once)).toEqual(once);
  });

  it("findKeyPaths reports nested occurrences", () => {
    expect(findKeyPaths({ a: [{ b: { password: "x" } }] }, "password")).toEqual([
      "$.a[0].b.password",
    ]);
  });
});

describe("api request log line", () => {
  it("contains method, path, status and duration only", () => {
    expect(formatApiLogLine("POST", "/api/login", 200, 12)).toBe("POST /api/login 200 in 12ms");
  });
});
