/**
 * Simplifies error messages for user-facing display.
 * When debug is false, shows friendly messages instead of technical details.
 */
export function simplifyErrorMessage(error: unknown, debug: boolean): string {
  if (debug) {
    return error instanceof Error ? error.message : String(error);
  }

  const errorMessage =
    error instanceof Error ? error.message : String(error);
  const errorString = errorMessage.toLowerCase();

  // User rejection errors
  if (
    errorString.includes("user rejected") ||
    errorString.includes("user denied") ||
    errorString.includes("rejected the request") ||
    errorString.includes("user rejected the request")
  ) {
    return "User rejected the request";
  }

  // Chain configuration errors
  if (
    errorString.includes("chain not configured") ||
    errorString.includes("chain id") ||
    errorString.includes("does not match the target chain")
  ) {
    return "Chain not configured. Please switch to the correct network.";
  }

  // Transaction errors
  if (
    errorString.includes("insufficient funds") ||
    errorString.includes("insufficient balance")
  ) {
    return "Insufficient funds";
  }

  if (
    errorString.includes("transaction") &&
    (errorString.includes("failed") || errorString.includes("reverted"))
  ) {
    return "Transaction failed";
  }

  // Network errors
  if (
    errorString.includes("network") ||
    errorString.includes("connection") ||
    errorString.includes("fetch")
  ) {
    return "Network error. Please try again.";
  }

  // Generic fallback
  return "An error occurred. Please try again.";
}

