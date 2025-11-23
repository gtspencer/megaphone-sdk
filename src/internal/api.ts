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
  const endpoint = new URL(
    "/api/pre-buy/generate-signature",
    params.baseUrl
  ).toString();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": params.apiKey
    },
    body: JSON.stringify({
      referrer: params.referrer,
      auctionId: Number(params.auctionId),
      amount: Number(params.amount),
      fid: Number(params.fid)
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage: string;
    try {
      const errorJson = JSON.parse(errorText) as { error?: string };
      errorMessage = errorJson.error ?? `HTTP ${response.status}`;
    } catch {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(
      `Failed to fetch rev share signature: ${errorMessage}`
    );
  }

  const payload = (await response.json()) as {
    success?: boolean;
    signature?: string;
    referrer?: string;
    auctionId?: number;
    amount?: number;
    fid?: number;
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
  const endpoint = new URL("/api/pre-buy/report-pre-buy", params.baseUrl).toString();

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

export interface RecordIncentivizedInteractionRequest {
  baseUrl: string;
  apiKey: string;
  userFid: bigint;
  interactionLevel: number;
}

export interface RecordIncentivizedInteractionResponse {
  success: boolean;
  fid: number;
  auctionId: number;
  interactionLevel: number;
}

export async function recordIncentivizedInteraction(
  params: RecordIncentivizedInteractionRequest
): Promise<RecordIncentivizedInteractionResponse> {
  const endpoint = new URL(
    "/api/incentivized-interaction",
    params.baseUrl
  ).toString();

  // Validate interactionLevel
  if (
    !Number.isInteger(params.interactionLevel) ||
    params.interactionLevel < 1 ||
    params.interactionLevel > 3
  ) {
    throw new Error("interactionLevel must be an integer between 1 and 3");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": params.apiKey
    },
    body: JSON.stringify({
      fid: Number(params.userFid),
      interactionLevel: params.interactionLevel
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage: string;
    try {
      const errorJson = JSON.parse(errorText) as { error?: string };
      errorMessage = errorJson.error ?? `HTTP ${response.status}`;
    } catch {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(
      `Failed to record incentivized interaction: ${errorMessage}`
    );
  }

  const payload = (await response.json()) as RecordIncentivizedInteractionResponse;

  if (!payload.success) {
    throw new Error("Incentivized interaction recording returned unsuccessful response");
  }

  return payload;
}

