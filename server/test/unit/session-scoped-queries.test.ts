/**
 * Client cache helper: session-dependent queries (NFT availability) are
 * marked stale and refetched when the session changes.
 */

import { QueryClient, QueryObserver } from "@tanstack/react-query";
import {
  NFT_ENABLED_QUERY_KEY,
  SESSION_SCOPED_QUERY_KEYS,
  refreshSessionScopedQueries,
} from "../../../client/src/lib/session-queries";

describe("refreshSessionScopedQueries", () => {
  let client: QueryClient;

  beforeEach(() => {
    client = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false } },
    });
  });

  afterEach(() => client.clear());

  it("includes the NFT availability query", () => {
    expect(SESSION_SCOPED_QUERY_KEYS).toContainEqual(NFT_ENABLED_QUERY_KEY);
    expect(NFT_ENABLED_QUERY_KEY).toEqual(["/api/nft/enabled"]);
  });

  it("marks a cached signed-out result stale", async () => {
    client.setQueryData(NFT_ENABLED_QUERY_KEY, null);
    expect(client.getQueryState(NFT_ENABLED_QUERY_KEY)?.isInvalidated).toBe(false);

    await refreshSessionScopedQueries(client);

    expect(client.getQueryState(NFT_ENABLED_QUERY_KEY)?.isInvalidated).toBe(true);
  });

  it("refetches an active NFT availability query after sign-in", async () => {
    const responses: Array<{ enabled: boolean } | null> = [null, { enabled: true }];
    const queryFn = jest.fn(async () => responses.shift() ?? null);
    const observer = new QueryObserver(client, { queryKey: NFT_ENABLED_QUERY_KEY, queryFn });
    const unsubscribe = observer.subscribe(() => undefined);

    try {
      await observer.refetch();
      expect(client.getQueryData(NFT_ENABLED_QUERY_KEY)).toBeNull();

      await refreshSessionScopedQueries(client);

      expect(queryFn).toHaveBeenCalledTimes(2);
      expect(client.getQueryData(NFT_ENABLED_QUERY_KEY)).toEqual({ enabled: true });
    } finally {
      unsubscribe();
    }
  });

  it("leaves unrelated queries alone", async () => {
    client.setQueryData(["/api/default-circle"], { id: 1 });
    await refreshSessionScopedQueries(client);
    expect(client.getQueryState(["/api/default-circle"])?.isInvalidated).toBe(false);
  });
});
