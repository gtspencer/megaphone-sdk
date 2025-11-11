import { useEffect, useState } from "react";

import type { Megaphone } from "../../client";
import type { AvailableDay, GetAvailableDaysParams } from "../../types";

interface UseAvailableDaysResult {
  days: AvailableDay[];
  loading: boolean;
  error: Error | null;
}

export function useAvailableDays(
  client: Megaphone | undefined,
  params: GetAvailableDaysParams | undefined
): UseAvailableDaysResult {
  const [days, setDays] = useState<AvailableDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!client || !params?.config) {
      setDays([]);
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
        const result = await currentClient.getAvailableDays(currentParams);
        if (!cancelled) {
          setDays(result);
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

  return { days, loading, error };
}

