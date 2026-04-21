import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Image,
  Linking,
  Platform,
  ActivityIndicator,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { formatCents } from "@/lib/utils";
import type { SoldListing, ActiveListing } from "@/lib/api";
import { fetchActiveListingsForCard } from "@/lib/api";

type Tab = "sold" | "active";

interface SalesModalProps {
  visible: boolean;
  onClose: () => void;
  listings: SoldListing[];
  cardName: string;
  avgPriceCents: number | null;
  cardImageUrl?: string | null;
  card?: {
    player_name: string;
    set_name?: string | null;
    year?: number | null;
    card_number?: string | null;
    grade?: string | null;
  } | null;
}

function openUrl(url: string) {
  if (Platform.OS === "web") {
    window.open(url, "_blank");
  } else {
    Linking.openURL(url);
  }
}

export function SalesModal({
  visible,
  onClose,
  listings,
  cardName,
  avgPriceCents,
  cardImageUrl,
  card,
}: SalesModalProps) {
  const [tab, setTab] = useState<Tab>("sold");
  const [activeListings, setActiveListings] = useState<ActiveListing[]>([]);
  const [loadingActive, setLoadingActive] = useState(false);
  const [activeFetched, setActiveFetched] = useState(false);

  useEffect(() => {
    if (!visible) {
      setTab("sold");
      setActiveListings([]);
      setActiveFetched(false);
    }
  }, [visible]);

  const loadActiveListings = useCallback(async () => {
    if (activeFetched || !card) return;
    setLoadingActive(true);
    try {
      const results = await fetchActiveListingsForCard(card);
      setActiveListings(results);
    } catch {
      setActiveListings([]);
    } finally {
      setLoadingActive(false);
      setActiveFetched(true);
    }
  }, [card, activeFetched]);

  const handleTabSwitch = (newTab: Tab) => {
    setTab(newTab);
    if (newTab === "active" && !activeFetched) {
      loadActiveListings();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: "80%",
          }}
        >
          {/* Handle bar */}
          <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 4 }}>
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: "#d4d4d8",
              }}
            />
          </View>

          {/* Header */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 8,
              borderBottomWidth: 1,
              borderBottomColor: "#f4f4f5",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {cardImageUrl ? (
                <Image
                  source={{ uri: cardImageUrl }}
                  style={{
                    width: 48,
                    height: 67,
                    borderRadius: 6,
                    backgroundColor: "#f4f4f5",
                    marginRight: 12,
                  }}
                  resizeMode="cover"
                />
              ) : null}
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text
                  style={{ fontSize: 13, color: "#71717a", marginTop: 2 }}
                  numberOfLines={2}
                >
                  {cardName}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: "#f4f4f5",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <FontAwesome name="close" size={14} color="#71717a" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Segment control */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: "#f4f4f5",
                borderRadius: 10,
                padding: 3,
                marginTop: 12,
              }}
            >
              <TouchableOpacity
                onPress={() => handleTabSwitch("sold")}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: tab === "sold" ? "#fff" : "transparent",
                  alignItems: "center",
                  ...(tab === "sold"
                    ? {
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.1,
                        shadowRadius: 2,
                        elevation: 2,
                      }
                    : {}),
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: tab === "sold" ? "700" : "500",
                    color: tab === "sold" ? "#18181b" : "#71717a",
                  }}
                >
                  Recent Sales
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleTabSwitch("active")}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: tab === "active" ? "#fff" : "transparent",
                  alignItems: "center",
                  ...(tab === "active"
                    ? {
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.1,
                        shadowRadius: 2,
                        elevation: 2,
                      }
                    : {}),
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: tab === "active" ? "700" : "500",
                    color: tab === "active" ? "#18181b" : "#71717a",
                  }}
                >
                  Active Listings
                </Text>
              </TouchableOpacity>
            </View>

            {/* Summary bar */}
            {tab === "sold" && avgPriceCents !== null && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 10,
                  backgroundColor: "#f0fdf4",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                }}
              >
                <FontAwesome name="line-chart" size={12} color="#16a34a" />
                <Text style={{ fontSize: 13, color: "#15803d", fontWeight: "600" }}>
                  Avg sold price: {formatCents(avgPriceCents)}
                </Text>
                <Text style={{ fontSize: 12, color: "#71717a" }}>
                  ({listings.length} listing{listings.length !== 1 ? "s" : ""})
                </Text>
              </View>
            )}
            {tab === "active" && !loadingActive && activeListings.length > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 10,
                  backgroundColor: "#eff6ff",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                }}
              >
                <FontAwesome name="tag" size={12} color="#2563eb" />
                <Text style={{ fontSize: 13, color: "#1d4ed8", fontWeight: "600" }}>
                  {activeListings.length} active listing
                  {activeListings.length !== 1 ? "s" : ""}
                </Text>
                {activeListings.length > 0 && (
                  <Text style={{ fontSize: 12, color: "#71717a" }}>
                    from{" "}
                    {formatCents(
                      Math.min(...activeListings.map((l) => l.priceCents))
                    )}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Content */}
          <ScrollView
            style={{ paddingHorizontal: 20 }}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
          >
            {tab === "sold" ? (
              <SoldListingsTab listings={listings} />
            ) : (
              <ActiveListingsTab
                listings={activeListings}
                loading={loadingActive}
                grade={card?.grade}
              />
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SoldListingsTab({ listings }: { listings: SoldListing[] }) {
  if (listings.length === 0) {
    return (
      <View style={{ alignItems: "center", paddingVertical: 30 }}>
        <FontAwesome name="search" size={24} color="#d4d4d8" />
        <Text style={{ color: "#a1a1aa", marginTop: 8 }}>
          No sold listings found
        </Text>
      </View>
    );
  }

  return (
    <>
      {listings.map((listing, index) => (
        <TouchableOpacity
          key={`${listing.ebayUrl}-${index}`}
          onPress={() => openUrl(listing.ebayUrl)}
          activeOpacity={0.7}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 12,
            borderBottomWidth: index < listings.length - 1 ? 1 : 0,
            borderBottomColor: "#f4f4f5",
          }}
        >
          {listing.imageUrl ? (
            <Image
              source={{ uri: listing.imageUrl }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 6,
                backgroundColor: "#f4f4f5",
                marginRight: 12,
              }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 6,
                backgroundColor: "#f4f4f5",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              <FontAwesome name="shopping-cart" size={16} color="#d4d4d8" />
            </View>
          )}
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text
              style={{ fontSize: 13, color: "#18181b", fontWeight: "500" }}
              numberOfLines={2}
            >
              {listing.title}
            </Text>
            <Text style={{ fontSize: 11, color: "#a1a1aa", marginTop: 2 }}>
              Sold {listing.date}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#18181b" }}>
              {formatCents(listing.priceCents)}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                marginTop: 4,
              }}
            >
              <Text style={{ fontSize: 11, color: "#3b82f6", fontWeight: "500" }}>
                View on eBay
              </Text>
              <FontAwesome name="external-link" size={9} color="#3b82f6" />
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </>
  );
}

function ActiveListingsTab({
  listings,
  loading,
  grade,
}: {
  listings: ActiveListing[];
  loading: boolean;
  grade?: string | null;
}) {
  if (loading) {
    return (
      <View style={{ alignItems: "center", paddingVertical: 30 }}>
        <ActivityIndicator size="small" color="#3b82f6" />
        <Text style={{ color: "#a1a1aa", marginTop: 8 }}>
          Finding {grade ? `${grade} ` : ""}listings...
        </Text>
      </View>
    );
  }

  if (listings.length === 0) {
    return (
      <View style={{ alignItems: "center", paddingVertical: 30 }}>
        <FontAwesome name="tag" size={24} color="#d4d4d8" />
        <Text style={{ color: "#a1a1aa", marginTop: 8 }}>
          No {grade ? `${grade} ` : ""}active listings found
        </Text>
      </View>
    );
  }

  return (
    <>
      {listings.map((listing, index) => (
        <TouchableOpacity
          key={`${listing.ebayUrl}-${index}`}
          onPress={() => openUrl(listing.ebayUrl)}
          activeOpacity={0.7}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 12,
            borderBottomWidth: index < listings.length - 1 ? 1 : 0,
            borderBottomColor: "#f4f4f5",
          }}
        >
          {listing.imageUrl ? (
            <Image
              source={{ uri: listing.imageUrl }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 6,
                backgroundColor: "#f4f4f5",
                marginRight: 12,
              }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 6,
                backgroundColor: "#f4f4f5",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              <FontAwesome name="tag" size={16} color="#d4d4d8" />
            </View>
          )}
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text
              style={{ fontSize: 13, color: "#18181b", fontWeight: "500" }}
              numberOfLines={2}
            >
              {listing.title}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                marginTop: 4,
              }}
            >
              <View
                style={{
                  backgroundColor: "#dbeafe",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
              >
                <Text style={{ fontSize: 10, color: "#2563eb", fontWeight: "600" }}>
                  BUY NOW
                </Text>
              </View>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#18181b" }}>
              {formatCents(listing.priceCents)}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                marginTop: 4,
              }}
            >
              <Text style={{ fontSize: 11, color: "#3b82f6", fontWeight: "500" }}>
                View on eBay
              </Text>
              <FontAwesome name="external-link" size={9} color="#3b82f6" />
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </>
  );
}
