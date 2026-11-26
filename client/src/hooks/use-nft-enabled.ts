import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { NFT_ENABLED_QUERY_KEY } from "@/lib/session-queries";

/**
 * Whether the server has the NFT feature turned on.
 * Defaults to false while loading, on error, or when signed out.
 * Refreshed on login, register and logout (see refreshSessionScopedQueries).
 */
export function useNftEnabled(): boolean {
  const { data } = useQuery<{ enabled: boolean } | null>({
    queryKey: NFT_ENABLED_QUERY_KEY,
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  return data?.enabled === true;
}
