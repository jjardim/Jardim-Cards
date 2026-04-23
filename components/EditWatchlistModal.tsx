import { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CardImage } from "./CardImage";
import { FormField } from "./FormField";
import { palette, radius, shadow, getSportTheme } from "@/lib/theme";
import {
  updateWatchlistCard,
  removeFromWatchlist,
  moveWatchlistToPortfolio,
} from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import { formatCents } from "@/lib/utils";
import type { WatchlistCard } from "@/lib/types";

interface EditWatchlistModalProps {
  card: WatchlistCard | null;
  visible: boolean;
  onClose: () => void;
  currentMarketCents: number | null;
}

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

export function EditWatchlistModal({
  card,
  visible,
  onClose,
  currentMarketCents,
}: EditWatchlistModalProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const sport = getSportTheme(card?.sport);

  const [targetPrice, setTargetPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [moveMode, setMoveMode] = useState(false);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayIso());

  useEffect(() => {
    if (!card) return;
    setTargetPrice(
      card.target_price_cents != null
        ? (card.target_price_cents / 100).toFixed(2)
        : ""
    );
    setNotes(card.notes ?? "");
    setMoveMode(false);
    setPurchasePrice(
      currentMarketCents != null ? (currentMarketCents / 100).toFixed(2) : ""
    );
    setPurchaseDate(todayIso());
  }, [card, currentMarketCents]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!card) return;
      const targetCents = targetPrice.trim()
        ? Math.round(parseFloat(targetPrice) * 100)
        : null;
      await updateWatchlistCard(card.id, {
        target_price_cents: targetCents && targetCents > 0 ? targetCents : null,
        notes: notes.trim() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      showToast("Watchlist updated", "success");
      onClose();
    },
    onError: (err: Error) => {
      showToast(err.message || "Failed to update", "error");
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => {
      if (!card) throw new Error("No card");
      return removeFromWatchlist(card.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      showToast("Removed from watchlist", "success");
      onClose();
    },
    onError: (err: Error) => {
      showToast(err.message || "Failed to remove", "error");
    },
  });

  const moveMutation = useMutation({
    mutationFn: async () => {
      if (!card) throw new Error("No card");
      const priceCents = Math.round(parseFloat(purchasePrice) * 100);
      if (!Number.isFinite(priceCents) || priceCents <= 0) {
        throw new Error("Enter a valid purchase price");
      }
      await moveWatchlistToPortfolio(card, {
        purchasePriceCents: priceCents,
        purchaseDate: purchaseDate || todayIso(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      showToast("Moved to portfolio", "success");
      onClose();
    },
    onError: (err: Error) => {
      showToast(err.message || "Failed to move card", "error");
    },
  });

  const confirmRemove = () => {
    if (!card) return;
    const run = () => removeMutation.mutate();
    if (Platform.OS === "web") {
      if (window.confirm(`Remove ${card.player_name} from your watchlist?`)) run();
    } else {
      Alert.alert(
        "Remove card",
        `Remove ${card.player_name} from your watchlist?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Remove", style: "destructive", onPress: run },
        ]
      );
    }
  };

  if (!card) return null;

  const targetCents = targetPrice.trim()
    ? Math.round(parseFloat(targetPrice) * 100)
    : null;
  const targetHit =
    targetCents != null &&
    currentMarketCents != null &&
    currentMarketCents <= targetCents;

  const busy =
    saveMutation.isPending ||
    removeMutation.isPending ||
    moveMutation.isPending;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: palette.bg }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingTop: Platform.OS === "ios" ? 14 : 18,
            paddingBottom: 12,
            backgroundColor: palette.bg,
          }}
        >
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={{ fontSize: 15, color: palette.textMuted, fontWeight: "600" }}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: "700", color: palette.text }}>
            Edit watchlist card
          </Text>
          <TouchableOpacity
            onPress={() => saveMutation.mutate()}
            disabled={busy}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator size="small" color={palette.primary} />
            ) : (
              <Text
                style={{
                  fontSize: 15,
                  color: palette.primary,
                  fontWeight: "700",
                }}
              >
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card summary */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: palette.surface,
              borderRadius: radius.lg,
              padding: 14,
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
            <CardImage
              imageUrl={card.image_url}
              playerName={card.player_name}
              setName={card.set_name}
              year={card.year}
              width={56}
              height={78}
              borderRadius={6}
            />
            <View style={{ flex: 1, marginLeft: 12, justifyContent: "center" }}>
              <Text
                style={{
                  fontSize: 10,
                  color: palette.textSubtle,
                  fontWeight: "700",
                  letterSpacing: 0.3,
                }}
                numberOfLines={1}
              >
                {(card.set_name ?? "CARD").toUpperCase()}
                {card.year ? ` \u00B7 ${card.year}` : ""}
                {card.grade ? ` \u00B7 ${card.grade}` : ""}
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: palette.text,
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {card.player_name}
              </Text>
              {currentMarketCents != null && (
                <Text
                  style={{ fontSize: 12, color: palette.textMuted, marginTop: 4 }}
                >
                  {`Market ${formatCents(currentMarketCents)}`}
                </Text>
              )}
            </View>
          </View>

          {/* Target price */}
          <Text
            style={{
              fontSize: 11,
              fontWeight: "800",
              color: palette.textSubtle,
              letterSpacing: 0.4,
              marginTop: 22,
              marginBottom: 8,
            }}
          >
            TARGET PRICE
          </Text>
          <View style={{ gap: 10 }}>
            <FormField
              label="Buy at or below"
              value={targetPrice}
              onChangeText={setTargetPrice}
              placeholder="e.g. 150.00"
              keyboardType="decimal-pad"
            />
            {targetHit && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: palette.successBg,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: radius.md,
                }}
              >
                <Text style={{ fontSize: 16 }}>{"\uD83C\uDFAF"}</Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "800",
                      color: palette.success,
                      letterSpacing: 0.3,
                    }}
                  >
                    TARGET HIT
                  </Text>
                  <Text style={{ fontSize: 12, color: palette.text, marginTop: 1 }}>
                    {`Market ${formatCents(currentMarketCents!)} is at or below your target.`}
                  </Text>
                </View>
              </View>
            )}
            <Text style={{ fontSize: 11, color: palette.textSubtle }}>
              {"We\u2019ll flag the card once the market drops to this price."}
            </Text>
          </View>

          {/* Notes */}
          <Text
            style={{
              fontSize: 11,
              fontWeight: "800",
              color: palette.textSubtle,
              letterSpacing: 0.4,
              marginTop: 22,
              marginBottom: 8,
            }}
          >
            NOTES
          </Text>
          <View style={{ borderRadius: radius.md, ...shadow.sm }}>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Why you're watching this card..."
              placeholderTextColor={palette.textSubtle}
              multiline
              style={{
                backgroundColor: palette.surface,
                borderRadius: radius.md,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
                color: palette.text,
                minHeight: 88,
                textAlignVertical: "top",
              }}
            />
          </View>

          {/* Move to portfolio */}
          <Text
            style={{
              fontSize: 11,
              fontWeight: "800",
              color: palette.textSubtle,
              letterSpacing: 0.4,
              marginTop: 22,
              marginBottom: 8,
            }}
          >
            BOUGHT IT?
          </Text>
          {!moveMode ? (
            <TouchableOpacity
              onPress={() => setMoveMode(true)}
              style={{
                backgroundColor: palette.heroDark,
                borderRadius: radius.md,
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                ...shadow.sm,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: radius.pill,
                  backgroundColor: "rgba(96,165,250,0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FontAwesome name="briefcase" size={13} color={palette.primarySoft} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: palette.textInverse,
                    fontSize: 14,
                    fontWeight: "700",
                  }}
                >
                  Move to portfolio
                </Text>
                <Text
                  style={{
                    color: palette.textInverseMuted,
                    fontSize: 11,
                    marginTop: 2,
                  }}
                >
                  {"Use when you actually buy the card \u2013 we\u2019ll track P/L from there."}
                </Text>
              </View>
              <FontAwesome name="angle-right" size={16} color={palette.textInverseMuted} />
            </TouchableOpacity>
          ) : (
            <View
              style={{
                backgroundColor: palette.surface,
                borderRadius: radius.md,
                padding: 14,
                gap: 12,
                ...shadow.sm,
              }}
            >
              <FormField
                label="Purchase price"
                value={purchasePrice}
                onChangeText={setPurchasePrice}
                placeholder="e.g. 149.99"
                keyboardType="decimal-pad"
              />
              <FormField
                label="Purchase date"
                value={purchaseDate}
                onChangeText={setPurchaseDate}
                placeholder="YYYY-MM-DD"
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setMoveMode(false)}
                  disabled={busy}
                  style={{
                    flex: 1,
                    backgroundColor: palette.bgMuted,
                    paddingVertical: 12,
                    borderRadius: radius.pill,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: palette.textMuted,
                      fontSize: 13,
                      fontWeight: "700",
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => moveMutation.mutate()}
                  disabled={busy}
                  style={{
                    flex: 1.4,
                    backgroundColor: palette.success,
                    paddingVertical: 12,
                    borderRadius: radius.pill,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    ...shadow.sm,
                  }}
                >
                  {moveMutation.isPending ? (
                    <ActivityIndicator size="small" color={palette.textInverse} />
                  ) : (
                    <>
                      <FontAwesome
                        name="briefcase"
                        size={12}
                        color={palette.textInverse}
                      />
                      <Text
                        style={{
                          color: palette.textInverse,
                          fontSize: 13,
                          fontWeight: "700",
                        }}
                      >
                        Move to portfolio
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Remove */}
          <TouchableOpacity
            onPress={confirmRemove}
            disabled={busy}
            style={{
              marginTop: 28,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 12,
            }}
          >
            {removeMutation.isPending ? (
              <ActivityIndicator size="small" color={palette.danger} />
            ) : (
              <>
                <FontAwesome name="trash" size={13} color={palette.danger} />
                <Text
                  style={{
                    color: palette.danger,
                    fontSize: 14,
                    fontWeight: "700",
                  }}
                >
                  Remove from watchlist
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
