import type { QueryClient } from "@tanstack/react-query";

/** Query key for GET /api/nft/enabled. */
export const NFT_ENABLED_QUERY_KEY = ["/api/nft/enabled"] as const;

/**
 * Queries whose result depends on who is signed in. Their cached value is
 * kept indefinitely (staleTime: Infinity), so they are refreshed whenever
 * the session changes (login, register, logout).
 */
export const SESSION_SCOPED_QUERY_KEYS = [NFT_ENABLED_QUERY_KEY] as const;

export function refreshSessionScopedQueries(client: QueryClient): Promise<void[]> {
  return Promise.all(
    SESSION_SCOPED_QUERY_KEYS.map((queryKey) => client.invalidateQueries({ queryKey })),
  );
}
