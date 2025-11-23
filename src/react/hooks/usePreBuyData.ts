import { useEffect, useState } from "react";

import type { Megaphone } from "../../client";
import type { GetPreBuyDataParams, PreBuyData } from "../../types";

interface UsePreBuyDataResult {
  data: PreBuyData | null;
  loading: boolean;
  error: Error | null;
}

export function usePreBuyData(
  client: Megaphone | undefined,
  params: GetPreBuyDataParams | undefined
): UsePreBuyDataResult {
  const [data, setData] = useState<PreBuyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!client || !params?.config) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    const currentClient = client;
    const currentParams = params;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const result = await currentClient.getPreBuyData(currentParams);
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [client, params]);

  return { data, loading, error };
}

