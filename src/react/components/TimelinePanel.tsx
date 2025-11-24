import React, { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from "react";

import type { Address } from "viem";
import { formatUnits } from "viem";
import { useConfig } from "wagmi";

import type { Megaphone } from "../../client";
import type { MegaphoneOptions, PreBuyWindowDay } from "../../types";
import { simplifyErrorMessage } from "../../utils/errors";
import { useMegaphoneClient } from "../hooks/useMegaphoneClient";
import { usePreBuyData } from "../hooks/usePreBuyData";

export interface TimelinePanelProps {
  account: Address;
  fid: bigint;
  name: string;
  referrer?: Address;
  renderDay?: (
    day: PreBuyWindowDay,
    options: { selected: boolean; select: () => void; isBought: boolean }
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
  clientOptions
}: TimelinePanelProps) {
  const wagmiConfig = useConfig();

  const megaphone = useMegaphoneClient({
    client,
    apiKey: clientOptions?.apiKey,
    isTestnet: clientOptions?.isTestnet,
    operatorFid: clientOptions?.operatorFid
  });

  const debug = clientOptions?.debug ?? false;

  const preBuyDataParams = useMemo(
    () => ({ config: wagmiConfig }),
    [wagmiConfig]
  );

  const {
    data: preBuyData,
    loading: dataLoading,
    error: dataError
  } = usePreBuyData(megaphone, preBuyDataParams);

  const [days, setDays] = useState<PreBuyWindowDay[]>([]);
  const [windowLoading, setWindowLoading] = useState(false);

  useEffect(() => {
    if (!megaphone || !wagmiConfig) {
      setDays([]);
      setWindowLoading(false);
      return;
    }

    let cancelled = false;

    async function loadWindow() {
      setWindowLoading(true);
      try {
        const result = await megaphone.getPreBuyWindow({ config: wagmiConfig });
        if (!cancelled) {
          setDays(result);
        }
      } catch (err) {
        // Error will be handled by dataError from usePreBuyData
        if (!cancelled) {
          setDays([]);
        }
      } finally {
        if (!cancelled) {
          setWindowLoading(false);
        }
      }
    }

    loadWindow();

    return () => {
      cancelled = true;
    };
  }, [megaphone, wagmiConfig]);

  const amount = preBuyData?.currentPreBuyPrice ?? null;

  const [selectedAuctionId, setSelectedAuctionId] = useState<bigint | null>(
    null
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successfulAuctionId, setSuccessfulAuctionId] = useState<bigint | null>(null);

  useEffect(() => {
    // Only select from available days
    const availableDays = days.filter((day) => day.available);
    
    if (availableDays.length === 0) {
      setSelectedAuctionId(null);
      return;
    }
    
    // If current selection is invalid (not available or doesn't exist), select first available
    const currentDay = days.find((day) => day.auctionId === selectedAuctionId);
    if (
      selectedAuctionId === null ||
      !currentDay ||
      !currentDay.available
    ) {
      setSelectedAuctionId(availableDays[0]?.auctionId ?? null);
    }
  }, [days, selectedAuctionId]);

  // Clear success message when days change (e.g., after refetch)
  useEffect(() => {
    if (successfulAuctionId && !days.find((day) => day.auctionId === successfulAuctionId)) {
      setSuccessfulAuctionId(null);
    }
  }, [days, successfulAuctionId]);

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

  const isLoading = dataLoading || windowLoading || submitting;
  const selectedDay = days.find((day) => day.auctionId === selectedAuctionId);
  const readyToReserve =
    !disabled &&
    !isLoading &&
    amount != null &&
    selectedAuctionId != null &&
    selectedDay != null &&
    selectedDay.available;

  const activeError = submitError
    ? submitError
    : dataError
      ? simplifyErrorMessage(dataError, debug)
      : null;

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

      // Set successful auction ID to show success message
      setSuccessfulAuctionId(auctionId);
      setSubmitError(null);
      
      onSuccess?.({ auctionId, success });
    } catch (error) {
      const message = simplifyErrorMessage(error, debug);
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
              const isBought = !day.available;
              const isSuccessfullyPurchased = successfulAuctionId === day.auctionId;
              const onSelect = () => {
                if (day.available && !isSuccessfullyPurchased) {
                  setSelectedAuctionId(day.auctionId);
                }
              };

              return (
                <li key={day.auctionId.toString()}>
                  {renderDay ? (
                    renderDay(day, { selected, select: onSelect, isBought })
                  ) : (
                    <button
                      type="button"
                      onClick={onSelect}
                      disabled={!day.available || isSuccessfullyPurchased}
                      style={{
                        padding: "0.375rem 0.5rem",
                        borderRadius: "0.5rem",
                        border: selected
                          ? "2px solid #000"
                          : "1px solid #ccc",
                        backgroundColor: selected
                          ? "#000"
                          : !day.available || isSuccessfullyPurchased
                            ? "#f0f0f0"
                            : "transparent",
                        color: selected
                          ? "#fff"
                          : !day.available || isSuccessfullyPurchased
                            ? "#999"
                            : "inherit",
                        cursor: !day.available || isSuccessfullyPurchased ? "not-allowed" : "pointer",
                        opacity: !day.available || isSuccessfullyPurchased ? 0.6 : 1,
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
      
      {successfulAuctionId ? (() => {
        const successfulDay = days.find((day) => day.auctionId === successfulAuctionId);
        if (!successfulDay) return null;
        
        const formattedDate = successfulDay.date.toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric"
        });
        
        return (
          <p style={{ color: "green", marginTop: "0.5rem", fontWeight: "500" }}>
            📢 Success! Visit the Megaphone app on {formattedDate}
          </p>
        );
      })() : null}
    </div>
  );
}

