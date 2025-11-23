import type { Address } from "viem";
import type { Config } from "wagmi";
import { waitForTransactionReceipt, writeContract } from "wagmi/actions";

import { megaphoneAbi } from "./abi/megaphone";
import {
  BASE_CHAIN_ID,
  BASE_SEPOLIA_CHAIN_ID,
  BASE_URL,
  MEGAPHONE_CONTRACT_ADDRESS,
  MEGAPHONE_SEPOLIA_CONTRACT_ADDRESS,
  USDC_CONTRACT_ADDRESS,
  USDC_SEPOLIA_CONTRACT_ADDRESS
} from "./constants";
import { reportPreBuy, requestRevShareSignature } from "./internal/api";
import {
  approveUsdc,
  readPreBuyAmount,
  readPreBuyData,
  type ContractContext
} from "./internal/contract";
import { addDays, normalizeTo12pmEST, toDateOrThrow } from "./utils/time";
import type {
  AvailableDay,
  GetAvailableDaysParams,
  GetPreBuyDataParams,
  MegaphoneOptions,
  PreBuyData,
  PreBuyParams,
  PreBuyWithRevShareParams
} from "./types";

export class Megaphone {
  private readonly apiKey?: string;
  private readonly contractAddress: Address;
  private readonly usdcAddress: Address;
  private readonly chainId: number;
  private readonly baseUrl: string;
  private readonly operatorFid: bigint;

  constructor(options: MegaphoneOptions) {
    const { apiKey, isTestnet = false, operatorFid } = options;

    if (operatorFid === undefined) {
      throw new Error("operatorFid is required in MegaphoneOptions");
    }

    this.apiKey = apiKey;
    this.operatorFid = operatorFid;
    this.baseUrl = BASE_URL;
    this.contractAddress = isTestnet
      ? MEGAPHONE_SEPOLIA_CONTRACT_ADDRESS
      : MEGAPHONE_CONTRACT_ADDRESS;
    this.usdcAddress = isTestnet
      ? USDC_SEPOLIA_CONTRACT_ADDRESS
      : USDC_CONTRACT_ADDRESS;
    this.chainId = isTestnet
      ? BASE_SEPOLIA_CHAIN_ID
      : BASE_CHAIN_ID;
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

    const success = receipt.status === "success";

    if (success) {
      // Report the pre-buy to the backend
      await reportPreBuy({
        baseUrl: this.baseUrl,
        auctionId,
        fid,
        amount,
        txHash: receipt.transactionHash,
        username: name,
        referrer: this.operatorFid
      });
    }

    return success;
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

    const success = receipt.status === "success";

    if (success) {
      // Report the pre-buy to the backend
      await reportPreBuy({
        baseUrl: this.baseUrl,
        auctionId,
        fid,
        amount,
        txHash: receipt.transactionHash,
        username: name,
        referrer: this.operatorFid
      });
    }

    return success;
  }

  async getAvailableDays(
    params: GetAvailableDaysParams
  ): Promise<AvailableDay[]> {
    const { config } = params;
    const context = this.createContractContext(config);

    const preBuyData = await readPreBuyData(context);
    const {
      preBuyStatus,
      minPreBuyId,
      maxPreBuyId,
      currentAuctionId,
      currentAuctionEndTime
    } = preBuyData;

    if (minPreBuyId > maxPreBuyId || preBuyStatus.length === 0) {
      return [];
    }

    // Normalize the current auction end time to 12pm EST for "today"
    const baseTimestamp = normalizeTo12pmEST(currentAuctionEndTime);
    const allDays: AvailableDay[] = [];

    for (let i = 0; i < preBuyStatus.length; i++) {
      const isBought = preBuyStatus[i];
      const offset = minPreBuyId + BigInt(i);
      
      if (offset <= 0n) {
        continue;
      }

      const auctionId = currentAuctionId + offset;
      // Add the offset days to the normalized base timestamp
      const timestamp = addDays(baseTimestamp, offset);

      allDays.push({
        auctionId,
        timestamp,
        date: toDateOrThrow(timestamp),
        isBought
      });
    }

    return allDays;
  }

  async getPreBuyData(params: GetPreBuyDataParams): Promise<PreBuyData> {
    const { config } = params;
    const context = this.createContractContext(config);
    return readPreBuyData(context);
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
