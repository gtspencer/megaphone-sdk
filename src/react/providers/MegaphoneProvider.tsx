import React, { useMemo, type PropsWithChildren } from "react";

import type { MegaphoneOptions } from "../../types";
import { Megaphone } from "../../client";
import { MegaphoneContext } from "../context";

export interface MegaphoneProviderProps extends MegaphoneOptions {}

export function MegaphoneProvider({
  children,
  ...options
}: PropsWithChildren<MegaphoneProviderProps>) {
  const { apiKey } = options;

  const value = useMemo(() => {
    const client = new Megaphone(options);
    return { client };
  }, [apiKey, options.isTestnet]);

  return (
    <MegaphoneContext.Provider value={value}>
      {children}
    </MegaphoneContext.Provider>
  );
}

