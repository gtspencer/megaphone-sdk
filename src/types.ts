import type { Address } from "viem";
import type { Config } from "wagmi";

interface PreBuyBaseParams {
  auctionId: bigint;
  fid: bigint;
  name: string;
  account: Address;
  config: Config;
}

export interface MegaphoneOptions {
  apiKey?: string;
}

export interface PreBuyParams extends PreBuyBaseParams {}

export interface PreBuyWithRevShareParams extends PreBuyBaseParams {
  referrer: Address;
}

export interface GetAvailableDaysParams {
  config: Config;
}

export interface AvailableDay {
  auctionId: bigint;
  date: Date;
  timestamp: bigint;
}

