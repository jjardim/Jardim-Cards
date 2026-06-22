/** eBay OAuth connection status from `ebay-auth` action `status`. */
export interface EbayConnectionStatus {
  connected: boolean;
  ebayUsername: string | null;
  connectedAt: string | null;
  /** @deprecated Use needsReconnect — was true whenever the 2h access token lapsed */
  tokenExpired: boolean;
  needsReconnect: boolean;
  accessTokenExpiry: string | null;
  refreshTokenExpiry: string | null;
  daysUntilRefreshExpiry: number | null;
}

export const EBAY_REFRESH_WARN_DAYS = 7;
export const EBAY_REFRESH_NOTICE_DAYS = 30;

/** Days until the long-lived refresh token expires (when re-consent is required). */
export function daysUntilRefreshExpiry(refreshTokenExpiry: string | null): number | null {
  if (!refreshTokenExpiry) return null;
  const ms = new Date(refreshTokenExpiry).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export function formatEbayRefreshCountdown(days: number | null): string | null {
  if (days === null) return null;
  if (days <= 0) return "Re-auth required";
  if (days === 1) return "1 day until re-auth";
  return `${days} days until re-auth`;
}

export function ebayNeedsReconnect(status: EbayConnectionStatus | null): boolean {
  if (!status?.connected) return false;
  return status.needsReconnect || status.tokenExpired;
}
