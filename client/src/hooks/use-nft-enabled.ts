import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

/**
 * Whether the server has the NFT feature turned on.
 * Defaults to false while loading, on error, or when signed out.
 */
export function useNftEnabled(): boolean {
  const { data } = useQuery<{ enabled: boolean } | null>({
    queryKey: ["/api/nft/enabled"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  return data?.enabled === true;
}
