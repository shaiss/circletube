/**
 * Client cache helper: session-dependent queries (NFT availability) are
 * refreshed when the session changes, and a response to a request that
 * started before the change is never stored afterward.
 */

import { QueryClient, QueryObserver } from "@tanstack/react-query";
import {
  NFT_ENABLED_QUERY_KEY,
  SESSION_SCOPED_QUERY_KEYS,
  refreshSessionScopedQueries,
} from "../../../client/src/lib/session-queries";

type Availability = { enabled: boolean } | null;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

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

  it("clears a cached signed-out result on sign-in", async () => {
    client.setQueryData(NFT_ENABLED_QUERY_KEY, null);

    await refreshSessionScopedQueries(client);

    expect(client.getQueryData(NFT_ENABLED_QUERY_KEY)).toBeUndefined();
  });

  it("refetches an active NFT availability query after sign-in", async () => {
    const responses: Availability[] = [null, { enabled: true }];
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

  it("a response started before sign-in does not overwrite the fresh one (active query)", async () => {
    const earlier = deferred<Availability>();
    const queryFn = jest
      .fn<Promise<Availability>, []>()
      .mockImplementationOnce(() => earlier.promise)
      .mockImplementation(async () => ({ enabled: true }));
    const observer = new QueryObserver(client, { queryKey: NFT_ENABLED_QUERY_KEY, queryFn });
    const unsubscribe = observer.subscribe(() => undefined);

    try {
      // Request from the signed-out session is still pending
      expect(queryFn).toHaveBeenCalledTimes(1);

      await refreshSessionScopedQueries(client);
      expect(queryFn).toHaveBeenCalledTimes(2);
      expect(client.getQueryData(NFT_ENABLED_QUERY_KEY)).toEqual({ enabled: true });

      // The earlier request finishes late with the signed-out answer
      earlier.resolve(null);
      await flush();

      expect(client.getQueryData(NFT_ENABLED_QUERY_KEY)).toEqual({ enabled: true });
    } finally {
      unsubscribe();
    }
  });

  it("a response started before sign-in is not stored on an inactive query", async () => {
    const earlier = deferred<Availability>();
    const queryFn = jest
      .fn<Promise<Availability>, []>()
      .mockImplementationOnce(() => earlier.promise)
      .mockImplementation(async () => ({ enabled: true }));
    const observer = new QueryObserver(client, { queryKey: NFT_ENABLED_QUERY_KEY, queryFn });
    const unsubscribe = observer.subscribe(() => undefined);
    // Component unmounts while the request is pending
    unsubscribe();

    await refreshSessionScopedQueries(client);
    earlier.resolve(null);
    await flush();

    expect(client.getQueryData(NFT_ENABLED_QUERY_KEY)).toBeUndefined();

    // Next mount fetches for the current session
    const remount = new QueryObserver(client, { queryKey: NFT_ENABLED_QUERY_KEY, queryFn });
    const stop = remount.subscribe(() => undefined);
    try {
      await flush();
      expect(client.getQueryData(NFT_ENABLED_QUERY_KEY)).toEqual({ enabled: true });
    } finally {
      stop();
    }
  });

  it("sign-out hides availability immediately and ignores a late signed-in response", async () => {
    const earlier = deferred<Availability>();
    client.setQueryData(NFT_ENABLED_QUERY_KEY, { enabled: true });
    const pending = client.fetchQuery({
      queryKey: NFT_ENABLED_QUERY_KEY,
      queryFn: () => earlier.promise,
      staleTime: 0,
    });

    const refresh = refreshSessionScopedQueries(client, { signedOut: true });
    // Set synchronously, before the helper awaits anything
    expect(client.getQueryData(NFT_ENABLED_QUERY_KEY)).toBeNull();

    await refresh;
    earlier.resolve({ enabled: true });
    await pending.catch(() => undefined);
    await flush();

    expect(client.getQueryData(NFT_ENABLED_QUERY_KEY)).toBeNull();
  });

  it("leaves unrelated queries alone", async () => {
    client.setQueryData(["/api/default-circle"], { id: 1 });
    await refreshSessionScopedQueries(client);
    await refreshSessionScopedQueries(client, { signedOut: true });
    expect(client.getQueryData(["/api/default-circle"])).toEqual({ id: 1 });
    expect(client.getQueryState(["/api/default-circle"])?.isInvalidated).toBe(false);
  });
});
