import type { Address } from "viem";
import type { Config } from "wagmi";
import { waitForTransactionReceipt, writeContract } from "wagmi/actions";

import { megaphoneAbi } from "./abi/megaphone";
import {
  BASE_CHAIN_ID,
  BASE_URL,
  MEGAPHONE_CONTRACT_ADDRESS,
  USDC_CONTRACT_ADDRESS
} from "./constants";
import { requestRevShareSignature } from "./internal/api";
import {
  approveUsdc,
  readCurrentAuctionTokenId,
  readPreBuyAmount,
  readSettings,
  type ContractContext
} from "./internal/contract";
import { addDays, toDateOrThrow } from "./utils/time";
import type {
  AvailableDay,
  GetAvailableDaysParams,
  MegaphoneOptions,
  PreBuyParams,
  PreBuyWithRevShareParams
} from "./types";

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
    const context = this.createContractContext(config);

    const amount = await readPreBuyAmount(context);
    await approveUsdc(context, account, amount);

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

    const apiKey = this.requireApiKey();
    const context = this.createContractContext(config);

    const amount = await readPreBuyAmount(context);

    const signature = await requestRevShareSignature({
      baseUrl: this.baseUrl,
      apiKey,
      amount,
      auctionId,
      fid,
      referrer
    });

    await approveUsdc(context, account, amount);

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
    const context = this.createContractContext(config);

    const currentTokenId = await readCurrentAuctionTokenId(context);
    const { scheduledEndTime, minPreBuyId, maxPreBuyId } =
      await readSettings(context);

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
      const timestamp = addDays(scheduledEndTime, offset);

      available.push({
        auctionId,
        timestamp,
        date: toDateOrThrow(timestamp)
      });
    }

    return available;
  }

  async getPreBuyAmount(config: Config): Promise<bigint> {
    const context = this.createContractContext(config);
    return readPreBuyAmount(context);
  }

  private createContractContext(config: Config): ContractContext {
    return {
      config,
      contractAddress: this.contractAddress,
      usdcAddress: this.usdcAddress,
      chainId: this.chainId
    };
  }

  private requireApiKey(): string {
    if (!this.apiKey) {
      throw new Error(
        "Megaphone requires an API key for rev share operations."
      );
    }
    return this.apiKey;
  }
}
