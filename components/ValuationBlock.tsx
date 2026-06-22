import { View, Text } from "react-native";
import { CompMatchBadge } from "@/components/CompMatchBadge";
import { MiniSparkline } from "@/components/MiniSparkline";
import { formatCompStatsLabel } from "@/lib/pricing/comp-match";
import type { PortfolioValuation } from "@/lib/api";
import { formatCents } from "@/lib/utils";
import { palette } from "@/lib/theme";

type ValuationDisplay = Pick<
  PortfolioValuation,
  | "currentValueCents"
  | "matchLevel"
  | "matchLabel"
  | "gradeTierUsed"
  | "recentSales"
  | "priceSource"
  | "compCountGradeSpecific"
  | "catalogVolume"
  | "numSales"
>;

interface ValuationHeaderProps {
  valuation: ValuationDisplay;
  /** e.g. "since $X added" or mismatch hint */
  subtitle?: string;
}

/** Shared market-value header: label + price + comp match badge. */
export function ValuationHeader({ valuation, subtitle }: ValuationHeaderProps) {
  const label = valuation.gradeTierUsed
    ? `MARKET VALUE · ${valuation.gradeTierUsed}`
    : "MARKET VALUE";

  return (
    <View style={{ flex: 1 }}>
      <Text
        style={{ fontSize: 10, color: palette.textSubtle, fontWeight: "700", letterSpacing: 0.3 }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: palette.text,
          marginTop: 2,
          letterSpacing: -0.4,
        }}
      >
        {formatCents(valuation.currentValueCents)}
      </Text>
      <View style={{ marginTop: 6, alignSelf: "flex-start" }}>
        <CompMatchBadge level={valuation.matchLevel} label={valuation.matchLabel} />
      </View>
      {subtitle ? (
        <Text style={{ fontSize: 11, color: palette.textSubtle, marginTop: 4 }}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

interface ValuationCompFooterProps {
  valuation: ValuationDisplay;
  sparklineColor: string;
  /** Prefix before comp stats, e.g. "30d +5.2% · " */
  prefix?: string;
}

/** Shared comp stats line + optional sparkline. */
export function ValuationCompFooter({
  valuation,
  sparklineColor,
  prefix,
}: ValuationCompFooterProps) {
  if (valuation.recentSales.length < 2) return null;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 10,
      }}
    >
      <Text style={{ fontSize: 11, color: palette.textSubtle }}>
        {prefix}
        {formatCompStatsLabel(valuation)}
      </Text>
      <MiniSparkline
        data={valuation.recentSales.map((s) => s.priceCents)}
        color={sparklineColor}
        width={60}
        height={20}
      />
    </View>
  );
}
