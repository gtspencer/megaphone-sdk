import type { Address, Hex } from "viem";

export interface RevShareSignatureRequest {
  baseUrl: string;
  apiKey: string;
  amount: bigint;
  auctionId: bigint;
  fid: bigint;
  referrer: Address;
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

