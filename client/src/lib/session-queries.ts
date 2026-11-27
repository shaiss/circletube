import type { QueryClient } from "@tanstack/react-query";

/** Query key for GET /api/nft/enabled. */
export const NFT_ENABLED_QUERY_KEY = ["/api/nft/enabled"] as const;

/**
 * Queries whose result depends on who is signed in. Their cached value is
 * kept indefinitely (staleTime: Infinity), so they are refreshed whenever
 * the session changes (login, register, logout).
 */
export const SESSION_SCOPED_QUERY_KEYS = [NFT_ENABLED_QUERY_KEY] as const;

/**
 * Refresh session-scoped queries after the session changes.
 *
 * Any request started before the change is cancelled first, so its late
 * response is discarded instead of being stored for the new session.
 * - signed in (login/register): the cached value is reset and active
 *   queries refetch for the new session.
 * - signedOut (logout): the value is set to null immediately (before any
 *   await) so dependent UI hides right away.
 */
function clearToSignedOut(client: QueryClient): void {
  for (const queryKey of SESSION_SCOPED_QUERY_KEYS) {
    client.setQueryData<unknown>(queryKey, null);
  }
}

export async function refreshSessionScopedQueries(
  client: QueryClient,
  { signedOut = false }: { signedOut?: boolean } = {},
): Promise<void> {
  const keys = SESSION_SCOPED_QUERY_KEYS;

  // Cancel first. A cancelled request restores the state from before it
  // started, so the signed-out value is written after this call.
  const cancelled = keys.map((queryKey) => client.cancelQueries({ queryKey }));

  if (signedOut) {
    clearToSignedOut(client);
    await Promise.all(cancelled);
    clearToSignedOut(client);
    return;
  }

  await Promise.all(cancelled);
  await Promise.all(keys.map((queryKey) => client.resetQueries({ queryKey })));
}
