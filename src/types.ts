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
  isTestnet?: boolean;
  operatorFid: bigint;
  debug?: boolean;
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
  isBought: boolean;
}

export interface PreBuyData {
  preBuyStatus: readonly boolean[];
  minPreBuyId: bigint;
  maxPreBuyId: bigint;
  currentAuctionId: bigint;
  currentAuctionEndTime: bigint;
  currentPreBuyPrice: bigint;
}

export interface GetPreBuyDataParams {
  config: Config;
}

