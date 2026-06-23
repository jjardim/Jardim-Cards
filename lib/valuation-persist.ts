import { Platform } from "react-native";
import type { PortfolioValuation } from "@/lib/api";

const STORAGE_PREFIX = "cards-portfolio-valuations:";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

interface PersistedValuations {
  cardIdsKey: string;
  savedAt: number;
  valuations: Record<string, PortfolioValuation | null>;
}

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function readRaw(userId: string): string | null {
  if (Platform.OS !== "web" || typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

function writeRaw(userId: string, payload: string): void {
  if (Platform.OS !== "web" || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(storageKey(userId), payload);
  } catch {
    // quota exceeded or private mode — ignore
  }
}

export function loadPersistedValuations(
  userId: string,
  cardIdsKey: string
): { valuations: Record<string, PortfolioValuation | null>; savedAt: number } | null {
  const raw = readRaw(userId);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PersistedValuations;
    if (parsed.cardIdsKey !== cardIdsKey) return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    if (!parsed.valuations || typeof parsed.valuations !== "object") return null;
    return { valuations: parsed.valuations, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

export function persistValuations(
  userId: string,
  cardIdsKey: string,
  valuations: Record<string, PortfolioValuation | null>
): void {
  const payload: PersistedValuations = {
    cardIdsKey,
    savedAt: Date.now(),
    valuations,
  };
  writeRaw(userId, JSON.stringify(payload));
}
