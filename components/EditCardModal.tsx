import { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { FormField } from "./FormField";
import { CardPhotoEditor } from "./CardPhotoEditor";
import { SPORTS } from "@/lib/types";
import type { PortfolioCard } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

interface EditCardModalProps {
  card: PortfolioCard | null;
  visible: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<PortfolioCard>) => void;
  saving: boolean;
}

function isLocalUri(url: string | null): boolean {
  if (!url) return false;
  return url.startsWith("blob:") || url.startsWith("file:") || url.startsWith("ph://");
}

async function uploadImage(uri: string, userId: string): Promise<string | null> {
  try {
    const ext = uri.split(".").pop()?.split("?")[0]?.toLowerCase() ?? "jpg";
    const fileName = `${userId}/${Date.now()}.${ext}`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const { error } = await supabase.storage
      .from("card-images")
      .upload(fileName, blob, { contentType: `image/${ext === "jpg" ? "jpeg" : ext}`, upsert: false });
    if (error) return null;
    const { data } = supabase.storage.from("card-images").getPublicUrl(fileName);
    return data.publicUrl;
  } catch {
    return null;
  }
}

export function EditCardModal({ card, visible, onClose, onSave, saving }: EditCardModalProps) {
  const { user } = useAuth();
  const [playerName, setPlayerName] = useState("");
  const [setName, setSetName] = useState("");
  const [year, setYear] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [grade, setGrade] = useState("");
  const [sport, setSport] = useState("baseball");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [backImageUrl, setBackImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (card) {
      setPlayerName(card.player_name);
      setSetName(card.set_name ?? "");
      setYear(card.year?.toString() ?? "");
      setCardNumber(card.card_number ?? "");
      setGrade(card.grade ?? "");
      setSport(card.sport);
      setPurchasePrice((card.purchase_price_cents / 100).toFixed(2));
      setPurchaseDate(card.purchase_date?.split("T")[0] ?? "");
      setQuantity(card.quantity.toString());
      setNotes(card.notes ?? "");
      setImageUrl(card.image_url ?? null);
      setBackImageUrl(card.back_image_url ?? null);
    }
  }, [card]);

  async function handleSave() {
    if (!card || !playerName || !purchasePrice) return;

    const priceCents = Math.round(parseFloat(purchasePrice) * 100);
    const cardName = [year, setName, playerName, cardNumber ? `#${cardNumber}` : ""]
      .filter(Boolean)
      .join(" ");

    let finalImageUrl = imageUrl;
    if (finalImageUrl && isLocalUri(finalImageUrl) && user) {
      const uploaded = await uploadImage(finalImageUrl, user.id);
      if (uploaded) finalImageUrl = uploaded;
    }

    let finalBackImageUrl = backImageUrl;
    if (finalBackImageUrl && isLocalUri(finalBackImageUrl) && user) {
      const uploaded = await uploadImage(finalBackImageUrl, user.id);
      if (uploaded) finalBackImageUrl = uploaded;
    }

    onSave(card.id, {
      player_name: playerName,
      card_name: cardName,
      set_name: setName || null,
      year: year ? parseInt(year) : null,
      card_number: cardNumber || null,
      grade: grade || null,
      sport,
      image_url: finalImageUrl,
      back_image_url: finalBackImageUrl,
      purchase_price_cents: priceCents,
      purchase_date: purchaseDate || card.purchase_date,
      quantity: parseInt(quantity) || 1,
      notes: notes || null,
    });
  }

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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: "90%",
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
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: "#f4f4f5",
              }}
            >
              <TouchableOpacity onPress={onClose}>
                <Text style={{ fontSize: 15, color: "#71717a" }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 17, fontWeight: "600", color: "#18181b" }}>
                Edit Card
              </Text>
              <TouchableOpacity onPress={handleSave} disabled={saving || !playerName || !purchasePrice}>
                {saving ? (
                  <ActivityIndicator size="small" color="#18181b" />
                ) : (
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: playerName && purchasePrice ? "#18181b" : "#a1a1aa",
                    }}
                  >
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Form */}
            <ScrollView
              style={{ paddingHorizontal: 20 }}
              contentContainerStyle={{ paddingTop: 16, paddingBottom: 40, gap: 14 }}
              keyboardShouldPersistTaps="handled"
            >
              <CardPhotoEditor
                frontUri={imageUrl}
                backUri={backImageUrl}
                onFrontChange={setImageUrl}
                onBackChange={setBackImageUrl}
                playerName={playerName}
                setName={setName || null}
                year={year ? parseInt(year) : null}
              />

              <FormField
                label="Player Name *"
                value={playerName}
                onChangeText={setPlayerName}
                placeholder="Derek Jeter"
              />
              <FormField
                label="Set Name"
                value={setName}
                onChangeText={setSetName}
                placeholder="1993 SP"
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="Year"
                    value={year}
                    onChangeText={setYear}
                    placeholder="1993"
                    keyboardType="number-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="Card #"
                    value={cardNumber}
                    onChangeText={setCardNumber}
                    placeholder="279"
                  />
                </View>
              </View>

              <View>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#3f3f46", marginBottom: 6 }}>
                  Sport
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {SPORTS.map((s) => (
                      <TouchableOpacity
                        key={s}
                        onPress={() => setSport(s)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                          backgroundColor: sport === s ? "#18181b" : "#fff",
                          borderWidth: 1,
                          borderColor: sport === s ? "#18181b" : "#e4e4e7",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color: sport === s ? "#fff" : "#3f3f46",
                          }}
                        >
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <FormField
                label="Grade"
                value={grade}
                onChangeText={setGrade}
                placeholder="PSA 10, BGS 9.5, Raw..."
              />

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="Purchase Price ($) *"
                    value={purchasePrice}
                    onChangeText={setPurchasePrice}
                    placeholder="285.00"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FormField
                    label="Quantity"
                    value={quantity}
                    onChangeText={setQuantity}
                    placeholder="1"
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <FormField
                label="Purchase Date"
                value={purchaseDate}
                onChangeText={setPurchaseDate}
                placeholder="2026-04-20"
              />

              <FormField
                label="Notes"
                value={notes}
                onChangeText={setNotes}
                placeholder="Condition notes, where purchased..."
              />
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
