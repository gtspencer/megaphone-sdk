import type { Address, Hash, Hex } from "viem";
import type { Config } from "wagmi";
import {
  readContract,
  waitForTransactionReceipt,
  writeContract
} from "wagmi/actions";

import { erc20Abi } from "./abi/erc20";
import { megaphoneAbi } from "./abi/megaphone";
import {
  BASE_CHAIN_ID,
  BASE_URL,
  MEGAPHONE_CONTRACT_ADDRESS,
  USDC_CONTRACT_ADDRESS
} from "./constants";
import type { AvailableDay } from "./types";

const DAY_IN_SECONDS = 86_400n;
const MAX_SAFE_MS = BigInt(Number.MAX_SAFE_INTEGER);

type AuctionResult = readonly [
  bigint,
  boolean,
  bigint,
  bigint,
  Address,
  bigint,
  bigint,
  bigint,
  boolean,
  bigint,
  bigint
];

type SettingsResult = readonly [
  Address,
  Address,
  bigint,
  bigint,
  boolean,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  boolean,
  Address,
  bigint,
  bigint
];

export interface MegaphoneOptions {
  apiKey?: string;
}

interface PreBuyBaseParams {
  auctionId: bigint;
  fid: bigint;
  name: string;
  account: Address;
  config: Config;
}

export interface PreBuyParams extends PreBuyBaseParams {}

export interface PreBuyWithRevShareParams extends PreBuyBaseParams {
  referrer: Address;
}

export interface GetAvailableDaysParams {
  config: Config;
}

export class Megaphone {
  private readonly apiKey?: string;
  private readonly contractAddress: Address;
  private readonly usdcAddress: Address;
  private readonly chainId: number;
  private readonly baseUrl: string;

  constructor(options: MegaphoneOptions = {}) {
    const { apiKey } = options;

    this.apiKey = apiKey;
    this.baseUrl = BASE_URL;
    this.contractAddress = MEGAPHONE_CONTRACT_ADDRESS;
    this.usdcAddress = USDC_CONTRACT_ADDRESS;
    this.chainId = BASE_CHAIN_ID;
  }

  get configuration() {
    return {
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      contractAddress: this.contractAddress,
      usdcAddress: this.usdcAddress,
      chainId: this.chainId
    } as const;
  }

  async preBuy(params: PreBuyParams): Promise<boolean> {
    const { auctionId, fid, name, account, config } = params;

    const amount = await this.getPreBuyAmount(config);

    await this.approve(config, account, amount);

    const transactionHash = await writeContract(config, {
      address: this.contractAddress,
      abi: megaphoneAbi,
      functionName: "preBuyAuction",
      args: [amount, auctionId, fid, name],
      account,
      chainId: this.chainId
    });

    const receipt = await waitForTransactionReceipt(config, {
      hash: transactionHash,
      chainId: this.chainId
    });

    return receipt.status === "success";
  }

  async preBuyWithRevShare(
    params: PreBuyWithRevShareParams
  ): Promise<boolean> {
    const {
      auctionId,
      fid,
      name,
      account,
      config,
      referrer
    } = params;

    const apiKey = this.apiKey;
    if (!apiKey) {
      throw new Error(
        "Megaphone requires an API key for rev share operations."
      );
    }

    const amount = await this.getPreBuyAmount(config);

    const signature = await this.fetchRevShareSignature({
      amount,
      auctionId,
      fid,
      referrer,
      apiKey
    });

    await this.approve(config, account, amount);

    const transactionHash = await writeContract(config, {
      address: this.contractAddress,
      abi: megaphoneAbi,
      functionName: "preBuyAuctionWithRevShare",
      args: [amount, auctionId, fid, name, signature, referrer],
      account,
      chainId: this.chainId
    });

    const receipt = await waitForTransactionReceipt(config, {
      hash: transactionHash,
      chainId: this.chainId
    });

    return receipt.status === "success";
  }

  async getAvailableDays(
    params: GetAvailableDaysParams
  ): Promise<AvailableDay[]> {
    const { config } = params;

    const currentTokenId = await this.getCurrentAuctionTokenId(config);
    const settings = await this.getSettings(config);

    const { scheduledEndTime, minPreBuyId, maxPreBuyId } = settings;

    if (minPreBuyId > maxPreBuyId) {
      return [];
    }

    const available: AvailableDay[] = [];

    for (
      let offset = minPreBuyId;
      offset <= maxPreBuyId;
      offset += 1n
    ) {
      if (offset <= 0n) {
        continue;
      }

      const auctionId = currentTokenId + offset;
      const timestamp = scheduledEndTime + offset * DAY_IN_SECONDS;
      const milliseconds = timestamp * 1000n;

      if (milliseconds > MAX_SAFE_MS) {
        throw new Error("Timestamp exceeds supported JavaScript date range.");
      }

      available.push({
        auctionId,
        date: new Date(Number(milliseconds)),
        timestamp
      });
    }

    return available;
  }

  private async fetchRevShareSignature(params: {
    amount: bigint;
    auctionId: bigint;
    fid: bigint;
    referrer: Address;
    apiKey: string;
  }): Promise<Hex> {
    const endpoint = new URL("/rev-share/signature", this.baseUrl).toString();

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": params.apiKey
      },
      body: JSON.stringify({
        amount: params.amount.toString(),
        auctionId: params.auctionId.toString(),
        fid: params.fid.toString(),
        referrer: params.referrer
      })
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch rev share signature: ${response.status} ${response.statusText}`
      );
    }

    const payload = (await response.json()) as {
      signature?: string;
    };

    if (typeof payload?.signature !== "string") {
      throw new Error(
        "Rev share signature response is missing the signature field."
      );
    }

    return payload.signature as Hex;
  }

  private async getPreBuyAmount(config: Config): Promise<bigint> {
    return readContract(config, {
      address: this.contractAddress,
      abi: megaphoneAbi,
      functionName: "getPreBuyAmount",
      args: [],
      chainId: this.chainId
    });
  }

  private async getCurrentAuctionTokenId(config: Config): Promise<bigint> {
    const auction = (await readContract(config, {
      address: this.contractAddress,
      abi: megaphoneAbi,
      functionName: "auction",
      args: [],
      chainId: this.chainId
    })) as AuctionResult;

    return auction[0];
  }

  private async getSettings(config: Config): Promise<{
    scheduledEndTime: bigint;
    minPreBuyId: bigint;
    maxPreBuyId: bigint;
  }> {
    const settings = (await readContract(config, {
      address: this.contractAddress,
      abi: megaphoneAbi,
      functionName: "settings",
      args: [],
      chainId: this.chainId
    })) as SettingsResult;

    return {
      scheduledEndTime: settings[5],
      minPreBuyId: settings[9],
      maxPreBuyId: settings[10]
    };
  }

  private async approve(
    config: Config,
    account: Address,
    amount: bigint
  ): Promise<Hash> {
    const approveHash = await writeContract(config, {
      address: this.usdcAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [this.contractAddress, amount],
      account,
      chainId: this.chainId
    });

    await waitForTransactionReceipt(config, {
      hash: approveHash,
      chainId: this.chainId
    });

    return approveHash;
  }
}
