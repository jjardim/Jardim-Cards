import { View, Text, TouchableOpacity } from "react-native";
import { Stack, router } from "expo-router";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "#fafafa" }}>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#18181b" }}>Page not found</Text>
        <TouchableOpacity onPress={() => router.replace("/")} style={{ marginTop: 16 }}>
          <Text style={{ color: "#2f95dc", fontSize: 16, fontWeight: "600" }}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
