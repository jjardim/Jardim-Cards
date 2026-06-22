import * as SecureStore from "expo-secure-store";

const TARGET_PROFIT_KEY = "cards_target_profit_pct";

export const DEFAULT_TARGET_PROFIT_PCT = 20;
export const NEAR_TARGET_BUFFER_PCT = 5;

export const TARGET_PROFIT_OPTIONS = [10, 15, 20, 25, 30, 50] as const;

export async function loadTargetProfitPct(): Promise<number> {
  try {
    const raw = await SecureStore.getItemAsync(TARGET_PROFIT_KEY);
    if (!raw) return DEFAULT_TARGET_PROFIT_PCT;
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 500) {
      return DEFAULT_TARGET_PROFIT_PCT;
    }
    return parsed;
  } catch {
    return DEFAULT_TARGET_PROFIT_PCT;
  }
}

export async function saveTargetProfitPct(pct: number): Promise<void> {
  await SecureStore.setItemAsync(TARGET_PROFIT_KEY, String(Math.round(pct)));
}
