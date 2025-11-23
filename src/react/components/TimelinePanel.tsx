import React, { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from "react";

import type { Address } from "viem";
import { formatUnits } from "viem";
import { useConfig } from "wagmi";

import type { Megaphone } from "../../client";
import type { AvailableDay, MegaphoneOptions } from "../../types";
import { useMegaphoneClient } from "../hooks/useMegaphoneClient";
import { usePreBuyData } from "../hooks/usePreBuyData";
import { addDays, normalizeTo12pmEST, toDateOrThrow } from "../../utils/time";

export interface TimelinePanelProps {
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
  isTestnet?: boolean;
}

function defaultFormatAmount(amount: bigint): string {
  const formatted = formatUnits(amount, 6);
  const num = parseFloat(formatted);
  return num.toFixed(2);
}

export function TimelinePanel({
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
  clientOptions,
  isTestnet
}: TimelinePanelProps) {
  const wagmiConfig = useConfig();

  const effectiveIsTestnet =
    clientOptions?.isTestnet ?? isTestnet ?? false;

  const megaphone = useMegaphoneClient({
    client,
    apiKey: clientOptions?.apiKey,
    isTestnet: effectiveIsTestnet,
    operatorFid: clientOptions?.operatorFid
  });

  const preBuyDataParams = useMemo(
    () => ({ config: wagmiConfig }),
    [wagmiConfig]
  );

  const {
    data: preBuyData,
    loading: dataLoading,
    error: dataError
  } = usePreBuyData(megaphone, preBuyDataParams);

  const days = useMemo<AvailableDay[]>(() => {
    if (!preBuyData) {
      return [];
    }

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
  }, [preBuyData]);

  const amount = preBuyData?.currentPreBuyPrice ?? null;

  const [selectedAuctionId, setSelectedAuctionId] = useState<bigint | null>(
    null
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Only select from available (non-bought) days
    const availableDays = days.filter((day) => !day.isBought);
    
    if (availableDays.length === 0) {
      setSelectedAuctionId(null);
      return;
    }
    
    // If current selection is invalid (bought or doesn't exist), select first available
    const currentDay = days.find((day) => day.auctionId === selectedAuctionId);
    if (
      selectedAuctionId === null ||
      !currentDay ||
      currentDay.isBought
    ) {
      setSelectedAuctionId(availableDays[0]?.auctionId ?? null);
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
      return `Reserve the Megaphone for $${amountLabel}`;
    }
    return loadingText;
  }, [buttonText, amount, formatButtonLabel, amountLabel, loadingText]);

  const isLoading = dataLoading || submitting;
  const selectedDay = days.find((day) => day.auctionId === selectedAuctionId);
  const readyToReserve =
    !disabled &&
    !isLoading &&
    amount != null &&
    selectedAuctionId != null &&
    selectedDay != null &&
    !selectedDay.isBought;

  const activeError = submitError ?? dataError?.message ?? null;

  async function handleReserve() {
    const auctionId = selectedAuctionId;
    if (auctionId == null || amount == null || dataLoading) {
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
            config: wagmiConfig,
            referrer: referrer!
          })
        : await megaphone.preBuy({
            auctionId,
            fid,
            name,
            account,
            config: wagmiConfig
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
        {dataLoading ? (
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
              const isBought = day.isBought;
              const onSelect = () => {
                if (!isBought) {
                  setSelectedAuctionId(day.auctionId);
                }
              };

              return (
                <li key={day.auctionId.toString()}>
                  {renderDay ? (
                    renderDay(day, { selected, select: onSelect })
                  ) : (
                    <button
                      type="button"
                      onClick={onSelect}
                      disabled={isBought}
                      style={{
                        padding: "0.375rem 0.5rem",
                        borderRadius: "0.5rem",
                        border: selected
                          ? "2px solid #000"
                          : "1px solid #ccc",
                        backgroundColor: selected
                          ? "#000"
                          : isBought
                            ? "#f0f0f0"
                            : "transparent",
                        color: selected
                          ? "#fff"
                          : isBought
                            ? "#999"
                            : "inherit",
                        cursor: isBought ? "not-allowed" : "pointer",
                        opacity: isBought ? 0.6 : 1,
                        fontSize: "0.875rem"
                      }}
                    >
                      {day.date.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric"
                      })}
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
        style={{
          padding: "0.75rem 1.5rem",
          borderRadius: "0.5rem",
          border: "1px solid #000",
          backgroundColor: readyToReserve ? "#000" : "#ccc",
          color: readyToReserve ? "#fff" : "#666",
          cursor: readyToReserve ? "pointer" : "not-allowed",
          fontSize: "1rem",
          fontWeight: "500",
          width: "100%",
          transition: "background-color 0.2s, color 0.2s"
        }}
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

