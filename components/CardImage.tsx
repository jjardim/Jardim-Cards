import { useState, useEffect, useCallback } from "react";
import { View, Image, type ImageStyle, type ViewStyle, ActivityIndicator } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { fetchCardImage } from "@/lib/api";

interface CardImageProps {
  imageUrl: string | null;
  playerName: string;
  setName?: string | null;
  year?: number | null;
  width: number;
  height: number;
  borderRadius?: number;
}

export function CardImage({
  imageUrl,
  playerName,
  setName,
  year,
  width,
  height,
  borderRadius = 6,
}: CardImageProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [triedFetch, setTriedFetch] = useState(false);

  const doFetch = useCallback(() => {
    setLoading(true);
    fetchCardImage(playerName, setName, year).then((url) => {
      setResolvedUrl(url);
      setTriedFetch(true);
      if (!url) setLoading(false);
    });
  }, [playerName, setName, year]);

  useEffect(() => {
    const isBrokenUrl = imageUrl && (imageUrl.startsWith("blob:") || imageUrl.startsWith("ph://"));
    if (imageUrl && !isBrokenUrl) {
      setResolvedUrl(imageUrl);
      setTriedFetch(false);
    } else {
      doFetch();
    }
  }, [imageUrl, doFetch]);

  const handleError = useCallback(() => {
    if (!triedFetch) {
      doFetch();
    } else {
      setResolvedUrl(null);
      setLoading(false);
    }
  }, [triedFetch, doFetch]);

  const imageStyle: ImageStyle = {
    width,
    height,
    borderRadius,
    backgroundColor: "#f4f4f5",
  };

  const containerStyle: ViewStyle = {
    width,
    height,
    borderRadius,
    backgroundColor: "#f4f4f5",
    justifyContent: "center",
    alignItems: "center",
  };

  if (resolvedUrl) {
    return (
      <Image
        source={{ uri: resolvedUrl }}
        style={imageStyle}
        resizeMode="cover"
        onLoad={() => setLoading(false)}
        onError={handleError}
      />
    );
  }

  if (loading) {
    return (
      <View style={containerStyle}>
        <ActivityIndicator size="small" color="#a1a1aa" />
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <FontAwesome name="image" size={Math.min(width, height) * 0.35} color="#d4d4d8" />
    </View>
  );
}
