import { useEffect, useState } from "react";

import type { Megaphone } from "../../client";
import type { Config } from "wagmi";

interface UsePreBuyAmountResult {
  amount: bigint | null;
  loading: boolean;
  error: Error | null;
}

export function usePreBuyAmount(
  client: Megaphone | undefined,
  config: Config | undefined
): UsePreBuyAmountResult {
  const [amount, setAmount] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!client || !config) {
      setAmount(null);
      setError(null);
      setLoading(false);
      return;
    }

    const currentClient = client;
    const currentConfig = config;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const value = await currentClient.getPreBuyAmount(currentConfig);
        if (!cancelled) {
          setAmount(value);
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
  }, [client, config]);

  return { amount, loading, error };
}

