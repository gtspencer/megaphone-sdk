const MS_PER_SECOND = 1_000n;
const DAY_IN_SECONDS = 86_400n;
const MAX_SAFE_MS = BigInt(Number.MAX_SAFE_INTEGER);

export function addDays(timestamp: bigint, days: bigint): bigint {
  return timestamp + days * DAY_IN_SECONDS;
}

export function toDateOrThrow(timestamp: bigint): Date {
  const milliseconds = timestamp * MS_PER_SECOND;
  if (milliseconds > MAX_SAFE_MS) {
    throw new Error("Timestamp exceeds supported JavaScript date range.");
  }
  return new Date(Number(milliseconds));
}

