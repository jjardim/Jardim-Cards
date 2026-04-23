import type { ViewStyle } from "react-native";

/**
 * Cards App design tokens.
 *
 * Inspired by the "Personal Productivity Dashboard" Dribbble palette:
 * pastel blue wash, pure white surfaces, one dark hero card, pill buttons,
 * soft generous corners and subtle shadows.
 */

export const palette = {
  // Backgrounds
  bg: "#eaf2fb",         // app wash (soft pastel blue)
  bgSoft: "#dbeafe",     // deeper pastel blue accent wash
  bgMuted: "#f4f7fb",    // quiet surface behind secondary content
  surface: "#ffffff",    // card / sheet surface
  surfaceAlt: "#f8fafc", // quieter surface (chips, inputs)
  heroDark: "#0f172a",   // dark "hero" card surface
  heroDarkAlt: "#1e293b",

  // Text
  text: "#0f172a",        // primary text
  textMuted: "#64748b",   // secondary text
  textSubtle: "#94a3b8",  // tertiary / captions
  textInverse: "#ffffff",
  textInverseMuted: "#cbd5e1",

  // Borders (used sparingly; prefer shadows)
  borderSoft: "#e2e8f0",

  // Accents
  primary: "#3b82f6",     // primary blue
  primarySoft: "#60a5fa",
  primaryBg: "#dbeafe",

  success: "#22c55e",
  successBg: "#dcfce7",
  danger: "#ef4444",
  dangerBg: "#fee2e2",
  warning: "#f59e0b",
  warningBg: "#fef3c7",

  purple: "#8b5cf6",
  purpleBg: "#ede9fe",
  pink: "#fda4af",
  pinkBg: "#ffe4e6",
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const typography = {
  display: { fontSize: 32, fontWeight: "700" as const, color: palette.text },
  title: { fontSize: 22, fontWeight: "700" as const, color: palette.text },
  h2: { fontSize: 18, fontWeight: "700" as const, color: palette.text },
  body: { fontSize: 14, color: palette.text },
  caption: { fontSize: 12, color: palette.textMuted },
  micro: { fontSize: 11, color: palette.textSubtle },
} as const;

export const shadow: {
  sm: ViewStyle;
  md: ViewStyle;
  lg: ViewStyle;
  hero: ViewStyle;
} = {
  sm: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  hero: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 12,
  },
};

export type Sport = "baseball" | "basketball" | "football" | "hockey" | "soccer";

/**
 * Per-sport accent colors so the app feels alive and sporty.
 * Baseball red, basketball orange, football brown-ish, hockey cyan, soccer green.
 */
export const sportTheme: Record<
  string,
  { color: string; bg: string; emoji: string; label: string }
> = {
  baseball: { color: "#ef4444", bg: "#fee2e2", emoji: "\u26BE", label: "Baseball" },
  basketball: { color: "#f97316", bg: "#ffedd5", emoji: "\uD83C\uDFC0", label: "Basketball" },
  football: { color: "#8b5cf6", bg: "#ede9fe", emoji: "\uD83C\uDFC8", label: "Football" },
  hockey: { color: "#06b6d4", bg: "#cffafe", emoji: "\uD83C\uDFD2", label: "Hockey" },
  soccer: { color: "#22c55e", bg: "#dcfce7", emoji: "\u26BD", label: "Soccer" },
  pokemon: { color: "#eab308", bg: "#fef9c3", emoji: "\u2728", label: "Pok\u00E9mon" },
  formula1: { color: "#dc2626", bg: "#fee2e2", emoji: "\uD83C\uDFCE", label: "Formula 1" },
};

export function getSportTheme(sport: string | null | undefined) {
  if (!sport) return { color: palette.primary, bg: palette.primaryBg, emoji: "\uD83C\uDFAF", label: "All" };
  return sportTheme[sport.toLowerCase()] ?? {
    color: palette.primary,
    bg: palette.primaryBg,
    emoji: "\uD83C\uDFAF",
    label: sport,
  };
}

/**
 * Canonical surface style for a "soft" content card
 * (white surface, rounded corners, subtle shadow, no border).
 */
export const surfaceCard: ViewStyle = {
  backgroundColor: palette.surface,
  borderRadius: radius.lg,
  ...shadow.sm,
};

/**
 * Canonical pill button style.
 */
export const pillButton = (bg: string = palette.primary): ViewStyle => ({
  backgroundColor: bg,
  borderRadius: radius.pill,
  paddingHorizontal: 18,
  paddingVertical: 10,
  alignItems: "center",
  justifyContent: "center",
});
