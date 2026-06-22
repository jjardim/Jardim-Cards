import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_TARGET_PROFIT_PCT,
  loadTargetProfitPct,
  saveTargetProfitPct,
} from "./user-preferences";

interface UserPreferencesContextValue {
  targetProfitPct: number;
  setTargetProfitPct: (pct: number) => Promise<void>;
  preferencesReady: boolean;
}

const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [targetProfitPct, setTargetProfitPctState] = useState(DEFAULT_TARGET_PROFIT_PCT);
  const [preferencesReady, setPreferencesReady] = useState(false);

  useEffect(() => {
    loadTargetProfitPct()
      .then(setTargetProfitPctState)
      .finally(() => setPreferencesReady(true));
  }, []);

  const setTargetProfitPct = useCallback(async (pct: number) => {
    const rounded = Math.max(1, Math.min(500, Math.round(pct)));
    setTargetProfitPctState(rounded);
    await saveTargetProfitPct(rounded);
  }, []);

  const value = useMemo(
    () => ({ targetProfitPct, setTargetProfitPct, preferencesReady }),
    [targetProfitPct, setTargetProfitPct, preferencesReady]
  );

  return (
    <UserPreferencesContext.Provider value={value}>{children}</UserPreferencesContext.Provider>
  );
}

export function useUserPreferences(): UserPreferencesContextValue {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) {
    throw new Error("useUserPreferences must be used within UserPreferencesProvider");
  }
  return ctx;
}
