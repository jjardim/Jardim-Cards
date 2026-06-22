/**
 * Material 3 Expressive design tokens — experimental theme for the M3
 * preview screens. Kept fully separate from `lib/theme.ts` so we can A/B
 * the look without touching the rest of the app.
 *
 * References:
 *   https://m3.material.io/
 *   https://m3.material.io/blog/building-with-m3-expressive
 *
 * Tactics this theme supports:
 *   1. Variety of shapes (10-step radius scale)
 *   2. Rich, nuanced colors (primary / secondary / tertiary + 5 surface tones)
 *   3. Emphasized typography (heavier weights, tighter tracking, Display scale)
 *   4. Contained content (surfaceContainer family)
 *   5. Fluid motion (spring presets)
 */
import type { TextStyle, ViewStyle } from "react-native";

/**
 * Custom "expressive" light color scheme tuned for a sports cards / TCG app.
 * Saffron primary (energetic, money-feel) + deep indigo secondary +
 * teal tertiary. Warm neutral surfaces with a paper-like cream wash.
 */
export const m3Color = {
  primary: "#A6480F",
  onPrimary: "#FFFFFF",
  primaryContainer: "#FFDBC8",
  onPrimaryContainer: "#380D00",

  secondary: "#5B5891",
  onSecondary: "#FFFFFF",
  secondaryContainer: "#E3DFFF",
  onSecondaryContainer: "#171249",

  tertiary: "#1F6C6F",
  onTertiary: "#FFFFFF",
  tertiaryContainer: "#A4EEF1",
  onTertiaryContainer: "#002022",

  error: "#BA1A1A",
  onError: "#FFFFFF",
  errorContainer: "#FFDAD6",
  onErrorContainer: "#410002",

  // Semantic success (M3 doesn't ship one — derived to match tertiary family)
  success: "#1B6F3D",
  successContainer: "#B6F2C7",
  onSuccessContainer: "#00210E",

  background: "#FFF8F5",
  onBackground: "#221A15",

  surface: "#FFF8F5",
  onSurface: "#221A15",
  surfaceVariant: "#F5DED1",
  onSurfaceVariant: "#52443D",

  // 5-step surface container scale — the heart of M3 tonal hierarchy
  surfaceContainerLowest: "#FFFFFF",
  surfaceContainerLow: "#FFF1EA",
  surfaceContainer: "#FBEBE3",
  surfaceContainerHigh: "#F5E4DC",
  surfaceContainerHighest: "#EFDED5",

  outline: "#85756C",
  outlineVariant: "#D7C3B8",
  scrim: "#000000",

  inverseSurface: "#382E29",
  inverseOnSurface: "#FFEDE3",
  inversePrimary: "#FFB68F",
} as const;

export type M3Color = typeof m3Color;

/**
 * 10-step shape scale (M3 Expressive expanded the original 5-step scale).
 * Use a *variety* of these on the same screen to create rhythm.
 */
export const m3Shape = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
  huge: 48,
  full: 9999,
} as const;

/**
 * 4dp spacing scale.
 */
export const m3Space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

/**
 * M3 Expressive type scale, including emphasized variants (heavier weight,
 * tighter tracking). Use `*Emphasized` to make headlines hit harder — this
 * is one of M3 Expressive's signature moves.
 */
export const m3Type = {
  displayLarge: { fontSize: 57, lineHeight: 64, fontWeight: "400", letterSpacing: -0.25 },
  displayMedium: { fontSize: 45, lineHeight: 52, fontWeight: "400", letterSpacing: 0 },
  displaySmall: { fontSize: 36, lineHeight: 44, fontWeight: "400", letterSpacing: 0 },

  displayLargeEmphasized: { fontSize: 57, lineHeight: 60, fontWeight: "800", letterSpacing: -1.2 },
  displayMediumEmphasized: { fontSize: 45, lineHeight: 50, fontWeight: "800", letterSpacing: -0.8 },
  displaySmallEmphasized: { fontSize: 36, lineHeight: 42, fontWeight: "800", letterSpacing: -0.6 },

  headlineLarge: { fontSize: 32, lineHeight: 40, fontWeight: "500", letterSpacing: 0 },
  headlineMedium: { fontSize: 28, lineHeight: 36, fontWeight: "500", letterSpacing: 0 },
  headlineSmall: { fontSize: 24, lineHeight: 32, fontWeight: "500", letterSpacing: 0 },

  headlineLargeEmphasized: { fontSize: 32, lineHeight: 38, fontWeight: "800", letterSpacing: -0.4 },
  headlineMediumEmphasized: { fontSize: 28, lineHeight: 34, fontWeight: "800", letterSpacing: -0.3 },
  headlineSmallEmphasized: { fontSize: 24, lineHeight: 30, fontWeight: "800", letterSpacing: -0.2 },

  titleLarge: { fontSize: 22, lineHeight: 28, fontWeight: "500", letterSpacing: 0 },
  titleMedium: { fontSize: 16, lineHeight: 24, fontWeight: "500", letterSpacing: 0.15 },
  titleSmall: { fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: 0.1 },

  titleLargeEmphasized: { fontSize: 22, lineHeight: 28, fontWeight: "800", letterSpacing: -0.1 },
  titleMediumEmphasized: { fontSize: 16, lineHeight: 24, fontWeight: "800", letterSpacing: 0.1 },
  titleSmallEmphasized: { fontSize: 14, lineHeight: 20, fontWeight: "800", letterSpacing: 0.1 },

  bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: "400", letterSpacing: 0.5 },
  bodyMedium: { fontSize: 14, lineHeight: 20, fontWeight: "400", letterSpacing: 0.25 },
  bodySmall: { fontSize: 12, lineHeight: 16, fontWeight: "400", letterSpacing: 0.4 },

  labelLarge: { fontSize: 14, lineHeight: 20, fontWeight: "600", letterSpacing: 0.1 },
  labelMedium: { fontSize: 12, lineHeight: 16, fontWeight: "600", letterSpacing: 0.5 },
  labelSmall: { fontSize: 11, lineHeight: 16, fontWeight: "600", letterSpacing: 0.5 },

  labelLargeEmphasized: { fontSize: 14, lineHeight: 20, fontWeight: "800", letterSpacing: 0.1 },
  labelMediumEmphasized: { fontSize: 12, lineHeight: 16, fontWeight: "800", letterSpacing: 0.5 },
} as const satisfies Record<string, TextStyle>;

/**
 * M3 Expressive elevation. Subtler than iOS shadows — more about tonal lift
 * than drop shadow. We pair small shadows with surfaceContainer color steps.
 */
export const m3Elevation: Record<"level0" | "level1" | "level2" | "level3" | "level4" | "level5", ViewStyle> = {
  level0: {},
  level1: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  level2: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  level3: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  level4: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  level5: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
};

/**
 * Spring presets for the M3 motion physics system. Use with
 * `Animated.spring` to evoke shape-morph / scale interactions.
 */
export const m3Motion = {
  // Quick reaction — buttons, chips
  springFast: { stiffness: 380, damping: 26, mass: 1 },
  // Standard interactive — cards, sheets
  springStandard: { stiffness: 260, damping: 22, mass: 1 },
  // Expressive bounce — hero / playful
  springExpressive: { stiffness: 200, damping: 14, mass: 1 },
} as const;
