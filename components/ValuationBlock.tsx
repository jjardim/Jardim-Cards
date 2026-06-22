import { View, Text, TouchableOpacity, Linking, Platform } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { CompMatchBadge } from "@/components/CompMatchBadge";
import { MiniSparkline } from "@/components/MiniSparkline";
import { formatCompStatsLabel, pickLastCompListing, pickTopCompListing } from "@/lib/pricing/comp-match";
import type { PortfolioValuation, SoldListing } from "@/lib/api";
import { formatCents, formatCompSaleDate } from "@/lib/utils";
import { palette, radius } from "@/lib/theme";

function openExternalUrl(url: string) {
  if (Platform.OS === "web") {
    window.open(url, "_blank");
  } else {
    Linking.openURL(url).catch(() => {});
  }
}

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

interface CompSaleLinksProps {
  listings: SoldListing[];
  grade?: string | null;
}

function CompSalePill({
  label,
  priceCents,
  date,
  ebayUrl,
  tone,
}: {
  label: string;
  priceCents: number;
  date: string;
  ebayUrl: string;
  tone: "last" | "top" | "gain";
}) {
  const styles =
    tone === "gain"
      ? {
          bg: palette.successBg,
          border: palette.success,
          labelColor: palette.success,
          priceColor: palette.text,
        }
      : tone === "top"
        ? {
            bg: palette.primaryBg,
            border: palette.primaryBg,
            labelColor: palette.primary,
            priceColor: palette.primary,
          }
        : {
            bg: palette.surfaceAlt,
            border: palette.borderSoft,
            labelColor: palette.textSubtle,
            priceColor: palette.text,
          };

  return (
    <TouchableOpacity
      onPress={(e) => {
        e.stopPropagation?.();
        openExternalUrl(ebayUrl);
      }}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: radius.pill,
        backgroundColor: styles.bg,
        borderWidth: 1,
        borderColor: styles.border,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: "800",
          color: styles.labelColor,
          letterSpacing: 0.4,
        }}
      >
        {label.toUpperCase()}
      </Text>
      <Text style={{ fontSize: 11, fontWeight: "700", color: styles.priceColor }}>
        {formatCents(priceCents)}
      </Text>
      <Text style={{ fontSize: 10, color: palette.textSubtle }}>
        {formatCompSaleDate(date)}
      </Text>
      <FontAwesome name="external-link" size={9} color={styles.labelColor} />
    </TouchableOpacity>
  );
}

/** Last sale + highest comp pills — tap to open eBay listing. */
export function CompSaleLinks({
  listings,
  grade,
  lastAccent,
}: CompSaleLinksProps & { lastAccent?: boolean }) {
  const last = pickLastCompListing(listings, grade);
  const top = pickTopCompListing(listings, grade);
  const showTop =
    top?.ebayUrl &&
    last?.ebayUrl &&
    (top.ebayUrl !== last.ebayUrl || top.priceCents !== last.priceCents);

  if (!last?.ebayUrl && !top?.ebayUrl) return null;

  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 8,
        alignSelf: "flex-start",
      }}
    >
      {last?.ebayUrl ? (
        <CompSalePill
          label="Last sale"
          priceCents={last.priceCents}
          date={last.date}
          ebayUrl={last.ebayUrl}
          tone={lastAccent ? "gain" : "last"}
        />
      ) : null}
      {showTop && top ? (
        <CompSalePill
          label="Top comp"
          priceCents={top.priceCents}
          date={top.date}
          ebayUrl={top.ebayUrl}
          tone="top"
        />
      ) : null}
    </View>
  );
}

/** @deprecated Use CompSaleLinks */
export function TopCompLink({ listings, grade }: CompSaleLinksProps) {
  return <CompSaleLinks listings={listings} grade={grade} />;
}

interface PortfolioGainHeroProps {
  paidCents: number;
  worthNowCents: number;
  plCents: number;
  plPct: number;
  valuation: ValuationDisplay & { soldListings: SoldListing[] };
  grade?: string | null;
}

/**
 * Win-state portfolio row: paid → worth now (sell estimate) + last sale proof.
 * Only shown when unrealized gain is positive.
 */
export function PortfolioGainHero({
  paidCents,
  worthNowCents,
  plCents,
  plPct,
  valuation,
  grade,
}: PortfolioGainHeroProps) {
  const tier = valuation.gradeTierUsed ?? "Raw";

  return (
    <View
      style={{
        backgroundColor: palette.successBg,
        borderRadius: radius.md,
        padding: 12,
        borderWidth: 1,
        borderColor: palette.success,
        marginBottom: 10,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            fontSize: 10,
            fontWeight: "800",
            color: palette.success,
            letterSpacing: 0.5,
          }}
        >
          IF YOU SELL TODAY
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: palette.surface,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: radius.pill,
          }}
        >
          <FontAwesome name="arrow-up" size={9} color={palette.success} />
          <Text style={{ fontSize: 12, fontWeight: "800", color: palette.success }}>
            {`+${formatCents(plCents)}`}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: "700", color: palette.success }}>
            {`(${plPct >= 0 ? "+" : ""}${plPct.toFixed(1)}%)`}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: "700",
              color: palette.textSubtle,
              letterSpacing: 0.3,
            }}
          >
            YOU PAID
          </Text>
          <Text
            style={{
              fontSize: 17,
              fontWeight: "600",
              color: palette.textMuted,
              marginTop: 4,
              letterSpacing: -0.3,
            }}
          >
            {formatCents(paidCents)}
          </Text>
        </View>

        <FontAwesome name="long-arrow-right" size={14} color={palette.success} style={{ marginBottom: 6 }} />

        <View style={{ flex: 1.15, alignItems: "flex-end" }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: "700",
              color: palette.success,
              letterSpacing: 0.3,
            }}
          >
            {`WORTH NOW · ${tier}`}
          </Text>
          <Text
            style={{
              fontSize: 30,
              fontWeight: "800",
              color: palette.success,
              marginTop: 2,
              letterSpacing: -1,
            }}
          >
            {formatCents(worthNowCents)}
          </Text>
          <Text
            style={{
              fontSize: 10,
              color: palette.textMuted,
              marginTop: 2,
              textAlign: "right",
            }}
          >
            Sell estimate (avg recent comps)
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 8, alignSelf: "flex-start" }}>
        <CompMatchBadge level={valuation.matchLevel} label={valuation.matchLabel} />
      </View>

      <CompSaleLinks
        listings={valuation.soldListings}
        grade={grade}
        lastAccent
      />

      <Text style={{ fontSize: 10, color: palette.textSubtle, marginTop: 8, lineHeight: 14 }}>
        Worth now is our comp average — what you&apos;d likely list at. Last sale is the freshest
        eBay sold proof (tap to check).
      </Text>
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
