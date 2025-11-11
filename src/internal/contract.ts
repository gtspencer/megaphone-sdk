import type { Address, Hash } from "viem";
import type { Config } from "wagmi";
import {
  readContract,
  waitForTransactionReceipt,
  writeContract
} from "wagmi/actions";

import { erc20Abi } from "../abi/erc20";
import { megaphoneAbi } from "../abi/megaphone";

export interface ContractContext {
  config: Config;
  contractAddress: Address;
  usdcAddress: Address;
  chainId: number;
}

type AuctionStructOutput = readonly [
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

type SettingsStructOutput = readonly [
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

export async function readPreBuyAmount(
  context: ContractContext
): Promise<bigint> {
  const { config, contractAddress, chainId } = context;
  return readContract(config, {
    address: contractAddress,
    abi: megaphoneAbi,
    functionName: "getPreBuyAmount",
    args: [],
    chainId
  });
}

export async function readCurrentAuctionTokenId(
  context: ContractContext
): Promise<bigint> {
  const { config, contractAddress, chainId } = context;
  const [tokenId] = (await readContract(config, {
    address: contractAddress,
    abi: megaphoneAbi,
    functionName: "auction",
    args: [],
    chainId
  })) as AuctionStructOutput;

  return tokenId;
}

export interface MegaphoneSettingsSnapshot {
  scheduledEndTime: bigint;
  minPreBuyId: bigint;
  maxPreBuyId: bigint;
}

export async function readSettings(
  context: ContractContext
): Promise<MegaphoneSettingsSnapshot> {
  const { config, contractAddress, chainId } = context;

  const settings = (await readContract(config, {
    address: contractAddress,
    abi: megaphoneAbi,
    functionName: "settings",
    args: [],
    chainId
  })) as SettingsStructOutput;

  return {
    scheduledEndTime: settings[5],
    minPreBuyId: settings[9],
    maxPreBuyId: settings[10]
  };
}

export async function approveUsdc(
  context: ContractContext,
  account: Address,
  amount: bigint
): Promise<Hash> {
  const { config, contractAddress, usdcAddress, chainId } = context;

  const approveHash = await writeContract(config, {
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "approve",
    args: [contractAddress, amount],
    account,
    chainId
  });

  await waitForTransactionReceipt(config, {
    hash: approveHash,
    chainId
  });

  return approveHash;
}

