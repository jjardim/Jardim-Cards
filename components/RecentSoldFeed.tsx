import { View, Text, TouchableOpacity, Linking, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { CardImage } from "./CardImage";
import { formatCents } from "@/lib/utils";
import { fetchRecentSales } from "@/lib/api";
import type { RecentSale } from "@/lib/api";

interface RecentSoldFeedProps {
  sport?: string;
  yearMin?: number;
  yearMax?: number;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

export function RecentSoldFeed({ sport, yearMin, yearMax }: RecentSoldFeedProps) {
  const { data: sales = [], isLoading } = useQuery<RecentSale[]>({
    queryKey: ["recent-sales", sport, yearMin, yearMax],
    queryFn: () => fetchRecentSales(sport, yearMin, yearMax),
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <View style={{ marginTop: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#18181b", marginBottom: 12 }}>
          Recently Sold
        </Text>
        <ActivityIndicator color="#a1a1aa" style={{ marginTop: 8 }} />
      </View>
    );
  }

  if (sales.length === 0) return null;

  return (
    <View style={{ marginTop: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: "700", color: "#18181b", marginBottom: 12 }}>
        Recently Sold
      </Text>
      {sales.map((sale) => (
        <TouchableOpacity
          key={sale.id}
          activeOpacity={0.7}
          onPress={() => Linking.openURL(sale.ebayUrl).catch(() => {})}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#fff",
            borderRadius: 10,
            padding: 10,
            marginBottom: 6,
            borderWidth: 1,
            borderColor: "#f4f4f5",
          }}
        >
          <CardImage
            imageUrl={sale.imageUrl}
            playerName={sale.playerName ?? ""}
            setName={sale.setName}
            year={sale.year}
            width={40}
            height={56}
            borderRadius={6}
          />
          <View style={{ flex: 1, marginLeft: 10, marginRight: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#18181b" }} numberOfLines={1}>
              {sale.playerName ?? sale.title}
            </Text>
            <Text style={{ fontSize: 11, color: "#71717a", marginTop: 1 }} numberOfLines={1}>
              {sale.setName} {sale.year ? `(${sale.year})` : ""}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#18181b" }}>
              {formatCents(sale.soldPriceCents)}
            </Text>
            <Text style={{ fontSize: 10, color: "#a1a1aa", marginTop: 2 }}>
              {timeAgo(sale.soldDate)}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}
