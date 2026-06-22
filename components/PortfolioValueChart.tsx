import { useMemo } from "react";
import { View, Text, Dimensions } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import type { PortfolioSnapshot } from "@/lib/types";
import { palette, radius, shadow } from "@/lib/theme";
import { formatCents } from "@/lib/utils";

const CHART_WIDTH = Dimensions.get("window").width - 64;

function formatShortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  if (!y || !m || !d) return isoDate;
  const month = new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return month;
}

export function PortfolioValueChart({ snapshots }: { snapshots: PortfolioSnapshot[] }) {
  const sorted = useMemo(
    () => [...snapshots].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date)),
    [snapshots]
  );

  const chartData = useMemo(
    () =>
      sorted.map((s) => ({
        value: s.total_value_cents / 100,
        label: "",
      })),
    [sorted]
  );

  const minVal = Math.min(...chartData.map((d) => d.value));
  const maxVal = Math.max(...chartData.map((d) => d.value));
  const yOffset = Math.max(0, minVal - Math.max(1, (maxVal - minVal) * 0.1));

  const latest = sorted[sorted.length - 1];
  const first = sorted[0];
  const periodChangeCents =
    latest && first && sorted.length >= 2 ? latest.total_value_cents - first.total_value_cents : null;
  const chartColor =
    periodChangeCents === null
      ? palette.primary
      : periodChangeCents >= 0
        ? palette.success
        : palette.danger;

  if (sorted.length === 0) return null;

  return (
    <View
      style={{
        marginTop: 16,
        backgroundColor: palette.surface,
        borderRadius: radius.lg,
        padding: 16,
        ...shadow.sm,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 18 }}>{"\uD83D\uDCC8"}</Text>
          <Text
            style={{ fontSize: 16, fontWeight: "700", color: palette.text, letterSpacing: -0.2 }}
          >
            Portfolio Value
          </Text>
          <View
            style={{
              backgroundColor: palette.bgMuted,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: radius.pill,
            }}
          >
            <Text style={{ fontSize: 10, color: palette.textMuted, fontWeight: "700" }}>
              {sorted.length >= 2 ? `${sorted.length} days` : "Today"}
            </Text>
          </View>
        </View>
        {periodChangeCents !== null && (
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: periodChangeCents >= 0 ? palette.success : palette.danger,
            }}
          >
            {periodChangeCents >= 0 ? "+" : ""}
            {formatCents(periodChangeCents)}
          </Text>
        )}
      </View>

      {chartData.length >= 1 && (
        <LineChart
          data={chartData}
          width={CHART_WIDTH - 50}
          height={160}
          color={chartColor}
          thickness={3}
          curved={sorted.length >= 2}
          yAxisOffset={yOffset}
          yAxisTextStyle={{ fontSize: 10, color: palette.textSubtle }}
          yAxisLabelWidth={64}
          formatYLabel={(label) => {
            const num = Math.round(parseFloat(label));
            return Number.isFinite(num) ? `$${num.toLocaleString("en-US")}` : label;
          }}
          yAxisColor="transparent"
          xAxisColor="transparent"
          noOfSections={4}
          rulesColor={palette.borderSoft}
          rulesType="dashed"
          startFillColor={chartColor}
          endFillColor={palette.surface}
          startOpacity={0.2}
          endOpacity={0}
          areaChart
          isAnimated
          animationDuration={600}
          hideDataPoints={sorted.length < 2}
          dataPointsRadius={4}
          dataPointsColor={palette.heroDark}
          dataPointsShape="circular"
        />
      )}

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 8,
        }}
      >
        <Text style={{ fontSize: 11, color: palette.textSubtle }}>
          {formatShortDate(first.snapshot_date)}
        </Text>
        <Text style={{ fontSize: 11, color: palette.textSubtle }}>
          {formatShortDate(latest.snapshot_date)}
        </Text>
      </View>

      {sorted.length === 1 && (
        <Text style={{ fontSize: 11, color: palette.textSubtle, marginTop: 8, textAlign: "center" }}>
          Open Portfolio daily to build your value-over-time chart.
        </Text>
      )}
    </View>
  );
}
