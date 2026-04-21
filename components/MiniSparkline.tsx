import { View } from "react-native";

interface MiniSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function MiniSparkline({
  data,
  width = 60,
  height = 24,
  color = "#22c55e",
}: MiniSparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const barWidth = Math.max(2, (width - (data.length - 1) * 1.5) / data.length);

  return (
    <View
      style={{
        width,
        height,
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 1.5,
      }}
    >
      {data.map((val, i) => {
        const normalized = (val - min) / range;
        const barHeight = Math.max(2, normalized * height);
        const isLast = i === data.length - 1;
        return (
          <View
            key={i}
            style={{
              width: barWidth,
              height: barHeight,
              borderRadius: 1,
              backgroundColor: isLast ? color : `${color}80`,
            }}
          />
        );
      })}
    </View>
  );
}
