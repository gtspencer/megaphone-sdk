import { createContext, useContext } from "react";

import type { Megaphone } from "../client";

export interface MegaphoneContextValue {
  client: Megaphone;
}

export const MegaphoneContext = createContext<
  MegaphoneContextValue | undefined
>(undefined);

export function useMegaphone(): MegaphoneContextValue {
  const value = useContext(MegaphoneContext);
  if (!value) {
    throw new Error(
      "Megaphone context not found. Wrap your tree with MegaphoneProvider or pass a client explicitly."
    );
  }
  return value;
}

export function useMegaphoneContext():
  | MegaphoneContextValue
  | undefined {
  return useContext(MegaphoneContext);
}

