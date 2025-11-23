import { useMemo } from "react";

import type { Megaphone } from "../../client";
import { Megaphone as MegaphoneClass } from "../../client";
import type { MegaphoneOptions } from "../../types";
import { useMegaphoneContext } from "../context";

export interface UseMegaphoneClientOptions {
  client?: Megaphone;
  apiKey?: string;
  isTestnet?: boolean;
  operatorFid?: bigint;
}

export function useMegaphoneClient(
  override?: UseMegaphoneClientOptions
): Megaphone {
  const context = useMegaphoneContext();
  const { client, apiKey, isTestnet, operatorFid } = override ?? {};

  return useMemo(() => {
    if (client) {
      return client;
    }
    if (context) {
      return context.client;
    }
    if (operatorFid === undefined) {
      throw new Error("operatorFid is required when creating a new Megaphone client");
    }
    return new MegaphoneClass({ apiKey, isTestnet, operatorFid });
  }, [client, context, apiKey, isTestnet, operatorFid]);
}

