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

function computeYAxisBounds(values: number[]): { yOffset: number; maxValue?: number } {
  if (values.length === 0) return { yOffset: 0 };

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal;
  const minVisualRange = Math.max(maxVal * 0.04, 10);

  if (range >= minVisualRange) {
    return { yOffset: Math.max(0, minVal - range * 0.12) };
  }

  const mid = (minVal + maxVal) / 2;
  const paddedMin = Math.max(0, mid - minVisualRange / 2);
  return { yOffset: paddedMin, maxValue: paddedMin + minVisualRange };
}

export function PortfolioValueChart({ snapshots }: { snapshots: PortfolioSnapshot[] }) {
  const sorted = useMemo(
    () => [...snapshots].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date)),
    [snapshots]
  );

  const isBootstrap = sorted.length === 1;
  const latest = sorted[sorted.length - 1];
  const first = sorted[0];

  const chartData = useMemo(() => {
    if (sorted.length === 1) {
      const snap = sorted[0];
      return [
        { value: snap.total_cost_cents / 100, label: "" },
        { value: snap.total_value_cents / 100, label: "" },
      ];
    }
    return sorted.map((s) => ({
      value: s.total_value_cents / 100,
      label: "",
    }));
  }, [sorted]);

  const yBounds = useMemo(
    () => computeYAxisBounds(chartData.map((d) => d.value)),
    [chartData]
  );

  const periodChangeCents = useMemo(() => {
    if (isBootstrap && latest) {
      return latest.total_value_cents - latest.total_cost_cents;
    }
    if (latest && first && sorted.length >= 2) {
      return latest.total_value_cents - first.total_value_cents;
    }
    return null;
  }, [isBootstrap, latest, first, sorted.length]);

  const chartColor =
    periodChangeCents === null
      ? palette.primary
      : periodChangeCents >= 0
        ? palette.success
        : palette.danger;

  if (sorted.length === 0) return null;

  const xStartLabel = isBootstrap ? "Cost basis" : formatShortDate(first.snapshot_date);
  const xEndLabel = isBootstrap ? "Today" : formatShortDate(latest.snapshot_date);

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
              {sorted.length >= 2 ? `${sorted.length} days` : "Day 1"}
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

      <LineChart
        data={chartData}
        width={CHART_WIDTH - 50}
        height={160}
        color={chartColor}
        thickness={3}
        curved={chartData.length >= 3}
        yAxisOffset={yBounds.yOffset}
        maxValue={yBounds.maxValue}
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
        hideDataPoints={false}
        dataPointsRadius={5}
        dataPointsColor={palette.heroDark}
        dataPointsShape="circular"
      />

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 8,
          paddingLeft: 50,
        }}
      >
        <Text style={{ fontSize: 11, color: palette.textSubtle }}>{xStartLabel}</Text>
        <Text style={{ fontSize: 11, color: palette.textSubtle }}>{xEndLabel}</Text>
      </View>

      {isBootstrap && (
        <Text style={{ fontSize: 11, color: palette.textSubtle, marginTop: 8, textAlign: "center" }}>
          Check in daily to build a multi-day trend line.
        </Text>
      )}
    </View>
  );
}
