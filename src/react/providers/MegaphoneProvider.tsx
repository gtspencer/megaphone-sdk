import type { PropsWithChildren } from "react";
import { useMemo } from "react";

import type { MegaphoneOptions } from "../../types";
import { Megaphone } from "../../client";
import { MegaphoneContext } from "../context";

export interface MegaphoneProviderProps extends MegaphoneOptions {}

export function MegaphoneProvider({
  children,
  ...options
}: PropsWithChildren<MegaphoneProviderProps>) {
  const value = useMemo(() => {
    const client = new Megaphone(options);
    return { client };
  }, [options.apiKey]);

  return (
    <MegaphoneContext.Provider value={value}>
      {children}
    </MegaphoneContext.Provider>
  );
}

