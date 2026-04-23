import { useState, useCallback, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { palette, radius, shadow, getSportTheme } from "@/lib/theme";
import { searchEbayCards, addToWatchlist } from "@/lib/api";
import { lookupCanonicalCard } from "@/lib/pricing/pricecharting";
import { useToast } from "@/lib/toast-context";
import { formatCents } from "@/lib/utils";
import type { CardSearchResult } from "@/lib/types";

interface AddToWatchlistModalProps {
  visible: boolean;
  onClose: () => void;
}

const PRESET_QUERIES = [
  { label: "Jordan PSA", q: "Michael Jordan PSA" },
  { label: "Jeter Rookie", q: "Derek Jeter rookie" },
  { label: "Mahomes Prizm", q: "Patrick Mahomes Prizm" },
  { label: "Gretzky OPC", q: "Wayne Gretzky O-Pee-Chee" },
];

export function AddToWatchlistModal({ visible, onClose }: AddToWatchlistModalProps) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: results = [], isLoading } = useQuery<CardSearchResult[]>({
    queryKey: ["watchlist-search", submitted],
    queryFn: () => searchEbayCards(submitted),
    enabled: !!submitted && visible,
  });

  const addMutation = useMutation({
    mutationFn: addToWatchlist,
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      showToast(`Added ${vars.player_name} to watchlist`, "success");
    },
    onError: (e: Error) => {
      showToast(e.message ?? "Failed to add", "error");
    },
    onSettled: () => setAddingId(null),
  });

  const resetAndClose = useCallback(() => {
    setQuery("");
    setSubmitted("");
    setAddingId(null);
    onClose();
  }, [onClose]);

  const handleSearch = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    setSubmitted(trimmed);
  }, [query]);

  const handleAdd = useCallback(
    async (card: CardSearchResult) => {
      setAddingId(card.id);

      // Enrich from PriceCharting's catalog before saving. eBay's title parser
      // routinely bungles player_name / sport / set_name; PC gives us a clean,
      // canonical record we can trust downstream.
      const canonical = await lookupCanonicalCard({
        player_name: card.playerName,
        set_name: card.setName,
        year: card.year,
        card_number: card.cardNumber,
        ebay_title: card.title,
      });

      addMutation.mutate({
        player_name: canonical?.playerName ?? card.playerName,
        set_name: canonical?.setName ?? card.setName,
        year: canonical?.year ?? card.year,
        card_number: canonical?.cardNumber ?? card.cardNumber,
        sport: canonical?.sport ?? card.sport,
        // Grade is a user-selected attribute (which slab you own), not
        // canonical PC metadata — carry through whatever we parsed from the
        // eBay listing title.
        grade: card.grade,
        image_url: card.imageUrl,
        ebay_title: card.title,
        ebay_item_id: card.id,
        snapshot_price_cents: card.currentPriceCents,
        pricecharting_id: canonical?.pricechartingId ?? null,
      });
    },
    [addMutation]
  );

  const hasSearched = useMemo(() => submitted.length > 0, [submitted]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
      onRequestClose={resetAndClose}
    >
      <View style={{ flex: 1, backgroundColor: palette.bg }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingTop: Platform.OS === "android" ? 20 : 14,
            paddingBottom: 10,
          }}
        >
          <Text
            style={{ fontSize: 22, fontWeight: "700", color: palette.text, letterSpacing: -0.4 }}
          >
            Add to Watchlist
          </Text>
          <TouchableOpacity
            onPress={resetAndClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{
              width: 32,
              height: 32,
              borderRadius: radius.pill,
              backgroundColor: palette.surface,
              alignItems: "center",
              justifyContent: "center",
              ...shadow.sm,
            }}
          >
            <FontAwesome name="times" size={13} color={palette.text} />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            paddingHorizontal: 16,
            marginTop: 6,
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: palette.surface,
              borderRadius: radius.pill,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 14,
              ...shadow.sm,
            }}
          >
            <FontAwesome name="search" size={13} color={palette.textSubtle} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              placeholder="Michael Jordan Fleer PSA..."
              placeholderTextColor={palette.textSubtle}
              returnKeyType="search"
              autoFocus
              style={{
                flex: 1,
                paddingVertical: 11,
                paddingHorizontal: 10,
                fontSize: 14,
                color: palette.text,
              }}
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setQuery("");
                  setSubmitted("");
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <FontAwesome name="times-circle" size={14} color={palette.textSubtle} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={handleSearch}
            disabled={query.trim().length < 2}
            style={{
              backgroundColor:
                query.trim().length < 2 ? palette.textSubtle : palette.heroDark,
              borderRadius: radius.pill,
              paddingHorizontal: 18,
              justifyContent: "center",
              ...shadow.sm,
            }}
          >
            <Text style={{ color: palette.textInverse, fontWeight: "700", fontSize: 13 }}>
              Search
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1, marginTop: 14 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Preset chips */}
          {!hasSearched && (
            <>
              <Text
                style={{
                  fontSize: 11,
                  color: palette.textSubtle,
                  fontWeight: "700",
                  letterSpacing: 0.4,
                  marginBottom: 8,
                }}
              >
                TRY SEARCHING
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {PRESET_QUERIES.map((p) => (
                  <TouchableOpacity
                    key={p.q}
                    onPress={() => {
                      setQuery(p.q);
                      setSubmitted(p.q);
                    }}
                    style={{
                      backgroundColor: palette.surface,
                      borderRadius: radius.pill,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      ...shadow.sm,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: palette.text, fontWeight: "600" }}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View
                style={{
                  backgroundColor: palette.surface,
                  borderRadius: radius.lg,
                  padding: 20,
                  marginTop: 20,
                  alignItems: "center",
                  ...shadow.sm,
                }}
              >
                <Text style={{ fontSize: 28, marginBottom: 6 }}>{"\uD83D\uDD0D"}</Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: palette.text,
                    letterSpacing: -0.2,
                  }}
                >
                  Find cards to track
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: palette.textMuted,
                    marginTop: 4,
                    textAlign: "center",
                  }}
                >
                  {"Search by player, set, grade, or year. We\u2019ll snapshot the price the moment you add it."}
                </Text>
              </View>
            </>
          )}

          {isLoading && (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <ActivityIndicator color={palette.primary} />
              <Text style={{ color: palette.textMuted, marginTop: 10, fontSize: 13 }}>
                Searching eBay...
              </Text>
            </View>
          )}

          {hasSearched && !isLoading && results.length === 0 && (
            <View
              style={{
                backgroundColor: palette.surface,
                borderRadius: radius.lg,
                padding: 28,
                alignItems: "center",
                marginTop: 12,
                ...shadow.sm,
              }}
            >
              <Text style={{ fontSize: 28, marginBottom: 6 }}>{"\uD83E\uDD14"}</Text>
              <Text style={{ fontSize: 14, color: palette.text, fontWeight: "700" }}>
                {`No results for \u201C${submitted}\u201D`}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: palette.textMuted,
                  marginTop: 4,
                  textAlign: "center",
                }}
              >
                Try fewer words or a different spelling.
              </Text>
            </View>
          )}

          {results.length > 0 && (
            <View style={{ gap: 10 }}>
              {results.map((card) => {
                const sport = getSportTheme(card.sport);
                const isAdding = addingId === card.id;
                return (
                  <View
                    key={card.id}
                    style={{
                      backgroundColor: palette.surface,
                      borderRadius: radius.lg,
                      padding: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      overflow: "hidden",
                      ...shadow.sm,
                    }}
                  >
                    <View
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 3,
                        backgroundColor: sport.color,
                      }}
                    />
                    {card.imageUrl ? (
                      <Image
                        source={{ uri: card.imageUrl }}
                        style={{
                          width: 52,
                          height: 72,
                          borderRadius: 6,
                          backgroundColor: palette.bgMuted,
                          marginRight: 12,
                        }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={{
                          width: 52,
                          height: 72,
                          borderRadius: 6,
                          backgroundColor: palette.bgMuted,
                          marginRight: 12,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <FontAwesome name="image" size={18} color={palette.textSubtle} />
                      </View>
                    )}
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Text style={{ fontSize: 10 }}>{sport.emoji}</Text>
                        <Text
                          style={{
                            fontSize: 10,
                            color: palette.textSubtle,
                            fontWeight: "700",
                            letterSpacing: 0.3,
                          }}
                          numberOfLines={1}
                        >
                          {(card.setName ?? "CARD").toUpperCase()}
                          {card.year ? ` \u00B7 ${card.year}` : ""}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: palette.text,
                          marginTop: 2,
                        }}
                        numberOfLines={2}
                      >
                        {card.playerName}
                      </Text>
                      {card.grade && (
                        <View
                          style={{
                            alignSelf: "flex-start",
                            backgroundColor: palette.bgMuted,
                            borderRadius: radius.pill,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            marginTop: 4,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "700",
                              color: palette.text,
                              letterSpacing: 0.3,
                            }}
                          >
                            {card.grade}
                          </Text>
                        </View>
                      )}
                      {card.currentPriceCents != null && (
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "700",
                            color: palette.text,
                            marginTop: 4,
                            letterSpacing: -0.2,
                          }}
                        >
                          {formatCents(card.currentPriceCents)}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleAdd(card)}
                      disabled={isAdding}
                      style={{
                        backgroundColor: isAdding ? palette.textSubtle : palette.primary,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: radius.pill,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      {isAdding ? (
                        <ActivityIndicator color={palette.textInverse} size="small" />
                      ) : (
                        <>
                          <FontAwesome name="plus" size={10} color={palette.textInverse} />
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "700",
                              color: palette.textInverse,
                            }}
                          >
                            Track
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
