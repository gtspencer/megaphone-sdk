import type { Address, Hex } from "viem";

export interface RevShareSignatureRequest {
  baseUrl: string;
  apiKey: string;
  amount: bigint;
  auctionId: bigint;
  fid: bigint;
  referrer: Address;
}

export interface ReportPreBuyRequest {
  baseUrl: string;
  auctionId: bigint;
  fid: bigint;
  amount: bigint;
  txHash: string;
  username?: string;
  pfp?: string;
  referrer?: bigint;
}

export async function requestRevShareSignature(
  params: RevShareSignatureRequest
): Promise<Hex> {
  const endpoint = new URL("/rev-share/signature", params.baseUrl).toString();

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

export async function reportPreBuy(
  params: ReportPreBuyRequest
): Promise<void> {
  const endpoint = new URL("/pre-buy/report-pre-buy", params.baseUrl).toString();

  const body: Record<string, unknown> = {
    auctionId: Number(params.auctionId),
    fid: Number(params.fid),
    amount: Number(params.amount),
    txHash: params.txHash
  };

  if (params.username) {
    body.username = params.username;
  }

  if (params.pfp) {
    body.pfp = params.pfp;
  }

  if (params.referrer !== undefined) {
    body.referrer = Number(params.referrer);
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    // Don't throw - we don't want to fail the pre-buy if reporting fails
    console.warn(
      `Failed to report pre-buy: ${response.status} ${response.statusText}`
    );
  }
}

