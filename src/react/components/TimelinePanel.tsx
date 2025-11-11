import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import type { Address } from "viem";
import { formatUnits } from "viem";
import type { Config } from "wagmi";

import type { Megaphone } from "../../client";
import type { AvailableDay, MegaphoneOptions } from "../../types";
import { useMegaphoneClient } from "../hooks/useMegaphoneClient";
import { usePreBuyAmount } from "../hooks/usePreBuyAmount";
import { useAvailableDays } from "../hooks/useAvailableDays";

export interface TimelinePanelProps {
  config: Config;
  account: Address;
  fid: bigint;
  name: string;
  referrer?: Address;
  renderDay?: (
    day: AvailableDay,
    options: { selected: boolean; select: () => void }
  ) => ReactNode;
  buttonText?: string;
  formatButtonLabel?: (amount: bigint) => string;
  formatAmount?: (amount: bigint) => string;
  loadingText?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  onSuccess?: (result: { auctionId: bigint; success: boolean }) => void;
  onError?: (error: unknown) => void;
  client?: Megaphone;
  clientOptions?: MegaphoneOptions;
}

function defaultFormatAmount(amount: bigint): string {
  return formatUnits(amount, 6);
}

export function TimelinePanel({
  config,
  account,
  fid,
  name,
  referrer,
  renderDay,
  buttonText,
  formatButtonLabel,
  formatAmount = defaultFormatAmount,
  loadingText = "Loading…",
  emptyText = "No pre-buy days are currently available.",
  disabled,
  className,
  style,
  onSuccess,
  onError,
  client,
  clientOptions
}: TimelinePanelProps) {
  const megaphone = useMegaphoneClient({
    client,
    apiKey: clientOptions?.apiKey
  });

  const { amount, loading: amountLoading, error: amountError } =
    usePreBuyAmount(megaphone, config);

  const availableDaysParams = useMemo(
    () => ({ config }),
    [config]
  );

  const {
    days,
    loading: daysLoading,
    error: daysError
  } = useAvailableDays(megaphone, availableDaysParams);

  const [selectedAuctionId, setSelectedAuctionId] = useState<bigint | null>(
    null
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (days.length === 0) {
      setSelectedAuctionId(null);
      return;
    }
    if (
      selectedAuctionId === null ||
      !days.some((day) => day.auctionId === selectedAuctionId)
    ) {
      setSelectedAuctionId(days[0]?.auctionId ?? null);
    }
  }, [days, selectedAuctionId]);

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

  const isLoading = amountLoading || daysLoading || submitting;
  const readyToReserve =
    !disabled &&
    !isLoading &&
    amount != null &&
    selectedAuctionId != null &&
    days.length > 0;

  const activeError =
    submitError ?? amountError?.message ?? daysError?.message ?? null;

  async function handleReserve() {
    const auctionId = selectedAuctionId;
    if (
      auctionId == null ||
      amount == null ||
      amountLoading ||
      daysLoading
    ) {
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const supportsRevShare =
        Boolean(megaphone.configuration.apiKey) && Boolean(referrer);

      const success = supportsRevShare
        ? await megaphone.preBuyWithRevShare({
            auctionId,
            fid,
            name,
            account,
            config,
            referrer: referrer!
          })
        : await megaphone.preBuy({
            auctionId,
            fid,
            name,
            account,
            config
          });

      if (!success) {
        throw new Error("Pre-buy transaction did not complete successfully.");
      }

      onSuccess?.({ auctionId, success });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      setSubmitError(message);
      onError?.(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={className} style={style} aria-busy={isLoading}>
      <div style={{ marginBottom: "1rem" }}>
        {daysLoading ? (
          <p>{loadingText}</p>
        ) : days.length === 0 ? (
          <p>{emptyText}</p>
        ) : (
          <ul
            style={{
              display: "flex",
              gap: "0.5rem",
              listStyle: "none",
              padding: 0,
              margin: 0,
              flexWrap: "wrap"
            }}
          >
            {days.map((day) => {
              const selected = day.auctionId === selectedAuctionId;
              const onSelect = () => setSelectedAuctionId(day.auctionId);

              return (
                <li key={day.auctionId.toString()}>
                  {renderDay ? (
                    renderDay(day, { selected, select: onSelect })
                  ) : (
                    <button
                      type="button"
                      onClick={onSelect}
                      style={{
                        padding: "0.5rem 0.75rem",
                        borderRadius: "0.5rem",
                        border: selected
                          ? "2px solid #000"
                          : "1px solid #ccc",
                        backgroundColor: selected ? "#000" : "transparent",
                        color: selected ? "#fff" : "inherit",
                        cursor: "pointer"
                      }}
                    >
                      <div>{day.date.toLocaleDateString()}</div>
                      <small style={{ display: "block" }}>
                        Auction #{day.auctionId.toString()}
                      </small>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <button
        type="button"
        disabled={!readyToReserve}
        onClick={handleReserve}
      >
        {isLoading ? loadingText : computedButtonLabel}
      </button>

      {activeError ? (
        <p role="alert" style={{ color: "red", marginTop: "0.5rem" }}>
          {activeError}
        </p>
      ) : null}
    </div>
  );
}

