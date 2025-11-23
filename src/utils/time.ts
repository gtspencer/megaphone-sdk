const MS_PER_SECOND = 1_000n;
const DAY_IN_SECONDS = 86_400n;
const MAX_SAFE_MS = BigInt(Number.MAX_SAFE_INTEGER);

/**
 * Normalizes a timestamp to 12:00 PM EST for that day.
 * The contract's end time is assumed to be at 12pm EST.
 * This function ensures we're working with exactly 12pm EST timestamps.
 * When these timestamps are converted to Date objects and displayed,
 * they will automatically show in the user's local timezone.
 */
export function normalizeTo12pmEST(timestamp: bigint): bigint {
  const date = toDateOrThrow(timestamp);
  
  // Get the date components in EST/EDT timezone (America/New_York)
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  
  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  
  // Create a date at midnight UTC for this date
  const utcMidnight = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00Z`);
  
  // Get what time midnight UTC is in EST/EDT
  const estMidnightStr = utcMidnight.toLocaleString("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  
  const [estHour, estMinute] = estMidnightStr.split(":").map(Number);
  
  // Calculate the offset to get to 12pm EST
  // If UTC midnight is 7pm EST (19:00), that means EST is UTC-5
  // So 12pm EST = 5pm UTC (17:00), which is 17 hours after UTC midnight
  // If UTC midnight is 8pm EDT (20:00), that means EDT is UTC-4
  // So 12pm EDT = 4pm UTC (16:00), which is 16 hours after UTC midnight
  // 
  // Formula: hoursToAdd = (24 - estHour) + 12 = 36 - estHour
  // This gives us the UTC time that corresponds to 12pm EST/EDT
  const hoursToAdd = 36 - estHour;
  const minutesToSubtract = estMinute;
  
  const normalizedDate = new Date(
    utcMidnight.getTime() + hoursToAdd * 60 * 60 * 1000 - minutesToSubtract * 60 * 1000
  );
  
  return BigInt(Math.floor(normalizedDate.getTime() / 1000));
}

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

