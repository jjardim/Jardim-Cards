import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { TrendBadge } from "@/components/TrendBadge";
import { formatCents } from "@/lib/utils";
import { searchEbayCards } from "@/lib/api";
import type { CardSearchResult } from "@/lib/types";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data: results = [], isLoading } = useQuery<CardSearchResult[]>({
    queryKey: ["search", submitted],
    queryFn: () => searchEbayCards(submitted),
    enabled: !!submitted,
  });

  function handleSearch() {
    const trimmed = query.trim();
    if (trimmed) setSubmitted(trimmed);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: "700", color: "#18181b" }}>Search Cards</Text>
        <Text style={{ fontSize: 15, color: "#71717a", marginTop: 4 }}>
          Find any sports card by player, set, or year
        </Text>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            placeholder="Player name, set, or card..."
            returnKeyType="search"
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: "#e4e4e7",
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 15,
              backgroundColor: "#fff",
              color: "#18181b",
            }}
            placeholderTextColor="#a1a1aa"
          />
          <TouchableOpacity
            onPress={handleSearch}
            style={{
              backgroundColor: "#18181b",
              borderRadius: 10,
              paddingHorizontal: 20,
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>Search</Text>
          </TouchableOpacity>
        </View>

        {isLoading && (
          <View style={{ alignItems: "center", paddingVertical: 60 }}>
            <Text style={{ color: "#71717a" }}>Searching...</Text>
          </View>
        )}

        {submitted && !isLoading && results.length === 0 && (
          <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 40, alignItems: "center", marginTop: 20, borderWidth: 1, borderColor: "#e4e4e7" }}>
            <Text style={{ color: "#71717a", fontSize: 15 }}>No cards found for &quot;{submitted}&quot;</Text>
          </View>
        )}

        {results.length > 0 && (
          <View style={{ marginTop: 16, gap: 10 }}>
            {results.map((card) => (
              <View
                key={card.id}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: "#e4e4e7",
                }}
              >
                {card.imageUrl && (
                  <Image source={{ uri: card.imageUrl }} style={{ height: 180, borderRadius: 8, marginBottom: 10 }} resizeMode="contain" />
                )}
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#18181b" }}>{card.playerName}</Text>
                <Text style={{ fontSize: 13, color: "#71717a", marginTop: 2 }}>
                  {card.setName ?? card.title} {card.year ? `(${card.year})` : ""} {card.cardNumber ? `#${card.cardNumber}` : ""}
                </Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                  <Text style={{ fontSize: 18, fontWeight: "700", color: "#18181b" }}>
                    {card.currentPriceCents ? formatCents(card.currentPriceCents) : "N/A"}
                  </Text>
                  <TrendBadge pct={card.trend7dPct} />
                </View>
                <View style={{ marginTop: 8 }}>
                  <View style={{ backgroundColor: "#f4f4f5", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" }}>
                    <Text style={{ fontSize: 11, color: "#71717a" }}>{card.source === "mock" ? "Mock data" : "eBay"}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {!submitted && (
          <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 40, alignItems: "center", marginTop: 40, borderWidth: 1, borderColor: "#e4e4e7", borderStyle: "dashed" }}>
            <Text style={{ fontSize: 16, fontWeight: "500", color: "#71717a" }}>Search for a card to get started</Text>
            <Text style={{ fontSize: 13, color: "#a1a1aa", marginTop: 6 }}>Try &quot;Derek Jeter&quot; or &quot;Mike Trout&quot;</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
