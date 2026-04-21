import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { CardImage } from "./CardImage";

type Side = "front" | "back";

interface CardPhotoEditorProps {
  frontUri: string | null;
  backUri: string | null;
  onFrontChange: (uri: string | null) => void;
  onBackChange: (uri: string | null) => void;
  playerName?: string;
  setName?: string | null;
  year?: number | null;
}

export function CardPhotoEditor({
  frontUri,
  backUri,
  onFrontChange,
  onBackChange,
  playerName = "",
  setName,
  year,
}: CardPhotoEditorProps) {
  const [side, setSide] = useState<Side>("front");

  const currentUri = side === "front" ? frontUri : backUri;
  const onChangeUri = side === "front" ? onFrontChange : onBackChange;

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [5, 7],
    });
    if (!result.canceled && result.assets[0]) {
      onChangeUri(result.assets[0].uri);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [5, 7],
    });
    if (!result.canceled && result.assets[0]) {
      onChangeUri(result.assets[0].uri);
    }
  }

  const isLocalUri = currentUri && (currentUri.startsWith("blob:") || currentUri.startsWith("file:") || currentUri.startsWith("ph://") || currentUri.startsWith("data:"));

  return (
    <View>
      <Text style={{ fontSize: 13, fontWeight: "600", color: "#3f3f46", marginBottom: 10 }}>
        Card Photo
      </Text>

      <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        {/* Left column: toggle + card preview */}
        <View style={{ alignItems: "center", width: 90 }}>
          {/* Front / Back pill */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: "#f4f4f5",
              borderRadius: 8,
              padding: 2,
              marginBottom: 8,
              alignSelf: "center",
            }}
          >
            <TouchableOpacity
              onPress={() => setSide("front")}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 6,
                backgroundColor: side === "front" ? "#fff" : "transparent",
                ...(side === "front"
                  ? { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 }
                  : {}),
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: side === "front" ? "700" : "500",
                  color: side === "front" ? "#18181b" : "#71717a",
                }}
              >
                Front
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSide("back")}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 6,
                backgroundColor: side === "back" ? "#fff" : "transparent",
                ...(side === "back"
                  ? { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 }
                  : {}),
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: side === "back" ? "700" : "500",
                  color: side === "back" ? "#18181b" : "#71717a",
                }}
              >
                Back
              </Text>
            </TouchableOpacity>
          </View>

          {/* Card preview */}
          <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
            {currentUri && isLocalUri ? (
              <View>
                <Image
                  source={{ uri: currentUri }}
                  style={{ width: 90, height: 126, borderRadius: 8, backgroundColor: "#f4f4f5" }}
                  resizeMode="cover"
                />
                <EditBadge />
              </View>
            ) : side === "front" ? (
              <View>
                <CardImage
                  imageUrl={currentUri}
                  playerName={playerName}
                  setName={setName}
                  year={year}
                  width={90}
                  height={126}
                  borderRadius={8}
                />
                <EditBadge />
              </View>
            ) : currentUri ? (
              <View>
                <Image
                  source={{ uri: currentUri }}
                  style={{ width: 90, height: 126, borderRadius: 8, backgroundColor: "#f4f4f5" }}
                  resizeMode="cover"
                />
                <EditBadge />
              </View>
            ) : (
              <View
                style={{
                  width: 90,
                  height: 126,
                  borderRadius: 8,
                  backgroundColor: "#f4f4f5",
                  justifyContent: "center",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#e4e4e7",
                  borderStyle: "dashed",
                }}
              >
                <FontAwesome name="rotate-left" size={20} color="#d4d4d8" />
                <Text style={{ fontSize: 10, color: "#a1a1aa", marginTop: 4, textAlign: "center" }}>
                  Add back{"\n"}photo
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Right column: action buttons */}
        <View style={{ gap: 8, flex: 1, paddingTop: 30 }}>
          <TouchableOpacity
            onPress={takePhoto}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: "#18181b",
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <FontAwesome name="camera" size={14} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>
              Take Photo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={pickImage}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: "#fff",
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: "#e4e4e7",
            }}
          >
            <FontAwesome name="photo" size={14} color="#18181b" />
            <Text style={{ color: "#18181b", fontWeight: "600", fontSize: 13 }}>
              Choose Photo
            </Text>
          </TouchableOpacity>

          {currentUri && (
            <TouchableOpacity
              onPress={() => onChangeUri(null)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 14,
                paddingVertical: 6,
              }}
            >
              <FontAwesome name="trash-o" size={13} color="#ef4444" />
              <Text style={{ color: "#ef4444", fontSize: 12, fontWeight: "500" }}>
                Remove photo
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

function EditBadge() {
  return (
    <View
      style={{
        position: "absolute",
        bottom: 4,
        right: 4,
        backgroundColor: "rgba(0,0,0,0.6)",
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <FontAwesome name="pencil" size={11} color="#fff" />
    </View>
  );
}
