import React, {
  type ButtonHTMLAttributes,
  type CSSProperties,
  type FormEvent,
  useEffect,
  useMemo,
  useState
} from "react";

import type { Address } from "viem";
import { formatUnits } from "viem";
import { useConfig } from "wagmi";

import type { Megaphone } from "../../client";
import type { MegaphoneOptions } from "../../types";
import { simplifyErrorMessage } from "../../utils/errors";
import { useMegaphoneClient } from "../hooks/useMegaphoneClient";
import { usePreBuyAmount } from "../hooks/usePreBuyAmount";

export interface ReservePanelProps {
  account: Address;
  fid: bigint;
  name: string;
  auctionId?: bigint;
  referrer?: Address;
  showAuctionIdInput?: boolean;
  buttonText?: string;
  formatButtonLabel?: (amount: bigint) => string;
  formatAmount?: (amount: bigint) => string;
  loadingText?: string;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  buttonProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  onSuccess?: (result: { auctionId: bigint; success: boolean }) => void;
  onError?: (error: unknown) => void;
  client?: Megaphone;
  clientOptions?: MegaphoneOptions;
}

function defaultFormatAmount(amount: bigint): string {
  const formatted = formatUnits(amount, 6);
  const num = parseFloat(formatted);
  return num.toFixed(2);
}

function parseAuctionId(value: string): bigint | null {
  if (!value.trim()) {
    return null;
  }
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

export function ReservePanel({
  account,
  fid,
  name,
  auctionId: auctionIdProp,
  referrer,
  showAuctionIdInput,
  buttonText,
  formatButtonLabel,
  formatAmount = defaultFormatAmount,
  loadingText = "Loading…",
  disabled,
  className,
  style,
  buttonProps,
  onSuccess,
  onError,
  client,
  clientOptions
}: ReservePanelProps) {
  const wagmiConfig = useConfig();

  const megaphone = useMegaphoneClient({
    client,
    apiKey: clientOptions?.apiKey,
    isTestnet: clientOptions?.isTestnet,
    operatorFid: clientOptions?.operatorFid
  });

  const debug = clientOptions?.debug ?? false;

  const { amount, loading: amountLoading, error: amountError } =
    usePreBuyAmount(megaphone, wagmiConfig);

  const [auctionIdInput, setAuctionIdInput] = useState(
    auctionIdProp ? auctionIdProp.toString() : ""
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (auctionIdProp) {
      setAuctionIdInput(auctionIdProp.toString());
    }
  }, [auctionIdProp]);

  const resolvedAuctionId = useMemo<bigint | null>(() => {
    if (showAuctionIdInput) {
      return parseAuctionId(auctionIdInput);
    }
    return auctionIdProp ?? null;
  }, [showAuctionIdInput, auctionIdInput, auctionIdProp]);

  const amountLabel = useMemo(() => {
    if (!amount) {
      return undefined;
    }
    return formatAmount(amount);
  }, [amount, formatAmount]);

  const computedButtonLabel = useMemo(() => {
    if (buttonText) {
      return buttonText;
    }
    if (amount && formatButtonLabel) {
      return formatButtonLabel(amount);
    }
    if (amountLabel) {
      return `Reserve the Megaphone for ${amountLabel}`;
    }
    return loadingText;
  }, [buttonText, amount, formatButtonLabel, amountLabel, loadingText]);

  const isLoading = amountLoading || submitting;
  const isButtonDisabled =
    disabled ||
    isLoading ||
    !resolvedAuctionId ||
    amount == null ||
    amountLoading;

  const activeError = submitError
    ? submitError
    : amountError
      ? simplifyErrorMessage(amountError, debug)
      : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resolvedAuctionId || amount == null || amountLoading) {
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const supportsRevShare =
        Boolean(megaphone.configuration.apiKey) && Boolean(referrer);

      const success = supportsRevShare
        ? await megaphone.preBuyWithRevShare({
            auctionId: resolvedAuctionId,
            fid,
            name,
            account,
            config: wagmiConfig,
            referrer: referrer!
          })
        : await megaphone.preBuy({
            auctionId: resolvedAuctionId,
            fid,
            name,
            account,
            config: wagmiConfig
          });

      if (!success) {
        throw new Error("Pre-buy transaction did not complete successfully.");
      }

      onSuccess?.({ auctionId: resolvedAuctionId, success });
    } catch (error) {
      const message = simplifyErrorMessage(error, debug);
      setSubmitError(message);
      onError?.(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={className}
      style={style}
      aria-busy={isLoading}
    >
      {showAuctionIdInput ? (
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Auction ID
          <input
            type="number"
            min="0"
            step="1"
            value={auctionIdInput}
            onChange={(event) => setAuctionIdInput(event.target.value)}
            style={{ display: "block", marginTop: "0.25rem", width: "100%" }}
          />
        </label>
      ) : null}

      <button
        type="submit"
        disabled={isButtonDisabled}
        {...buttonProps}
      >
        {isLoading ? loadingText : computedButtonLabel}
      </button>

      {activeError ? (
        <p role="alert" style={{ color: "red", marginTop: "0.5rem" }}>
          {activeError}
        </p>
      ) : null}
    </form>
  );
}

