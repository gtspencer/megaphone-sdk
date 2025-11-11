import { useMemo } from "react";

import type { Megaphone } from "../../client";
import { Megaphone as MegaphoneClass } from "../../client";
import type { MegaphoneOptions } from "../../types";
import { useMegaphoneContext } from "../context";

export interface UseMegaphoneClientOptions extends MegaphoneOptions {
  client?: Megaphone;
}

export function useMegaphoneClient(
  override?: UseMegaphoneClientOptions
): Megaphone {
  const context = useMegaphoneContext();
  const { client, apiKey } = override ?? {};

  return useMemo(() => {
    if (client) {
      return client;
    }
    if (context) {
      return context.client;
    }
    return new MegaphoneClass({ apiKey });
  }, [client, context, apiKey]);
}

