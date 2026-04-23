import { useState, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, Platform, TextInput, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { parseCardText, type ParsedCardData } from "@/lib/card-parser";
import { FormField } from "@/components/FormField";
import { CardPhotoEditor } from "@/components/CardPhotoEditor";
import { SPORTS } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { lookupEbayItem } from "@/lib/api";

async function runOCR(uri: string): Promise<string[]> {
  try {
    const mod = require("expo-text-extractor");
    const extractTextFromImage = mod.extractTextFromImage ?? mod.default?.extractTextFromImage;
    if (typeof extractTextFromImage === "function") {
      return await extractTextFromImage(uri);
    }
  } catch {
    // Native module not available (Expo Go)
  }
  return [];
}

export default function ScanScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [parsed, setParsed] = useState<ParsedCardData | null>(null);
  const [processing, setProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const [playerName, setPlayerName] = useState("");
  const [setName, setSetName] = useState("");
  const [year, setYear] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [grade, setGrade] = useState("");
  const [sport, setSport] = useState("baseball");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [backImageUri, setBackImageUri] = useState<string | null>(null);

  const [sessionCards, setSessionCards] = useState<string[]>([]);
  const [ebayUrl, setEbayUrl] = useState("");
  const [lookingUp, setLookingUp] = useState(false);

  const [ebayMeta, setEbayMeta] = useState<{
    title: string | null;
    itemId: string | null;
    url: string | null;
  }>({ title: null, itemId: null, url: null });

  async function handleEbayLookup() {
    if (!ebayUrl.trim()) {
      showToast("Please paste an eBay URL", "error");
      return;
    }
    setLookingUp(true);
    try {
      const result = await lookupEbayItem(ebayUrl);
      if (result.playerName) setPlayerName(result.playerName);
      if (result.setName) setSetName(result.setName);
      if (result.year) setYear(result.year.toString());
      if (result.cardNumber) setCardNumber(result.cardNumber);
      if (result.grade) setGrade(result.grade);
      if (result.sport) setSport(result.sport);
      if (result.priceCents) setPurchasePrice((result.priceCents / 100).toFixed(2));
      const images = result.allImageUrls ?? [];
      if (images.length > 0) setImageUri(images[0]);
      if (images.length > 1) setBackImageUri(images[1]);
      setEbayMeta({
        title: result.title,
        itemId: result.itemId,
        url: result.ebayUrl,
      });
      setEbayUrl("");
      const photoCount = Math.min(images.length, 2);
      showToast(
        `Card details imported from eBay${photoCount > 0 ? ` (${photoCount} photo${photoCount > 1 ? "s" : ""})` : ""}`,
        "success"
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to look up eBay item";
      showToast(message, "error");
    } finally {
      setLookingUp(false);
    }
  }

  const resetForm = useCallback(() => {
    setPlayerName("");
    setSetName("");
    setYear("");
    setCardNumber("");
    setGrade("");
    setSport("baseball");
    setPurchasePrice("");
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setImageUri(null);
    setBackImageUri(null);
    setParsed(null);
    setEbayMeta({ title: null, itemId: null, url: null });
  }, []);

  async function processImage(uri: string) {
    setImageUri(uri);
    setProcessing(true);
    try {
      let textBlocks: string[] = [];
      if (Platform.OS !== "web") {
        textBlocks = await runOCR(uri);
      }

      if (textBlocks.length === 0) {
        const data = parseCardText(["[OCR requires a development build - fill in details manually]"]);
        setParsed(data);
        Alert.alert(
          "Manual entry",
          "OCR text recognition requires a development build. In Expo Go, please fill in the card details manually below.",
          [{ text: "OK" }]
        );
      } else {
        const data = parseCardText(textBlocks);
        setParsed(data);
        if (data.playerName) setPlayerName(data.playerName);
        if (data.setName) setSetName(data.setName);
        if (data.year) setYear(data.year.toString());
        if (data.cardNumber) setCardNumber(data.cardNumber);
        if (data.grade) setGrade(data.grade);
      }
    } catch {
      Alert.alert(
        "Manual entry",
        "Card scanning is not available in Expo Go. Please fill in details manually.",
        [{ text: "OK" }]
      );
    } finally {
      setProcessing(false);
      setScanning(false);
    }
  }

  async function takePhoto() {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync();
    if (photo?.uri) {
      await processImage(photo.uri);
    }
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri);
    }
  }

  async function uploadCardImage(uri: string, userId: string): Promise<string | null> {
    try {
      const ext = uri.split(".").pop()?.toLowerCase() ?? "jpg";
      const fileName = `${userId}/${Date.now()}.${ext}`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from("card-images")
        .upload(fileName, blob, { contentType: `image/${ext === "jpg" ? "jpeg" : ext}`, upsert: false });

      if (uploadError) {
        console.warn("Image upload failed:", uploadError.message);
        return null;
      }

      const { data: urlData } = supabase.storage.from("card-images").getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (err) {
      console.warn("Image upload error:", err);
      return null;
    }
  }

  async function saveCard(mode: "exit" | "another"): Promise<boolean> {
    if (!user) {
      Alert.alert("Sign in required", "Please sign in to save cards to your portfolio.");
      router.push("/(auth)/login");
      return false;
    }
    if (!playerName || !purchasePrice) {
      showToast("Player name and purchase price are required.", "error");
      return false;
    }

    setSaving(true);
    const priceCents = Math.round(parseFloat(purchasePrice) * 100);
    const cardName = [year, setName, playerName, cardNumber ? `#${cardNumber}` : ""].filter(Boolean).join(" ");

    let permanentImageUrl: string | null = null;
    if (imageUri) {
      permanentImageUrl = await uploadCardImage(imageUri, user.id);
    }
    let permanentBackImageUrl: string | null = null;
    if (backImageUri) {
      permanentBackImageUrl = await uploadCardImage(backImageUri, user.id);
    }

    const { error } = await supabase.from("portfolio_cards").insert({
      user_id: user.id,
      card_name: cardName,
      player_name: playerName,
      set_name: setName || null,
      year: year ? parseInt(year) : null,
      card_number: cardNumber || null,
      sport,
      grade: grade || null,
      image_url: permanentImageUrl,
      back_image_url: permanentBackImageUrl,
      ebay_title: ebayMeta.title,
      ebay_item_id: ebayMeta.itemId,
      ebay_url: ebayMeta.url,
      purchase_price_cents: priceCents,
      purchase_date: purchaseDate,
      quantity: 1,
    });

    setSaving(false);

    if (error) {
      showToast(error.message, "error");
      return false;
    }

    const newSession = [...sessionCards, cardName];
    setSessionCards(newSession);
    queryClient.invalidateQueries({ queryKey: ["portfolio"] });

    if (mode === "another") {
      showToast(`Added "${playerName}" to portfolio`, "success");
      resetForm();
    } else {
      if (newSession.length === 1) {
        showToast(`Added "${playerName}" to portfolio`, "success");
      } else {
        showToast(`Added ${newSession.length} cards to portfolio`, "success", 5000);
      }
      setSessionCards([]);
      resetForm();
      router.push("/(tabs)/portfolio");
    }

    return true;
  }

  if (scanning) {
    if (!permission?.granted) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "#fafafa" }}>
          <Text style={{ fontSize: 16, textAlign: "center", marginBottom: 16, color: "#18181b" }}>
            Camera permission is needed to scan cards
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            style={{ backgroundColor: "#18181b", borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
          <View style={{ flex: 1, justifyContent: "flex-end", padding: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 16 }}>
              <TouchableOpacity
                onPress={() => setScanning(false)}
                style={{ backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 999, paddingHorizontal: 20, paddingVertical: 14 }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={takePhoto}
                style={{ backgroundColor: "#fff", borderRadius: 999, width: 70, height: 70, justifyContent: "center", alignItems: "center" }}
              >
                <View style={{ width: 58, height: 58, borderRadius: 999, borderWidth: 3, borderColor: "#18181b" }} />
              </TouchableOpacity>
              <View style={{ width: 70 }} />
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: "700", color: "#18181b" }}>Scan Card</Text>
        <Text style={{ fontSize: 15, color: "#71717a", marginTop: 4 }}>
          Take a photo of a card to auto-fill details
        </Text>

        {sessionCards.length > 0 && (
          <View
            style={{
              backgroundColor: "#eff6ff",
              borderRadius: 10,
              padding: 12,
              marginTop: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <FontAwesome name="check-circle" size={16} color="#1d4ed8" />
            <Text style={{ fontSize: 13, color: "#1d4ed8", fontWeight: "500", flex: 1 }}>
              {sessionCards.length} card{sessionCards.length > 1 ? "s" : ""} added this session
            </Text>
            <TouchableOpacity
              onPress={() => {
                showToast(
                  `Session complete: ${sessionCards.length} card${sessionCards.length > 1 ? "s" : ""} added`,
                  "success",
                  5000
                );
                setSessionCards([]);
                resetForm();
                router.push("/(tabs)/portfolio");
              }}
            >
              <Text style={{ fontSize: 13, color: "#1d4ed8", fontWeight: "700" }}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Import from eBay URL */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 14,
            marginTop: 20,
            borderWidth: 1,
            borderColor: "#e4e4e7",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <FontAwesome name="link" size={14} color="#71717a" />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#18181b" }}>
              Import from eBay URL
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <TextInput
              value={ebayUrl}
              onChangeText={setEbayUrl}
              placeholder="Paste eBay item URL..."
              placeholderTextColor="#a1a1aa"
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                flex: 1,
                backgroundColor: "#f4f4f5",
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: Platform.OS === "web" ? 10 : 12,
                fontSize: 14,
                color: "#18181b",
              }}
            />
            <TouchableOpacity
              onPress={handleEbayLookup}
              disabled={lookingUp || !ebayUrl.trim()}
              style={{
                backgroundColor: "#18181b",
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: Platform.OS === "web" ? 10 : 12,
                opacity: lookingUp || !ebayUrl.trim() ? 0.5 : 1,
              }}
            >
              {lookingUp ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>Look Up</Text>
              )}
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 11, color: "#a1a1aa", marginTop: 6 }}>
            Paste any eBay item page URL to auto-fill card details
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 16, marginBottom: 4 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: "#e4e4e7" }} />
          <Text style={{ marginHorizontal: 12, fontSize: 12, color: "#a1a1aa", fontWeight: "500" }}>or scan a card</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: "#e4e4e7" }} />
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          <TouchableOpacity
            onPress={() => setScanning(true)}
            style={{ flex: 1, backgroundColor: "#18181b", borderRadius: 12, padding: 18, alignItems: "center" }}
          >
            <Text style={{ fontSize: 24, marginBottom: 6 }}>{"\uD83D\uDCF7"}</Text>
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={pickImage}
            style={{ flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 18, alignItems: "center", borderWidth: 1, borderColor: "#e4e4e7" }}
          >
            <Text style={{ fontSize: 24, marginBottom: 6 }}>{"\uD83D\uDDBC\uFE0F"}</Text>
            <Text style={{ color: "#18181b", fontWeight: "600", fontSize: 15 }}>Pick Photo</Text>
          </TouchableOpacity>
        </View>

        {processing && (
          <View style={{ alignItems: "center", paddingVertical: 30 }}>
            <Text style={{ color: "#71717a", fontSize: 15 }}>Analyzing card...</Text>
          </View>
        )}

        {parsed && (
          <View style={{ backgroundColor: "#ecfdf5", borderRadius: 10, padding: 12, marginTop: 16 }}>
            <Text style={{ color: "#065f46", fontWeight: "600", fontSize: 13 }}>OCR Result</Text>
            <Text style={{ color: "#065f46", fontSize: 12, marginTop: 4 }}>{parsed.rawText.slice(0, 200)}</Text>
          </View>
        )}

        {/* Card Photos (Front & Back) */}
        <View style={{ marginTop: 20 }}>
          <CardPhotoEditor
            frontUri={imageUri}
            backUri={backImageUri}
            onFrontChange={setImageUri}
            onBackChange={setBackImageUri}
            playerName={playerName}
            setName={setName || null}
            year={year ? parseInt(year) : null}
          />
        </View>

        {/* Form */}
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#18181b", marginTop: 24, marginBottom: 12 }}>
          Card Details
        </Text>

        <View style={{ gap: 12 }}>
          <FormField label="Player Name *" value={playerName} onChangeText={setPlayerName} placeholder="Derek Jeter" />
          <FormField label="Set Name" value={setName} onChangeText={setSetName} placeholder="1993 SP" />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <FormField label="Year" value={year} onChangeText={setYear} placeholder="1993" keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Card #" value={cardNumber} onChangeText={setCardNumber} placeholder="279" />
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#3f3f46", marginBottom: 4 }}>Sport</Text>
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
                      <Text style={{ fontSize: 12, fontWeight: "600", color: sport === s ? "#fff" : "#3f3f46" }}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
          <FormField label="Grade" value={grade} onChangeText={setGrade} placeholder="PSA 10, BGS 9.5, Raw..." />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <FormField label="Purchase Price ($) *" value={purchasePrice} onChangeText={setPurchasePrice} placeholder="285.00" keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Purchase Date" value={purchaseDate} onChangeText={setPurchaseDate} placeholder="2026-04-20" />
            </View>
          </View>
        </View>

        {/* Save buttons */}
        <View style={{ gap: 10, marginTop: 20 }}>
          <TouchableOpacity
            onPress={() => saveCard("exit")}
            disabled={saving}
            style={{
              backgroundColor: "#18181b",
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              opacity: saving ? 0.5 : 1,
            }}
          >
            <FontAwesome name="check" size={15} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
              {saving ? "Saving..." : "Save & View Portfolio"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => saveCard("another")}
            disabled={saving}
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              borderWidth: 2,
              borderColor: "#18181b",
              opacity: saving ? 0.5 : 1,
            }}
          >
            <FontAwesome name="plus" size={14} color="#18181b" />
            <Text style={{ color: "#18181b", fontWeight: "700", fontSize: 16 }}>
              Save & Add Another
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}
